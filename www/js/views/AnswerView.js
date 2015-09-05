/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */
/*global jstap, $, jQuery, MultipleChoiceWidget, TextSortWidget, NumericQuestionWidget, Clozewidget, ApologizeWidget*/

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
 * @Class AnswerView
 * The answer View displays the possible solutions of a question.
 * The user can interact with the view by selecting/typing/sorting the possible solutions/answers.
 * The possible solutions can have different formats. This is handled by widgets that are acting as subviews of the Answer View.
 * The answer View is a general template that loads in its main body a different widget based on the type of the question.
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the answer view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the answer body
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function AnswerView() {
    this.widget = null;

    // init widget delegates
    this.delegate(MultipleChoiceWidget,
                  'assSingleChoice',
                  {single: true, interactive: true});
    this.delegate(MultipleChoiceWidget,
                  'assMultipleChoice',
                  {single: false, interactive: true});
    this.delegate(TextSortWidget,
                  'assOrderingQuestion',
                  {interactive: true});
    this.delegate(NumericQuestionWidget,
                  'assNumeric',
                  {interactive: true});
    this.delegate(ClozeWidget,
                  'assClozeTest',
                  {interactive: true});
    this.delegate(ApologizeWidget,
                  'apologize',
                  {interactive: true});

    this.mapDelegate('assOrderingQuestion',
                     'assOrderingHorizontal');

}

/**
 * Ensure that the correct widget is being used.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
AnswerView.prototype.prepare = function () {
    this.didApologize = false;
    // TODO: There should be an apologize widget.

    var qt = this.model.getQuestionInfo().type;
    switch (qt) {
        case 'assSingleChoice':
        case 'assMultipleChoice':
        case 'assOrderingQuestion':
        case 'assOrderingHorizontal':
        case 'assNumeric':
        case 'assClozeTest':
            break;
        default:
            this.didApologize = true;
            qt = "apologize";
            break;
    }

    this.scroll = true;

    this.activeDelegate = qt;
    console.log("use delegate " + qt);

    this.useDelegate(qt);
};

/**
 * Scrolling during move events
 *
 * We need to manage the scrolling ourselves, because Android refuses to scroll
 * if preventDefault has been called during move events.
 */
AnswerView.prototype.duringMove = function () {
    if (this.scroll) {
        this.doScroll();
    }
};

/**
 * Scroll helper - can be used by the widgets if they want to scroll
 * TODO: include doScroll() in CoreView, so we don't have to bother here.
 */
AnswerView.prototype.doScroll = function () {
    var dY = jstap().touches(0).delta.y();
    this.container.scrollTop(this.container.scrollTop() - dY);
};

/**
 * @prototype
 * @function cleanup
 * @param {NONE}
 *
 * scrolls the container to the default position.
 */
AnswerView.prototype.cleanup = function () {
    this.content.html(""); // remove everything from the content

    // hack for scrolling the content box into place.
    this.container.addClass("active");
    this.container.scrollTop(0);
    // console.log("container during cleanup at " + this.container.scrollTop());
    this.container.removeClass("active");
};

/**
 * updates the answer title and removes any error messages.
 * @prototype
 * @function update
 * @param {NONE}
 *
 * note that the actual view contents is done by the widget delegates.
 **/
AnswerView.prototype.update = function () {
    var currentAnswerTitle = this.model.getQuestionInfo().type;

    var title = jQuery.i18n.prop("msg_"+currentAnswerTitle +'_title'),
        icon  = jQuery.i18n.prop("ico_"+currentAnswerTitle + '_icon');

    // fixme use the component style
    $("#answerdynamicicon").removeClass();
    $("#answerdynamicicon").addClass(icon);
    $("#answertitle").text(title);
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
AnswerView.prototype.tap_answerfooter = function () {
    if (this.didApologize) {
        this.app.changeView("question", "CONTENT_QUESTION_READY");
        this.model.nextQuestion();
    }
    else {
        this.model.checkResponse();
        this.app.changeView("feedback");
    }
};

// AnswerView.prototype.tap_answercontent = AnswerView.prototype.tap_answerfooter;

AnswerView.prototype.tap_answerheader = function () {
    this.app.changeView("question");
};

AnswerView.prototype.tap_answercross = function () {
    this.model.finishAttempt(); // avoid cancel here
    this.model.deactivateCourse(); // reset the contexts
    this.app.chooseView("course", "landing");
};
