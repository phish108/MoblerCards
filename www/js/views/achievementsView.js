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

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** @author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/**
 * @Class AchievementsView
 * View for displaying the achievements of a user, such as:
 * - Stackhandler
 * - CardBurner
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns event handler when taping on close button
 *  - bind 2 events, similarly with statistics view that are related with
 *    the loading of statistics and the calculation of all the statistics metrics.
 *  @param {String} controller
 **/
// TODO templates
function AchievementsView(controller) {
    var self = this;
    self.controller = controller;
    self.tagID = self.controller.views.id;
    self.featuredContentId = FEATURED_CONTENT_ID;
    var achievementsFlag = true;

    /**It is triggered after statistics loaded locally from the server. This happens during the
     * authentication
     * @event loadstatisticsfromserver
     * @param: a callback function that gets the first active day in order to start the calculation
     *         of all thedifferent statistics metrics.
     */
    // TODO make loginState a boolean if possible
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.tagID === self.controller.activeView.id) && 
            (self.controller.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done");
            self.controller.models.statistics.getFirstActiveDay();
        }
    });

    /**It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that loads the body of the achievements view, which are
     *        the two achievement types (cardBurner, stackHandler) and their values.
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done 1 ");
        if ((self.tagID === self.controller.activeView.id) &&
            (self.controller.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done 2 ");
            self.showAchievementsBody();
        }
    });
}

/**
 * When the view opens it checks whether the statistics
 * have been loaded from the server to the local storage.
 * If they do, then the vies is loaded normally otherwise
 * a loading message is displayed that notifies the user.
 * @prototype
 * @function open
 **/
AchievementsView.prototype.prepare = function () {
    var self = this;
    
    if (self.featuredContentId) {
        self.showAchievementsBody();
    } 
    else if (self.controller.getConfigVariable("statisticsLoaded")) {
        self.showAchievementsBody();
    }
    else {
        self.showLoadingMessage();
    }
};

AchievementsView.prototype.tap = function (event) {
    var id = event.target.id;
    
    if (id === "closeAchievementsIcon") {
        this.controller.changeView("statistics", 1);
    }
};

/**
 * Pinch leads to statistics view.
 * It works currently only on iOS devices.
 * @prototype
 * @function handlePinch
 **/
AchievementsView.prototype.pinch = function (event) {
    console.log("pinch in AchievementsView");
    this.controller.changeView("statistics", 1);
};

/**
 * swipe leads to statistics view
 * @prototype
 * @function handleSwipe
 **/
AchievementsView.prototype.swipe = function (event) {
    console.log("swipe in AchievementsView");
    this.controller.changeView("statistics", 1);
};

// TODO TEMPLATES
/**
 * Shows the achievements body after firstly removing
 * the loading message.
 * For every achievement type it displays:
 * -its name
 * -its definition and value
 * -its icon, which has blue font color if the achievement has been reached
 * @prototype
 * @function showAchievementsBody
 **/
AchievementsView.prototype.showAchievementsBody = function () {
    var statisticsModel = this.controller.models.statistics;
    $("#loadingMessageAchievements").hide();
    $("#StackHandlerContainer").show();
    $("#CardBurnerContainer").show();
    $("#stackHandlerIcon").removeClass("blue");
    $("#cardBurnerIcon").removeClass("blue");
    $("#valueStackHandler").text(statisticsModel.stackHandler.achievementValue + "%");

    if (statisticsModel.stackHandler.achievementValue === 100) {
        $("#stackHandlerIcon").addClass("blue");
        $("#stackHandlerDash").removeClass("dashGrey");
        $("#stackHandlerDash").addClass("select");
    }

    $("#valueCardBurner").text(statisticsModel.cardBurner.achievementValue + "%");

    if (statisticsModel.cardBurner.achievementValue === 100) {
        $("#cardBurnerIcon").addClass("blue");
        $("#cardBurnerDash").removeClass("dashGrey");
        $("#cardBurnerDash").addClass("select");
    }
};

/**
 * shows loading message that achievements are being loaded
 * from the server
 * @prototype
 * @function showLoadingMessage
 **/
AchievementsView.prototype.showLoadingMessage = function () {
    $("#StackHandlerContainer").hide();
    $("#CardBurnerContainer").hide();
    $("#loadingMessageAchievements").show();

};