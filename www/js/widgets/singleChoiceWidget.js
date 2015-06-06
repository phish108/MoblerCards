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
 * @Class MultipleChoiceWidget
 * The Single choice widget has two views, an answer and a feedback view.
 * The answer view contains a list with possible solutions and the selected answer by the user is highlighted.
 * The feedback view contains the list with the possible solutions highlighted by both the correct answer and learner's ticked answer.
 * Sometimes when available, the feedback view provides extra feedback information, both for correct and wrong feedback.
 * @constructor
 * - it gets the selected answers of the users and assign them to a variable
 * - it activates either answer or feedback view based on the passed value of
 *   the parameter of the constructor (interactive)
 * - it initializes the flag that keeps track when wrong data structure are received from the server
 *   and an appropriate message is displayed to the user.
 * @param {Boolean} interactive
 */
function SingleChoiceWidget(opts) {
    var self = this;

    // Check the boolean value of interactive. This is set through the answer and feedback view.
    self.interactive = typeof opts === "object" ? opts.interactive : false

    // a flag tracking when questions with no data are loaded and an error message is displayed on the screen
    self.didApologize = false;

    // current selected Answer
    self.selectedAnswer = new Array();

    // stating whether the widget allows moving
    self.moveEnabled = false;
}

SingleChoiceWidget.prototype.prepare = function () {
    console.log("prepare function called");  
};
SingleChoiceWidget.prototype.update = function() {

    // a list  with the currently  selected answers
    this.tickedAnswers = this.app.models.answer.getAnswers();

    console.log ("ever called maybe not maybe yesnobody knows.");
    if (this.interactive) {
        this.showAnswer();
    }
    else {
        this.showFeedback();
    }
};
/**
 * Handling behavior when click on the an item of the single answers list
 * @prototype
 * @function clickSingleAnswerItem
 **/
SingleChoiceWidget.prototype.tap = function (event) {
    var id = event.target.id;
    var answerId = "answertext_answerlistbox_";
    var li = $("#" + answerId + this.selectedAnswer[0]).closest("li");
    
    if (this.selectedAnswer.length > -1 &&
        this.selectedAnswer[0] !== id.split("_")[2] &&
        li.hasClass("gradientSelected")) {
        li.removeClass("gradientSelected").addClass("gradient2");
    }

    if ($("#" + id).closest("li").hasClass("gradient2")) {
        $("#" + id).closest("li").removeClass("gradient2").addClass("gradientSelected");
        this.selectedAnswer[0] = id.split("_")[2];
    }
};

/**
 * Creation of answer body for single choice questions. It contains a list with
 * the possible solutions which have been firstly mixed in a random order.
 * Only one of them can be ticked each time.
 * @prototype
 * @function showAnswer
 **/
SingleChoiceWidget.prototype.showAnswer = function () {
    var questionpoolModel = this.app.models.questionpool;

    // Check if there is a question pool and if there are answers for a specific
    // question in order to display the answer body
    console.log("maybe no answer are displayed");
    if (questionpoolModel.questionList && 
        questionpoolModel.getAnswer()[0].answertext) {
        var self = this;

        if (!questionpoolModel.currAnswersMixed()) {
            questionpoolModel.mixAnswers();
        }

        // returns an array containing the possible answers
        var answers = questionpoolModel.getAnswer();
        var mixedAnswers = questionpoolModel.getMixedAnswersArray();
        var c;

        var aTmpl = this.app.templates.getTemplate("answerlistbox");

        for (c = 0; c < mixedAnswers.length; c++) {
            aTmpl.attach(mixedAnswers[c].toString());
            aTmpl.answertext.text = answers[mixedAnswers[c]].answertext;
        }
    }
    else {
        this.useDelegate("apologize");
    }
};

/**
 * Creation of feedback body for single choice questions. It contains the list
 * with the possible solutions highlighted by both the correct answer and
 * learner's ticked answer
 * @prototype
 * @function showFeedback
 **/
SingleChoiceWidget.prototype.showFeedback = function () {
    console.log("enter feedback view after switching from question view");

    var self = this;
    var app = this.app;
    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var mixedAnswers = questionpoolModel.getMixedAnswersArray();
    var c;

    var fTmpl = app.templates.getTemplate("feedbacklistbox");

    for (c = 0; c < mixedAnswers.length; c++) {
        fTmpl.attach(mixedAnswers[c].toString());
        fTmpl.feedbacktext.text = answers[mixedAnswers[c]].answertext;

        // the selected answer will be in gradientSelected
        if (app.models.answer.getAnswers().indexOf(mixedAnswers[c].toString()) !== -1) {
            fTmpl.feedbacklist.removeClass("gradient2");
            fTmpl.feedbacklist.addClass("gradientSelected");
        }

        // the correct answer will be marked with a green tick
        if (questionpoolModel.getScore(mixedAnswers[c]) > 0) {
            fTmpl.feedbacktickicon.addClass("icon-checkmark");
            fTmpl.feedbacktickicon.addClass("glow2");
        }
    }
};

/**
 * Storing the ticked answer in an array
 * @prototype
 * @function storeAnswers
 **/
SingleChoiceWidget.prototype.cleanup = function () {
    this.app.models.answer.setAnswers(this.selectedAnswer);
};
