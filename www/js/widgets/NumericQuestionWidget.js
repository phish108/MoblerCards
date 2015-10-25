/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */
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
 * @author Christian Glahn
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

    function cbCatchBlur(ev) {
        var resval = ev.target.value;

        // FIXME process the event ONLY if active

        console.log("user entered a value in the field: '" + resval + "'");

        // TODO check for numberic values

        // this.model.clearResponseList();
        // this.model.addResponse(resval);
    }

    self.interactive = typeof opts === "object" ? opts.interactive : false;

    // stating whether the widget allows moving, this object is used by the AnswerView.
    self.moveEnabled = false;

    var templateType = this.interactive ? "answer" : "feedback";

    if (typeof opts === "object" &&
        opts.hasOwnProperty("template")) {

        self.widgetTemplate = templateType + opts.template;
    }

    this.container.bind("blur", cbCatchBlur);
}

NumericQuestionWidget.prototype.prepare = function () {
    this.useTemplate(this.widgetTemplate);
};

/**
 * Decide whether to show the widget for the answer or feedback view.
 * Update a list with the currently selected answer.
 * @prototype
 * @function update
 * @param {NONE}
 */
NumericQuestionWidget.prototype.update = function() {
    this.template.attach('answerbox');

    var lstAnswers = this.model.getAnswerList(); // don't mix!
    var response   = this.model.getResponseList(); // there is only one response

    var resText;
    if (response &&
        response.length &&
        typeof response[0] !== "undefined") {

        resText = response[0];
    }

    if (typeof resText !== 'undefined') {
        this.template.answerinput.text = resText;
    }

    if (!this.interactive) {

        // in feedback mode we want to display the correct values, too
        this.showFeedback();
    }
};

/**
 * Make a feedback to the user's input. If the user's answer was correct, give only the correct answer field. If the user's answer was incorrect show which his answer was and which the correct answer would be.
 * @prototype
 * @function showFeedback
 * @param {NONE}
 */
NumericQuestionWidget.prototype.showFeedback = function () {

    // TODO display the possible responses
};
