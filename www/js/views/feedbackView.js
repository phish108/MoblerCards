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
    this.delegate(window.ClozeQuestionType,'assClozeTest', {interactive: false});

    // FIXME!
    // this.delegate(window.ApologizeWidget,'apologize', {interactive: true});

    /**It is triggered after statistics are loaded locally from the server. This can happen during the
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

    /**It is triggered when the calculation of all the statistics metrics is done
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

FeedbackView.prototype.prepare = function () {
    $("#feedbacktip").hide();

    // ensure that the active widget is used.
    var qt = this.app.models.questionpool.getQuestionType();
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

    this.useDelegate(qt);};

FeedbackView.prototype.update = function () {
    if (this.app.models.answer.answerScore === -1) {
        this.app.models.answer.calculateScore();
    }

    this.showFeedbackBody();
    this.showFeedbackTitle();
};

FeedbackView.prototype.cleanup = function () {
    $("#feedbackbox").show();
    $("#feedbacktip").hide();
};

FeedbackView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[FeedbackView] tap registered: " + id);
    
    switch (id) {
        case "feedbackfooter":
        case "feedbackcontent":
            this.clickFeedbackDoneButton();
            break;
        case "feedbackinfo":
            this.clickFeedbackMore();
            break;
        case "feedbackcross":
            this.app.models.answer.answerList = [];
            this.app.models.answer.answerScore = -1;
            this.clickCourseListButton();
            break;
        case "feedbackheader":
            this.clickTitleArea();
            break;
        default:
            break;
    }
};

/**
 * click on feedback done button leads to new question
 * @prototype
 * @function clickFeedbackDoneButton
 **/
FeedbackView.prototype.clickFeedbackDoneButton = function () {
    this.app.models.answer.deleteData();
    this.app.models.questionpool.nextQuestion();
    this.app.changeView("question");
};


/**
 * click on feedback more button toggles the feedback body and the tip
 * @prototype
 * @function clickFeedbackMore
 **/
FeedbackView.prototype.clickFeedbackMore = function () {
    $("#feedbackbox").toggle();
    $("#feedbacktip").toggle();
};

/**
 * click on the course list button leads to course list
 * @prototype
 * @function clickCourseListButton
 **/
FeedbackView.prototype.clickCourseListButton = function () {
    this.app.models.answer.deleteData();

    if (this.app.getLoginState()) {
        this.app.changeView("course");
    } else {
        this.app.changeView("landing");
    }
};

/**Shows the title area of the feedback view,
 * containing title and corresponding icon
 * @prototype
 * @function showFeedbackTitle
 **/
FeedbackView.prototype.showFeedbackTitle = function () {
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    $("#feedbacktitle").text(jQuery.i18n.prop('msg_' + currentFeedbackTitle + 'Results_title'));
    $("#feedbackdynamicicon").attr('class', jQuery.i18n.prop('msg_' + currentFeedbackTitle + '_icon'));
};

/**Calls the appropriate widget to show the feedback body
 * based on the specific question type
 * It is displayed within the main body area of the feedback view
 * @prototype
 * @function showFeedbackBody
 **/
FeedbackView.prototype.showFeedbackBody = function () {
    var questionpoolModel = this.app.models.questionpool;
    var questionType = questionpoolModel.getQuestionType();

    // show feedback more information, which is the same for all kinds of questions
    $("#feedbackinfo").hide();

    var feedbackText = questionpoolModel.getWrongFeedback();
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    if (currentFeedbackTitle === "Excellent") {
        //gets correct feedback text
        feedbackText = questionpoolModel.getCorrectFeedback();
    }

    if (feedbackText && feedbackText.length > 0) {
        //$("#feedbackTip").text(feedbackText);
        $("#feedbacktip").html(feedbackText);
        $("#feedbackinfo").show();
    }
};

/**Transition back to question view when click on the title area
 * @prototype
 * @function clickTitleArea
 **/
FeedbackView.prototype.clickTitleArea = function () {
    this.app.models.answer.answerScore = -1;
    this.app.changeView("question");
};
