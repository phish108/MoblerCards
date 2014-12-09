function MoblerCards() {
    var self = this;

    self.viewId = "login";
    self.MoblerVersion = 2.0;
    self.appLoaded = false;
    self.clickOutOfStatisticsIcon = true;
    
    var startTime = new Date().getTime();

    jester().options({
        'avoidDoubleTap': true,
        'tapTime': 1000,
        'swipeDistance': 100,
        'avoidFlick': true
    });
    
    $.ajaxSetup({
        cache: false
    });
}

//Class.extend(MoblerCards, CoreApplication);

MoblerCards.prototype.bindEvents = function () {
    var self = this;

    document.addEventListener('pause', function (ev) {
        self.onPause(ev);
    }, false);
    
    document.addEventListener('resume', function (ev) {
        self.onResume(ev);
    }, false);
    
    document.addEventListener('backbutton', function (ev) {
        self.onBack(ev);
    }, false);
    
    $(document).bind("allstatisticcalculationsdone", function (featuredContent_id) {
        console.log("all statistics calculations done is ready");
        // if the user has clicked anywhere else in the meantime, then the transition to statistics view should not take place
        if (!self.checkclickOutOfStatisticsIcon()) {
            console.log("transition to statistics because all calculations have been done");
            self.transition('statisticsView', featuredContent_id);
        } else {
            console.log("transition to statistics is not feasible because the user has clicked elsewhere else");
        }
    });

    /**
     * This event is triggered  when statistics are sent to the server during
     * a)loggout b)synchronization.
     * When are not LOGGED IN (=logged out) and have open the login form and listen to this
     * event, we want to stay in the login form.
     * @event statisticssenttoserver
     * @param a callback function that loads the login form
     */
    $(document).bind("statisticssenttoserver", function () {
        if (!self.getLoginState()) {
            console.log("stays in login view, despite the synchronization of sent statistics");
            //	self.transitionToLogin();
        }
    });

    /**
     * This event is triggered  when questions are loaded from the server. It is
     * binded also in courses list view and we want to avoid loading that view.
     * For that reason we check IF WE ARE  not LOGGED IN(=logged out) in order to show the login form.
     * @event questionpoolready
     * @param a callback function that loads the login form
     */
    $(document).bind("questionpoolready", function () {
        if (!self.getLoginState()) {
            console.log("stays in login view, despite the synchronization of questionpool ready");
            self.transitionToLogin(); // or we can stay on the current view i.e. lms view, landing view or login view
        }
    });

    /**
     * This event is triggered  when courses are loaded from the server. It is
     * binded also in courses list view and we want to avoid loading of that view.
     * For that reason we check IF WE ARE not LOGGED IN (=logged out)in order to show the login form.
     * @event courselistupdate
     * @param a callback function that loads the login form
     */
    $(document).bind("courselistupdate", function () {
        if (!self.getLoginState()) {
            console.log("stays in login view, despite the courses synchronization updates");
            //self.transitionToLogin();
            // or we can stay on the current view i.e. lms view, landing view or login view
        }
    });

    $(document).bind("activeServerReady", function () {
        if (self.appLoaded && self.activeView === self.views.lms) {
            console.log("transition to login view after selecting server in lms view");
            self.transitionToLogin();
        } else if (self.appLoaded && self.activeView === self.views.splashScreen) {
            console.log("transition to login view after the default server has been registered");
            self.transitionToLanding();
        }
    });
    
    $(document).bind("click", function (e) {
        console.log(" click in login view ");
        e.preventDefault();
        e.stopPropagation();
    });
};

MoblerCards.prototype.onPause = function () {

};

MoblerCards.prototype.onResume = function () {

};

MoblerCards.prototype.onBack = function () {

};

MoblerCards.prototype.openFirstView = function () {
    this.initBasics();
    
    this.appLoaded = true;
    this.transitionToAuthArea("coursesList");
};

MoblerCards.prototype.initBasics = function () {
    this.featuredContentId = FEATURED_CONTENT_ID;
    this.models.connectionstate.synchronizeData();
    this.models.configuration.loadFromServer();
};

MoblerCards.prototype.checkVersion = function () {
    var presentVersion = localStorage.getItem("MoblerVersion");
    if (!presentVersion || presentVersion !== self.MoblerVersion) {
        this.migrate(presentVersion); //upgrade to the latest version
    }
};

MoblerCards.prototype.migrate = function (thisVersion) {
    if (!thisVersion) {
        thisVersion = 1;
    }

    if (thisVersion < 2) {
        this.migrateTo2();
    }

    localStorage.setItem("MoblerVersion", self.MoblerVersion);
};

MoblerCards.prototype.migrateTo2 = function () {
    var configuration;
    try {
        //configuration=JSON.parse(localStorage.getItem("configuration"));
        var configurationObject = localStorage.getItem("configuration");
        if (configurationObject) {
            var configuration = JSON.parse(configurationObject);
        }
    } catch (err) {
        console.log("error! while loading configuration in migration");
    }
    var language = navigator.language.split("-");
    var language_root = (language[0]);
    if (configuration && configuration.appAuthenticationKey) {
        console.log("app authentication key exists in configuration object");
        //create the new structure for the lms object
        var lmsObject = {
            "activeServer": "hornet",
            "ServerData": {
                "hornet": {
                    //and store there the authentication key
                    "requestToken": configuration.appAuthenticationKey,
                    "defaultLanguage": language_root
                }
            }
        }

        delete configuration.appAuthenticationKey;
        //var configurationObject=localStorage.getItem("configuration");
        //localStorage.setItem("configuration", JSON.stringify(localStorage.getItem("configuration")));
        localStorage.setItem("configuration", JSON.stringify(configuration));
        console.log("configuration object after delete of appAuthenticationKey " + localStorage.getItem("configuration"));
        localStorage.setItem("urlsToLMS", JSON.stringify(lmsObject));
    }

    if (!configuration) {
        console.log("configuration object didn't exist during the migration");
        var configurationObject = {
            loginState: "loggedOut",
            statisticsLoaded: "false"
        }
        localStorage.setItem("configuration", JSON.stringify(configurationObject));
    }
};

/**
 * Initial Interface logic localization. Sets the correct strings depending on the language that is specified in the configuration model.
 * Make use of i18n jQuery plugin and apply its syntax for localization.
 * @prototype setupLanguage
 * */
MoblerCards.prototype.setupLanguage = function () {
    jQuery.i18n.properties({
        name: 'textualStrings',
        path: 'translations/',
        mode: 'both',
        language: this.models.authentication.getLanguage(),
        callback: function () { // initialize the static strings on all views
            $("#usernameInput").attr("placeholder", msg_placeholder_username);
            $("#numberInput").attr("placeholder", msg_placeholder_numberinput);
            $("#password").attr("placeholder", msg_placeholder_password);
            $("#coursesListTitle").text(msg_courses_list_title);
            $("#lmsListTitle").text(msg_lms_list_title);
            $("#settingsTitle").text(msg_settings_title);
            $("#logoutConfirmationTitle").text(msg_logout_title);
            $("#statBestDayTitle").text(msg_bestDay_title);
            $("#statBestScoreTitle").text(msg_bestScore_title);
            $("#statsBestScoreInfo").text(msg_bestScore_info);
            $("#achievementsReference").text(msg_achievements_reference);
            $("#statHandledCardsTitle").text(msg_handledCards_title);
            $("#statAverageScoreTitle").text(msg_averageScore_title);
            $("#statProgressTitle").text(msg_progress_title);
            $("#statsProgressInfo").text(msg_progress_info);
            $("#statSpeedTitle").text(msg_speed_title);
            //$("#statsSpeedinfo").text(msg_speed_info);
            $("#achievementsTitle").text(msg_achievements_title);
            $("#stackHandlerIcon").addClass(msg_achievements_Handler_icon);
            $("#stackHandlerTitle").text(msg_achievementsHandler_title);
            $("#stackHandlerExplanation").text(msg_achievementsHandler_explanation);
            $("#starterStackHandler").text(msg_achievements_text1);
            $("#loadingMessage").text(msg_loading_message);
            $("#loadingMessageAchievements").text(msg_achievementsLoading_message);
            $("#doneStackHandler").text(msg_achievements_text2);
            $("#cardBurnerIcon").addClass(msg_achievements_Burner_icon);
            $("#cardBurnerTitle").text(msg_achievementsBurner_title);
            $("#cardBurnerExplanation").text(msg_achievementsBurner_explanation);
            $("#starterCardBurner").text(msg_achievements_text1);
            $("#doneCardBurner").text(msg_achievements_text2);
            $("#aboutTitle").text(msg_about_title);
            $("#logoutText").text(msg_logout_body);
            $("#nameLabelSet").text(jQuery.i18n.prop('msg_fullname'));
            $("#usernameLabelSet").text(jQuery.i18n.prop('msg_username'));
            $("#emailLabelSet").text(jQuery.i18n.prop('msg_email'));
            $("#languageLabelSet").text(jQuery.i18n.prop('msg_language'));
            $("#copyright").text(jQuery.i18n.prop('msg_copyright'));
            $("#openSource").text(jQuery.i18n.prop('msg_openSource'));
            $("#license").text(jQuery.i18n.prop('msg_license'));
            $("#cardQuestionTitle").text(jQuery.i18n.prop('msg_question_title'));
        }
    });
};

/**
 * Closes the current view and opens the specified one
 * @prototype
 * @function transition
 * @param {String} viewname, the name of the specified target view
 **/
MoblerCards.prototype.transition = function (viewname, fd, achievementsFlag) {
    console.log("transition start to " + viewname);
    // Check if the current active view exists and either if it is different from the targeted view or if it is the landing view
    if (this.views[viewname] && (viewname === "landing" || this.activeView.tagID !== this.views[viewname].tagID)) {
        console.log("transition: yes we can!");
        this.activeView.close();
        this.activeView = this.views[viewname];
        //clear all flags that are needed for waiting for model processing
        //currently only used by the statistics model
        this.clickOutOfStatisticsIcon = true;
        this.activeView.open(fd, achievementsFlag);
    }
};

/**
 * It  navigates to the first view that is shown after the the constructor has been initialized and has reached its end point.
 * If a user is already logged in, the course list is shown otherwise the login form is shown.
 * @prototype
 * @function transitionToEndpoint
 **/
MoblerCards.prototype.transitionToEndpoint = function () {
    console.log('initialize endpoint');
    this.appLoaded = true;
    this.transitionToAuthArea("coursesList");
};

/**
 * Transition to login view.
 * @prototype
 * @function transitionToLogin
 **/
MoblerCards.prototype.transitionToLogin = function () {
    console.log("enter transitionToLogin in controller");
    if (this.appLoaded) {
        moblerlog("the app is loaded in transition to login in controller");
        this.transition('login');

    }
};

MoblerCards.prototype.transitionToLanding = function () {
    console.log("enter controller transition to landing view in controller");
    this.transition('landing');
};

/**
 * Transition to lms view.
 * @prototype
 * @function transitionToLogin
 **/
MoblerCards.prototype.transitionToLMS = function () {
    console.log("enter controller transition to LMS");
    this.transition('lms');
};

/**
 * Transition to logout view
 * @prototype
 * @function transitionToLogout
 **/
MoblerCards.prototype.transitionToLogout = function () {
    this.transitionToAuthArea('logout');
};

/**
 * Helper function that handles the transition to the specified targeted view by firstly checking if the user is logged in.
 * If the user is not logged in the transition reaches the login view
 * @prototype
 * @function transitionToAuthArea
 * @param {String} viewname, the name of the targeted view
 **/
MoblerCards.prototype.transitionToAuthArea = function (viewname, featuredContentFlag) {
    if (this.getLoginState()) {
        this.transition(viewname);
    } else {
//        stay on the current view if we are not logged in 0
        this.transitionToLanding();
    }
};

/**
 * Transition to courses list view
 * @prototype
 * @function transitionToCourses
 **/
MoblerCards.prototype.transitionToCourses = function () {
    this.transitionToAuthArea('coursesList');
};

/**
 * Transition to question view
 * @prototype
 * @function transitionToQuestion
 **/
MoblerCards.prototype.transitionToQuestion = function () {
    console.log("enters transition to question in controller");
    //this.transitionToAuthArea('questionView',fd);
    this.transition('questionView');
};

/**
 * Transition to answer view
 * @prototype
 * @function transitionToAnswer
 **/
MoblerCards.prototype.transitionToAnswer = function () {
    console.log("enters transition to answer view in controller");
    this.transition('answerView');
};

/**
 * Transition to feedback view
 * @prototype
 * @function transitionToFeedback
 **/
MoblerCards.prototype.transitionToFeedback = function () {
    this.transition('feedbackView');
};

/**
 * Transition to settings view
 * @prototype
 * @function transitionToSettings
 **/
MoblerCards.prototype.transitionToSettings = function () {
    this.transitionToAuthArea('settings');
};

/**
 * Transition to feedback more view, which is the view that contains any extra tips about the feedback.
 * @prototype
 * @function transitionToFeedbackMore
 **/
MoblerCards.prototype.transitionToFeedbackMore = function () {
    this.transition('feedbackMore');
};

/**
 * Transition to statistics view. The user can reach the statistics view in two ways: 1) either by clicking the statistics icon on the course list view or  2) from the achievements view.
 * TODO: Refactoring of the function
 * @prototype
 * @function transitionToStatistics
 **/
MoblerCards.prototype.transitionToStatistics = function (courseID, achievementsFlag) {
    //set the statistics waiting flag
    this.clickOutOfStatisticsIcon = false;

    //The transition to statistics view is done by clicking the statistics icon in any list view. 
    //In this case a courseID is assigned for the clicked option.

    if ((courseID && (courseID > 0 || courseID === "fd")) || !achievementsFlag) {
        this.models['statistics'].setCurrentCourseId(courseID);
        if (!this.models['statistics'].dataAvailable()) {
            this.transition("landing");
        }
    } else if (achievementsFlag) {
        this.transition("statisticsView", achievementsFlag);
    }
};

/**
 * Transition to achievements view
 * @prototype
 * @function transitionToAchievements
 **/
MoblerCards.prototype.transitionToAchievements = function (courseID) {
    this.transition('achievements', courseID);
};

/**
 * Transition to about view
 * @prototype
 * @function transitionToAbout
 **/
MoblerCards.prototype.transitionToAbout = function () {
    this.transitionToAuthArea('about');
};

/**
 * @prototype
 * @function getLoginState
 * @return {boolean} true if the user is logged in (he has an authentication key stored in the local storage) and false if not.
 **/
MoblerCards.prototype.getLoginState = function () {
    return this.models.configuration.isLoggedIn();
};

/**
 * @prototype
 * @function isOffline
 * @return {boolean} true if the connection state is offline, otherwise false
 **/
MoblerCards.prototype.isOffline = function () {
    return this.models.connectionstate.isOffline();
};

/**
 * @prototype
 * @function getActiveClientKey
 * @return {String} activeClientKey, the client key of the activated server
 **/
// TODO: Refactor all models to use the term RequestToken in the future
MoblerCards.prototype.getActiveClientKey = function () {
    return this.models["lms"].getActiveRequestToken();
};

/**
 * @prototype
 * @function getActiveURL
 * @return {String} url, url of the active server
 **/
MoblerCards.prototype.getActiveURL = function () {
    return this.models["lms"].getActiveServerURL();
};

/**
 * @prototype
 * @function getActiveLogo
 * @return {String} url, url of the image of the active server
 **/
MoblerCards.prototype.getActiveLogo = function () {
    return this.models["lms"].getActiveServerImage();
};

/**
 * @prototype
 * @function getActiveLabel
 * @return {String} label, the label of the active server
 **/
MoblerCards.prototype.getActiveLabel = function () {
    return this.models["lms"].getActiveServerLabel();
};

/**
 * @prototype
 * @function getConfigVariable
 * @param {String} varname, the name of the
 * @return {String} It returns the name of the added property of the configuration object.
 **/
MoblerCards.prototype.getConfigVariable = function (varname) {
    return this.models["authentication"].configuration[varname];
};

/**
 * It adds a property in the local storage for the configuration object and assigns a value to it.
 * @prototype
 * @function setConfigVariable
 * @param {String} varname, {Boolean, String} varvalue
 **/
MoblerCards.prototype.setConfigVariable = function (varname, varvalue) {
    if (!this.models["authentication"].configuration) {
        this.models["authentication"].configuration = {};
    }
    this.models["authentication"].configuration[varname] = varvalue;
    this.models["authentication"].storeData();
};

MoblerCards.prototype.resizeHandler = function () {
    //   new Orientation Layout
    var orientationLayout = false; // e.g. Portrait mode
    var w = $(window).width(),
        h = $(window).height();
    if (w / h > 1) {
        orientationLayout = true;
        moblerlog("we are in landscape mode");
    } // e.g. Landscape mode
    // window.width / window.height > 1 portrait
    this.activeView.changeOrientation(orientationLayout, w, h);
};

/**
 * Checks if any other element of the view has been tapped/clicked
 * after the statistics icon  has been clicked in either the course list view or landing view.
 * @prototype
 * @function checkclickOutOfStatisticsIcon
 * @return {Boolean}, true or false.  It returns true if any other element has been clicked, and false if only the statistics icon has been clicked and the user is waiting.
 */
MoblerCards.prototype.checkclickOutOfStatisticsIcon = function () {
    moblerlog("check click out of statistics icon is" + this.clickOutOfStatisticsIcon);
    return this.clickOutOfStatisticsIcon;
}

var app = new MoblerCards();