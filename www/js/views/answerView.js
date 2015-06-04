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
 * @Class AnswerView
 * The answer View displays the possible solutions of a question.
 * The user can interact with the view by selecting/typing/sorting the possible solutions/answers.
 * The possible solutions can have different formats. This is handled by widgets that are acting as subviews of the Answer View.
 * The answer View is a general template that loads in its main body a different widget based on the type of the question.
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the answer view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the answer body
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function AnswerView() {
    var self = this;

    this.tagID = this.app.viewId;
    this.widget = null;

    // init widget delegates
    this.delegate(window.SingleChoiceWidget,'assSingleChoice', {interactive: true});
    this.delegate(window.MultipleChoiceWidget,'assMultipleChoice', {interactive: true});

    this.delegate(window.TextSortWidget,'assOrderingQuestion', {interactive: true});
    this.mapDelegate('assOrderingQuestion', 'assOrderingHorizontal');

    this.delegate(window.NumericQuestionWidget,'assNumeric', {interactive: true});
    this.delegate(window.ClozeQuestionType,'assClozeTest', {interactive: true});

    // this.delegate(window.ApologizeWidget,'apologize', {interactive: true});

    /**It is triggered after statistics are loaded locally from the server. This can happen during the
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.app.isActiveView(self.tagID)) &&
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done in answer view 1");
            self.update();
        }
    });

    /**
     * It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");
        if ((self.app.isActiveView(self.tagID)) &&
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in  answer view 2 ");
            self.update();
        }
    });
}

AnswerView.prototype.apologize = function doApologize() {
    // FIXME move this into an apologize widget
    this.didApologize = true;
    // FIXME use TemplateFactory API
    $("<span/>", {
        text: "Apologize, no data are loaded"
    }).appendTo($("#dataErrorMessage"));
    $("#dataErrorMessage").show();
};


AnswerView.prototype.tap = function (event) {
    var id = event.target.id;
    // var answer, type;

    console.log("[AnswerView] tap registered: " + id);

    if (id === "answerclose") {
        if (this.app.getLoginState()) {
            this.app.changeView("course");
        }
        else {
            this.app.changeView("landing");
        }
    }
    else if (id === "answerbutton" ||
             id === "answerbuttonenter" ||
             id === "answercontent") {
        this.clickDoneButton();
    }
    else if (id === "answertitle" ||
             id === "answericon") {
        this.widget.storeAnswers();
        this.app.changeView("question");
    }
    // responses are handled by the widgets via CoreView!
};

AnswerView.prototype.cleanup = function () {
    if (!$("#scrolltop").hasClass("inactive")) {
        $("#scrolltop").addClass("inactive");
        $("#scrollbot").addClass("inactive");
    }
};

AnswerView.prototype.prepare = function () {
    this.didApologize = false;
    // FIXME: There should be an apologize widget.

    // ensure that the correct answer widget is used.
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

    this.useDelegate(qt);
};

/**Loads a subview-widget based on the specific question type
 * It is displayed within the main body area of the answer view
 * @prototype
 * @function showAnswerBody
 **/
AnswerView.prototype.update = function () {
    this.showAnswerTitle();

    $("#dataErrorMessage").empty();
    $("#dataErrorMessage").hide();
};

/**Displays the title area of the answer view,
 * containing a title icon and the title text
 * @prototype
 * @function showAnswerTitle
 **/
AnswerView.prototype.showAnswerTitle = function () {
    var currentAnswerTitle = this.app.models.questionpool.getQuestionType();
    $("#answerdynamicicon").removeClass();
    $("#answerdynamicicon").addClass(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_icon'));
    $("#answertitle").text(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_title'));
};

/**Handling the behavior of the "forward-done" button on the answer view
 * @prototype
 * @function clickDoneButton
 **/
AnswerView.prototype.clickDoneButton = function () {
    var questionpoolModel = this.app.models.questionpool;
    var statisticsModel = this.app.models.statistics;
    var answerModel = this.app.models.answer;

    // FIXME: the widgets should store their Answers in the cleanup function

    if (this.didApologize) {
        // FIXME this should be moved into the apologize widget.

        // if there was a problem with the data, the widget knows
        // in this case we proceed to the next question
        //statisticsModel.resetTimer();
        questionpoolModel.nextQuestion();
        this.app.changeView("question");
    } else {
        // if there was no error with the data we provide feedback to the
        // learner.
        console.log("click done button in answer view");
        questionpoolModel.queueCurrentQuestion();
        // there is no way to identify this.
        this.widget.storeAnswers();


        answerModel.storeScoreInDB();
        this.app.changeView("feedback");
    }
};
