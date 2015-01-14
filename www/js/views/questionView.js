/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class QuestionView
 * View for displaying questions
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the question view
 *   such as title, body, done button
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the question text
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function QuestionView() {
    var self = this;

    this.tagID = this.app.viewId;
    var featuredContentId = FEATURED_CONTENT_ID;
    var returnButton = $('#CourseList_FromQuestion')[0];
    
    if (returnButton) {
        function cbReturnButtonTap(event, featuredContentId) {
            self.clickCourseListButton(featuredContentId);
        }

        jester(returnButton).tap(cbReturnButtonTap);
    }

    // center the question body to the middle of the screen
    function setOrientation() {
        $(".cardBody").css('height', window.innerHeight - 70);
        $(".cardBody").css('width', window.innerWidth - 100);

    }
    setOrientation();
    // when orientation changes, set the new width and height
    // resize event should be caught, too, because not all devices
    // send an orientationchange event
    window.addEventListener("orientationchange", setOrientation, false);
    window.addEventListener("resize", setOrientation, false);

    var prevent = false;

    /**It is triggered after statistics are loaded locally from the server. This can happen during the 
     * authentication or if we had clicked on the statistics icon and moved to the questions.
     * @event loadstatisticsfromserver
     * @param: a callback function that displays the question text and preventing the display of the statistics view
     */
    $(document).bind("loadstatisticsfromserver", function () {
        if ((self.tagID === self.app.activeView) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters load statistics from server is done in question view");
            self.showQuestionBody();
        }

    });

    /**It is triggered when the calculation of all the statistics metrics is done
     * @event allstatisticcalculationsdone
     * @param: a callback function that displays the answer body and preventing the display of the statistics view
     */
    $(document).bind("allstatisticcalculationsdone", function () {
        console.log("enters in calculations done in question view1 ");

        if ((self.tagID === self.app.activeView) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("enters in calculations done in question view 2 ");
            self.showQuestionBody();
        }
    });
}

QuestionView.prototype.prepare = function () {
    var featuredContentId = FEATURED_CONTENT_ID;
    this.showQuestionTitle();
    this.showQuestionBody();
    if (!this.app.models.answer.hasStarted()) {
        if (featuredContentId) {
            this.app.models.answer.startTimer(featuredContentId);
        } else {
            this.app.models.answer.startTimer(this.app.models.questionpool.getId());
        }
    }
};

QuestionView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[QuestionView] tap registered: " + id);
    
    if (id === "ButtonAnswer" ||
        id === "carQuestionBody" ||
        id === "cardQuestionHeader") {
        if (this.app.models.answer.answerScore > -1) {
            this.app.changeView("feedback");
        } else {
            this.app.changeView("answer");
        }
    }
};

QuestionView.prototype.pinch = function (event) {
    var id = event.target.id;
    
    if (id === "cardQuestionView") {
        if (this.app.getLoginState()) {
            this.app.changeView("course");
        } else {
            this.app.changeView("landing");
        }
    }
};

/**swipe shows a new question updates question body and title
 * @prototype
 * @function handleSwipe
 **/
QuestionView.prototype.swipe = function (event) {
    this.app.models.questionpool.nextQuestion();
    this.prepare();
};

/**shows the current question text
 * @prototype
 * @function showQuestionBody
 **/
QuestionView.prototype.showQuestionBody = function () {
    console.log("enter question view exclusive content");
    var currentQuestionBody = this.app.models.questionpool.getQuestionBody();
    console.log("current question body" + currentQuestionBody);
    $("#questionText").html(currentQuestionBody);
    $("#ButtonTip").hide();

};


/**shows the current question title and the corresponding icon
 * @prototype
 * @function showQuestionTitle
 **/
QuestionView.prototype.showQuestionTitle = function () {
    var currentQuestionType = this.app.models.questionpool.getQuestionType();

    $("#questionIcon").removeClass();
    $("#questionIcon").addClass(jQuery.i18n.prop('msg_' + currentQuestionType + '_icon'));

};

/**click on the course list button leads to course list
 * @prototype
 * @function clickCourseListButton
 **/
QuestionView.prototype.clickCourseListButton = function (featuredContentId) {
    this.app.models.answer.resetTimer();
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    } else {
        this.app.changeView("landing");
    }
};
