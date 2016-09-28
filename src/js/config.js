module.exports = [
	{
		"type": "heading",
		"defaultValue": "Golf GPS Settings"
	},
	{
		"type": "text",
		"defaultValue": "Feedback can be sent to pieteroskam@gmail.com"
	},
	{
		"type": "section",
		"items": [
			{
				"type": "heading",
				"defaultValue": "User settings"
			},
			{
				"type": "input",
				"appKey": "email",
				"defaultValue": "",
				"label": "Email Address",
				"attributes": {
					"placeholder": "eg: name@domain.com",
					"type": "email"
				}
			},
			{
				"type": "select",
				"appKey": "units",
				"defaultValue": "meters",
				"label": "Units",
				"options": [
					{ 
						"label": "meters", 
						"value": "meters" 
					},
					{ 
						"label": "yards",
						"value": "yards" 
					}
				]
			},
			{
				"type": "submit",
				"defaultValue": "Save"
			}
		]
	},
	{
		"type": "section",
		"items": [
			{
				"type": "heading",
				"defaultValue": "App settings"
			},
			{
				"type": "toggle",
				"appKey": "enableClubSuggest",
				"label": "Club suggestions",
				"defaultValue": 1
			},
			{
				"type": "slider",
				"appKey": "holeAdvance",
				"defaultValue": 30,
				"label": "Auto hole advance",
				"description": "Automatically go the next hole when tee closer than:",
				"min": 10,
				"max": 100
			},
			{
				"type": "slider",
				"appKey": "searchRadius",
				"defaultValue": 30,
				"label": "Golf course search radius (km)",
				"description": "Golf courses within this distance will be loaded",
				"min": 1,
				"max": 100
			},
			{
				"type": "slider",
				"appKey": "skipHazard",
				"defaultValue": 30,
				"label": "Don't show hazards closer than(m)",
				"min": 1,
				"max": 300
			},
			{
				"type": "toggle",
				"appKey": "skipBunkers",
				"label": "Skip Bunkers",
				"defaultValue": 0
			},
			{
				"type": "submit",
				"defaultValue": "Save"
			}
		]
	},
	{
		"type": "section",
		"items": [
			{
				"type": "heading",
				"defaultValue": "Clubs"
			},
			{
				"type": "text",
				"defaultValue": "Set distance value to 0 if you don't have the club"
			},
			{
				"type": "input",
				"appKey": "club1_name",
				"label": "Club 1 name",
				"defaultValue": "Driver"
			},
			{
				"type": "input",
				"appKey": "club1_distance",
				"defaultValue": 240,
				"label": "club 1 distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club2_name",
				"label": "Club 2 name",
				"defaultValue": "Wood 3"
			},
			{
				"type": "input",
				"appKey": "club2_distance",
				"defaultValue": 0,
				"label": "club 2 distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club3_name",
				"label": "Club 3 name",
				"defaultValue": "Hybrid 4"
			},
			{
				"type": "input",
				"appKey": "club3_distance",
				"defaultValue": 200,
				"label": "club 3 distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club4_name",
				"label": "Club 4 name",
				"defaultValue": "3 iron"
			},
			{
				"type": "input",
				"appKey": "club4_distance",
				"defaultValue": 180,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club5_name",
				"label": "Club 5 name",
				"defaultValue": "4 iron"
			},
			{
				"type": "input",
				"appKey": "club5_distance",
				"defaultValue": 170,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club6_name",
				"label": "Club 6 name",
				"defaultValue": "5 iron"
			},
			{
				"type": "input",
				"appKey": "club6_distance",
				"defaultValue": 160,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club7_name",
				"label": "Club 7 name",
				"defaultValue": "6 iron"
			},
			{
				"type": "input",
				"appKey": "club7_distance",
				"defaultValue": 150,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club8_name",
				"label": "Club 8 name",
				"defaultValue": "7 iron"
			},
			{
				"type": "input",
				"appKey": "club8_distance",
				"defaultValue": 140,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club9_name",
				"label": "Club 9 name",
				"defaultValue": "8 iron"
			},
			{
				"type": "input",
				"appKey": "club9_distance",
				"defaultValue": 130,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club10_name",
				"label": "Club 10 name",
				"defaultValue": "9 iron"
			},
			{
				"type": "input",
				"appKey": "club10_distance",
				"defaultValue": 120,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club11_name",
				"label": "Club 11 name",
				"defaultValue": "PW"
			},
			{
				"type": "input",
				"appKey": "club11_distance",
				"defaultValue": 100,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club12_name",
				"label": "Club 12 name",
				"defaultValue": "SW"
			},
			{
				"type": "input",
				"appKey": "club12_distance",
				"defaultValue": 80,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club13_name",
				"label": "Club 13 name",
				"defaultValue": "Putter"
			},
			{
				"type": "input",
				"appKey": "club13_distance",
				"defaultValue": 25,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
			{
				"type": "input",
				"appKey": "club14_name",
				"label": "Club 1 name",
				"defaultValue": "..."
			},
			{
				"type": "input",
				"appKey": "club14_distance",
				"defaultValue": 0,
				"label": "distance",
				"attributes": {
					"type": "number"
				}
			},
		]
			},
			{
			"type": "submit",
			"defaultValue": "Save"
			}
		];