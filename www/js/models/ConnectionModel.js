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
 *@author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/**
 ** @class ConnectionStateModel
 *  This model holds the current connection state (online = true, offline =
 * false). Every time an online or offline event is triggered, it updates its
 * connection state
 * @constructor
 * It gets the connection state by using the connection.type property of phone gap/corodva documentation.
 * It  shows the device's cellular and wifi connection information.
 * Two event listeners are added that detect the offline and online event respectivey. And the goOffline and
 * goOnline handlers are executed respectively.
 *  @param {String} controller
 */
function ConnectionModel(controller) {
    var self = this;

    this.controller = controller;
    this.checkConnection();

//    console.log("connection state during initialization: " + self.state);

    window.addEventListener("offline", self.goOffline, true);
    window.addEventListener("online", self.goOnline, true);
}

ConnectionModel.prototype.update = function () {
    this.checkConnection();
};

ConnectionModel.prototype.clear = function () {
    this.goOffline();
};

/*
 * Check for the devices connection state.
 * Maybe I will need to include a feature for IOS
 */
ConnectionModel.prototype.checkConnection = function () {
    var networkState = navigator.connection.type;

    if (networkState === Connection.NONE) {
        this.state = false;
    }
    else {
        this.state = true;
    }
};

/**
 * @prototype
 * @function isOffline
 * @return {Boolean} true if the connection state is offline, otherwise false
 */
ConnectionModel.prototype.isOffline = function () {
    return !this.state;
};

ConnectionModel.prototype.isOnline = function () {
    return this.state;
};

/**
 * when are an internet connection is detected then synchronize data
 * as long as the app is already loaded
 * @prototype
 * @function goOnline
 */
ConnectionModel.prototype.goOnline = function () {
    console.log("**online**");
    this.state = true;

    // send a message to the system

    if (typeof this.controller !== "undefined" &&
        this.controller.appLoaded) {
        this.synchronizeData();
    }
    $(document).trigger("DEVICE_ONLINE");
};


/**
 * When an internet connectivity is lost then show the error message
 * @prototype
 * @function goOffline
 */
ConnectionModel.prototype.goOffline = function () {
    console.log("**offline**");
    var self = this;

    this.state = false;
    // send a better message to the system

    $(document).trigger("trackingEventDetected", "offline");
    $(document).trigger("DEVICE_OFFLINE");
    // show no connection error message in login view
};

/**
 * When online connection is detected any locally stored pending logout information is sent to the server.
 * Additionally, any pending courses and questions information are loaded from the server.
 * Any pending statistics and tracking data are sent to the server as well.
 * When online connection state is detected the error messages about the lost of connectivity are hiden
 * The switchtoonline event is triggered
 ** @prototype
 * @function synchronizeData
 */
ConnectionModel.prototype.synchronizeData = function () {
    if (this.state) {
        /**
         * It it triggered when the connection state is online
         * Additionally for statistics purposes we trigger the tracking event in order
         * to track the connectivity behavior
         * @event trackingEventDetected
         * @event online
         * **/
        $(document).trigger("trackingEventDetected", "online");

        // if a pending logout exists, send the logout to the server
        var sessionKey = localStorage.getItem("pendingLogout");
        if (sessionKey) {
            localStorage.removeItem("pendingLogout");
            this.controller.models.configuration.sendLogoutToServer(sessionKey);
        }

        //hide no connection error message in login view

        /**
         * It is triggered when an online connection is detected and consequently
         * the error message is hided
         * @event errormessagehide
         * **/
        $(document).trigger("errormessagehide");

//        console.log('check synchronization - course list');
        // if a pending course list exist, load the course list from the server
        var pendingCourseList = localStorage.getItem("pendingCourseList");
        if (pendingCourseList) {
            this.controller.models.course.loadFromServer();
        }

//        console.log('check synchronization - question pools');
        // if a pending question pool exists, load the question pool from the server
        // FIXME improve /=void conditioning
        if (this.controller &&
            this.controller.models &&
            this.controller.models.course &&
            this.controller.models.course.courseList) {
//            console.log('got models ');
            var courseList = this.controller.models.course.courseList;

            if (courseList) {
//                console.log('interate course list ');
                for (var c in courseList) {
//                    console.log('check course ' + c);

                    var pendingQuestionPools = localStorage.getItem("pendingQuestionPool_" + courseList[c].id);
                    if (pendingQuestionPools) {
//                        console.log('check synchronization - question pool missing for course ' + c);
                        this.controller.models.questionpool.loadFromServer(courseList[c].id);
                    }
                }
            }
        }


        console.log('check synchronization - featured question pools');
        // if a pending featured content question pool exists, load the question pool from the server
        if (this.controller &&
            this.controller.models &&
            this.controller.models.featured &&
            this.controller.models.featured.featuredContentList) {
            console.log('got models ');
            var featuredContentList = this.controller.models.featured.featuredContentList;
            if (featuredContentList) {
//                console.log('interate featured course list ');
                //for ( var c in featuredContentList) {
//                console.log('check featured course ');
                var pendingFeaturedQuestionPools = localStorage.getItem("pendingFeaturedContentList" + featuredContentList.id);
                if (pendingFeaturedQuestionPools) {
//                    console.log('check synchronization - featured question pool missing for course ');
                    this.controller.models.featured.loadFromServer(featuredContentList.id);
                }
                //}
            }
        }

        var statisticsModel = this.controller.models.statistics;

//        console.log('check synchronization - statistics');
        // if pending statistics exist, send them to the server
        var pendingStatistics = localStorage.getItem("pendingStatistics");
        if (pendingStatistics) {
            statisticsModel.sendToServer();
        }
        // if statistics data wasn't sent to the server for more than 24 hours
        // send the data to the server
        if (this.controller &&
            this.controller.models &&
            this.controller.models.statistics) {
            if (!statisticsModel.lastSendToServer ||
                statisticsModel.lastSendToServer < ((new Date()).getTime() - 60 * 60 * 1000)) {
                // it was 24*60*60*1000 (check once every day)
//                console.log("statistics need to be synchronized in connection state model");
                statisticsModel.sendToServer();
            }
        }

        // FIXME remove all tracking model references.
//        var trackingModel = this.controller.models.tracking;

//        console.log('check synchronization - tracking');
        // if pending statistics exist, send them to the server
//        var pendingTracking = localStorage.getItem("pendingTracking");
//        if (pendingTracking) {
//            trackingModel.sendToServer();
//        }
        // if tracking data wasn't sent to the server for more than 24 hours
        // send the data to the server
//        if (this.controller &&
//            this.controller.models
//            && this.controller.models.tracking) {
//            if (!trackingModel.lastSendToServer ||
//                trackingModel.lastSendToServer < ((new Date()).getTime() - 60 * 60 * 1000)) {
//                trackingModel.sendToServer();
//            }
//        }
//        console.log('check synchronization DONE');
    }
};