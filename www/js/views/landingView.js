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
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @Class LandingView
 * View for displaying the first page that is visible to the user when the app is launched.
 * It contains the courses that are available free to the user, whithout beeing registrated.
 *  @constructor
 *  - it sets the tag ID for the landing view
 *  - assigns various event handlers when taping on the elements of the
 *    landing form such as featured content, exclusive content (and free content soon)
 *  - it binds synchronization events such as the sending of statistics to the server,
 *    the update of courses and questions. It prevents the display of the appropriate
 *    views that are also binded with the aforementioned events by displaying the
 *    login form itself.(FIX ME:. stay here instead of redirecting to the login view)
 *  @param {String} controller
 **/
function LandingView(controller) {
    var self = this;

    self.tagID = this.controller.viewId;
    this.controller = controller;
    this.active = false;
    this.fixedRemoved = false;
    
    $('#featuredContent').bind("touchstart", function (e) {
        $("#featuredContent").addClass("gradientSelected");
        console.log("color changed in featured content touchstart");
        e.preventDefault();
        e.stopPropagation();
    });

    $('#selectExclusiveContent').bind("touchstart", function (e) {
        console.log(" enters in landing view 2 ");
        $("#selectExclusiveContent").addClass("gradientSelected");
        e.preventDefault();
        e.stopPropagation();
    });

    /** 
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        console.log(" hide error message loaded ");
        self.hideErrorMessage();
    });

    $(document).bind("featuredContentlistupdate", function (e, featuredCourseId) {
        self.showForm(); //this will be called when a synchronization update takes place
    });
} //end of constructor

/**
 * It opens the landing view
 * @prototype
 * @function open
 **/
LandingView.prototype.prepare = function () {
    console.log("landingView: open sesame");
    this.showForm();
    this.active = true;
};

/**
 * closes the view after firstly removing the gradients
 * of the featured and exclusive content
 * @prototype
 * @function close
 **/
LandingView.prototype.cleanup = function () {
    $("#selectExclusiveContent").removeClass("gradientSelected");
    $("#featuredContent").removeClass("gradientSelected");
    this.active = false;
};

/**
 *
 * @prototype
 * @function handleTap
 **/
LandingView.prototype.tap = function (event) {
    var id = event.target.id;
    var featuredContentId = FEATURED_CONTENT_ID;
    
    if (id === "selectarrowLanding") {
        this.clickFeaturedStatisticsIcon(featuredContentId);
    }
    else if (id === "leftElement1") {
        this.clickFeaturedItem(featuredContentId);
    }
    else if (id === "leftElementExclusive") {
        this.selectExclusiveContent();
    }
};

/**
 * transition to login view when the exclusive option
 * is selected in the landing page
 * @prototype
 * @function selectExclusiveContent
 */
LandingView.prototype.selectExclusiveContent = function () {
    console.log("enter selectExclusiveContent");
    // this statement comes from the controller TranstitionToLogin
    if (this.apploaded) {
        this.controller.changeView("login");
    }
};

/**
 * displays the landing form
 * @prototype
 * @function showForm
 * @param{string}, featuredContent_id
 */
LandingView.prototype.showForm = function () {
    console.log("enter show form of landing view");
    var self = this;
    var featuredModel = self.controller.models.featured;
    this.hideErrorMessage();
    if (this.controller.models.connection.isOffline()) {
        this.showErrorMessage(jQuery.i18n.prop('msg_landing_message'));
    }
    //$("#featuredContent").attr("id",this.featuredContent_id);
    //NEW
    //$("#featuredContent").attr("id",featuredModel.getId());
    //scalculateLabelWidth();
    $("#landingViewHeader").show();
    console.log("showed landing view header");
    $("#leftElement1").text(featuredModel.getTitle());

    if ($("#selectarrowLanding").hasClass("icon-loading loadingRotation")) {
        $("#selectarrowLanding").addClass("icon-bars").removeClass("icon-loading loadingRotation");
    }
    $("#landingBody").show();
    console.log("showed the body of the landing page");
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LandingView.prototype.showErrorMessage = function (message) {
    $("#warningmessageLanding").hide();
    $("#errormessageLanding").text(message);
    $("#errormessageLanding").show();
};

/**
 * click on the default featured content, loads its questions
 * @prototype
 * @function clickFeaturedItem
 */
LandingView.prototype.clickFeaturedItem = function (featuredContentId) {
    //	if (this.controller.models['featured'].isSynchronized(featuredContent_id)) {
    //  NEW
    //  var featuredModel = self.controller.models['featured'];
    //	var feauturedId= featuredModel.getId();
    //	moblerlog("featured content id in landing view is "+feauturedId);
    selectCourseItem(featuredContentId);
    //}
};

/**
 * hides the specified error message
 * @prototype
 * @function hideErrorMessage
 **/
LandingView.prototype.hideErrorMessage = function () {
    $("#errormessageLanding").text("");
    $("#errormessageLanding").hide();
};

/**
 * click on statistic icon calculates the appropriate statistics and
 * loads the statistics view after transforming the statistics icon into loading icon
 * @prototype
 * @function clickStatisticsIcon
 * @param {string} featuredContent_id
 */
LandingView.prototype.clickFeaturedStatisticsIcon = function (featuredContentId) {
    console.log("statistics button in landing view clicked");

    if ($("#selectarrowLanding").hasClass("icon-bars")) {
        console.log("select arrow landing has icon bars");
        $("#selectarrowLanding").removeClass("icon-bars").addClass("icon-loading loadingRotation");

        //icon-loading, icon-bars old name
        //all calculations are done based on the course id and are triggered
        //within setCurrentCourseId
        //this.controller.transitionToStatistics(featuredContent_id);
        //		NEW
        //		var featuredModel = self.controller.models['featured'];
        //		var feauturedId= featuredModel.getId();
        this.controller.changeView("statistics", featuredContentId);
    }
};