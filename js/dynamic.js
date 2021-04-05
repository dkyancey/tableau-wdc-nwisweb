// dkyancey@usgs.gov - 11/10/2020

(function() {

	// Create the connector object
	var myConnector = tableau.makeConnector();

	// Define the schema
	myConnector.getSchema = function(schemaCallback) {

		// get the selected parameters from the submitted form
		var formObj = JSON.parse(tableau.connectionData);
		Parms = formObj.Parms.split(',');
		Parms = Parms.sort();

		// id can have no spaces, only letters, numbers, and "_"
		// alias is used as column name
		var cols = [{ id: "Date", alias: "Date, time", description: "Date, time", dataType: tableau.dataTypeEnum.string },
			    { id: "SiteID", alias: "Site ID", dataType: tableau.dataTypeEnum.string },
			    { id: "SiteName", alias: "Site Name", dataType: tableau.dataTypeEnum.string
		}];

		// add the cols of each parameter 
		for (var k = 0, l = Parms.length; k < l; k++) {
			cols.push({id: Parms[k]+"_value", alias: parmcode[Parms[k]]+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.string });
			cols.push({id: Parms[k]+"_units", alias: "Units"+" ("+Parms[k]+")", dataType: tableau.dataTypeEnum.string });
		}

		// more cols
		cols.push({id: "Qualifier", description: "Qualifier flag", dataType: tableau.dataTypeEnum.string });
		cols.push({id: "Lat", dataType: tableau.dataTypeEnum.float });
		cols.push({id: "Lng", dataType: tableau.dataTypeEnum.float });

		var tableSchema = {
			id: "ws",
			//alias: "waterservices",
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = function(table, doneCallback) {
		var formObj = JSON.parse(tableau.connectionData),
			dateString = "starttime=" + formObj.startDate + "&endtime=" + formObj.endDate,
			apiCall="https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + formObj.Site_no + "&startDT=" +  formObj.startDate + "T0:0:00.000&endDT=" +  formObj.endDate + "T0:0:00.000&parameterCd=" + formObj.Parms + "&siteStatus=all";

		$.getJSON(apiCall, function(resp) {
			var ts = resp.value.timeSeries,
			tableData = [];

			// go thru data to build array keyed on datetime
			var data = [];
			var dt;
			var va;
			var cd;
			for (var i = 0, len = ts.length; i < len; i++) {
				for (var j = 0, l = ts[i].values[0].value.length; j < l; j++) {
					dt = ts[i].values[0].value[j].dateTime;
					cd = ts[i].variable.variableCode[0].value;
					un = ts[i].variable.unit.unitCode;
					va = ts[i].values[0].value[j].value;
					pn = ts[i].variable.variableName;
					if ( data[dt] == undefined) {
						data[dt]=[cd,va,un];
					} else {
						data[dt].push(cd,va,un);
						//tableau.log(data[dt]);
					}
				}
			}

			// go thru data again to push array to tableau table
			var tblRow = [];
			for (var i = 0, len = ts.length; i < len; i++) {
				tableau.log(data[dt]);

				// output the cols 
				for (var j = 0, l = ts[i].values[0].value.length; j < l; j++) {
					dt = ts[i].values[0].value[j].dateTime;
					qu = ts[i].values[0].value[0].qualifiers;
					nm = ts[i].sourceInfo.siteName,
					nu = ts[i].sourceInfo.siteCode[0].value,	// site_no
					lt = ts[i].sourceInfo.geoLocation.geogLocation.latitude,
					ln = ts[i].sourceInfo.geoLocation.geogLocation.longitude,
					//cd = ts[i].variable.variableCode[0].value;

					// create the row with chosen parameters, col order must match that of the schema
					tblRow=[dt, nu, nm]; 
					k = 0;
					for (var m = 0, len = Parms.length; m < len; m++) {
						tblRow.push(data[dt][++k],data[dt][++k]);
						k++; 	// skip pcode
					}
					tblRow.push(qu+" ("+qual[qu]+")", lt, ln);

					// now add row to table
					tableData.push(tblRow);
				}
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
				Parms: $('#parameters').val().trim(),
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
				tableau.connectionName = "USGS Site Feed"; // This will be the data source name in Tableau
				tableau.submit(); // This sends the connector object to Tableau
			} else {
				$('#errorMsg').html("Enter valid dates. For example, 2016-05-08.");
			}
		});
	});
})();
