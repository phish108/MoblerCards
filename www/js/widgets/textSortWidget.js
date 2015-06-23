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
function TextSortWidget(opts) {
    var self = this;

    self.interactive = typeof opts === "object" ? opts.interactive : false;

    // stating whether the widget allows moving, this object is used by the AnswerView.
    self.moveEnabled = true;

    // boolean value to check if a drag is taking place.
    self.dragActive = false;

    // Handles the Error messages.
    self.didApologize = false;
}

/**
 * Make sure that the array for the users answers is empty.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
TextSortWidget.prototype.prepare = function () {
    
};

/**
 * Decide whether to show the widget for the answer or feedback view.
 * Make the unsorted list sortable.
 * @prototype
 * @function update
 * @param {NONE}
 */
TextSortWidget.prototype.update = function () {
    // loads answers from model for displaying already by the user ordered elements
    this.tickedAnswers = this.app.models.answer.getAnswers();

    if (this.interactive) {
        // make the list sortable using JQuery UI's function
        $("#answerbox").sortable({
            axis: "y",
            scroll: true,
            scrollSensitivity: 60,
            scrollSpeed: 10,
            disabled: false,
            start: function (event, ui) {
                $(ui.item).addClass("currentSortedItem");
            },
            stop: function (event, ui) {
                $(ui.item).removeClass("currentSortedItem");
            }
        });
        
        this.showAnswer();
    }
    else {
        this.showFeedback();
    }
};

/**
 * stores the current sorting order in the answer model
 * @prototype
 * @function cleanup
 * @param {NONE}
 */
TextSortWidget.prototype.cleanup = function () {
    var answers = [];
    
    if (!this.didApologize) {
        $("#answerbox").find("li").each(function (index) {
            var id = $(this).attr("id").split("_")[2];
            answers.push(parseInt(id,10));
        });
        console.log(answers);
        this.app.models.answer.setAnswers(answers);
    }
};

/**
 * Creates a new mouse event of the specified type
 * @event
 * @function createEvent
 * @param {String} type - describes the type of the mouse event.
 * @param {OBJECT} event - contains all the information for the touch interaction.
 */
function createEvent(type, event) {
    var first = event.changedTouches[0];
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX,
        first.screenY, first.clientX, first.clientY, false, false, false,
        false, 0, null);

    first.target.dispatchEvent(simulatedEvent);
}

/**
 * If a move gesture is detected on the 'answertick' element in the list, the move is set in motion calling createEvent with argument "mousedown".
 * @prototype
 * @function startMove
 * @param {OBJECT} event - contains all the information for the touch interaction.
 */
TextSortWidget.prototype.startMove = function (event) {
    var id = event.target.id;
    console.log("[TextSortWidget] startMove detected: " + id);
    
    if (id.split("_")[0] === "answertick") {
        createEvent("mousedown", event);
        this.dragActive = true;
    }
};

/**
 * CreateEvent with argument "mousemove" will be called, if a movement is still occuring.
 * @prototype
 * @function duringMove
 * @param {OBJECT} event - contains all the information for the touch interaction.
 */
TextSortWidget.prototype.duringMove = function (event) {
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

/**
 * CreateEvent with argument "mouseup" will be called when the movement has stoped.
 * @prototype
 * @function endMove
 * @param {OBJECT} event - contains all the information for the touch interaction.
 */
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
 * @param {NONE}
 */
TextSortWidget.prototype.showAnswer = function () {
    var self = this;

    var app = this.app;
    
    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var answerModel = app.models.answer;
    var tmpl = app.templates.getTemplate("answerlistbox");
    var i;
    
    if (questionpoolModel.questionList && answers && answers[0].answertext) {
        var mixedAnswers;

        // if sorting has not started yet, mix the answers
        if (!questionpoolModel.currAnswersMixed()) {
            var tmp_answerModel = app.models.answer;
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
    }
    
    $("#answerbox").find("li").addClass("untouchable");
    $(".dragicon").show();
    $(".listimage").addClass("touchable");
    $(".tick").hide();
};

/**
 * Displays the correct order of the list.
 * @prototype
 * @function showFeedback
 * @param {NONE}
 */
TextSortWidget.prototype.showFeedback = function () {
    var answers = this.app.models.questionpool.getAnswer();
    var scores = this.app.models.answer.getScoreList();
    var fTmpl = this.app.templates.getTemplate("feedbacklistbox");
    var i;

    for (i = 0; i < answers.length; i++) {
        fTmpl.attach(i.toString());
        fTmpl.feedbacktext.text = answers[i].answertext;
//        fTmpl.feedbacktick.addClass("inactive");

        if (scores[i] === 0.5) {
            fTmpl.feedbacktickicon.addClass("icon-checkmark");
            fTmpl.feedbacklist.addClass("glow2");
        }
        else if (scores[i] === 1) {
            fTmpl.feedbacklist.addClass("gradientSelected");
        }
        else if (scores[i] === 1.5) {
            fTmpl.feedbacktickicon.addClass("icon-checkmark");
            fTmpl.feedbacklist.addClass("glow2");
            fTmpl.feedbacklist.addClass("gradientSelected");
        }
    }
};
