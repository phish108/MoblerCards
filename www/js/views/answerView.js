/*** .0	THIS COMMENT MUST NOT BE REMOVED
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

/** @author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

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
// TODO get rid of css elements
function AnswerView() {
    var self = this;
    this.tagID = this.app.viewId;
    this.widget = null;
    
    var featuredContentId = FEATURED_CONTENT_ID;

    // center the answer body to the middle of the screen of the answer view
    function setOrientation() {
        $(".cardBody").css('height', window.innerHeight - 70);
        $(".cardBody").css('width', window.innerWidth - 100);
    }

    setOrientation();
    window.addEventListener("orientationchange", setOrientation, false);
    window.addEventListener("resize", setOrientation, false);

    /**It is triggered after statistics are loaded locally from the server. This can happen during the 
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.tagID === self.app.isActiveView) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done in answer view 1");
            self.showAnswerBody();
        }
    });

    /**It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");
        if ((self.tagID === self.app.isActiveView) &&
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in  answer view 2 ");
            self.showAnswerBody();
        }
    });


} // end of Constructor

/**Opening of answer view. The parts of the container div element that are loaded dynamically 
 * are explicitly defined/created here
 * @prototype
 * @function open
 **/
AnswerView.prototype.prepare = function (featuredContent_id) {
    this.showAnswerTitle();
    this.showAnswerBody();
    this.app.resizeHandler();
    //set automatic the width of the input field in numeric questions
    //setNumberInputWidth();
};

AnswerView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[AnswerView] tap registered: " + id);
    
    if (id === "CourseList_FromAnswer") {
        if (this.app.getLoginState()) {
            this.app.changeView("course");
        } else {
            this.app.changeView("landing");
        }
    } 
    else if (id === "doneButton") {
        this.clickDoneButton();
    }
    else if (id === "cardAnswerTitle" || id === "cardAnswerIcon") {
        this.widget.storeAnswers();
        this.app.changeView("question");
    };
};

/**Transition to courses list view when pinching on the answer view. 
 * This  is executed only on the iPhone.
 * @prototype
 * @function handlePinch
 **/
AnswerView.prototype.pinch = function () {
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    } else {
        this.app.changeView("landing");
    }
};

/**Loads a subview-widget based on the specific question type
 * It is displayed within the main body area of the answer view
 * @prototype
 * @function showAnswerBody
 **/
AnswerView.prototype.showAnswerBody = function () {
    $("#dataErrorMessage").empty();
    $("#dataErrorMessage").hide();
    $("#cardAnswerBody").empty();

    var questionpoolModel = this.app.models.questionpool;

    var questionType = questionpoolModel.getQuestionType();
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
    $("#answerIcon").removeClass();
    $("#answerIcon").addClass(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_icon'));
    $("#cardAnswerTitle").text(jQuery.i18n.prop('msg_' + currentAnswerTitle + '_title'));
};


/**Handling the behavior of the "forward-done" button on the answer view
 * @prototype
 * @function clickDoneButton
 **/
AnswerView.prototype.clickDoneButton = function () {
    var questionpoolModel = this.app.models.questionpool;
    var statisticsModel = this.app.models.statistics;
    var answerModel = this.app.models.answer;
    console.log('check apology ' + this.widget.didApologize);
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

// FIXME to be handled elsewhere
/**
 * handles dynamically any change that should take place on the layout
 * when the orientation changes.
 * @prototype
 * @function changeOrientation
 **/
AnswerView.prototype.changeOrientation = function (o, w, h) {
    console.log("change orientation in answer view " + o + " , " + w + ", " + h);
    setAnswerWidth(o, w, h);
    setNumberInputWidth();
};

function setNumberInputWidth() {

    var questionpoolModel = this.app.models.questionpool;

    var questionType = questionpoolModel.getQuestionType();
    if (questionType == "assNumeric") {
        window_width = $(window).width();
        var inputwidth = window_width - 49 - 34 - 18; //49 is the width of the close button on the header
        $("#numberInput").css("width", inputwidth + "px");
    }
}