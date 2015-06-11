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
    var self = this;

    this.tagID = this.app.viewId;
    this.widget = null;

    // init widget delegates
    this.delegate(window.SingleChoiceWidget,'assSingleChoice', {interactive: true});
    this.delegate(window.MultipleChoiceWidget,'assMultipleChoice', {interactive: true});

    this.delegate(window.TextSortWidget,'assOrderingQuestion', {interactive: true});
    this.mapDelegate('assOrderingQuestion', 'assOrderingHorizontal');

    this.delegate(window.NumericQuestionWidget,'assNumeric', {interactive: true});
    this.delegate(window.ClozeQuestionTypeView,'assClozeTest', {interactive: true});

    this.delegate(window.ApologizeWidget,'apologize', {interactive: true});

    /**
     * It is triggered after statistics are loaded locally from the server. This can happen during the
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if (self.app.isActiveView(self.tagID) &&  self.app.getLoginState()) {
            console.log("enters load statistics from server is done in answer view 1");
            self.update();
        }
    });

    /**
     * It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");
        if (self.app.isActiveView(self.tagID) && self.app.getLoginState()) {
            console.log("enters in calculations done in  answer view 2 ");
            self.update();
        }
    });
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

    var qt = this.app.models.questionpool.getQuestionType();
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

    this.useDelegate(qt);
};

/**
 * updates the answer title and removes any error messages.
 * @prototype
 * @function update
 * @param {NONE}
 **/
AnswerView.prototype.update = function () {
    this.showAnswerTitle();

    $("#dataErrorMessage").empty();
    $("#dataErrorMessage").hide();
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
AnswerView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log(">>>>> [tap registered] ** " + id + " ** <<<<<");    
    
    switch (id) {
        case "answerfooter":
        case "answercontent": // If any error occured, go to the next question. Otherwise get feedback to your answers.
            if (this.didApologize) {
                this.app.models.questionpool.nextQuestion();
                this.app.changeView("question");
            } 
            else {
                this.app.changeView("feedback");
            }
            break;
        case "answerheader": // Get back to the question
            this.app.changeView("question");
            break;
        case "answercross": // Close the answer view.
            if (this.app.getLoginState()) {
                this.app.changeView("course");
            }
            else {
                this.app.changeView("landing");
            }
            break;
        default:
            break;
    }   
};

/**
 * Displays the title area of the answer view, containing a title icon and the title text.
 * @prototype
 * @function showAnswerTitle
 * @param {NONE}
 **/
AnswerView.prototype.showAnswerTitle = function () {
    var currentAnswerTitle = this.app.models.questionpool.getQuestionType();
    $("#answerdynamicicon").removeClass();
    $("#answerdynamicicon").addClass(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_icon'));
    $("#answertitle").text(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_title'));
};
