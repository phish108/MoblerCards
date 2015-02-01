/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**	THIS COMMENT MUST NOT BE REMOVED
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

/**
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Christian Glahn
 */

/**
 *Global properties/variables that show the number of values
 *that are passed and returned during the execution of the queries
 *in the various statistics sub models
 *
 *@property SUBMODEL_QUERY_ONE
 *@default 1, it applies to BestDayScore model
 *
 *@property SUBMODEL_QUERY_ONE
 *@default 3, it applies to AverageScore, AverageSpeed, HandledCards, CardBurner models
 *
 *@property SUBMODEL_QUERY_ONE
 *@default 4, it applies to Progress Model
 **/
var SUBMODEL_QUERY_ONE = 1;
var SUBMODEL_QUERY_THREE = 3;
var SUBMODEL_QUERY_FOUR = 4;

/**
 *Global variable that stores the
 *duration of a day in miliseconds.

 *@property TWENTY_FOUR_HOURS
 *@default 1000 * 60 * 60 * 24
 **/
var TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

var $ = window.$;

/**
 * @class StatisticsModel
 * This model holds the statistics for a course
 * @constructor
 * It sets and initializes basic properties such as:
 *  - the current course Id
 *  - the first active and last active day
 *  - the time that data were last sent to the server
 *  - local database
 * It loads data from the server if the user is logged in
 * It listens to an event that is triggered when achievements are checked whether they have been reached or not
 * @param {String} controller
 */
function StatisticsModel(controller) {
    var self = this;
//    var featuredContent_id = FEATURED_CONTENT_ID;
    // FIXME Get Rid off the Featured Content Alltogether
    // var featuredContent_id = -1;

    self.controller = controller;
    //initialization of model's variables
    this.lastSendToServer = 0;
    this.clickOutOfStatisticsIcon = 0; // FIXME move UI Statements into views
    this.db = window.openDatabase('ISNLCDB', '1.0', 'ISN Learning Cards Database', 100000);
    this.currentCourseId = -1;
    this.firstActiveDay = 0;
    this.lastActiveDay = 0;
    this.checkLocalStorage();
    this.cardBurner = 0;

    /**
     * Check if time dependent achievements have been accomplished.
     *
     * It is triggered after a new entry has been added to the local statistics table. We need immediately
     * to check the cardBurner Achievement because it is time dependent and we want to give the achievement
     * when the learner has reached it. This also applies to all other time dependent achievements (which
     * do not exist yet).
     *
     * @event checkachievements
     * @param: a callback function that
     * FIXME: the call back is undefined
     **/
    $(document).bind("checkachievements", function (p, courseId) {
        self.controller.models.cardburner.calculateValue(courseId);
    });
}

/**
 * check the localstorage if the the data is already loaded
 * if the the data is not loaded but the user is logged in, then loadFromServer
 */
StatisticsModel.prototype.checkLocalStorage = function () {
    var self = this;
    if (self.controller.getConfigVariable("statisticsLoaded") === false && self.controller.getLoginState()) {
        console.log("statistics to be loaded from server");
        self.loadFromServer();
    }
};

/**
 * Sets the current course id and starts the calculations if the statistics are
 * already loaded locally.Otherwise it triggers the event that all calculations are done
 * in order to navigate to the statistics view where a "loading statistics" message will be
 * displayed to the user.
 * @prototype
 * @function setCurrentCourseId
 */
StatisticsModel.prototype.setCurrentCourseId = function (courseId) {
    if (this.currentCourseId !== courseId) {
        this.currentCourseId = undefined;

        // if the course id is one of the free content
        // OR if the authenticated user has access to the course id

        this.currentCourseId = courseId;
        console.log("course-id: " + courseId);

        // uncomment the following line for debugging purposes
        // this.getAllDBEntries();

        // WHY IS THE FOLLOWING LINE
        this.controller.models.questionpool.loadData(courseId);

        console.log("statistics are loaded? " + (this.controller.getConfigVariable("statisticsLoaded") ? "yes2" : "no2"));

        //if statistics are loaded
        if ((this.controller.getConfigVariable("statisticsLoaded") === true) || this.currentCourseId === "fd") {
            this.getFirstActiveDay(courseId);
        } else {
            // this case is only used if the statistics are not yet loaded from the server
            // so the controller can move to the statistics view that will then show a nice
            // message to the user
            $(document).trigger("allstatisticcalculationsdone");
        }
    } else {
        $(document).trigger("allstatisticcalculationsdone");
    }
    // endif the user has access to the course id
};

/**
 * checks the existence and validity
 * of the course id
 * @prototype
 * @function dataAvailable
 */
StatisticsModel.prototype.dataAvailable = function () {
    if (this.currentCourseId) {
        return true;
    }
    return false;
};


/**
 * Gets the timestamp of the first activity
 * And then start checking the last activity
 * @prototype
 * @function getFirstActiveDay
 */
StatisticsModel.prototype.getFirstActiveDay = function (courseId) {
    console.log("enters first active day");
    var self = this;
    var row;
    this.queryDB('SELECT min(day) as firstActivity FROM statistics WHERE course_id=? AND duration != -100', [self.currentCourseId],
        function dataSelectHandler(transaction, results) {
            // if we retrieve statistics data for a specific course,
            // for the earliest(min) day on which these data were tracked
            if (results.rows.length > 0) {
                row = results.rows.item(0);
                console.log("first active day: " + JSON.stringify(row));
                if (row.firstActivity) {
                    console.log("do we enter with null?");
                    self.firstActiveDay = row.firstActivity;
                } else {
                    self.firstActiveDay = (new Date()).getTime();
                }
            }
            // the first time we launch the app
            // we dont get any min day, because we don't have
            // any statistics data.
            // so we set the current time to be the first active day
            else {
                self.firstActiveDay = (new Date()).getTime();
                console.log("get a new first active day");
            }
            //check if there was any activity until one day(=24hours)
            //before  the current time
            self.checkActivity((new Date()).getTime() - TWENTY_FOUR_HOURS, courseId);
        });
};

/**
 * Sets the last active day
 * If no activity is found, the last activity is set to the
 * current timestamp
 * @prototype
 * @function checkActivity
 *
 */
StatisticsModel.prototype.checkActivity = function (day, courseId) {
    var self = this;
    //if one day/24hours back from the current time
    //is more recent than the first active day
    if (day > self.firstActiveDay) {
        // count the statistics data for the last 24 hours before this day
        this.queryDB('SELECT count(id) as counter FROM statistics WHERE course_id=? AND duration != -100 AND day>=? AND day<=?', [self.currentCourseId, (day - TWENTY_FOUR_HOURS), day],
            function dataSelectHandler(transaction, results) {
                //if statistics data are retrieved from the last 24 hours before this day
                if (results.rows.length > 0 && results.rows.item(0).counter !== 0) {
                    console.log("active day: " + day);
                    // then set this day to be the last active day
                    self.lastActiveDay = day;
                    self.calculateValues(courseId);
                }
                //if there was no activity in the past 24 hours
                //and if the previous day is not the first active day
                // check the activity of the pre-previous day
                else {
                    //continue checking the past activity
                    //by going each time 24 hours back
                    //until to reach the last active day
                    self.checkActivity(day - TWENTY_FOUR_HOURS, courseId);
                }
            });
    }
    //this is executed the first time we launch the app
    //the current day (day= new Date()).getTime() - TWENTY_FOUR_HOURS)
    //is not more recent than the first active day (day < first active day)
    else {
        //the last active day is set to be the current active day
        self.lastActiveDay = day;
        //we proceed and calculate the values
        //for the statistics metrics
        self.calculateValues(courseId);
    }
};

/**
 * Initializes all values that are needed for the calculations (executions of the queries)
 * of statistics metrics (statistiscs submodels)
 * @prototype
 * @function getCurrentValues
 * @param {Number} val, a variable that states the number of arguments that are passed in the query
 * 		   that is used for the calculation of the value for the specific statistics metric.
 * @return:{Array} retval, an array consisting of n=val items and contains the actual values that
 * 			are passed to the specific query
 */
StatisticsModel.prototype.getCurrentValues = function (val) {
    var timeNow = (new Date()).getTime();
    var time24hAgo = timeNow - TWENTY_FOUR_HOURS;
    var retval = [];
    switch (val) {
    case 1:
        retval = [this.currentCourseId];
        break;
    case 3:
        retval = [this.currentCourseId, time24hAgo, timeNow];
        break;
    default:
        retval = [this.currentCourseId, 1, time24hAgo, timeNow];
        break;
    }
    return retval;
};

/**
 * Get the values from the last active day. It is needed for the calculation of improvement
 * for some of the statistics metrics/models:
 * - Progress
 * - AverageScore
 * - AverageSpeed
 * - HandledCards
 * @prototype
 * @function getLastActiveValues
 * @param {Boolean} progressVal, it is passed as true to these statistics metrics that calculate improvement
 * @return {Array}, containing the values of the parameters of the query for the last active day
 *
 */
StatisticsModel.prototype.getLastActiveValues = function (progressVal) {
    var lastActiveDay24hBefore = this.lastActiveDay - TWENTY_FOUR_HOURS;
    if (!progressVal) {
        return [this.currentCourseId, lastActiveDay24hBefore, this.lastActiveDay];
    }
    return [this.currentCourseId, 1, lastActiveDay24hBefore, this.lastActiveDay];
};

/**
 * Calculates the statistics values for the various statistics metrics.
 * For some of them like: Progress, AverageScore, AverageSpeed HandledCardsimprovements it calculates also their improvement.
 * Additionally it calculates the achievements.
 * @prototype
 * @function calculateValues
 */
StatisticsModel.prototype.calculateValues = function (courseId) {
    var self = this;

    self.boolAllDone = 0;
    self.bestDay.calculateValue(courseId);
    self.handledCards.calculateValue(courseId);
    self.averageScore.calculateValue(courseId);
    self.averageSpeed.calculateValue(courseId);
    self.progress.calculateValue(courseId);

    // calculate the achievements
    self.stackHandler.calculateValue(courseId);
    self.checkAchievements(this.currentCourseId);
};



/**
 * It triggeres an event when all stastistics caluclations is done. The logic is
 * the following: After each statistics calculation is finished the boolAllDone variable
 * increases at one. When all  statistics calculations have been done, this
 * variable has counted 6 times. In this case, the event allstatisticcalculationsdone is triggered
 * @prototype
 * @function allCalculationsDone
 *
 */
StatisticsModel.prototype.allCalculationsDone = function (courseId) {
    console.log(" finished n=" + this.boolAllDone + " calculations");
    if (this.boolAllDone === 6) {
        $(document).trigger("allstatisticcalculationsdone", courseId);
    }
};

/**
 *Function for querying the database
 * @prototype
 * @function queryDB
 * @param query, values, cbResutls
 */
StatisticsModel.prototype.queryDB = function (query, values, cbResult) {
    var self = this;
    self.db.transaction(function (transaction) {
        transaction.executeSql(query,
            values,
            cbResult,
            function (tx, e) {
                self.dbErrorFunction(tx, e);
            });
    });
};

/**
 *Checks if any achievements have been achieved for the specific course
 * @prototype
 * @function checkAchievements
 * @param {Number}, courseId
 */
StatisticsModel.prototype.checkAchievements = function (courseId) {
    //check if cardburner was already achieved
//    this.controller.models.cardburner.calculateValue(courseId);
};

/**
 *Function that is called if an error occurs while querying the database
 * @prototype
 * @function dbErrorFunction
 * @param tx - transaction object
 * @param e - error object
 */
StatisticsModel.prototype.dbErrorFunction = function (tx, e) {
    console.log("DB Error: " + e.message);
};

/**
 * Loads the statistics data from the server and stores it in the local database
 * @prototype
 * @function dbErrorFunction
 */
StatisticsModel.prototype.loadFromServer = function () {
    console.log("enter load statistis");
    var self = this;

    var activeURL = self.controller.models.lms.getServiceURL("Sensor:XAPI LRS");

    if (activeURL && activeURL.length &&
        self.controller.models.configuration.isLoggedIn()) {
        $
            .ajax({
                url: activeURL,
                type: 'GET',
                dataType: 'json',
                success: function (data) {
                    console.log("success");

                    // FIXME No Global Functions please!
                    turnOffDeactivate();
                    console.log("JSON: " + data);
                    var i, statisticsObject;
                    try {
                        statisticsObject = data;
                        console.log("statistics data from server: " + JSON.stringify(statisticsObject));
                    } catch (err) {
                        console.log("Error: Couldn't parse JSON for statistics");
                    }

                    if (!statisticsObject) {
                        statisticsObject = [];
                    }

                    for (i = 0; i < statisticsObject.length; i++) {
                        self.insertStatisticItem(statisticsObject[i]);
                        //console.log("i is "+i+" and the length of statistics object is "+statisticsObject.length);
                    }
                    console.log("after inserting statistics from server");
                    // trigger event statistics are loaded from server

                    // Store a flag into the local storage that the data is loaded.
                    self.controller.setConfigVariable("statisticsLoaded", true);
                    console.log("config variable is set to true");
                    $(document).trigger("loadstatisticsfromserver");
                },
                error: function (xhr, err, errorString, request) {
                    var lmsModel = self.controller.models.lms;
                    var servername = lmsModel.lmsData.activeServer;
                    if (request.status === 403) {
                        if (lmsModel.lmsData.ServerData[servername].deactivateFlag === false) {
                            turnOnDeactivate();
                            console.log("Error while getting statistics data from server: " + errorString);
                            showErrorResponses(request);
                        }
                    }

                    if (request.status === 404) {
                        console.log("Error while getting statistics data from server: " + errorString);
                        showErrorResponses(request);
                    }
                },
                beforeSend: function setHeader(xhr) {
                    xhr.setRequestHeader('sessionkey',
                        self.controller.models.configuration.getSessionKey());
                }
            });
    }
};

/**
 * inserts the statistic item into the database if it doesn't exist there yet
 * @prototype
 * @function
 */
StatisticsModel.prototype.insertStatisticItem = function (statisticItem) {
    var self = this;
    // console.log("day: " + statisticItem['day']);

    function checkIfItemExists(transaction, results) {
        var item = statisticItem;
        if (results.rows.length === 0) {
            console.log("No entry for day: " + item.day);
            var query = "INSERT INTO statistics(course_id, question_id, day, score, duration) VALUES (?,?,?,?,?)";
            var values = [item.course_id,
              item.question_id,
              item.day,
              item.score,
              item.duration];
            self.queryDB(query, values, function cbInsert(transaction,
                results) {
                //  console.log("after inserting in insertStatisticsItem "+JSON.stringify(statisticItem));
            });
        }
    }
    self.queryDB(
        "SELECT id FROM statistics WHERE day = ?",
        [statisticItem.day],
        function cbSelect(t, r) {
            checkIfItemExists(t, r);
        });
};

/**Send statistics data to the server after checking firstly if there are any pending statistics data from previous time.
 * The statistics data are stored in the local 'statistics' database. The pending statistics data are stored in the local storage in the
 * object with the label "pendingstatistics".
 * The logic of sending data to the server is:
 * 1. Check what statistics data will be sent (pending, new statistics data)
 * 2. Send the data from step 1 to the server
 * 2. If step 2 was not successful, then next time we send statistics to the server we do step 1.
 *
 * @function sendToServer
 * */
StatisticsModel.prototype.sendToServer = function (featuredContent_id) {
    console.log("enter sendToServer in statistics model");
    var self = this;
    var activeURL = self.controller.models.lms.getServiceURL("Sensor:XAPI LRS");
    //if (self.controller.getLoginState()) {
    if (activeURL &&
        activeURL.length &&
        self.controller.models.configuration.configuration.userAuthenticationKey &&
        self.controller.models.configuration.configuration.userAuthenticationKey !== "") {
        console.log("we enter the get login state in sendToServer");
        //var url = self.controller.models['authentication'].urlToLMS + '/statistics.php';
        var url = activeURL;
        var courseList = self.controller.models.course.getCourseList();
        console.log("url statistics: " + url);
        // select all statistics data from the local table "statistics"
        // and then execute the code in sendStatistics function
        //self.queryDB('SELECT * FROM statistics where course_id != ?', [featuredContent_id], function(t,r) {sendStatistics(t,r);});
        var qm = [];
        //courseList.each(function() {qm.push("?");}); // generate the exact number of parameters for the IN clause
        $.each(courseList, function () {
            qm.push("?");
        });

        function sendStatistics(transaction, results) {
            var row,
                statistics = [],
                numberOfStatisticsItems = 0,
                uuid = "",
                sessionkey = "";
            //if there are any statistics data
            //that were not sent last time succesfully
            //to the server, they are stored in the local object "pendingStatistics"
            if (localStorage.getItem("pendingStatistics")) {
                console.log("there are pending statistics to the server");
                var pendingStatistics = {};
                try {
                    pendingStatistics = JSON.parse(localStorage.getItem("pendingStatistics"));
                } catch (err) {
                    console.log("error! while loading pending statistics");
                }
                //
                sessionkey = pendingStatistics.sessionkey;
                uuid = pendingStatistics.uuid;
                statistics = pendingStatistics.statistics;
                numberOfStatisticsItems = statistics.length;
            } else {
                numberOfStatisticsItems = results.rows.length;
                var i;
                console.log("results length: " + results.rows.length);
                for (i = 0; i < results.rows.length; i++) {
                    row = results.rows.item(i);
                    //	console.log("sent statistics row to the server"+row);
                    //	rowCourse= row.course_id;
                    //	console.log("course id is "+rowCourse);
                    statistics.push(row);
                    // console.log("sending " + i + ": " + JSON.stringify(row));
                }
                sessionkey = self.controller.models.configuration.getSessionKey();
                uuid = window.device.uuid;
            }

            console.log("count statistics=" + statistics.length);
            var statisticsString = JSON.stringify(statistics);

            //processData has to be set to false!
            $.ajax({
                url: url,
                type: 'PUT',
                data: statisticsString,
                processData: false,
                success: function (data) {
                    console.log("statistics data successfully send to the server");
                    localStorage.removeItem("pendingStatistics");
                    if (data) {
                        console.log("there ");
                        if (numberOfStatisticsItems < data) {
                            console.log("server has more items than local database -> fetch statistics from server");
                            self.loadFromServer();
                        }
                    }

                    self.lastSendToServer = (new Date()).getTime();
                    $(document).trigger("statisticssenttoserver");
                },
                error: function (request) {
                    var lmsModel = self.controller.models.lms;
                    var servername = lmsModel.lmsData.activeServer;
                    if (request.status === 403) {
                        if (lmsModel.lmsData.ServerData[servername].deactivateFlag === false) {
                            turnOnDeactivate();
                            console.log("Error while sending statistics data to server");
                            showErrorResponses(request);
                        }
                    }
                    console.log("Error while sending statistics data to server");
                    var statisticsToStore = {
                        sessionkey: sessionkey,
                        activeServerUrl: activeURL,
                        uuid: window.device.uuid,
                        statistics: statistics
                    };
                    localStorage.setItem("pendingStatistics", JSON.stringify(statisticsToStore));
                    //FIXME:to pass the session key as argument in the triggering of the event
                    $(document).trigger("statisticssenttoserver", sessionkey, activeURL, featuredContent_id);
                },
                beforeSend: function setHeader(xhr) {
                    xhr.setRequestHeader('sessionkey', sessionkey);
                    xhr.setRequestHeader('uuid', window.device.uuid);
                }
            });
        }

        self.queryDB('SELECT * FROM statistics where course_id IN (' + qm.join(",") + ')',
                     courseList,
                     function (t, r) {
            sendStatistics(t, r);
            });
    } // end of isLoginState
};

/**Display all entries of the database (the local one) for a specific course
 * Use this function for debugging purposes
 * @function getAllDBEntries
 * */
StatisticsModel.prototype.getAllDBEntries = function () {
    this.db.transaction(function (transaction) {
        //select all the statistics data for a specific course
        transaction.executeSql('SELECT * FROM statistics WHERE course_id=?', [courseId], dataSelectHandler, function (tx, e) {
            console.log("Error for select average score: " + e.message);
        });
    });

    function dataSelectHandler(transaction, results) {
        var i,
            row;

        console.log("ALL ROWS: " + results.rows.length);
        for (i = 0; i < results.rows.length; i++) {
            row = results.rows.item(i);
            console.log(i + ": " + JSON.stringify(row));
        }
    }
};

/**
 * Sets to true the flag variable that tracks
 * if any element has been clicked while the user had previously clicked the statistics icon.
 * * @prototype
 * @function resetClickOutOfStatisticsIcon
 */
StatisticsModel.prototype.setClickOutOfStatisticsIcon = function () {
    this.clickOutOfStatisticsIcon = true;
};

/**
 * Resets the flag variable that tracks if anything has been clicked after the user had clicked the statistics icon.
 * It is reset everytime the user clicks only on the statistics icon and waits until the statistics to be calculated.
 * @prototype
 * @function resetClickOutOfStatisticsIcon
 */
StatisticsModel.prototype.resetClickOutOfStatisticsIcon = function () {
    this.clickOutOfStatisticsIcon = false;
};

/**
 * Checks if any other element of the view has been tapped/clicked
 * after the statistics icon  has been clicked in either the course list view or landing view.
 * @prototype
 * @function checkclickOutOfStatisticsIcon
 * @return {Boolean}, true or false.  It returns true if any other element has been clicked, and false if only the statistics icon has been clicked and the user is waiting.
 */
StatisticsModel.prototype.checkclickOutOfStatisticsIcon = function () {
    console.log("check click out of statistics icon is" + this.clickOutOfStatisticsIcon);
    return this.clickOutOfStatisticsIcon;
};
