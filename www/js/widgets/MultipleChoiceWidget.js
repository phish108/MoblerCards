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

/*jslint white: true */
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */
/*jslint todo: true */

/*global $*/

/**
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class MultipleChoiceWidget
 *
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
    //Check the boolean value of interactive. This is set through the answer and feedback view.
    this.interactive = typeof opts === "object" ? opts.interactive : false;

    // stating whether the widget allows moving, used by parent view
    this.moveEnabled = false;

    var templateType = this.interactive ? "answer" : "feedback";

    if (typeof opts === "object" &&
        opts.hasOwnProperty("template")) {

        this.widgetTemplate = templateType + opts.template;
    }

    // Single choice or Multiple Choice?
    this.single = typeof opts === "object" ? opts.single : false;
}

/**
 * Make sure that the array for the users answers is empty.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.prepare = function () {
    this.answers = this.model.getAnswerList(true); // mix answers
    this.useTemplate(this.widgetTemplate);
};

/**
 * Storing the ticked answers in an array.
 * @prototype
 * @function storeAnswers
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.cleanup = function () {
    this.answers = null;
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
MultipleChoiceWidget.prototype.tap = function (event) {
    if (this.interactive) {
        var id = event.target.id,
            realId    = id.split("_")[2];

        if (this.single) {
            var answerId  = this.model.getResponseList()[0];

            if (answerId &&
                this.template.find(answerId)) {
                this.template.answerlist.removeClass("selected");
            }

            this.model.clearResponseList();

            // now add the new answer if we really want to add it
            if (realId !== answerId &&
                this.template.find(realId)) {

                this.model.addResponse(realId);
                this.template.answerlist.addClass("selected");
            }
        }
        else if (this.template.find(realId)) {
            // automatically toggles the response

            this.model.addResponse(realId);
            this.template.answerlist.toggleClass("selected");
        }
    }
};

/**
 * Display the List of Answers (if necessary with feedback)
 * @prototype
 * @function update
 * @param {NONE}
 */
MultipleChoiceWidget.prototype.update = function() {
    var response  = this.model.getResponseList(),
        aTmpl     = this.template;

    this.answers.forEach(function (a) {
        var os = a.order.toString();
        aTmpl.attach(os);
        aTmpl.answertext.html = a.answertext;

        if (response.indexOf(os) >= 0) {
            aTmpl.answerlist.addClass("selected");
        }
        // in feedback mode  display the feedback too
        if (!this.interactive && a.points) {
            aTmpl.answertickicon.addClass("icon-checkmark");
        }
    }, this);

    if (!this.answers.length) {
        // should never happen
        this.useDelegate("apologize");
    }
};
