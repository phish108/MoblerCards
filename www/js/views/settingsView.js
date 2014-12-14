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

/** @author Isabella Nake
 * @author Evangelia Mitsopoulou
   
*/

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @Class SettingsView
 *  View for displaying the settings which are:
 *  - name (first name and last name) of the user
 *  - email address of user
 *  - selected language
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns various event handlers when taping on various elements of the view
 *    such as the close button, the logout button and the "more info" icon.
 *  - it binds the event that is triggered when the authentication is ready
 **/
function SettingsView(controller) {
    var self = this;
    this.controller = controller;
    this.tagID = this.controller.views.id;

    /**
     * When all authentication data are received and stored in the local storage
     * the authenticationready event is triggered and binded here
     * @event authenticationready
     * @param e, userID, the user id
     */
    $(document).bind("authenticationready", function (e, userID) {
        console.log("authentication ready called " + userID);
        self.loadData();
    });
}

SettingsView.prototype.prepare = function () {
    this.controller.models.featured.loadFeaturedCourseFromServer();
    this.controller.models.course.loadFromServer();
    this.loadData();
};

SettingsView.prototype.tap = function (event) {
    var id = event.target.id;
    
    if (id === "closeSettingsIcon") {
        if (this.controller.getLoginState()) {
            this.controller.changeView("course");
        } else {
            this.controller.changeView("landing");
        }
    }
    else if (id === "logOutSettings") {
        if (this.controller.getLoginState()) {
            this.controller.changeView("logout");
        }
        else {
            this.controller.changeView("landing");
        }
    }
    else if (id === "aboutMore") {
        if (this.controller.getLoginState()) {
            this.controller.changeView("about");
        }
        else {
            this.controller.changeView("landing");
        }
    }
};

SettingsView.prototype.pinch = function (event) {
    if (this.controller.getLoginState()) {
        this.controller.changeView("course");
    } else {
        this.controller.changeView("landing");
    }
};

/**
 * loads the statistics data
 * @prototype
 * @function loadData
 **/
SettingsView.prototype.loadData = function () {
    $("#deactivateLi").hide();
    var self = this;
    var config = this.controller.models.configuration;
    var lmsModel = this.controller.model.lms;
    var servername = lmsModel.lmsData.activeServer;

    console.log("deactivate flag is " + lmsModel.lmsData.ServerData[servername].deactivateFlag);
    if (lmsModel.lmsData.ServerData[servername].deactivateFlag === true) {
        console.log("deactivate flag is: will show deactive msg");
        $("#deactivateLi").show();
    } else {
        console.log(" deactivate flag is: will NOT show deactivate msg");
    }

    $("#aboutMore").show();
    $("#lmsLabelSet").attr("src", self.controller.getActiveLogo());
    $("#pfpItemSet").text(self.controller.getActiveLabel());
    $("#nameItemSet").text(config.getDisplayName());
    $("#usernameItemSet").text(config.getUserName());
    $("#emailItemSet").text(config.getEmailAddress());
    $("#languageItemSet").text(jQuery.i18n.prop('msg_' + config.getLanguage() + '_title'));
};