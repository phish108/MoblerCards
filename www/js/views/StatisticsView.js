/**
 * THIS COMMENT MUST NOT REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Copyright: 2012-2014 ETH Zurich, 2015 Mobinaut
 */

/*jslint white: true */
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */
/*jslint todo: true */

/*global $, jQuery, LearningRecordStore*/

/**
 * @author Christian Glahn
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

StatisticsView.prototype.tap_statsSelectQuestionPool = function() {
//    this.app.changeView("achievements");
    console.log("switch to question pool list");
    this.app.changeView("questionpools");
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

    var tQP = this.app.models.contentbroker.getQuestionPools(1);
    if (tQP.length <= 1) {
        t.statsSelectQuestionPool.addClass("hidden");
    }
    else {
        t.statsSelectQuestionPool.removeClass("hidden");
    }

    // TODO: Best day stats etc.
    pv                   = m.getBestDay();
    t.statBestDay.text   = pv.date  || jQuery.i18n.prop('msg_err_no_bestday');
    t.statBestScore.text = pv.score || jQuery.i18n.prop('msg_err_no_bestscore');

    // handle attempts
    pv                    = m.getDailyActions();
    t.statActions.text    = pv.today;

    this.setTrendIcon(t.statActionsIcon,
                      pv.trend, pv.today);

    // handle score
    pv                   = m.getDailyScore();
    t.statScore.text     = pv.today;

    this.setTrendIcon(t.statScoreIcon,
                      pv.trend, pv.today);

    // handle progress
    pv                    = m.getDailyProgress();
    t.statProgress.text   = pv.today;

    this.setTrendIcon(t.statProgressIcon,
                      pv.trend, pv.today);

    // handle speed
    pv                    = m.getDailySpeed();
    if (pv.today === LearningRecordStore.Default_Speed) {
        t.statSpeed.text = jQuery.i18n.prop('msg_err_no_speed_today');
        t.msg_speed_info.addClass("hidden");
        this.setTrendIcon(t.statSpeedIcon,
                          pv.trend, 0, true);
    }
    else {
        t.statSpeed.text = pv.today;
        t.msg_speed_info.removeClass("hidden");
        this.setTrendIcon(t.statSpeedIcon,
                          pv.trend, pv.today, true);
    }



};

StatisticsView.prototype.setTrendIcon = function (iDiv, trend, score, inverse) {
    iDiv.removeClass([
        "green",
        "red",
        "icon-neutralstat",
        "icon-increase",
        "icon-decrease"
    ]);

    var pc = inverse ? "red" : "green", pi = "icon-neutralstat";
    if (trend < 0) {
        pc = inverse ? "green" : "red";
        pi = "icon-decrease";
    }
    else if (trend > 0) {
        pi = "icon-increase";
    }
    if (score === 0) {
        pc = "red";
    }
    iDiv.addClass([pc, pi]);
};
