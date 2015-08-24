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
    return this;
}

StatisticsView.prototype.tap_statisticscross = function() {
    this.app.chooseView("course", "landing");
};

StatisticsView.prototype.tap_statsSlot3 = function() {
//    this.app.changeView("achievements");
    return;
};

/**show loading message when statistics have not been fully loaded from the server
 * @prototype
 * @function showLoadingMessage
 **/
StatisticsView.prototype.showLoadingMessage = function () {
//    $("#statisticsBody").hide();
//    $("#loadingMessage").show();
    return;
};


StatisticsView.prototype.update = function () {
    var t = this.template,
        m = this.model,
        pv;

    // TODO: Best day stats etc.
    pv                   = m.getBestDay();
    t.statBestDay.text   = pv.date  || jQuery.i18n.prop('msg_err_no_bestday');
    t.statBestScore.text = pv.score || jQuery.i18n.prop('msg_err_no_bestscore');

    // handle attempts
    pv                    = m.getDailyActions();
    t.statActions.text    = pv.today;

    this.setTrendIcon(t.statActionsIcon,
                      pv.trend);

    // handle score
    pv                   = m.getDailyScore();
    t.statScore.text     = pv.today;

    this.setTrendIcon(t.statScoreIcon,
                      pv.trend);

    // handle progress
    pv                    = m.getDailyProgress();
    t.statProgress.text   = pv.today;

    this.setTrendIcon(t.statProgressIcon,
                      pv.trend);

    // handle speed
    pv                    = m.getDailySpeed();
    t.statSpeed.text      = pv.today;

    this.setTrendIcon(t.statSpeedIcon,
                      pv.trend, true);
};

StatisticsView.prototype.setTrendIcon = function (iDiv, trend, inverse) {
    iDiv.removeClass([
        "green",
        "red",
        "icon-neutral",
        "icon-increase",
        "icon-decrease"
    ]);

    var pc = inverse ? "red" : "green", pi = "icon-neutral";
    if (trend < 0) {
        pc = inverse ? "green" : "red";
        pi = "icon-decrease";
    }
    else if (trend > 0) {
        pi = "icon-increase";
    }
    iDiv.addClass([pc, pi]);
};
