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
    
    self.startPosition;
    self.listLength = 0;
    
    self.didApologize = false;
    
    if (self.interactive) {
        self.showAnswer();
    }
    else {
        self.showFeedback();
    }
}

TextSortWidget.prototype.startMove = function (event) {
    var id = event.target.id;
    console.log("[TextSortWidget] startMove detected: " + id);
    
    if (id.split("_")[0] === "answertext") {
        var li = $("#" + id).closest("li");
        
        this.startPosition = li.offset().top;
        this.dragActive = true
        this.lockPosition();
        li.css("z-index", 2);
    }
};

TextSortWidget.prototype.duringMove = function (event, touches) {
    var id = event.target.id,
        li = $("#" + id).closest("li"),
        ty = touches.touch(0).total.y(),
        newPos = this.startPosition + ty, 
        maxPos = this.listLength * 60 + 2;
    
    event.preventDefault();
    console.log("[TextSortWidget] duringMove detected: " + id);
    
    if (this.dragActive) {
        if (newPos < 62) {
            li.css("top", "62px");
        }
        else if (newPos > maxPos) {
            li.css("top", maxPos + "px");
        }
        else {
            li.css("top", newPos + "px");
        }
    }
};

TextSortWidget.prototype.endMove = function (event) {
    var id = event.target.id;
    console.log("[TextSortWidget] endMove detected: " + id);
    
    this.dragActive = false;
    this.listLength = 0;
    this.unlockPosition();
    this.snap();
};

TextSortWidget.prototype.lockPosition = function () {
    var ul = document.getElementById("answerbox"),
        list = ul.getElementsByTagName("li");
    var i;
    
    this.listLength = list.length;
    
    for (i = 0; i < list.length; i++) {
        list[i].style.position = "fixed";
        list[i].style.top = (60 * (i + 1) + 2) + "px";
    }
};

TextSortWidget.prototype.unlockPosition = function () {
    
};

TextSortWidget.prototype.swap = function () {
    
};

TextSortWidget.prototype.snap = function () {
    
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
        for (var c = 0; c < mixedAnswers.length; c++) {
            tmpl.attach(mixedAnswers[c].toString());
            tmpl.answertext.text = answers[mixedAnswers[c]].answertext;
        }
        // make the list sortable using JQuery UI's function
//        $(".sortable").sortable({
//            placeholder: "placeholder",
//            scrollSensitivity: 10,
//            disabled: false,
//            start: function (event, ui) {
//                $(ui.item).addClass("currentSortedItem");
//                //$("#sortGraber"+mixedAnswers[c]).addClass("currentSortedItem gradientSelected");
//            },
//            stop: function (event, ui) {
//                (ui.item).removeClass("currentSortedItem");
//                //$("#sortGraber"+mixedAnswers[c]).addClass("currentSortedItem gradientSelected");
//            }
//        });
//        $(".sortable").disableSelection();

//        self.enableSorting();
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
//    $("#feedbackBody").empty();
//    $("#feedbackTip").empty();

//    $(".sortable").sortable({
//        disabled: true
//    });

//    var ul = $("<ul/>", {
//        "class": "gradient2"
//    }).appendTo("#feedbackBody");

    var questionpoolModel = app.models.questionpool;
    var answers = questionpoolModel.getAnswer();
    var answerModel = app.models.answer;
    var scores = answerModel.getScoreList();
    var fTmpl = app.templates.getTemplate("feedbacklistbox");

    // iterate over all answers
    for (var i = 0; i < answers.length; i++) {
        fTmpl.attach(i.toString());
        fTmpl.feedbacktext.text = answers[i].answertext;
//        var li = $("<li/>", {
//            //if a ticked answer is in the correct place or in a sequence then use a blue background color
//            "class": (scores[i] == "1" || scores[i] == "1.5") ? "gradientSelected" : "gradient2 "
//        }).appendTo(ul);

//        var div = $("<div/>", {
//            "class": "text",
//            text: answers[i].answertext
//        }).appendTo(li);

        // if score is 0.5 or 1.5 show a checkmark
//        if (scores[i] == "0.5" || scores[i] == "1.5") {
//            var div = $("<div/>", {
//                "class": "right correctAnswer icon-checkmark"
//            }).prependTo(li);
//        }
    }

//    var currentFeedbackTitle = answerModel.getAnswerResults();
//    if (currentFeedbackTitle == "Excellent") {
//        var correctText = questionpoolModel.getCorrectFeedback();
//        if (correctText && correctText.length > 0) {
//            $("#FeedbackMore").show();
//            $("#feedbackTip").text(correctText);
//        } else {
//            $("#FeedbackMore").hide();
//        }
//    } else {
//        var wrongText = questionpoolModel.getWrongFeedback();
//        if (wrongText && wrongText.length > 0) {
//            $("#FeedbackMore").show();
//            $("#feedbackTip").text(wrongText);
//        } else {
//            $("#FeedbackMore").hide();
//        }
//    }
};

/**stores the current sorting order in the answer model
 * @prototype
 * @function storeAnswers
 **/
TextSortWidget.prototype.storeAnswers = function () {
    var answers = new Array();

//    $("#cardAnswerBody").find("li.sortableListItem").each(function (index) {
//        var id = $(this).attr("id").substring(6);
//        answers.push(id);
//    });
//    $("#answerbox").find("li.sortableListItem").each(function (index) {
//        var id = $(this).attr("id").substring(6);
//        answers.push(id);
//    });
//    app.models.answers.setAnswers(answers);
};

/**catches touch events and creates correspoding mouse events this has to be
 * done because JQuery UI's sortable function listens for mouse events
 * @prototype
 * @function enableSorting
 **/
TextSortWidget.prototype.enableSorting = function () {
    jester($(".sortable")[0]).start(function (touches, event) {
        console.log("ScrollTop " + $("ul#cardAnswerBody").scrollTop());
        createEvent("mousedown", event);
    });

    jester($(".sortable")[0]).during(function (touches, event) {
        createEvent("mousemove", event);

        // if an element is dragged on the header, scroll the list down
        var y = event.changedTouches[0].screenY;
        if (y < 60) {
            if (window.pageYOffset > y) {
                var scroll = y > 20 ? y - 20 : 0;
                window.scrollTo(0, scroll);
            }
        }
    });

    jester($(".sortable")[0]).end(function (touches, event) {
        createEvent("mouseup", event);
        var y = event.changedTouches[0].screenY;
        if (y < 60) {
            window.scrollTo(0, 0);
        }
    });
};

/**sets the height property of the list items that contain correct answers
 * @prototype
 * @function setCorrectAnswerTickHeight
 **/
//TextSortWidget.prototype.setCorrectAnswerTickHeight = function () {
//    $("#feedbackBody ul li").each(function () {
//        height = $(this).height();
//        $(this).find(".correctAnswer").height(height);
//        $(this).find(".correctAnswer").css("line-height", height + "px");
//    });
//}

//creates a new mouse event of the specified type
function createEvent(type, event) {
    var first = event.changedTouches[0];
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX,
        first.screenY, first.clientX, first.clientY, false, false, false,
        false, 0, null);

    first.target.dispatchEvent(simulatedEvent);
}
