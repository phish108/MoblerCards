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
    
    /**It is triggered after statistics are loaded locally from the server. This can happen during the 
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.app.isActiveView(self.tagID)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
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
        if ((self.app.isActiveView(self.tagID)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in  answer view 2 ");
            self.update();
        }
    });
}

AnswerView.prototype.tap = function (event) {
    var id = event.target.id;
    var answer, type;
    console.log("[AnswerView] tap registered: " + id);
    
    switch (id) {
        case "answercross":
            if (this.app.getLoginState()) {
                this.app.changeView("course");
            }
            this.app.changeView("landing");
            break;
        case "answerfooter":
        case "answercontent":
            this.clickDoneButton();
            break;
        case "answerheader":
            this.widget.storeAnswers();
            this.app.changeView("question");
            break;
        default:
            break;
    }
    
    if (!this.widget.moveEnabled && id.split("_").length === 3) {
        if (id.split("_")[0] === "answerlist") {
            this.widget.tap(event);
        }
    }
};

AnswerView.prototype.startMove = function (event) {    
    if (this.widget.moveEnabled && 
        event.target.id.split("_")[0] === "answerdragicon") {
        this.widget.startMove(event);
    };
};

AnswerView.prototype.duringMove = function (event, touches) {
    if (this.widget.moveEnabled && this.widget.dragActive) {
        this.widget.duringMove(event, touches);
    };
};

AnswerView.prototype.endMove = function (event) {    
    if (this.widget.moveEnabled) {this.widget.endMove(event);};
};

AnswerView.prototype.cleanup = function () {
}

/**Loads a subview-widget based on the specific question type
 * It is displayed within the main body area of the answer view
 * @prototype
 * @function showAnswerBody
 **/
AnswerView.prototype.update = function () {
    this.showAnswerTitle();

    $("#dataErrorMessage").empty();
    $("#dataErrorMessage").hide();

    var questionType = this.app.models.questionpool.getQuestionType();
    // a flag used to distinguish between answer and feedback view. 
    //Interactivity is true because the user can interact (answer questions) with the view on the answer view
    var interactive = true;
    
    switch (questionType) {
        case 'assSingleChoice':
            this.widget = new SingleChoiceWidget(interactive);
            break;
        case 'assMultipleChoice':
            this.widget = new MultipleChoiceWidget(interactive);
            break;
        case 'assOrderingQuestion':
        case 'assOrderingHorizontal':
            this.widget = new TextSortWidget(interactive);
            break;
        case 'assNumeric':
            this.widget = new NumericQuestionWidget(interactive);
            break;
        case 'assClozeTest':
            this.widget = new ClozeQuestionType(interactive);
            break;
        default:
            console.log("no Questiontype found");
            break;
    }
};

/**Displays the title area of the answer view,
 * containing a title icon and the title text
 * @prototype
 * @function showAnswerTitle
 **/
AnswerView.prototype.showAnswerTitle = function () {
    var currentAnswerTitle = this.app.models.questionpool.getQuestionType();
    $("#answerdynamicicon").removeClass();
    $("#answerdynamicicon").addClass(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_icon'));
    $("#answertitle").text(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_title'));
};

/**Handling the behavior of the "forward-done" button on the answer view
 * @prototype
 * @function clickDoneButton
 **/
AnswerView.prototype.clickDoneButton = function () {
    var questionpoolModel = this.app.models.questionpool;
    var statisticsModel = this.app.models.statistics;
    var answerModel = this.app.models.answer;

    if (this.widget.didApologize) {
        // if there was a problem with the data, the widget knows
        // in this case we proceed to the next question
        //statisticsModel.resetTimer();
        questionpoolModel.nextQuestion();
        this.app.changeView("question");
    } else {
        // if there was no error with the data we provide feedback to the
        // learner.
        console.log("click done button in answer view");
        questionpoolModel.queueCurrentQuestion();
        this.widget.storeAnswers();
        answerModel.storeScoreInDB();
        this.app.changeView("feedback");
    }
};
