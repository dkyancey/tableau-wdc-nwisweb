// dkyancey@usgs.gov - 11/10/2020

(function() {
	var Parms =  new Array();

	var myConnector = tableau.makeConnector();

	// Define the schema
	myConnector.getSchema = function(schemaCallback) {

		// get the selected parameters from the submitted form
		var formObj = JSON.parse(tableau.connectionData);
		Parms = formObj.Parms.sort();

		// id can have no spaces, only letters, numbers, and "_"
		// alias is used as the column label when loaded into Tableau
		var cols = [
			{ id: "Date", alias: "Date, time", description: "Date, time", dataType: tableau.dataTypeEnum.string },
			{ id: "SiteID", alias: "Site ID", dataType: tableau.dataTypeEnum.string },
			{ id: "SiteName", alias: "Site Name", dataType: tableau.dataTypeEnum.string}
		];

		// more cols
		cols.push({id: "Lat", alias: "Latitude", dataType: tableau.dataTypeEnum.float });
		cols.push({id: "Lng", alias: "Longitude", dataType: tableau.dataTypeEnum.float });

		// add the 2 cols of each parameter 
		for (var k = 0, l = Parms.length; k < l; k++) {
			cols.push({id: Parms[k]+"_value", alias: parmcode[Parms[k]]+", in "+parmunits[Parms[k]]+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.float });
			cols.push({id: Parms[k]+"_qual", alias: "Qualifier"+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.string });
		}

		var tableSchema = {
			id: "USGS",
			alias: "ws",
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
		    apiCall="https://nwis.waterservices.usgs.gov/nwis/iv/?format=json&sites=" + formObj.Site_no + "&startDT=" +  startDate + "T0:0:00.000&endDT=" +  endDate + "T23:59:59.000&parameterCd=" + formObj.Parms + "&siteStatus=all";

		tableau.log(apiCall);

		$.getJSON(apiCall, function(resp) {
			var ts = resp.value.timeSeries,
			tableData = [];

			// go thru data to build array keyed on datetime
			var data = new Array();
			var dates = new Array();
			var dt, va, cd, qu;
			for (var i = 0, len = ts.length; i < len; i++) {
				nm = ts[i].sourceInfo.siteName;
				nu = ts[i].sourceInfo.siteCode[0].value;	// site_no
				lt = ts[i].sourceInfo.geoLocation.geogLocation.latitude;
				ln = ts[i].sourceInfo.geoLocation.geogLocation.longitude;
				for (var j = 0, l = ts[i].values[j].value.length; j < l; j++) {
					dt = ts[i].values[0].value[j].dateTime;
					// set date w/o TZ
					//iso = dt.split('-');
					//dt = iso[0]+"-"+iso[1]+"-"+iso[2];

					cd = ts[i].variable.variableCode[0].value;
					va = ts[i].values[0].value[j].value;
					qu = ts[i].values[0].value[j].qualifiers;
					if (qu !== undefined) {qu = qu+"-"+qual[qu];}
					//vn = ts[i].variable.variableName;
					//vu= ts[i].variable.unit.unitCode;

					if ( dates.indexOf(dt) < 0) {
						dates.push([dt,nu,nm,lt,ln]);
					}

					if ( data[dt] == undefined ){
						data[dt]=[[cd,va,qu]];
					} else {
						data[dt].push([cd,va,qu]);
					}
				}
			}

			// go thru the array to push to tableau table row
			var tblRow = [];
			for (var i = 0; i < dates.length; i++) {
				var dt = dates[i][0];
				tblRow=[dt, dates[i][1], dates[i][2], dates[1][3], dates[1][4]]; 

				// push parameters in the order of the schema
				for (var k = 0, ln = Parms.length; k < ln; k++) {
					var elem = -1;
					// find parameter in data[dt]
					for (var l = 0, len = data[dt].length; l < len; l++) {
						if (data[dt][l][0] == Parms[k]){
						elem = l;
							break;
						}
					}
					if (elem >= 0) {
						tblRow.push(data[dt][elem][1],data[dt][elem][2]);
					} else {
						// push null if parm not exist
						tblRow.push(undefined,'');
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
			}
		});
	});
})();
