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
 * @author Dijan Helbling
 */

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
function SettingsView() {
    var self = this;

    this.tagID = this.app.viewId;

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
    this.lms = [];

    this.model.eachLMSPrivate(function (lms) {
        this.lms.push(lms);
    }, this);
};

SettingsView.prototype.update = function () {
    // display the user information for the first LMS
    if (this.lms.length) {
        $("#settingslmslabel").text(this.lms[0].name);

//        $("#nameItemSet").text(config.getDisplayName());
//        $("#usernameItemSet").text(config.getUserName());
//        $("#emailItemSet").text(config.getEmailAddress());
//        $("#languageItemSet").text(jQuery.i18n.prop('msg_' + config.getLanguage() + '_title'));

    }
};

SettingsView.prototype.tap_settingscross = function (event) {
    this.app.chooseView("course", "landing");
};
SettingsView.prototype.tap_settingslogout = function (event) {
    this.app.chooseView("logout", "landing");
};
SettingsView.prototype.tap_settingsabout = function (event) {
    this.app.chooseView("about", "landing");
};

/**
 * loads the statistics data
 * @prototype
 * @function loadData
 **/
SettingsView.prototype.loadData = function () {
    $("#deactivateLi").hide();
    var self = this;
    var config = this.app.models.configuration;
    var lmsModel = this.app.models.lms;
    lmsModel.getActiveLMS(function (lms) {
        console.log("deactivate flag is " + lms.inactive);
        if (lms.inactive === 1) {
            console.log("deactivate flag is: will show deactive msg");
            $("#deactivateLi").show();
        } else {
            console.log(" deactivate flag is: will NOT show deactivate msg");
        }
        $("#aboutMore").show();

//        $("#settingslmsimg").attr("src", lms.logofile);
        $("#settingslmslabel").text(lms.name);
    });

    $("#nameItemSet").text(config.getDisplayName());
    $("#usernameItemSet").text(config.getUserName());
    $("#emailItemSet").text(config.getEmailAddress());
    $("#languageItemSet").text(jQuery.i18n.prop('msg_' + config.getLanguage() + '_title'));
};
