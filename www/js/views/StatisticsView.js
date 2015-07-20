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
 */

/**
 * @Class StatisticsView
 * The statistics view displays displays the statistics data.
 * - Best day and best score. Their calculations are based on from the first active
 *   day until the current time.
 * - Handled Cards:It is the number of cards the user has handled for a specific course
 *   during the last 24 hours
 * - Average Score: It is the average score of the handled cards during the last 24 hours
 * - Progress: It is the increase or not in the percentage of the correctly answered
 *   questions of a users on a specific course
 * - Speed:It the average time the user needs to answer a question.
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the statistics view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics.
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function StatisticsView() {
    var self = this;

    this.tagID = this.app.viewId;
    this.featuredContentId = FEATURED_CONTENT_ID;

    self.dataLoaded = false;

    /**It is triggered after statistics are loaded locally from the server. This can happen during the
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.app.isActiveView(self.tagID)) &&
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done");
            self.app.models.statistics.getFirstActiveDay();
        }

    });

    /**It is triggered when the calculation of all the statistics metrics is done in the statistics model
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done 1 ");
        if (self.app.isActiveView(self.tagID)) {
            console.log("enters in calculations done 2 ");
            self.loadData();
        }
    });
}

/**Opens the view. First checks if the statistics are loaded from the server.
 * If not displays a "loading" message on the screen, otherwise it
 * loads the statistics data.
 * @prototype
 * @function open
 **/
StatisticsView.prototype.prepare = function () {
    if (this.app.getLoginState()) {
        if (this.featuredContentId ||
            this.app.getConfigVariable("statisticsLoaded") === true) {
            this.loadData();
        }
        else {
            this.showLoadingMessage();
        }
    }
    else {
        console.log("open statistics view in featured course context");
        this.loadData();
    }
    this.app.models.featured.loadFeaturedCourseFromServer();
};

StatisticsView.prototype.tap_statisticscross = function() {
    this.app.chooseView("course", "landing");
    }
};

StatisticsView.prototype.tap_statsSlot3 = function() {
    this.app.changeView("achievements");
};

/**show loading message when statistics have not been fully loaded from the server
 * @prototype
 * @function showLoadingMessage
 **/
StatisticsView.prototype.showLoadingMessage = function () {
//    $("#statisticsBody").hide();
//    $("#loadingMessage").show();
};

/**loads the statistics data, whose values are calculated in the answer model
 * additionally, depending on the improvement or not of their values in
 * comparison with the previous 24 hours a red or green up or down arrow is
 * displayed next to the value.
 * @prototype
 * @function loadData
 **/
StatisticsView.prototype.loadData = function () {
    var self = this;
    var statisticsModel = this.app.models.statistics;

    console.dir(statisticsModel);

    console.log("init values for statistics");
    //starts the calculation of the values of the various
    //statistics metrics
    var avgScore = statisticsModel.averageScore.averageScore;
    console.log("average score is: " + avgScore);
    var improvementAvgScore = statisticsModel.averageScore.improvementAverageScore;
    if (avgScore < 0) {
        avgScore = 0;
    }

    var avgSpeed = statisticsModel.averageSpeed.averageSpeed;
    var improvementSpeed = statisticsModel.averageSpeed.improvementSpeed;
    if (avgSpeed <= 0) {
        avgSpeed = "-";
    }

    var handledCards = statisticsModel.handledCards.handledCards;
    var improvementhandledCards = statisticsModel.handledCards.improvementHandledCards;
    if (handledCards < 0) {
        handledCards = 0;
    }

    var progress = statisticsModel.progress.progress;
    var improvementProgress = statisticsModel.progress.improvementProgress;
    if (progress < 0) {
        progress = 0;
    }

    var bestDay = statisticsModel.bestDay.bestDay;
    if (!bestDay) {
        // if the database does not know better, today is the best day!
        bestDay = new Date().getTime();
    }
    var oBestDay = new Date(bestDay);

    var bestScore = statisticsModel.bestDay.bestScore;
    if (bestScore < 0) {
        bestScore = 0;
    }
    console.log("initialization of data done");

    var removeClasses = msg_positiveImprovement_icon + " " + msg_negativeImprovement_icon + " " + msg_neutralImprovement_icon +
        " red green";
    //once the calculation of the values is done
    // we display the values, their text and the improvement arrow
    $("#loadingMessage").hide();
    $("#statisticsBody").show();
    $("#statBestDayValue").text(oBestDay.getDate() + " " + jQuery.i18n.prop('msg_monthName_' + (oBestDay.getMonth() + 1)));
    $("#statBestDayInfo").text(oBestDay.getFullYear());
    $("#statBestScoreValue").text(bestScore + "%");
    //$("#statHandledCardsValue").text(handledCards+ " "+ jQuery.i18n.prop('msg_handledCards_info'));
    $("#statHandledCardsValue").text(handledCards);
    $("#statsHandledCardsInfo").text(jQuery.i18n.prop('msg_handledCards_info'));
    $("#statsHandledCardsIconchange").removeClass(removeClasses);
    $("#statsHandledCardsIconchange").addClass(checkImprovement(improvementhandledCards));
    $("#statAverageScoreValue").text(avgScore + "%");
    $("#statsAverageScoreIconchange").removeClass(removeClasses);
    $("#statsAverageScoreIconchange").addClass(checkImprovement(improvementAvgScore));
    $("#statProgressValue").text(progress + "%");
    $("#statsProgressIconchange").removeClass(removeClasses);
    $("#statsProgressIconchange").addClass(checkImprovement(improvementProgress));
    //$("#statSpeedValue").text(avgSpeed+" "+ jQuery.i18n.prop('msg_speed_info'));
    $("#statSpeedValue").text(avgSpeed);
    $("#statsSpeedinfo").text(jQuery.i18n.prop('msg_speed_info'));
    $("#statsSpeedIconchange").removeClass(removeClasses);
    $("#statsSpeedIconchange").addClass(checkSpeedImprovement(improvementSpeed));

    console.log("end load data");
};
