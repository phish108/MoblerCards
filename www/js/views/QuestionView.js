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
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
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
    $(document).bind("CONTENT_QUESTION_READY", function () {
        self.refresh();
    });
}

QuestionView.prototype.update = function () {
    this.qInfo = this.model.getQuestionInfo();

    this.template.questionicon.clearClass();
    this.template.questionicon.addClass(jQuery.i18n.prop('ico_' + this.qInfo.type + '_icon'));
    this.template.questiontext.html = this.qInfo.question;
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
QuestionView.prototype.tap = function () {
    if (this.model.answerScore >= 0) {
        this.app.changeView("feedback");
    }
    else {
        if (!this.model.isAttempt()) {
            this.model.startAttempt(this.qInfo.id);
        }
        this.app.changeView("answer");
    }

};

QuestionView.prototype.swipe = function (event) {

    var id = event.target.id;

    if (id !== "questioncross") {
        if (this.model.isAttempt()){
            this.app.changeView("answer");
        }
        else {
            this.model.nextQuestion();
        }
    }
};

QuestionView.prototype.tap_questioncross = function () {
    this.model.cancelAttempt();
    this.app.chooseView("course", "landing");
};

