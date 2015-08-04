/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */
/*global $, jQuery*/

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
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class LandingView
 * View for displaying the first page that is visible to the user when the app is launched.
 * It contains the courses that are available free to the user, whithout beeing registrated.
 *  @constructor
 *  - assigns various event handlers when taping on the elements of the
 *    landing form such as featured content, exclusive content (and free content soon)
 *  - it binds synchronization events such as the sending of statistics to the server,
 *    the update of courses and questions. It prevents the display of the appropriate
 *    views that are also binded with the aforementioned events by displaying the
 *    login form itself.(FIX ME:. stay here instead of redirecting to the login view)
 *  @param {String} controller
 **/
function LandingView() {
    var self = this;

    this.pList = [];

    function refresh() {
        self.refresh();
    }

    window.addEventListener("offline",             refresh, true);
    window.addEventListener("online",              refresh, true);
    $(document).bind("CONTENT_COURSELIST_UPDATED", refresh);
    $(document).bind("CONTENT_COURSE_UPDATED",     refresh);
}

LandingView.prototype.prepare = function () {
    this.hideErrorMessage();
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    }
};

LandingView.prototype.update = function () {
    var courseList = this.models.contentbroker.getCourseList(true);
    this.hideErrorMessage();

    console.log("LV.update! courselist " + courseList.length);
    // FUTURE show ALL featured courses!
    if (courseList.length) {
        this.pList = courseList;

        var lvTemplate = this.app.templates.getTemplate("landingcourse");

        // for now we show the first featured course
        lvTemplate.landingfeaturedlabel.text = courseList[0].title;
    }
    else if (this.app.isOffline()) {
        this.showErrorMessage(jQuery.i18n.prop('msg_landing_message'));
    }
    else {
        // no content!
        this.showErrorMessage(jQuery.i18n.prop('msg_no_courses_message'));
    }
};

LandingView.prototype.tap_landingfeaturedimage = function () {
    console.log("select featured course");
    this.models.contentbroker.activateCourse(this.pList[0]);
    this.app.deferredChangeView("LRS_CALCULATION_DONE", "statistics");
};

LandingView.prototype.tap_landingfeaturedlist = function() {
    console.log("select featured course");
    this.models.contentbroker.activateCourse(this.pList[0]);
    this.models.contentbroker.nextQuestion();

    this.app.deferredChangeView("CONTENT_QUESTION_READY", "question");
};

LandingView.prototype.tap_landingexclusivelist = function () {
    var al;

    this.app.models.identityprovider.getActiveLMS(function(d) {
        al = d;
    });

    if (al && al.hasOwnProperty("id") && al.id.length) {
        // we show the login view ONLY if the device has an LMS registered
        this.app.changeView("login");
    }
    else {
        // otherwise, the app asks to which LMS it should connect
        // This means the user does not need to select "choose LMS" from the
        // login view
        this.app.changeView("lms");
    }
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LandingView.prototype.showErrorMessage = function (message) {
    if (this.active) {
        $("#warningmessageLanding").hide();
        $("#errormessageLanding").text(message);
        $("#errormessageLanding").show();
    }
};

/**
 * hides the specified error message
 * @prototype
 * @function hideErrorMessage
 **/
LandingView.prototype.hideErrorMessage = function () {
    if (this.active) {
        $("#errormessageLanding").text("");
        $("#errormessageLanding").hide();
    }
};
