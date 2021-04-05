// dkyancey@usgs.gov - 11/10/2020
// see: https://www.youtube.com/watch?v=aHlbkq_YUag
//      https://tableau.github.io/webdataconnector/docs/wdc_samples
//      https://tableau.github.io/webdataconnector/docs/wdc_tutorial
//      https://tableau.github.io/webdataconnector/docs/api_ref.html#webdataconnectorapi.datatypeenum
//	https://help.tableau.com/current/pro/desktop/en-us/union.htm
// WDC SDK: git clone https://github.com/tableau/webdataconnector.git

(function() {
	var Parms =  new Array();
        var Quals;
	var maxDays = 365;

	var myConnector = tableau.makeConnector();

	if (tableau.platformVersion == undefined) {
		alert( "This Web Data Connector can do nothing here. It must be accessed from Tableau desktop or Tableau server.");
	}

	// Define the schema
	myConnector.getSchema = function(schemaCallback) {

		// get the selected parameters from the submitted form
		var formObj = JSON.parse(tableau.connectionData);
		Parms = formObj.Parms.sort();
                Quals = formObj.Quals;

		// id can have no spaces, only letters, numbers, and "_"
		// alias is used as the column label when loaded into Tableau
		// alias:  tableau.dataTypeEnum.datetime
		var cols = [
			{ id: "SiteID",   alias: "Site ID",    dataType: tableau.dataTypeEnum.string },
			{ id: "SiteName", alias: "Site Name",  dataType: tableau.dataTypeEnum.string },
			{ id: "Lat",      alias: "Latitude",   dataType: tableau.dataTypeEnum.float },
			{ id: "Lng",      alias: "Longitude",  dataType: tableau.dataTypeEnum.float },
			{ id: "URL",      alias: "NWISWeb",    dataType: tableau.dataTypeEnum.string },
			{ id: "Date",     alias: "Date, time", dataType: tableau.dataTypeEnum.string, description: "Date, time" }
		];

		// add the 2 cols of each parameter 
		for (var k = 0, l = Parms.length; k < l; k++) {
			cols.push({id: Parms[k]+"_value", alias: parmcode[Parms[k]]+", in "+parmunits[Parms[k]]+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.float });
                        if (Quals == true) {
			    cols.push({id: Parms[k]+"_qual", alias: "Qualifier"+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.string });
                        }
		}

		var tableSchema = {
			id: "USGS",
			alias: formObj.Site_no,
			columns: cols
		}

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = function(table, doneCallback) {
		var formObj = JSON.parse(tableau.connectionData),
		    mdyStart = [];
		    mdyStart = formObj.startDate.split('/');
		    var startDate = mdyStart[2]+"-"+mdyStart[0]+"-"+mdyStart[1];
		    mdyEnd = [];
		    mdyEnd = formObj.endDate.split('/');
		    var endDate = mdyEnd[2]+"-"+mdyEnd[0]+"-"+mdyEnd[1];
		    dateString = "starttime=" + startDate + "&endtime=" + endDate,
		    apiCall="https://nwis.waterservices.usgs.gov/nwis/iv/?format=json&sites=" + formObj.Site_no + "&startDT=" + startDate + "T0:0:00.000&endDT=" + endDate + "T23:59:59.000&parameterCd=" + formObj.Parms + "&siteStatus=all&Access=" + formObj.Access;

		console.log(apiCall);

		$.getJSON(apiCall, function(resp) {
			var ts = resp.value.timeSeries,
			tableData = [];

			// go thru data to build array keyed on site_no+datetime
			var data = new Array();
			var rows = new Array();
			var dt, va, cd, qu, nm, nu, lt, ln, lk, key;
			for (var i = 0, len = ts.length; i < len; i++) {
				nm = ts[i].sourceInfo.siteName;
				nu = ts[i].sourceInfo.siteCode[0].value;	// site_no
				lt = ts[i].sourceInfo.geoLocation.geogLocation.latitude;
				ln = ts[i].sourceInfo.geoLocation.geogLocation.longitude;
				lk = "https://waterdata.usgs.gov/nwis/uv?site_no="+nu;
				for (var j = 0, l = ts[i].values[j].value.length; j < l; j++) {
					dt = ts[i].values[0].value[j].dateTime;

					// convert ISO date to dataTypeEnum.datetime format (y-m-d h:m:s)
					isodt = dt.split(/[T\-\.]/);
					dt = isodt[0]+"-"+isodt[1]+"-"+isodt[2]+' '+isodt[3];
                                        //dt = new Date(isodt[0]+"-"+isodt[1]+"-"+isodt[2]+' '+isodt[3]) // Convert to a date format from epoch time

					cd = ts[i].variable.variableCode[0].value;
					va = ts[i].values[0].value[j].value;
					qu = ts[i].values[0].value[j].qualifiers;
					if (qu !== undefined) {qu = qu+"-"+qual[qu];}
					//vn = ts[i].variable.variableName;
					//vu= ts[i].variable.unit.unitCode;

					// set schema order for each row
					if ( rows.indexOf(dt) < 0) {
						rows.push([nu,nm,lt,ln,lk,dt]);	// start new row
					}
					key = nu + dt;
					if ( data[key] == undefined ){
                                                if (Quals == true) {
						    data[key]=[[cd,va,qu]];	// add 1st data tuple to new row
                                                } else {
						    data[key]=[[cd,va]];	// add 1st data tuple to new row
                                                }
					} else {
                                                if (Quals == true) {
						    data[key].push([cd,va,qu]);	// append subsequent data tuples to existing row
                                                } else {
						    data[key].push([cd,va]);	// append subsequent data tuples to existing row
                                                }
					}
				}
			}

			// go thru the array to push to tableau table row
			var tblRow = [];
			for (var i = 0; i < rows.length; i++) {
				var dt = rows[i][5];

				// push site data in the order of the schema
				//      nu          nm          lt          ln          lk
				tblRow=[rows[i][0], rows[i][1], rows[i][2], rows[i][3], rows[i][4], dt]; 

				// now push data parameters in the order of the schema
				var key = rows[i][0] + dt;
				for (var k = 0, ln = Parms.length; k < ln; k++) {
					var elem = -1;
					// find parameter in data[key]
					for (var l = 0, len = data[key].length; l < len; l++) {
						if (data[key][l][0] == Parms[k]){
							elem = l;
							break;
						}
					}
					//console.log(Parms[k]);
					if (elem >= 0) {
                                                if (Quals == true) {
						    tblRow.push(data[key][elem][1],data[key][elem][2]);
                                                } else {
						    tblRow.push(data[key][elem][1]);
                                                }
					} else {
						// push null if parm not exist
                                                if (Quals == true) {
						    tblRow.push(undefined,'');
                                                } else {
						    tblRow.push(undefined);
                                                }
					}
				}

				// now add row to table
				tableData.push(tblRow);
			}
	
			table.appendRows(tableData);
			doneCallback();
		});
	}

	tableau.registerConnector(myConnector);

	// Create event listeners for when the user submits the form
	$(document).ready(function() {
		$("#submitButton").click(function() {
			var formObj = {
				Site_no: $('#site_no').val().trim(),
				//Parms: $('#site-parms').val().trim(),
				Parms: $('#site-parms').val(),
				Quals: $('#quals').prop("checked"),
				Access: $('#access_level').val(),
				startDate: $('#start-date-one').val().trim(),
				endDate: $('#end-date-one').val().trim(),
			};

			// limit data retrieval to 1 year
			var sec = new Date(formObj.startDate);
			var bs = Math.round(sec.getTime() / 1000);
			sec = new Date(formObj.endDate);
			var es = Math.round(sec.getTime() / 1000);
			var days = Math.round((((es - bs)/60)/60)/24);
			if (days > maxDays) {
				$('#errorMsg').html("Date range of "+Math.round(days)+" days is too large. Pick a range of "+maxDays+" days or less");
				return;
			}


			// Simple date validation: Call the getDate function on the date object created
			function isValidDate(dateStr) {
				var d = new Date(dateStr);
				return !isNaN(d.getDate());
			}

			if (isValidDate(formObj.startDate) && isValidDate(formObj.endDate)) {
				tableau.connectionData = JSON.stringify(formObj); // Use this variable to pass data to your getSchema and getData functions
				tableau.connectionName = "USGS Site Data"; // This will be the data source name in Tableau
				tableau.submit(); // This sends the connector object to Tableau
			} else {
				$('#errorMsg').html("Enter valid dates. For example, 2016-05-08.");
				return;
			}
		});
	});
})();
