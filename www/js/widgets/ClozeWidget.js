/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true, unparam: true */

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
 */

/**
 * @Class ClozeQuestionType
 * The ClozeQuestionType  has two views, an answer and a feedback view.
 * The answer view contains a paragraph and some text gaps.
 * The feedback view contains
 * Sometimes when available, the feedback view provides extra feedback information, both for correct and wrong feedback.
 * @constructor
 * -
 * -
 * @param {Boolean} interactive
 */

function ClozeWidget(opts) {
    // manage answer or feedback mode
    this.interactive = typeof opts === "object" ? opts.interactive : false;

    var templateType = this.interactive ? "answer" : "feedback";

    if (typeof opts === "object" &&
        opts.hasOwnProperty("template")) {

        this.widgetTemplate = templateType + opts.template;
    }

    // FIXME: remove did apologize

    // this widget does not handle move events
    this.moveEnabled = false;
}

ClozeWidget.prototype.prepare = function () {
    this.answers = this.model.getAnswerList(); // don't mix the answers
    this.useTemplate(this.widgetTemplate);
};

ClozeWidget.prototype.cleanup = function () {
    this.answers = null;
};

ClozeWidget.prototype.update = function () {
    var templateType = this.interactive ? "answer" : "feedback";

    var gaptpl = this.template;
    var txttpl = this.app.templates.getTemplate(templateType + "textbox")
    var lsttpl = this.app.templates.getTemplate(templateType + "listbox")

    var gapid = 0;

    if (this.answers) {
        this.answers.forEach(function (aw, id) {
            if (aw.answertext === "[gap]") {
                gaptpl.attach(id);
                if (this.answers &&
                    this.answers[gapid].length) {
                    gaptpl.answerinput.text = this.answers[gapid];
                }
                gapid++;

                if (!this.interactive) {
                    // attach all answers as listbox entries
                    // ensure that if a correct entry is present that it is
                    // selected
                }
            }
            else if (aw.answertext.length) {
                txttpl.attach(id);
                txttpl.answertext.text = aw.answertext;
            }
        }, this);
    }
};

/**
 * handle tap events - will focus the input fields
 */
ClozeWidget.prototype.tap = function (event) {return;};

/**
 * handle blur events for the input fields
 */
ClozeWidget.prototype.blur = function (event) {return;};

/**
 * stores the filled gaps of the user in an array
 *
 * @prototype
 * @function storeAnswers
 **/
ClozeWidget.prototype.storeAnswers = function () {

    var gapAnswers = [];

    //to get the answers the user typed in the gaps
    //and push the gaped answers in the array

//    $("#cardAnswerBody li :input").each(function (index) {
//        var answer = $(this).val();
//        gapAnswers.push(answer);
//    });

    this.app.models.answer.setAnswers(gapAnswers);
};
