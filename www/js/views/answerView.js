/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

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
    
    var featuredContentId = FEATURED_CONTENT_ID;

    /**It is triggered after statistics are loaded locally from the server. This can happen during the 
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.app.isActiveView(self.tagID)) && 
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
        if ((self.app.isActiveView(self.tagID)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in  answer view 2 ");
            self.showAnswerBody();
        }
    });
}

/**Opening of answer view. The parts of the container div element that are loaded dynamically 
 * are explicitly defined/created here
 * @prototype
 * @function open
 **/
AnswerView.prototype.prepare = function (featuredContent_id) {
    this.showAnswerTitle();
    this.showAnswerBody();
};

AnswerView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[AnswerView] tap registered: " + id);
    
    if (id === "answerclose") {
        if (this.app.getLoginState()) {
            this.app.changeView("course");
        } else {
            this.app.changeView("landing");
        }
    } 
    else if (id === "answerbutton") {
        this.clickDoneButton();
    }
    else if (id === "answertitle" || id === "answericon") {
        this.widget.storeAnswers();
        this.app.changeView("question");
    };
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
