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
 * @Class NumericQuestionWidget
 * The Numeric Question Widget has two views, an answer and a feedback view.
 * The answer view contains a input field where the user can type a numeric value.
 * The feedback view can vary depending on the correct or wron input of the user, which means
 * that if the typed answer of the user is correct then a green background color is applied to the input field
 * with an excellent acknolwedgement on the top otherwise a second input field is displayed with the correct answer.
 * @constructor
 * - it gets the selected answers of the users and assign them to a variable
 * - it activates either answer or feedback view based on the passed value of
 *   the parameter of the constructor (interactive)
 * - it initializes the flag that keeps track when wrong data structure are received from the server
 *   and an appropriate message is displayed to the user.
 * @param {Boolean} interactive
 */
function NumericQuestionWidget(opts) {
    var self = this;

    self.interactive = typeof opts === "object" ? opts.interactive : false

    // stating whether the widget allows moving, this object is used by the AnswerView.
    self.moveEnabled = false;

    // a flag tracking when questions with no data are loaded and an error message is displayed on the screen
    self.didApologize = false;

    // interactive is an attribute given by either the AnswerView or FeedbackView to clarify which View is using the Widget.

}

NumericQuestionWidget.prototype.update = function() {
    // a list with the typed answer
    this.tickedAnswers = this.app.models.answer.getAnswers();

    if (this.interactive) {
        this.showAnswer();
    }
    else {
        this.showFeedback();
    }
};

/**
 * Creation of answer body for numeric questions.
 * It contains a input field.
 * @prototype
 * @function showAnswer
 **/
NumericQuestionWidget.prototype.showAnswer = function () {
    var self = this;
    var app = this.app;

    var questionpoolModel = app.models.questionpool;
    var tmpl = app.templates.getTemplate("answerlistbox");

    // Check if there is a question pool and if there are answers for a specific question in order to display the answer body
    if (questionpoolModel.questionList && questionpoolModel.getAnswer()) {
        tmpl.attach("answerbox");
        tmpl.answerinput.removeClass("inactive");
        tmpl.answertick.addClass("inactive");
        tmpl.answertext.addClass("inactive");
    }
};

/**
 * Creation of feedback body for numeric questions.
 * It contains one or two input fields, based on the answer results
 * @prototype
 * @function showFeedback
 **/
NumericQuestionWidget.prototype.showFeedback = function () {
    console.log("start show feedback in numeric choice");
    var app = this.app;

    var questionpoolModel = app.models.questionpool;
    var answerModel = app.models.answer;
    var typedAnswer = answerModel.getAnswers();
    console.log("typed answer is " + typedAnswer);
    var correctAnswer = questionpoolModel.getAnswer()[0];
    var currentFeedbackTitle = answerModel.getAnswerResults();
    var tmpl = app.templates.getTemplate("feedbacklistbox");
    //display in an input field with the typed numeric answer of the learner

    if (typedAnswer === "undefined" || typedAnswer === "") {typedAnswer = "NaN";}

    tmpl.attach("feedbackbox");
    tmpl.feedbacktext.text = "Typed Answer: " + typedAnswer;
    tmpl.feedbacktick.addClass("inactive");

    if (currentFeedbackTitle != "Excellent") {
        // if the typed numeric answer is wrong
        tmpl.attach("feedbackbox");
        tmpl.feedbacktext.text = "Correct Answer: " + correctAnswer;
        tmpl.feedbacktick.addClass("inactive");
    }
};

/**
 * Storing the typed number
 * @prototype
 * @function storeAnswers
 **/
NumericQuestionWidget.prototype.storeAnswers = function () {
    var app = this.app;
    var questionpoolModel = app.models.questionpool;
    var numericAnswer = $("#answerinput_answerlistbox_answerbox").val();
    console.log("typed number: " + numericAnswer);
    app.models.answer.setAnswers(numericAnswer);
};
