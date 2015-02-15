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
function MultipleChoiceWidget (interactive) {
    var self = this;
        
    //Check the boolean value of interactive. This is set through the answer and feedback view.
    self.interactive = interactive;
    
    // a flag tracking when questions with no data are loaded and an error message is displayed on the screen
    self.didApologize = false;
    
    // a list with the currently selected answers
    self.tickedAnswers = app.models.answer.getAnswers(); 
    
    // current selected Answer
    self.selectedAnswer = null;
    
    if (self.interactive) {
        // when answer view is active, then interactive variable is set to true.
        // displays the answer body of the multiple choice widget
        self.showAnswer();
    } else {
        //displays the feedback body of the multiple choice widget
        self.showFeedback();
    }
}

/**
 * Creation of answer body for multiple choice questions.
 * It contains a list with the possible solutions which
 * have been firstly mixed in a random order.
 * @prototype
 * @function showAnswer
 **/
MultipleChoiceWidget.prototype.showAnswer = function () {
    var questionpoolModel = app.models.questionpool;

    console.log("[MultipleChoiceWidget] showAnswer");
    
    // Check if there is a question pool and if there are answers for a specific question in order to display the answer body
    if (questionpoolModel.questionList && questionpoolModel.getAnswer()[0].answertext) {
        var self = this;
        
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
            tmpl.attach(mixedAnswers[c]);
            tmpl.answertext.text = answers[mixedAnswers[c]].answertext;
        }
    } 
    else {
        //if there are no data for a question or there is no questionpool then display the error message
        this.didApologize = true;
        doApologize();
    }
};


/**
 * Creation of feedback body for multiple choice questions.
 * It contains the list with the possible solutions highlighted by both the correct answers
 * and learner's ticked answers
 * @prototype
 * @function showFeedback
 **/
MultipleChoiceWidget.prototype.showFeedback = function () {
    console.log("start show feedback in multiple choice");

    var self = this;
    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var mixedAnswers = questionpoolModel.getMixedAnswersArray();
    var c;

    var fTmpl = app.templates.getTemplate("feedbacklistbox");

    for (c = 0; c < mixedAnswers.length; c++) {
        fTmpl.attach(mixedAnswers[c]);
        fTmpl.feedbacktext.text = answers[mixedAnswers[c]].answertext;

//        if (app.models.answer.getAnswers()[0] === mixedAnswers[c]) {
//            fTmpl.feedbacklist.removeClass("gradient2");
//            fTmpl.feedbacklist.addClass("gradientSelected");
//        }
                    
        if (questionpoolModel.getScore(mixedAnswers[c]) > 0) {
            fTmpl.feedbacktickicon.addClass("icon-checkmark");
            fTmpl.feedbacktickicon.addClass("glow2");
        }
    }
};

/**
 * Handling behavior when click on the an item of the multiple answers list
 * Adds or removes the blue background color depending on what was the previous state.
 * @prototype
 * @function clickMultipleAnswerItem
 **/
MultipleChoiceWidget.prototype.tap = function (event) {
    var id = event.target.id;
    
    if (!$("#" + id).closest("li").hasClass("gradientSelected")) {
        $("#" + id).closest("li").removeClass("gradient2").addClass("gradientSelected");
    }
    else {
        $("#" + id).closest("li").addClass("gradient2").removeClass("gradientSelected");
    }
};

/**
 * Storing the ticked answers in an array
 * @prototype
 * @function storeAnswers
 **/
MultipleChoiceWidget.prototype.storeAnswers = function () {
    var answers = new Array();
    var questionpoolModel = app.models.questionpool;

    if (this.selectedAnswer !== null) {
        console.log("[MultipleChoiceWidget] selected Answer has number: " + this.selectedAnswer.split("_")[2]);
        answers.push(this.selectedAnswer.split("_")[2]);
    }

    app.models.answer.setAnswers(answers);
};