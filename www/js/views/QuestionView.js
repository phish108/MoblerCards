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
 * @author Christian Glahn
 */

/**
 * @Class QuestionView
 * View for displaying questions
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the question view
 *   such as title, body, done button
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the question text
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function QuestionView() {
    var self = this;

    this.tagID = this.app.viewId;
    var featuredContentId = FEATURED_CONTENT_ID;

    /**
     * It is triggered after statistics are loaded locally from the server. This can happen during the
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the question text and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if (self.app.isActiveView(self.tagID) && self.app.getLoginState()) {
            console.log("enters load statistics from server is done in question view");
            self.showQuestionBody();
        }
    });

    /**
     * It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");

        if ((self.app.isActiveView(self.tagID)) && self.app.getLoginState()) {
            console.log("enters in calculations done in question view 2 ");
            self.showQuestionBody();
        }
    });
}

/**
 * Call 'showQuestionTitle()' and 'showQuestionBody()'.
 * Start the timer.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
QuestionView.prototype.prepare = function () {};

QuestionView.prototype.update = function () {
    this.showQuestionTitle();
    this.showQuestionBody();
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
QuestionView.prototype.tap = function (event) {
    var id = event.target.id;
    var questionID = this.app.models.questionpool.getId();

    console.log(">>>>> [tap registered] ** " + id + " ** <<<<<");

    if (this.app.models.answer.answerScore > -1) {
        this.app.changeView("feedback");
    }
    else {
        this.app.models.answer.startAttempt(questionID);
        this.app.changeView("answer");
    }

};

QuestionView.prototype.swipe = function (event, touches) {
    var id = event.target.id;
    var tx = touches.touch(0).total.x(),
        ax = Math.abs(tx);
    console.log("a swipe event" + id + " distance: " + ax);

    if (id !== "questioncross" &&
        ax > 50) {
        this.app.models.answer.deleteData();
        this.app.models.questionpool.nextQuestion();
        this.app.changeView("question");
    }
};

QuestionView.prototype.tap_questioncross = function (event) {
    this.app.models.answer.resetTimer();
    this.app.chooseView("course", "landing");
};

/**
 * Shows the current question title and the corresponding icon.
 * @prototype
 * @function showQuestionTitle
 * @param {NONE}
 */
QuestionView.prototype.showQuestionTitle = function () {
    var currentQuestionType = this.app.models.questionpool.getQuestionType();

    $("#questiondynamicicon").removeClass();
    $("#questiondynamicicon").addClass(jQuery.i18n.prop('msg_' + currentQuestionType + '_icon'));
};

/**
 * Shows the current question text.
 * @prototype
 * @function showQuestionBody
 * @param {NONE}
 */
QuestionView.prototype.showQuestionBody = function () {
    var currentQuestionBody = this.app.models.questionpool.getQuestionBody();

    $("#questionlisttext").html(currentQuestionBody);
};
