var UI = require('ui');
//var Vibe = require('ui/vibe');
// noinspection NpmUsedModulesInstalled
var Vector2 = require('vector2');
// noinspection NpmUsedModulesInstalled
var ajax    = require('ajax');
var Accel   = require('ui/accel');

var Settings   = require('settings');
var Clay       = require('clay');
var clayConfig = require('config');
var clay       = new Clay(clayConfig);

//global variables
var currentPosition = {};
var player          = 0;//2 = looping hole 2
var course          = {};
var holes           = {};
var hole            = 1;

var currentDistanceTarget; //The current target of the distances screen

var hazardNum = 0;//the current currentDistanceTarget Num
var options   = Settings.option();
var clubs     = [];

////////////SETTINGS///////////
//////////////////////////////
Pebble.addEventListener('showConfiguration', function () {
    var claySettings = JSON.parse(localStorage.getItem("clay-settings"));
    for (var key in claySettings) {
        if (claySettings.hasOwnProperty(key)) {
            if (key in options) {
                //console.log(key + " -> " + options[key]);
                claySettings[key] = options[key];
            }
        }
    }
    localStorage["clay-settings"] = JSON.stringify(claySettings);
    Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function (e) {

    if (e && !e.response) {
        return;
    }
    var dict = clay.getSettings(e.response);
    // Save the Clay settings to the Settings module.
    Settings.option(dict);
    options = Settings.option();
    console.log(JSON.stringify(options));

    setSettings();

});

function setSettings() {
    console.log("setSettings()");

    if (!('units' in options)) options.units = "meters";
    if (!('searchRadius' in options)) options.searchRadius = 50;
    if (!('swingDetection' in options)) options.swingDetection = true;
    if (!('largerText' in options)) options.largerText = false;
    if (!('invertColors' in options)) options.invertColors = false;

    //Settings the clubs
    clubs = [];
    for (var i = 1; i <= 14; i++) {
        var clubDistance = parseInt(options["club" + i + "_distance"]);
        var clubName     = options["club" + i + "_name"];
        if (clubDistance > 0 && clubName !== '') clubs.push({name: clubName, distance: clubDistance, setting_id: i});
    }
    //Sort clubs for large calculateDistance to small one
    clubs.sort(function (a, b) {
        return b.distance - a.distance;
        //return (a.calculateDistance < b.calculateDistance) ? 1 : ((b.calculateDistance < a.calculateDistance) ? -1 : 0);
    });
    for (var i = 1; i <= 14; i++) {
        if (i <= clubs.length) {
            options["club" + i + "_distance"] = clubs[i - 1].distance;
            options["club" + i + "_name"]     = clubs[i - 1].name;
        } else {
            options["club" + i + "_distance"] = 0;
            options["club" + i + "_name"]     = "";
        }

    }
    console.log(JSON.stringify(clubs));
    if (typeof clubsMenu === 'object') clubsMenuItems();
}

setSettings();

/////FUNCTIONS//////
//////////////////////
function calculateDistance(target) {
    var targetLatitude   = target.lat;
    var targetLongitude  = target.lon;
    var currentLatitude  = currentPosition.coords.latitude;
    var currentLongitude = currentPosition.coords.longitude;

    // noinspection LocalVariableNamingConventionJS
    var R    = 6371000; // Radius of the earth in km
    var dLat = (currentLatitude - targetLatitude) * 0.01745329251;  // deg2rad below
    var dLon = (currentLongitude - targetLongitude) * 0.01745329251;
    var a    = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((targetLatitude) * 0.01745329251) * Math.cos((currentLatitude) * 0.01745329251) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d    = R * c; // Distance in km

    if ('units' in options && options.units === "yards") d *= 1.0936133;
    if (d >= 1000) {
        return 999;
    } else {
        return Math.round(d);
    }
}

var clubNumSuggest = -1;

var fairwayFurthest = 0;//todo Make a user settings that the prefered club for longest hit on fairway is selected

function clubSuggest(distanceTo, type) {
    if (!options.enableClubSuggest || distanceTo === 0 || distanceTo === "") return ""; //If the calculateDistance is 0, suggest no club
    clubNumSuggest = -1;
    var correction = 0;
    if (typeof variable !== 'undefined') {
        // the variable is defined
        if (type === "carry") distanceTo += Math.max(distanceTo - 80, 0) * 0.3;
        if (type === "inFront") correction = 1;
    }

    //Loop trough array. Club selection will
    for (var i = 0; i < clubs.length; i++) {
        if (clubs[i].distance >= distanceTo) {
            clubNumSuggest = i + correction;
        }
    }

    //If no club was suggested, the target is further than the biggest calculateDistance
    if (clubNumSuggest === -1) {
        if (calculateDistance(holes[hole].teeBoxes[0]) < 50) {
            clubNumSuggest = 0;
        } else {
            clubNumSuggest = fairwayFurthest;
        }
    }

    clubNumSuggest += correction;//If we have to stay in fron 1 club less is used.
    return clubs[clubNumSuggest].name;
}

////////Swing detection////
Accel.on('tap', function (e) {
    if (options.swingDetection) {
        //if speed is zero for a while
        if (e.axis === 'x' && e.direction === -1 && currentPosition.coords.speed < 0.5) {
            //console.log("swing detected");
            startTracking();
        }
    }
});

////////Settings warning menu///////////
///////////////////////////////
var settingAlert = new UI.Window({status: false, backgroundColor: 'black', color: 'white'});

var settingAlertText = new UI.Text({
    position: new Vector2(0, 0),
    size:     new Vector2(144, 168),
    text:     "Open the pebble app to update your settings.",
    color:    'white',
    font:     'gothic-28-bold'
});

settingAlert.add(settingAlertText);

////////Course menu///////////
///////////////////////////////
var coursesFound    = [];
var courseResultNum = 0;
var courseSelected  = 0;
var courseWindow    = new UI.Window({
    status:          false,
    backgroundColor: 'white',
    color:           'black',
    action:          {up: 'images/up_arrow.png', down: 'images/down_arrow.png', select: 'images/play.png'}
});

var courseName = new UI.Text({
    position: new Vector2(0, 0),
    size:     new Vector2(114, 84),
    text:     "Loading...",
    color:    'black',
    font:     'gothic-28-bold'

});


var courseHoleCount = new UI.Text({
    position: new Vector2(0, 108),
    size:     new Vector2(114, 28),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'

});

new UI.Text({
    position: new Vector2(0, 136),
    size:     new Vector2(114, 28),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'

});
courseWindow.add(courseName);
courseWindow.add(courseHoleCount);

function updateCourseWindow() {
    course = coursesFound[courseResultNum];
    /*
    var courseDistance=course.calculateDistance+"km";
    if(options.units=="yards") courseDistance=(course.calculateDistance*0.621)+"mi";
    */
    courseName.text(course.name);
    courseHoleCount.text(course.holeCount + " holes");
}


courseWindow.on('click', "up", function () {
    courseResultNum--;
    if (courseResultNum < 0) {
        courseResultNum = coursesFound.length - 1;
    }
    updateCourseWindow();
});

courseWindow.on('click', "down", function () {
    courseResultNum++;
    if (courseResultNum == coursesFound.length) {
        courseResultNum = 0;
    }
    updateCourseWindow();
});

courseWindow.on('click', 'select', function () {
    courseSelected = 1;


    holes = course.holes;
    console.log(JSON.stringify(course));
    hole                      = 0;
    var closestDistanceToHole = 999;
    for (var i = 1; i <= course.holeCount; i++) {
        if (calculateDistance(holes[i].teeBoxes[0]) < closestDistanceToHole) {
            hole                  = i - 1;//because nextItem will ++
            closestDistanceToHole = calculateDistance(holes[i].teeBoxes[0]);
        }
    }
    //console.log("Hole selected after course select: "+(hole+1));
    hazardNum = -2;//becayse nextItem will ++ and negative holeNum will go to next hole.

    nextItem();
    //console.log(hole);

    distanceWindow.show();
});

//Course tees
var teeMenu = new UI.Menu({
    sections: [{
        title: 'Select tee',
        items: []
    }]
});


//////HOME WINDOW/////////
////////////////////////////
var homeWindow = new UI.Card({title: 'Welcome!', subtitle: 'Retrieving GPS..', body: '..'});
homeWindow.on('click', function () {
    courseWindow.show();
});
homeWindow.show();

//////DISTANCe WINDOW/////////
//////////////////////////
var distanceWindow = new UI.Window({status: false, backgroundColor: 'white'});


var holeNumber = new UI.Text({
    position:        new Vector2(0, 0),
    size:            new Vector2(144, 35),
    text:            "1",
    color:           'white',
    font:            'gothic-28-bold',
    backgroundColor: "black",
    textAlign:       'left',
});

var hazardDescriptionText = new UI.Text({
    position: new Vector2(0, 60),
    size:     new Vector2(144, 57),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'
});

var distanceBackText = new UI.Text({
    position: new Vector2(0, 30),
    size:     new Vector2(65, 30),
    text:     "",
    color:    'black',
    font:     'bitham-30-black'
});

var clubSuggestBack = new UI.Text({
    position: new Vector2(70, 30),
    size:     new Vector2(74, 28),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'

});

var distanceMiddleText = new UI.Text({
    position:        options.largerText ? new Vector2(0, 63) : new Vector2(0, 60),
    size:            options.largerText ? new Vector2(144, 61) : new Vector2(65, 30),
    text:            "",
    textAlign:       "center",
    color:           options.invertColors ? 'white' : 'black',
    backgroundColor: options.invertColors ? "black" : 'white',
    font:            options.largerText ? 'roboto-bold-subset-49' : 'bitham-30-black'
});

var clubSuggestMiddle = new UI.Text({
    position: new Vector2(70, 60),
    size:     new Vector2(74, 28),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'

});

var distanceFrontText = new UI.Text({
    position: options.largerText ? new Vector2(0, 120) : new Vector2(0, 90),
    size:     new Vector2(65, 30),
    text:     "",
    color:    'black',
    font:     'bitham-30-black'
});

var clubSuggestFront = new UI.Text({
    position: options.largerText ? new Vector2(70, 120) : new Vector2(70, 90),
    size:     new Vector2(74, 28),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'

});

var distanceExtraText = new UI.Text({
    position: options.largerText ? new Vector2(0, 139) : new Vector2(0, 120),
    size:     new Vector2(144, 30),
    text:     "",
    color:    'black',
    font:     'gothic-28-bold'
});


distanceWindow.add(holeNumber);
distanceWindow.add(hazardDescriptionText);
distanceWindow.add(distanceFrontText);
distanceWindow.add(clubSuggestFront);
distanceWindow.add(distanceMiddleText);
distanceWindow.add(clubSuggestMiddle);
distanceWindow.add(distanceBackText);
distanceWindow.add(clubSuggestBack);
distanceWindow.add(distanceExtraText);

distanceWindow.on('click', "up", function () {
    nextItem();
});
distanceWindow.on('longClick', "up", function () {
    hazardNum = holes[hole].items.length - 1;//Go to the green
    nextItem();
});


distanceWindow.on('click', "down", function () {
    previousItem();
});
distanceWindow.on('longClick', "down", function () {
    hazardNum = 0;
    previousItem();
});

function nextItem() {
    hazardNum++;
    //console.log("next currentDistanceTarget hole:"+hole+" hazard:"+hazardNum);

    if (hazardNum < 0 || hazardNum > holes[hole].items.length) {
        //next hole
        hole++;
        if (hole > course.holeCount) hole = 1;//There is no hole 19
        //console.log("next hole: "+hole);
        hazardNum = 0;
        /*


        for(var i=hazardNum;i<holes[hole].items.length;i++){
            var hazard = holes[hole].items[i];
            hazardNum=i;
            //console.log("checking hazard: "+JSON.stringify(hazard));
            if(options.skipBunkers&&hazard.currentDistanceTarget=="bunker"){
                //console.log("skipped bunker:");
                continue;
            }

            if(calculateDistance(hazard.back)>=options.skipHazard){
                //console.log("hazard selected "+i);
                i=99;//stop the for loop
            }
        }
        */
    }

    ////console.log(JSON.stringify(holes[hole]));
    //console.log(hazardNum+"==="+holes[hole].items.length+' evaluates '+(hazardNum===holes[hole].items.length));
    if (hazardNum < holes[hole].items.length && hazardNum >= 0) { //valid hazard num
        currentDistanceTarget = holes[hole].items[hazardNum];
        //console.log("next hazard");
    } else {//green
        currentDistanceTarget = holes[hole].green;
    }
    //console.log(JSON.stringify(currentDistanceTarget));
    holeNumber.text(hole + " " + currentDistanceTarget.type);
    updateDistanceWindow();
}

function previousItem() {
    hazardNum--;
    if (hazardNum < 0) {
        hole--;

        if (hole === 0) hole = course.holeCount;
        currentDistanceTarget = holes[hole].green;
        hazardNum             = holes[hole].items.length;
    } else {
        currentDistanceTarget = holes[hole].items[hazardNum];
    }
    console.log("hole " + hole);
    console.log("hazard " + hazardNum);
    console.log("holes " + JSON.stringify(holes));
    console.log("currentDistanceTarget " + JSON.stringify(currentDistanceTarget));

    holeNumber.text(hole + " " + currentDistanceTarget.type);
    updateDistanceWindow();
}

distanceWindow.on('click', "select", function () {
    startTracking();
});

function startTracking() {
    //If no club is tracked
    console.log("start tracking. tracking club:" + trackingClub);
    if (trackingClub < 0) {
        if ("middle" in currentDistanceTarget) {
            clubSuggest(calculateDistance(currentDistanceTarget.middle));
        } else {
            clubSuggest(calculateDistance(currentDistanceTarget.front));
        }
        console.log("suggest club: " + clubNumSuggest);
        clubsMenu.selection(0, clubNumSuggest);

        trackingFrom.lat = currentPosition.coords.latitude;
        trackingFrom.lon = currentPosition.coords.longitude;
        clubsMenu.show();

    } else {
        trackingWindow.show();
        updateDistanceWindow();
    }
}


function updateDistanceWindow() {
    //Auto hole advaces
    //ToDo better to check wether the person was on the green and when moving away go to next hole


    //Go to next hole if its close.
    if (hole + 1 in holes && calculateDistance(holes[hole + 1].teeBoxes[0]) < options.holeAdvance) {
        hazardNum = 99;//because hazardNum>items.length will go next hole.
        nextItem();
        return;
    }
    //Todo Go to the next hazard if its close
    //if you pass a hazard.. Going back to a previous hole is blocked this way

    var distanceFront  = 0;
    var distanceMiddle = 0;
    var distanceBack   = 0;

    if ('front' in currentDistanceTarget) {
        distanceFront = calculateDistance(currentDistanceTarget.front);
    }
    if ('middle' in currentDistanceTarget) {
        distanceMiddle = calculateDistance(currentDistanceTarget.middle);
    }
    if ('back' in currentDistanceTarget) {
        distanceBack = calculateDistance(currentDistanceTarget.back);
    }

    //manualy set front and back of green
    if (currentDistanceTarget.type === "green" && !('front' in currentDistanceTarget) && !('back' in currentDistanceTarget)) {
        distanceFront = Math.min(distanceMiddle - 10, 999);
        distanceBack  = Math.min(distanceMiddle + 10, 999);
    }

    distanceFrontText.text(distanceFront);
    distanceBackText.text(distanceBack);
    distanceMiddleText.text(distanceMiddle);


    clubSuggestBack.text(clubSuggest(distanceBack));
    clubSuggestMiddle.text(clubSuggest(distanceMiddle));
    clubSuggestFront.text(clubSuggest(distanceFront));


    if (trackingClub >= 0) {
        var distanceTracked = calculateDistance(trackingFrom);
        distanceExtraText.text(clubs[trackingClub].name + " hit: " + distanceTracked);

        trackingDistanceText.text("hit: " + distanceTracked);
        clubTracked.text(clubs[trackingClub].name);
    } else {
        //show something else in the extra tekst
    }
}

////////CLUBS menu///////////
///////////////////////////////
var trackingClub  = -2;
var trackingFrom  = {lat: 0, lon: 0};
var clubMenuItems = [];

var clubsMenu = new UI.Menu({
    sections: [{
        title: 'Select Club',
        items: clubMenuItems
    }]
});

function clubsMenuItems() {
    console.log("bulding club menu");
    clubMenuItems = [];
    for (var i = 0; i < clubs.length; i++) {
        clubMenuItems.push({title: clubs[i].name + " " + clubs[i].distance, id: i});
        console.log(clubs[i].name + " " + clubs[i].distance);
    }
    clubsMenu.items(0, clubMenuItems);
}

clubsMenuItems();


clubsMenu.on('select', function (e) {
    trackingClub = e.item.id;
    clubsMenu.hide();
    distanceExtraText.text(clubs[trackingClub].name + ": 0");
});

//There was a false detection
clubsMenu.on('click', 'back', function () {
    trackingClub = -2;
    distanceExtraText.text("");
    clubsMenu.hide();
});


//////trackingWindow WINDOW/////////
//////////////////////////
var trackingWindow = new UI.Window({status: false, backgroundColor: 'white'});

var saveText = new UI.Text({
    position:  new Vector2(0, 0),
    size:      new Vector2(144, 35),
    text:      'good',
    color:     'black',
    font:      'gothic-28-bold',
    textAlign: "right"
});

var clubTracked = new UI.Text({
    position:  new Vector2(0, 40),
    size:      new Vector2(144, 30),
    text:      "Driver",
    color:     'black',
    font:      'bitham-30-black',
    textAlign: "center",
});

var trackingDistanceText = new UI.Text({
    position:  new Vector2(0, 70),
    size:      new Vector2(144, 57),
    text:      "208M",
    color:     'black',
    font:      'bitham-30-black',
    textAlign: "center",
});

var discardText = new UI.Text({
    position:  new Vector2(0, 120),
    size:      new Vector2(144, 30),
    text:      "bad->",
    color:     'black',
    textAlign: "right",
    font:      'gothic-28-bold'
});


trackingWindow.add(saveText);
trackingWindow.add(clubTracked);
trackingWindow.add(trackingDistanceText);
trackingWindow.add(discardText);

trackingWindow.on('click', "up", function () {
    var distanceTracked = calculateDistance(trackingFrom);
    Settings.option("club" + clubs[trackingClub].setting_id + "_distance", distanceTracked);
    clubs[trackingClub].calculateDistanceFromCurrentPosition = distanceTracked;
    //console.log("calculateDistance for "+clubs[trackingClub].name+" with id "+"club"+clubs[trackingClub].setting_id+"_distance"+" set to "+distanceTracked);
    trackingClub                                             = -2;
    trackingWindow.hide();
    distanceExtraText.text("");
    clubsMenuItems();
});
trackingWindow.on('click', "down", function () {
    trackingClub = -2;
    trackingWindow.hide();
    distanceExtraText.text("");
});


//GPS SETTINGS////
/////////////////
var GPSFix = 0;

function newPosition(pos) {
    currentPosition = pos;
    if (courseSelected) updateDistanceWindow();

    //only for first setup
    if (!GPSFix) getCourses();
    GPSFix = 1;

}

function getCourses() {
    homeWindow.subtitle("GPS found, searching for courses");
    //Get the course

    ajax({
            url:  'https://fitbitgolf.com/apiv2.php?radius=' + options.searchRadius + '&lat=' + currentPosition.coords.latitude + '&lon=' + currentPosition.coords.longitude,
            type: 'json'
        },
        function (data) {
            if (data.length === 0) {
                //console.log("no courses found");
                homeWindow.subtitle("No courses found. You can add your course within 10 minutes on fitbitgolf.com");
            } else {

                coursesFound = data;
                //console.log(JSON.stringify(coursesFound));
                courseWindow.show();
                updateCourseWindow();
                homeWindow.title("Close app?");
                homeWindow.subtitle("Press back to close the app");
            }
        });

}


//GETTING GPS INFO CONTINIOUSLY
var watchID;
var geoLoc;

function errorHandler(err) {
    if (err.code == 1) { homeWindow.body("Error: Access is denied!"); } else if (err.code == 2) { homeWindow.body("Error: Position is unavailable!"); } else { homeWindow.body("Error: Position is unavailable!"); }
}


function getLocationUpdate() {
    if (navigator.geolocation) {
        var options = {enableHighAccuracy: true, timeout: 50000, maximumAge: 2000};
        geoLoc      = navigator.geolocation;
        watchID     = geoLoc.watchPosition(newPosition, errorHandler, options);

    } else {
        homeWindow.body("Sorry, browser does not support geolocation!");
    }
}

if (player) {
    //currentPosition = {timestamp:1468325280459,  coords: {   latitude:52.5266952217286,   longitude:4.92219552397728,   speed:0,   heading:178  }};//hole 1
    var position1 = {coords: {latitude: 52.525872, longitude: 4.923372}};//hole 2 afslagplaats
    var position2 = {coords: {latitude: 52.524632, longitude: 4.922341}};//hole 2 voor water
    var position3 = {coords: {latitude: 52.524060, longitude: 4.921954}};//net voor bij water
    var position4 = {coords: {latitude: 52.523357, longitude: 4.921587}};//green
    var position5 = {coords: {latitude: 52.523356, longitude: 4.921702}};//in de hole

    var position  = position1;
    var positions = [position1, position2, position3, position4, position5];
    //course = {"course_id":"24","name":"Beemster 9 holes","lat":"52.5273514","lon":"4.9219222","adres":"volgerweg 42, beemster","holes":"9","course_rating":"62.1","slope_rating":"100","positions":"{\"0\":{\"address\":\"volgerweg 42, beemster\"},\"1\":{\"tee\":{\"yellow\":{\"lat\":52.526757231367995,\"lon\":4.92224782705307},\"red\":{\"lat\":52.52657446586387,\"lon\":4.922172725200653}},\"green\":{\"front\":{\"lat\":52.525500703168284,\"lon\":4.922215640544891},\"middle\":{\"lat\":52.52539626284275,\"lon\":4.9222531914711},\"back\":{\"lat\":52.525282030952354,\"lon\":4.922280013561249}},\"dogleg\":{},\"items\":[]},\"2\":{\"tee\":{\"yellow\":{\"lat\":52.525866242352066,\"lon\":4.923454821109772},\"red\":{\"lat\":52.525614934489994,\"lon\":4.923304617404938}},\"green\":{\"front\":{\"lat\":52.52346080811934,\"lon\":4.921769052743912},\"middle\":{\"lat\":52.52336125881669,\"lon\":4.921728819608688},\"back\":{\"lat\":52.52329924438294,\"lon\":4.921667128801346}},\"dogleg\":{},\"items\":[{\"currentDistanceTarget\":\"water\",\"distanceToHole\":136,\"front\":{\"lat\":52.52456073129846,\"lon\":4.922152608633041},\"back\":{\"lat\":52.5243926439308,\"lon\":4.92205336689949}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":106,\"front\":{\"lat\":52.52430288827689,\"lon\":4.921986311674118},\"back\":{\"lat\":52.52414948728015,\"lon\":4.9218253791332245}}]},\"3\":{\"tee\":{\"yellow\":{\"lat\":52.52302997016847,\"lon\":4.921625554561615},\"red\":{\"lat\":52.52311483252328,\"lon\":4.921346604824066}},\"green\":{\"front\":{\"lat\":52.523969974795214,\"lon\":4.918321073055267},\"middle\":{\"lat\":52.52394386382721,\"lon\":4.918122589588165},\"back\":{\"lat\":52.52394712769907,\"lon\":4.917945563793182}},\"dogleg\":{\"middle\":{\"lat\":52.52394549576315,\"lon\":4.918925911188126}},\"items\":[{\"currentDistanceTarget\":\"water\",\"distanceToHole\":124,\"front\":{\"lat\":52.52361421152112,\"lon\":4.919870048761368},\"back\":{\"lat\":52.52362073931355,\"lon\":4.91980567574501}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":62,\"front\":{\"lat\":52.52408094623613,\"lon\":4.91901308298111},\"back\":{\"lat\":52.52414948728015,\"lon\":4.918669760227203}},{\"currentDistanceTarget\":\"water\",\"distanceToHole\":36,\"front\":{\"lat\":52.52386553083003,\"lon\":4.918637573719025},\"back\":{\"lat\":52.52389980153348,\"lon\":4.9183908104896545}}]},\"4\":{\"tee\":{\"yellow\":{\"lat\":52.524554203645685,\"lon\":4.918491393327713},\"red\":{\"lat\":52.524678228882216,\"lon\":4.918700605630875}},\"green\":{\"front\":{\"lat\":52.52530161358323,\"lon\":4.919585734605789},\"middle\":{\"lat\":52.525368520839535,\"lon\":4.919706434011459},\"back\":{\"lat\":52.52545664243623,\"lon\":4.919867366552353}},\"dogleg\":{},\"items\":[{\"currentDistanceTarget\":\"water\",\"distanceToHole\":45,\"front\":{\"lat\":52.525066621436416,\"lon\":4.919255822896957},\"back\":{\"lat\":52.5251008912028,\"lon\":4.91931214928627}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":22,\"front\":{\"lat\":52.52517432632642,\"lon\":4.919629991054535},\"back\":{\"lat\":52.52525592076425,\"lon\":4.919733256101608}}]},\"5\":{\"tee\":{\"yellow\":{\"lat\":52.52471249895162,\"lon\":4.9183304607868195},\"red\":{\"lat\":52.52497523526204,\"lon\":4.918469935655594}},\"green\":{\"front\":{\"lat\":52.52759761653165,\"lon\":4.920387715101242},\"middle\":{\"lat\":52.52771184239995,\"lon\":4.920473545789719},\"back\":{\"lat\":52.5278407540945,\"lon\":4.920524507761002}},\"dogleg\":{},\"items\":[{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":203,\"front\":{\"lat\":52.52604574708751,\"lon\":4.919237047433853},\"back\":{\"lat\":52.526186086642454,\"lon\":4.919384568929672}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":181,\"front\":{\"lat\":52.5261289717614,\"lon\":4.919853955507278},\"back\":{\"lat\":52.52627747029761,\"lon\":4.919945150613785}}]},\"6\":{\"tee\":{\"yellow\":{\"lat\":52.52820301024847,\"lon\":4.920444041490555},\"red\":{\"lat\":52.52823727756781,\"lon\":4.920629113912582}},\"green\":{\"front\":{\"lat\":52.527834226929194,\"lon\":4.921109229326248},\"middle\":{\"lat\":52.52774937369183,\"lon\":4.921246021986008},\"back\":{\"lat\":52.52769226084362,\"lon\":4.921342581510544}},\"dogleg\":{},\"items\":[]},\"7\":{\"tee\":{\"yellow\":{\"lat\":52.527357741241296,\"lon\":4.92119774222374},\"red\":{\"lat\":52.52713581463586,\"lon\":4.920991212129593}},\"green\":{\"front\":{\"lat\":52.52480878138444,\"lon\":4.920247569680214},\"middle\":{\"lat\":52.524711682997875,\"lon\":4.920232817530632},\"back\":{\"lat\":52.52462682372797,\"lon\":4.920181855559349}},\"dogleg\":{},\"items\":[{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":140,\"front\":{\"lat\":52.52593478061035,\"lon\":4.9207256734371185},\"back\":{\"lat\":52.5257960721197,\"lon\":4.9206773936748505}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":114,\"front\":{\"lat\":52.52574058860077,\"lon\":4.920234829187393},\"back\":{\"lat\":52.5256084069939,\"lon\":4.920170456171036}},{\"currentDistanceTarget\":\"water\",\"distanceToHole\":21,\"front\":{\"lat\":52.524896904104104,\"lon\":4.920293837785721},\"back\":{\"lat\":52.52484468325452,\"lon\":4.920269697904587}}]},\"8\":{\"tee\":{\"yellow\":{\"lat\":52.52452319728183,\"lon\":4.918724745512009},\"red\":{\"lat\":52.5244807674853,\"lon\":4.918984919786453}},\"green\":{\"front\":{\"lat\":52.523801885166975,\"lon\":4.921052902936935},\"middle\":{\"lat\":52.523730079692825,\"lon\":4.921165555715561},\"back\":{\"lat\":52.523610947624505,\"lon\":4.921262115240097}},\"dogleg\":{},\"items\":[{\"currentDistanceTarget\":\"water\",\"distanceToHole\":85,\"front\":{\"lat\":52.524177230053304,\"lon\":4.920154362916946},\"back\":{\"lat\":52.52415438306491,\"lon\":4.920221418142319}}]},\"9\":{\"tee\":{\"yellow\":{\"lat\":52.52414459149484,\"lon\":4.921390861272812},\"red\":{\"lat\":52.524376324734654,\"lon\":4.921377450227737}},\"green\":{\"front\":{\"lat\":52.52681108177325,\"lon\":4.921479374170303},\"middle\":{\"lat\":52.52693020516248,\"lon\":4.921514242887497},\"back\":{\"lat\":52.527007716783345,\"lon\":4.921528324484825}},\"dogleg\":{\"middle\":{\"lat\":52.52621545998091,\"lon\":4.921216517686844}},\"items\":[{\"currentDistanceTarget\":\"water\",\"distanceToHole\":125,\"front\":{\"lat\":52.52582544571901,\"lon\":4.921193718910217},\"back\":{\"lat\":52.52623014664278,\"lon\":4.921423047780991}},{\"currentDistanceTarget\":\"bunker\",\"distanceToHole\":124,\"front\":{\"lat\":52.52581483858816,\"lon\":4.921632930636406},\"back\":{\"lat\":52.5259633381864,\"lon\":4.921516254544258}}]}}","calculateDistance":"86.9"};
    getCourses();
    if (player == 2) {
        player = 0;
        setInterval(function () {
            position = positions[player];
            if (courseSelected) updateDistanceWindow();
            player++;
            if (player == positions.length) player = 0;
        }, 5000);
    } else {
        position = positions[0];
    }
    distanceWindow.show();
} else {

    getLocationUpdate();
}

/*
var Accel = require('ui/accel');
Accel.on('tap', function(e) {
  //console.log('Tap event on axis: ' + e.axis + ' and direction: ' + e.direction);
});

Accel.peek(function(e) {
  //console.log('Current acceleration on axis are: X=' + e.accel.x + ' Y=' + e.accel.y + ' Z=' + e.accel.z);
});

Accel.on('data', function(e) {
  //console.log('Just received ' + e.samples + ' from the accelerometer.');
});
*/
