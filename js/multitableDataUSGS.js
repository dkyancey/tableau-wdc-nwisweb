// dkyancey@usgs.gov - 11/10/2020
// see: https://www.youtube.com/watch?v=aHlbkq_YUag
//      https://tableau.github.io/webdataconnector/docs/wdc_samples
//      https://tableau.github.io/webdataconnector/docs/wdc_tutorial
//      https://tableau.github.io/webdataconnector/docs/api_ref.html#webdataconnectorapi.datatypeenum
// WDC SDK: git clone https://github.com/tableau/webdataconnector.git

(function() {
	var Parms =  new Array();
        var Quals;

	var myConnector = tableau.makeConnector();

	if (tableau.platformVersion == undefined) {
		alert( "This Web Data Connector can do nothing here. It must be accessed from Tableau desktop or Tableau server.");
	}

	// Define the schema
	myConnector.getSchema = function(schemaCallback) {
		var siteTables = new Array();
		// get the selected parameters from the submitted form
		var formObj = JSON.parse(tableau.connectionData);
		Parms = formObj.Parms.sort();
                Quals = formObj.Quals;

		var siteList = new Array();
		formObj.Site_no = formObj.Site_no.replace(/ /g,'');	// remove any spaces
		siteList = formObj.Site_no.split(',');

		var tableSchema = new Array();

		for (var n = 0; n < siteList.length; n++) {
			// id can have no spaces, only letters, numbers, and "_"
			// alias is used as the column label when loaded into Tableau
			// alias:  tableau.dataTypeEnum.datetime
			var cols = new Array();
			cols[siteList[n]] = [
				{ id: "SiteID",   alias: "Site ID",    dataType: tableau.dataTypeEnum.string },
				{ id: "SiteName", alias: "Site Name",  dataType: tableau.dataTypeEnum.string },
				{ id: "Lat",      alias: "Latitude",   dataType: tableau.dataTypeEnum.float },
				{ id: "Lng",      alias: "Longitude",  dataType: tableau.dataTypeEnum.float },
				{ id: "URL",      alias: "NWISWeb",    dataType: tableau.dataTypeEnum.string },
				{ id: "Date",     alias: "Date, time", dataType: tableau.dataTypeEnum.string, description: "Date, time" }
			];
	
			// add the 2 cols for each parameter 
			for (var k = 0, l = Parms.length; k < l; k++) {
				cols[siteList[n]].push({id: Parms[k]+"_value", alias: parmcode[Parms[k]]+", in "+parmunits[Parms[k]]+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.float });
                        	if (Quals == true) {
			    		cols[siteList[n]].push({id: Parms[k]+"_qual", alias: "Qualifier"+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.string });
                        	}
			}
	
			tableSchema[siteList[n]] = {
				id: 'Table_'+n,
				alias: siteList[n],
				columns: cols[siteList[n]]
			}

			siteTables.push(tableSchema[siteList[n]]);
		}
		schemaCallback(siteTables);
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

			// go thru data to build array keyed on datetime
			var data = new Array();
			var rows = new Array();
			var dt, va, cd, qu, nm, nu, lt, ln, lk;
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
					if ( data[dt] == undefined ){
                                                if (Quals == true) {
						    data[dt]=[[cd,va,qu]];	// add 1st data tuple to new row
                                                } else {
						    data[dt]=[[cd,va]];	// add 1st data tuple to new row
                                                }
					} else {
                                                if (Quals == true) {
						    data[dt].push([cd,va,qu]);	// append subsequent data tuples to existing row
                                                } else {
						    data[dt].push([cd,va]);	// append subsequent data tuples to existing row
                                                }
					}
				}
			}

			// go thru the array to push to tableau table row
			var tblRow = [];
			for (var i = 0; i < rows.length; i++) {
				var dt = rows[i][5];

				// push site data in the order of the schema
				//          nu           nm           lt           ln           lk
				tblRow=[rows[i][0], rows[i][1], rows[i][2], rows[i][3], rows[i][4], dt]; 

				// now push parameters in the order of the schema
				for (var k = 0, ln = Parms.length; k < ln; k++) {
					var elem = -1;
					// find parameter in data[dt]
					for (var l = 0, len = data[dt].length; l < len; l++) {
						if (data[dt][l][0] == Parms[k]){
							elem = l;
							break;
						}
					}
					//console.log(Parms[k]);
					if (elem >= 0) {
                                                if (Quals == true) {
						    tblRow.push(data[dt][elem][1],data[dt][elem][2]);
                                                } else {
						    tblRow.push(data[dt][elem][1]);
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
