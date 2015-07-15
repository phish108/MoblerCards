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
 * @Class FeedbackView
 * View for displaying the feedback
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the answer view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the feedback body
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function FeedbackView() {
    var self = this;

    this.tagID = this.app.viewId;

    this.delegate(window.SingleChoiceWidget,'assSingleChoice', {interactive: false});
    this.delegate(window.MultipleChoiceWidget,'assMultipleChoice', {interactive: false});
    this.delegate(window.TextSortWidget,'assOrderingQuestion', {interactive: false});
    this.mapDelegate('assOrderingQuestion', 'assOrderingHorizontal');

    this.delegate(window.NumericQuestionWidget,'assNumeric', {interactive: false});
    this.delegate(window.ClozeQuestionTypeView,'assClozeTest', {interactive: false});
    this.delegate(window.ApologizeWidget,'apologize', {interactive: true});

    /**
     * It is triggered after statistics are loaded locally from the server. This can happen during the
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the feedback body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if (self.app.isActiveView(self.tagID) && self.app.getLoginState) {
            console.log("enters load statistics from server is done in feedback view 1");
            self.update();
        }
    });

    /**
     * It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the feeback body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");
        if  (self.app.isActiveView(self.tagID) && self.app.getLoginState)  {
            console.log("enters in calculations done in feedback view 2 ");
            self.update();
        }
    });
}

/**
 * Ensure that the correct widget is being used.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
FeedbackView.prototype.prepare = function () {
    var qt = this.app.models.questionpool.getQuestionType();

    $("#feedbacktip").hide();

    switch (qt) {
        case 'assSingleChoice':
        case 'assMultipleChoice':
        case 'assOrderingQuestion':
        case 'assOrderingHorizontal':
        case 'assNumeric':
        case 'assClozeTest':
            break;
        default:
            qt = "apologize";
            break;
    }

    this.useDelegate(qt);
};

/**
 * Calculates the answer score.
 * Updates the feedback title and body.
 * @prototype
 * @function update
 * @param {NONE}
 **/
FeedbackView.prototype.update = function () {
    if (this.app.models.answer.answerScore === -1) {
        this.app.models.answer.calculateScore();
    }

    this.showFeedbackTitle();
    this.showFeedbackBody();
};

/**
 * Delete any data related to the current question. Move the cursor in questionpool to the next question.
 * @protoype
 * @function cleanup
 * @param {NONE}
 */
FeedbackView.prototype.cleanup = function () {
    $("#feedbackbox").show();
    $("#feedbacktip").hide();
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */


FeedbackView.prototype.tap_feedbackfooter = function () {
    this.app.models.answer.deleteData();
    this.app.models.questionpool.nextQuestion();
    this.app.changeView("question");
};

FeedbackView.prototype.tap_feedbackcontent = FeedbackView.prototype.tap_feedbackfooter;

FeedbackView.prototype.tap_feedbackinfo = function () {
     this.getFeedbackInfo();
};
FeedbackView.prototype.tap_feedbackheader = function () {
    this.app.changeView("question");
};
FeedbackView.prototype.tap_feedbackcross = function () {
    this.app.models.answer.deleteData();
    this.app.chooseView("course", "landing");
};

/**
 * click on feedback more button toggles the feedback body and the tip
 * @prototype
 * @function getFeedbackInfo
 * @param {NONE}
 */
FeedbackView.prototype.getFeedbackInfo = function () {
    $("#feedbackbox").toggle();
    $("#feedbacktip").toggle();
};


/**Shows the title area of the feedback view,
 * containing title and corresponding icon
 * @prototype
 * @function showFeedbackTitle
 * @param {NONE}
 */
FeedbackView.prototype.showFeedbackTitle = function () {
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    $("#feedbacktitle").text(jQuery.i18n.prop('msg_' + currentFeedbackTitle + 'Results_title'));
    $("#feedbackdynamicicon").attr('class', jQuery.i18n.prop('msg_' + currentFeedbackTitle + '_icon'));
};

/**
 * Calls the appropriate widget to show the feedback body
 * based on the specific question type
 * It is displayed within the main body area of the feedback view
 * @prototype
 * @function showFeedbackBody
 * @param {NONE}
 */
FeedbackView.prototype.showFeedbackBody = function () {
    var questionpoolModel = this.app.models.questionpool;
    var questionType = questionpoolModel.getQuestionType();
    var feedbackText = questionpoolModel.getWrongFeedback();
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    if (currentFeedbackTitle === "Excellent") {
        //gets correct feedback text
        feedbackText = questionpoolModel.getCorrectFeedback();
    }

    if (feedbackText && feedbackText.length > 0) {
        $("#feedbacktip").html(feedbackText);
        $("#feedbackinfo").show();
    }
    else {
        $("#feedbackinfo").hide();
    }
};
