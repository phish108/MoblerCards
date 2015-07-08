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
 * The Multiple choice widget has two views, an answer and a feedback view.
 * The answer view contains a list with possible solutions and is highlighted by the selected answers of users.
 * The feedback view contains the list with the possible solutions highlighted by both the correct answers and learner's ticked answers.
 * Sometimes when available, the feedback view provides extra feedback information, both for correct and wrong feedback.
 * @constructor
 * - it gets the selected answers of the users and assign them to a variable
 * - it activates either answer or feedback view based on the passed value of
 *   the parameter of the constructor (interactive)
 * - it initializes the flag that keeps track when wrong data structure are received from the server
 *   and an appropriate message is displayed to the user.
 * @param {Boolean} interactive
 */
function MultipleChoiceWidget (opts) {
    var self = this;

    //Check the boolean value of interactive. This is set through the answer and feedback view.
    self.interactive = typeof opts === "object" ? opts.interactive : false;

    // a flag tracking when questions with no data are loaded and an error message is displayed on the screen
    self.didApologize = false;

    // current selected Answer
    self.selectedAnswer = [];

    // stating whether the widget allows moving
    self.moveEnabled = false;
}

/**
 * Make sure that the array for the users answers is empty.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.prepare = function () {
    this.selectedAnswer = [];
};

/**
 * Decide whether to show the widget for the answer or feedback view.
 * Update a list with the currently selected answers.
 * @prototype
 * @function update
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.update = function() {
    this.tickedAnswers = this.app.models.answer.getAnswers();
    
    if (this.interactive) {
        this.showAnswer();
    }
    else {
        this.showFeedback();
    }
};

/**
 * Storing the ticked answers in an array.
 * @prototype
 * @function storeAnswers
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.cleanup = function () {
    this.app.models.answer.setAnswers(this.selectedAnswer);
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
MultipleChoiceWidget.prototype.tap = function (event) {    
    if (this.interactive) {
        var id = event.target.id;

        if ($("#" + id).hasClass("gradient2")) {
            $("#" + id).removeClass("gradient2").addClass("gradientSelected");
            this.selectedAnswer.push(id.split("_")[2]);
        }
        else {
            $("#" + id).addClass("gradient2").removeClass("gradientSelected");
            this.selectedAnswer.splice(this.selectedAnswer.indexOf(id.split("_")[2]), 1);
        }
    }
};

/**
 * Create a mixed list of answers.
 * @prototype
 * @function showAnswer
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.showAnswer = function () {
    var app = this.app;
    var questionpoolModel = app.models.questionpool;

    console.log("[MultipleChoiceWidget] showAnswer");

    // Check if there is a question pool and if there are answers for a specific question in order to display the answer body
    if (questionpoolModel.questionList && questionpoolModel.getAnswer()[0].answertext) {

        //mix answer items in an random order
        if (!questionpoolModel.currAnswersMixed()) {
            questionpoolModel.mixAnswers();
        }

        //returns an array containing the possible answers
        var answers = questionpoolModel.getAnswer();
        var mixedAnswers = questionpoolModel.getMixedAnswersArray();
        var c;

        var tmpl = app.templates.getTemplate("answerlistbox");

        for (c = 0; c < mixedAnswers.length; c++) {
            tmpl.attach(mixedAnswers[c].toString());
            tmpl.answertext.text = answers[mixedAnswers[c]].answertext;
        }
    }
};

/**
 * Create the answer list.
 * Tick the correct answers and mark the users answer choice.
 * @prototype
 * @function showFeedback
 */
MultipleChoiceWidget.prototype.showFeedback = function () {
    console.log("start show feedback in multiple choice");

    var app = this.app;

    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var mixedAnswers = questionpoolModel.getMixedAnswersArray();
    var c;

    var fTmpl = app.templates.getTemplate("feedbacklistbox");

    for (c = 0; c < mixedAnswers.length; c++) {
        fTmpl.attach(mixedAnswers[c].toString());
        fTmpl.feedbacktext.text = answers[mixedAnswers[c]].answertext;

        if (app.models.answer.getAnswers().indexOf(mixedAnswers[c].toString()) !== -1) {
            fTmpl.feedbacklist.removeClass("gradient2");
            fTmpl.feedbacklist.addClass("gradientSelected");
        }

        if (questionpoolModel.getScore(mixedAnswers[c]) > 0) {
            fTmpl.feedbacktickicon.addClass("icon-checkmark");
        }
    }
};
