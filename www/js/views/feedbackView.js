/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** 
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/**
 * @Class FeedbackView
 * View for displaying the feedback
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the answer view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the feedback body
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function FeedbackView() {
    var self = this;

    this.tagID = this.app.viewId;
    
    // center the feedback body to the middle of the screen
    function setOrientation() {
        $(".cardBody").css('height', window.innerHeight - 70);
        $(".cardBody").css('width', window.innerWidth - 100);
        if (self.widget) {
            self.widget.setCorrectAnswerTickHeight();
        }
    }
    setOrientation();
    //when orientation changes, set the new width and height
    //resize event should be caught, too, because not all devices
    //send an orientation change even
    window.addEventListener("orientationchange", setOrientation, false);
    window.addEventListener("resize", setOrientation, false);

    /**It is triggered after statistics are loaded locally from the server. This can happen during the 
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the feedback body and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.app.isActiveView(self.tagID)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done in feedback view 1");
            self.showFeedbackBody();
        }
    });

    /**It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the feeback body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");
        if ((self.app.isActiveView(self.tagId)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in feedback view 2 ");
            self.showFeedbackBody();
        }
    });
} //end of constructor

/**hows feedback title and body
 * @prototype
 * @function open
 **/
FeedbackView.prototype.prepare = function () {
    // if (coming from answer view){
    if (this.app.models.answer.answerScore == -1) {
        console.log("feedbackview opened after returning from answerview");
        this.app.models.answer.calculateScore();
    }

    this.showFeedbackBody();
    this.showFeedbackTitle();

    console.log("feedback open");
    this.widget.setCorrectAnswerTickHeight();
    this.app.resizeHandler();
};

/**Closing of the feedback view
 * @prototype
 * @function close
 **/
FeedbackView.prototype.cleanup = function () {
    $("#feedbackBody").empty();
    $("#feedbackTip").empty();
};

/**
 * No action is executed when taping on the feedback view
 * @prototype
 * @function handleTap
 **/
FeedbackView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[FeedbackView] tap registered: " + id);
    
    if (id === "FeedbackDoneButon") {
        this.clickFeedbackDoneButton();
    }
    else if (id === "FeedbackMore") {
        this.clickFeedbackMore();
    }
    else if (id === "CourseList_FromFeedback") {
        this.app.models.answer.answerList = [];
        this.app.models.answer.answerScore = -1;
        this.clickCourseListButton();
    }
    else if (id === "cardFeedbackTitle") {
        this.clickTitleArea();
    }
}

/**
 * swipe leads to new question
 * @prototype
 * @function handleSwipe
 **/
FeedbackView.prototype.swipe = function () {
    this.clickFeedbackDoneButton();
    //	app.models["answers"].deleteData();
    //	$("#feedbackTip").empty();
    //	$("#feedbackTip").hide();
    //	$("#feedbackBody").show();
    //	app.models['questionpool'].nextQuestion();
    //	app.transitionToQuestion();
};

/**Transition to courses list view when pinching on the feedback view. 
 * This  is executed only on the iPhone.
 * @prototype
 * @function handlePinch
 **/
FeedbackView.prototype.pinch = function () {
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    } else {
        this.app.changeView("landing");
    }
};

/**click on feedback done button leads to new question
 * @prototype
 * @function clickFeedbackDoneButton
 **/
FeedbackView.prototype.clickFeedbackDoneButton = function () {
    this.app.models.answer.deleteData();
    $("#feedbackTipBody").hide();
    $("#feedbackBody").show();
    this.app.models.questionpool.nextQuestion();
    this.app.changeView("question");
};


/**click on feedback more button toggles the feedback body and the tip
 * @prototype
 * @function clickFeedbackMore
 **/
FeedbackView.prototype.clickFeedbackMore = function () {
    $("#feedbackBody").toggle();
    console.log("closed feedback normal");
    $("#feedbackTipBody").toggle();
};



/**click on the course list button leads to course list
 * @prototype
 * @function clickCourseListButton
 **/
FeedbackView.prototype.clickCourseListButton = function () {
    this.app.models.answer.deleteData();
    
    $("#feedbackTip").empty();
    $("#feedbackTipBody").hide();
    $("#feedbackBody").show();
    
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    } else {
        this.app.changeView("landing");
    }
};


/**Shows the title area of the feedback view,
 * containing title and corresponding icon
 * @prototype
 * @function showFeedbackTitle
 **/
FeedbackView.prototype.showFeedbackTitle = function () {
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    $("#cardFeedbackTitle").text(jQuery.i18n.prop('msg_' + currentFeedbackTitle + 'Results_title'));
    $("#feedbackIcon").attr('class', jQuery.i18n.prop('msg_' + currentFeedbackTitle + '_icon'));
};


/**Calls the appropriate widget to show the feedback body
 * based on the specific question type
 * It is displayed within the main body area of the feedback view
 * @prototype
 * @function showFeedbackBody
 **/
FeedbackView.prototype.showFeedbackBody = function () {
    var questionpoolModel = this.app.models.questionpool;
    var questionType = questionpoolModel.getQuestionType();
    var interactive = false;
    switch (questionType) {
    case 'assSingleChoice':
        this.widget = new SingleChoiceWidget(interactive);
        break;
    case 'assMultipleChoice':
        this.widget = new MultipleChoiceWidget(interactive);
        break;
    case 'assNumeric':
        this.widget = new NumericQuestionWidget(interactive);
        break;
    case 'assOrderingHorizontal':
    case 'assOrderingQuestion':
        this.widget = new TextSortWidget(interactive);
        break;
    case 'assClozeTest':
        this.widget = new ClozeQuestionType(interactive);
        break;
    default:
        console.log("didn't find questiontype");
        break;
    }

    // show feedback more information, which is the same for all kinds of questions
    $("#FeedbackMore").hide();

    var feedbackText = questionpoolModel.getWrongFeedback();
    var currentFeedbackTitle = this.app.models.answer.getAnswerResults();

    if (currentFeedbackTitle === "Excellent") {
        //gets correct feedback text
        feedbackText = questionpoolModel.getCorrectFeedback();
    }

    if (feedbackText && feedbackText.length > 0) {
        //$("#feedbackTip").text(feedbackText);
        $("#feedbackTip").html(feedbackText);
        $("#FeedbackMore").show();
    }
};

/**Transition back to question view when click on the title area
 * @prototype
 * @function clickTitleArea
 **/
FeedbackView.prototype.clickTitleArea = function () {
    this.app.models.answer.answerScore = -1;
    this.app.changeView("question");
};

/**
 * handles dynamically any change that should take place on the layout
 * when the orientation changes.
 * @prototype
 * @function changeOrientation
 **/
FeedbackView.prototype.changeOrientation = function (o, w, h) {
    console.log("change orientation in answer view " + o + " , " + w + ", " + h);
    setFeedbackWidth(o, w, h);
};