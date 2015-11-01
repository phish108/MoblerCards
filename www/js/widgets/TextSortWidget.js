/**
 * THIS COMMENT MUST NOT REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Copyright: 2012-2014 ETH Zurich, 2015 Mobinaut
 */

/*jslint white: true*/
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */
/*jslint unparam: true */
/*jslint todo: true */

/*global $, jstap*/

/**
 * @author Christian Glahn
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
 * The answer view contains a randomly mixed list with the answer items that
 * need to be sorted out. The feedback view contains the correct sorting order
 * of the answer items.
 *
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

    var templateType = this.interactive ? "answer" : "feedback";

    if (typeof opts === "object" &&
        opts.hasOwnProperty("template")) {

        self.widgetTemplate = templateType + opts.template;
    }

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
    // this.master.scroll = false;
    this.useTemplate(this.widgetTemplate);

    // footerY is screen size - 52;
    this.footerY = $(window).height() - 52;
};

/**
 * Decide whether to show the widget for the answer or feedback view.
 * Make the unsorted list sortable.
 * @prototype
 * @function update
 * @param {NONE}
 */
TextSortWidget.prototype.update = function () {
    // find out footerY
    this.footerY = $(window).height() - 52;

    // loads answers from model for displaying already by the user ordered elements
    this.tickedAnswers = this.model.getAnswerList(true); // get mixed answers

    if (this.interactive) {
        // make the list sortable using JQuery UI's function

        // FIXME: write native sort function that includes scrolling, too
        // TODO Do not update while drag and drop.

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
    var id          = event.target.id,
        aId         = id.split("_"),
        targetItem  = aId[aId.length - 1];

    if (aId[0] === "answerdrag") {

        console.log("start drag on " + targetItem);

        this.master.scroll = false;
        this.dragActive = true;

        this.initDrag(targetItem);
    }
};

/**
 * CreateEvent with argument "mousemove" will be called, if a movement is still occuring.
 * @prototype
 * @function duringMove
 * @param {OBJECT} event - contains all the information for the touch interaction.
 */
TextSortWidget.prototype.duringMove = function (event) {
    // event.preventDefault();
    // createEvent("mousemove", event);

    // move or scroll
    if (this.dragActive) {
        this.performDrag();
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

    if (this.dragActive) {
        this.performDrag(); // just in case the user moved a bit further
        this.dropElement();

        this.dragActive = false;
        this.master.scroll = true;
    }

//    var model = this.model;
//
//    model.clearResponseList();
//    $("#answerbox").find("li").each(function (index) {
//        var id = $(this).attr("id").split("_").pop();
//        model.addResponse(parseInt(id,10));
//    });

    // finally reset the scroll flag for the master view

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

/**
 * helper function that creates a dummy element
 * and sets the active element as dragged.
 */
TextSortWidget.prototype.initDrag = function (id) {
    console.log("init drag");
    this.dragTarget = id;
};

/**
 * helper function that places the active element to the
 * position of the dummy element
 */
TextSortWidget.prototype.dropElement = function () {
    console.log("drop " + this.dragTarget);

    this.dragTarget = null;
};

/**
 * helper function that places the active element under the
 * user's finger. If the finger moves into a new element the
 * dummy element flips the position of the dummy element.
 *
 * Two cases:
 * 1. if the user moves down the dummy flips AFTER
 * 2. if the user moves up the dummy flips BEFORE
 *
 * if the finger is within the top/bottom range of the screen,
 * the screen scrolls up/down as long as the finger is within
 * the range.
 */
TextSortWidget.prototype.performDrag = function () {

    var y = jstap().touches(0).previous.y();

    if (y < 68 || y > this.footerY) {
        this.performScroll();
    }
    else {
        console.log("move to y = " + y);
    }
};

/**
 * helper function that scrolls as long as the finger is within the
 * top/bottom range.
 *
 * The function MUST NOT scroll if no drag is active
 * The function MUST NOT scroll if the finger is no longer in
 * the range
 */
TextSortWidget.prototype.performScroll = function () {

    var self= this;

    var tInitScroll = 1000; // 1 sec.
    var tScroll     = 50; // 0.05 sec.
    var y;

    function cbScroll10() {

        y = jstap().touches(0).previous.y();

        if (self.scrollActive &&
            self.dragActive &&
            (y < 68 || y > self.footerY)) {

            var dir = y < 68 ? -10 : 10;

            self.container.scrollTop(self.container.scrollTop() + dir);

            if (self.container.scrollTop() > 0) {
                setTimeout(cbScroll10, tScroll);
            }
            else {
                self.scrollActive = false;
            }
        }
        else {
            self.scrollActive = false;
        }
    }

    if (!this.scrollActive) {

        // scrollActive avoids setting multiple timeouts
        self.scrollActive = true;
        setTimeout(cbScroll10, tInitScroll);
    }
};
