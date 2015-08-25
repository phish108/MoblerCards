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

    // this widget does not handle move events
    this.moveEnabled = false;
}

ClozeWidget.prototype.prepare = function () {
    this.answers = this.model.getAnswerList(); // don't mix the answers
};

ClozeWidget.prototype.cleanup = function () {
    this.answers = null;
};

ClozeWidget.prototype.update = function () {
    var box = $("#feebackbox");
    if (this.interactive) {
        box = $("#answerbox");
    }
    this.answers.forEach(function (a) {
        this.makeAnswerBody(box, a);
    }, this);
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
    console.log("store answers in cloze question view");
    var gapAnswers = [];

    //to get the answers the user typed in the gaps
    //and push the gaped answers in the array

    $("#cardAnswerBody li :input").each(function (index) {
        console.log("collect filled gaps");
        var answer = $(this).val();
        gapAnswers.push(answer);
    });
    console.log("gapAnswers is " + gapAnswers);
    this.app.models.answer.setAnswers(gapAnswers);
};

ClozeWidget.prototype.makeAnswerBody = function createClozeQuestionBody(domElement, answerBody, interactive) {
    // fixme - move to content broker cloze question text handling to content broker
    var answertext = answerBody.answertext;

    // FIXME USE TEMPLATE
    // The following code is probably broken

    // domElement.html(answertext);

    // wrap everything into li
    var li = $('<li class="marginClozeLi"/>');

    domElement.append(li); //the contents returns also the text nodes. the children not

    if (answertext.indexOf("[gap") === 0) {

        li.append($("<span/>", {
            "id": "clozeInputDash",
            "class": "dashGrey icon-dash"
        }));

        // process the gap
        var gap = answerBody.gap;

        // display a gap
        var inputtag = '<input type="text" class="loginInputCloze textShadow" required="required" autocorrect="off" autocapitalize="off" width="200px"placeholder="fill in the gap" id="gap_' +        gap.identifier + '"/>';
        li.append(inputtag);

        li.append($("<div/>", {
            "id": "shadowedClozeAnswerLi",
            "class": "gradient1 shadowedLi"
        }));

        var rightDiv2 = $("<div/>", {
            "class": "right "
        }).appendTo(li);

        $("<div/>", {
            "class": "radialCourses lineContainer separatorContainerCourses marginSeparatorTop"
        }).appendTo(rightDiv2);


        var divCorrect = $("<div/>", {
            "class": "courseListIconFeedback lineContainer background"
        }).appendTo(rightDiv2);

        var span2 = $("<span/>", {
            "class": "right glowNone icon-checkmark"
        }).appendTo(divCorrect);

        if (!this.interactive) {
            // todo show feedback
            span2.addClass("glow2");
        }
    }
    else {
        // display plain text
        li.text(answertext);
    }
};
