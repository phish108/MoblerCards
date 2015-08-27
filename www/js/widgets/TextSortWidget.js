/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, unparam: true, todo: true */
/*global $*/

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
}

/**
 * Make sure that the array for the users answers is empty.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
TextSortWidget.prototype.prepare = function () {
    // inform the master view that we do the scrolling.
    this.master.scroll = false;
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
    this.tickedAnswers = this.model.getAnswerList(true); // get mixed answers

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

    var model = this.model;

    model.clearResponseList();
    $("#answerbox").find("li").each(function (index) {
        var id = $(this).attr("id").split("_").pop();
        model.addResponse(parseInt(id,10));
    });
};

/**
 * displays the answer for text sort questions
 * @prototype
 * @function showAnswer
 * @param {NONE}
 */
TextSortWidget.prototype.showAnswer = function () {
    var slist   = this.tickedAnswers;
    var answers = this.model.getResponseList();

    var tmpl = this.template;

    if (slist && answers) {
        // for each possible answer create a list item
        slist.forEach(function (listitem) {
            tmpl.attach(listitem.order);
            tmpl.answertext.text = listitem.answertext;
        });
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
    // Ilias sends mixed lists already. Need to sort.
    var slist   = this.model.getAnswerList(false);
    var answers = this.model.getResponseList();

    // var scores = this.app.models.answer.getScoreList();
    var fTmpl = this.template;

    console.log(slist);
    slist.forEach(function (aw, i) {
        fTmpl.attach(aw.order);
        fTmpl.answertext.html = aw.answertext;
        if (answers[i] === aw.order) {
            fTmpl.answerlist.addClass("gradientSelected");
        }
//        fTmpl.feedbacktick.addClass("inactive");

        // TODO - get responses and manage the score
//        if (scores[i] === 0.5) {
//            fTmpl.feedbacktickicon.addClass("icon-checkmark");
//            fTmpl.feedbacklist.addClass("glow2");
//        }
//        else if (scores[i] === 1) {
//            fTmpl.feedbacklist.addClass("gradientSelected");
//        }
//        else if (scores[i] === 1.5) {
//            fTmpl.feedbacktickicon.addClass("icon-checkmark");
//            fTmpl.feedbacklist.addClass("glow2");
//            fTmpl.feedbacklist.addClass("gradientSelected");
//        }
    });
};
