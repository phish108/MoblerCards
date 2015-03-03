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
 * Widget for displaying text sort questions
 * @param interactive
 * if true answerview is shown, otherwise feedback view
 */

/**
 * @Class TextSortWidget
 * The text sort widget has two views, an answer and a feedback view.
 * The answer view contains a randomly mixed list with the answer items that need to be sorted out.
 * The feedback view contains the correct sorting order of the answer items. If more than half of
 * the answer items were sorted correctly then a blue background color is assigned to the.
 * @constructor
 * - it gets the selected answers of the users and assign them to a variable
 * - it activates either answer or feedback view based on the passed value of
 *   the parameter of the constructor (interactive)
 * - it initializes the flag that keeps track when wrong data structure are received from the server
 *   and an appropriate message is displayed to the user.
 * @param {Boolean} interactive
 */
function TextSortWidget(interactive) {
    var self = this;
    
    self.interactive = interactive;
    
    // loads answers from model for displaying already by the user ordered elements
    self.tickedAnswers = app.models.answer.getAnswers();
    
    // stating whether the widget allows moving
    self.moveEnabled = true;

    self.dragActive = false;
        
    self.didApologize = false;
    
    if (self.interactive) {
        self.showAnswer();
    }
    else {
        self.showFeedback();
    }
}

//creates a new mouse event of the specified type
function createEvent(type, event) {
    var first = event.changedTouches[0];
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX,
        first.screenY, first.clientX, first.clientY, false, false, false,
        false, 0, null);

    first.target.dispatchEvent(simulatedEvent);
}

TextSortWidget.prototype.startMove = function (event) {
    var id = event.target.id;
    console.log("[TextSortWidget] startMove detected: " + id);

    if (id.split("_")[0] === "answertext") {
        createEvent("mousedown", event);
        this.dragActive = true;
    }
};

TextSortWidget.prototype.duringMove = function (event, touches) {
    event.preventDefault();
    createEvent("mousemove", event);

    // if an element is dragged on the header, scroll the list down
    var y = event.changedTouches[0].screenY;
    
    if (this.dragActive && y < 60) {
        if (window.pageYOffset > y) {
            var scroll = y > 20 ? y - 20 : 0;
            window.scrollTo(0, scroll);
        }
    }
};

TextSortWidget.prototype.endMove = function (event) {
    createEvent("mouseup", event);
    var y = event.changedTouches[0].screenY;
    
    if (this.dragActive && y < 60) {
        window.scrollTo(0, 0);
        this.dragActive = false;
    }
};

/**
 * displays the answer for text sort questions
 * @prototype
 * @function showAnswer
 */
TextSortWidget.prototype.showAnswer = function () {
    var self = this;
    
    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var tmpl = app.templates.getTemplate("answerlistbox");
    var i;
    
    if (questionpoolModel.questionList && questionpoolModel.getAnswer()[0].answertext) {
        
        var mixedAnswers;
        
        // if sorting has not started yet, mix the answers
        if (!questionpoolModel.currAnswersMixed()) {
            var tmp_answerModel = new AnswerModel();
            do {
                tmp_answerModel.deleteData();
                questionpoolModel.mixAnswers();
                mixedAnswers = questionpoolModel.getMixedAnswersArray();
                
                //if the order of mixed answers is correct or partially correct, generate a new order
                tmp_answerModel.setAnswers(mixedAnswers);
                tmp_answerModel.calculateTextSortScore();
            } while (tmp_answerModel.getAnswerResults() !== "Wrong");
        }
        else {
            mixedAnswers = this.tickedAnswers;
        }
        
        // for each possible answer create a list item
        for (i = 0; i < mixedAnswers.length; i++) {
            tmpl.attach(mixedAnswers[i].toString());
            tmpl.answertext.text = answers[mixedAnswers[i]].answertext;
        }
        
        // make the list sortable using JQuery UI's function
        $("#answerbox").sortable({
            axis: "y",
            scroll: true,
            scrollSensitivity: 10,
            scrollSpeed: 20,
            disabled: false,
            start: function (event, ui) {
                $(ui.item).addClass("currentSortedItem");
                //$("#sortGraber"+mixedAnswers[c]).addClass("currentSortedItem gradientSelected");
            },
            stop: function (event, ui) {
                (ui.item).removeClass("currentSortedItem");
                //$("#sortGraber"+mixedAnswers[c]).addClass("currentSortedItem gradientSelected");
            }
        });
        
        $("#answerbox").disableSelection();
    }
    else {
        this.didApologize = true;
        doApologize();
    }
};

/**displays the feedback for text sort questions
 * @prototype
 * @function showFeedback
 **/
TextSortWidget.prototype.showFeedback = function () {
    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var answerModel = app.models.answer;
    var scores = answerModel.getScoreList();
    var fTmpl = app.templates.getTemplate("feedbacklistbox");
    var i;
    
    for (i = 0; i < answers.length; i++) {
        fTmpl.attach(i.toString());
        fTmpl.feedbacktext.text = answers[i].answertext;
        
        console.log("[FeedbackView] current score for i " + i + " is: " + scores[i]);
        if (scores[i] === 0.5) {
            fTmpl.feedbacklist.addClass("icon-checkmark");
            fTmpl.feedbacklist.addClass("glow2");
        }
        else if (scores[i] === 1) {
            fTmpl.feedbacklist.addClass("gradientSelected");
        }
        else if (scores[i] === 1.5) {
            fTmpl.feedbacklist.addClass("icon-checkmark");
            fTmpl.feedbacklist.addClass("glow2");
            fTmpl.feedbacklist.addClass("gradientSelected");
        }
    }

    var currentFeedbackTitle = answerModel.getAnswerResults();
    if (currentFeedbackTitle == "Excellent") {
        var correctText = questionpoolModel.getCorrectFeedback();
        if (correctText && correctText.length > 0) {
//            $("#FeedbackMore").show();
//            $("#feedbackTip").text(correctText);
        } else {
//            $("#FeedbackMore").hide();
        }
    } else {
        var wrongText = questionpoolModel.getWrongFeedback();
        if (wrongText && wrongText.length > 0) {
//            $("#FeedbackMore").show();
//            $("#feedbackTip").text(wrongText);
        } else {
//            $("#FeedbackMore").hide();
        }
    }
};

/**stores the current sorting order in the answer model
 * @prototype
 * @function storeAnswers
 **/
TextSortWidget.prototype.storeAnswers = function () {
    var answers = [];

    $("#answerbox").find("li").each(function (index) {
        var id = $(this).attr("id").split("_")[2];
        answers.push(id);
    });

    app.models.answer.setAnswers(answers);
};


