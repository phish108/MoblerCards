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

/*jslint white:true*/      // we have a different indentation style
/*jslint vars: true*/      // don't complain about multiple variable declarations.
/*jslint sloppy: true*/    // dont't expect use strict.
/*jslint plusplus: true*/  // allow the ++ operator
/*jslint browser: true */  // ignore all browser globals
/*jslint unparam: true*/   // allow unused parameters in function signatures

/*global $, jQuery, jstap*/

/**
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class QuestionView
 * View for displaying questions
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the question view
 *   such as title, body, done button
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the question text
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function QuestionView() {
    var self = this;
    $(document).bind("CONTENT_QUESTION_READY", function () {
        self.refresh();
    });
}

QuestionView.prototype.prepare = function () {

    if (this.app.models.identityprovider.getSetting("teacherdebug")) {
        this.template.questionteachermode.removeClass("hidden");
    }
    else if (!this.template.questionteachermode.hasClass("hidden")) {
        this.template.questionteachermode.addClass("hidden");
    }
};

QuestionView.prototype.update = function () {
    this.qInfo = this.model.getQuestionInfo();

    this.template.questionicon.clearClass();
    this.template.questionicon.addClass(jQuery.i18n.prop('ico_' + this.qInfo.type + '_icon'));
    this.template.questiontext.html = this.qInfo.question;
    this.template.questiontitle.text = this.qInfo.title;
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
QuestionView.prototype.tap = function () {
    if (this.model.score >= 0) {
        this.app.changeView("feedback");
    }
    else {
        if (!this.model.isAttempt()) {
            this.model.startAttempt();
        }
        this.app.changeView("answer");
    }

};

QuestionView.prototype.handleChangeOnSwipe = function (id) {
    if (id !== "questioncross") {

        // a swipe starting in the cross (close),
        // means that the user does not want to close.

        if (this.model.isAttempt()){

            // swipe during an attempt means to flip back to the answer

            this.app.changeView("answer");
        }
        else {

            // otherwise move on.
            this.model.nextQuestion();
        }
    }
};

QuestionView.prototype.swipe = function (event, id, data) {
    // we accept only horizontal swipes

    if (data &&
        data.hasOwnProperty("direction") &&
        data.direction > 0) {

        this.handleChangeOnSwipe(id);
    }
    else {
        // old android version fail to deliver the direction
        var dir = Math.abs(jstap().touches(0).total.x()) - Math.abs( jstap().touches(0).total.y());
        if (dir > 0) {
            this.handleChangeOnSwipe(id);
        }
    }
};

QuestionView.prototype.duringMove = function () {

    // only scroll vertically, ignore any x-scrolls

    var dY = jstap().touches(0).delta.y();

    if(dY !== 0) {
        this.container.scrollTop(this.container.scrollTop() - dY);
    }
};

QuestionView.prototype.tap_questioncross = function () {
    this.model.cancelAttempt();
    this.app.chooseView("course", "landing");
};

