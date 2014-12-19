/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

function MoblerCards() {
    var self = this;

    self.viewId = "splash";
    self.MoblerVersion = 2.0;
    self.appLoaded = false;
    self.clickOutOfStatisticsIcon = true;
    
    var featuredContentId = FEATURED_CONTENT_ID;
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
    
    document.addEventListener('pause', function (ev) {
        self.onPause(ev);
    }, false);

    document.addEventListener('resume', function (ev) {
        self.onResume(ev);
    }, false);

    document.addEventListener('backbutton', function (ev) {
        self.onBack(ev);
    }, false);

    $(document).bind("allstatisticcalculationsdone", function (featuredContentId) {
        console.log("all statistics calculations done is ready");
        // if the user has clicked anywhere else in the meantime, then the transition to statistics view should not take place
        if (!self.checkclickOutOfStatisticsIcon()) {
            console.log("transition to statistics because all calculations have been done");
            self.changeView("statistics", featuredContentId);
        } else {
            console.log("transition to statistics is not feasible because the user has clicked elsewhere");
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
            self.changeView("login"); // or we can stay on the current view i.e. lms view, landing view or login view
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
            self.changeView("login");
        } else if (self.appLoaded && self.activeView === self.views.splash) {
            console.log("transition to login view after the default server has been registered");
            self.changeView("landing");
        }
    });
}

MoblerCards.prototype.onPause = function () {};

MoblerCards.prototype.onResume = function () {};

MoblerCards.prototype.onBack = function () {};

MoblerCards.prototype.openFirstView = function () {
    this.initBasics();
    this.appLoaded = true;
    this.changeView("landing");
};

MoblerCards.prototype.initBasics = function () {
    this.models.connection.synchronizeData();
    this.models.configuration.loadFromServer();
};

MoblerCards.prototype.checkVersion = function () {
    var presentVersion = localStorage.getItem("MoblerVersion");
    if (!presentVersion || presentVersion !== this.MoblerVersion) {
        this.migrate(presentVersion); //upgrade to the latest version
    }
};

MoblerCards.prototype.migrate = function (thisVersion) {
    var self = this;

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
            configuration = JSON.parse(configurationObject);
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
        language: this.models.configuration.getLanguage(),
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
        this.models.statistics.setCurrentCourseId(courseID);
        if (!this.models.statistics.dataAvailable()) {
            this.changeView("landing");
        }
    } else if (achievementsFlag) {
        this.changeView("statistics", achievementsFlag);
    }
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
    return this.models.connection.isOffline();
};

/**
 * @prototype
 * @function getActiveClientKey
 * @return {String} activeClientKey, the client key of the activated server
 **/
// TODO: Refactor all models to use the term RequestToken in the future
MoblerCards.prototype.getActiveClientKey = function () {
    return this.models.lms.getActiveRequestToken();
};

/**
 * @prototype
 * @function getActiveURL
 * @return {String} url, url of the active server
 **/
MoblerCards.prototype.getActiveURL = function () {
    return this.models.lms.getActiveServerURL();
};

/**
 * @prototype
 * @function getActiveLogo
 * @return {String} url, url of the image of the active server
 **/
MoblerCards.prototype.getActiveLogo = function () {
    return this.models.lms.getActiveServerImage();
};

/**
 * @prototype
 * @function getActiveLabel
 * @return {String} label, the label of the active server
 **/
MoblerCards.prototype.getActiveLabel = function () {
    return this.models.lms.getActiveServerLabel();
};

/**
 * @prototype
 * @function getConfigVariable
 * @param {String} varname, the name of the
 * @return {String} It returns the name of the added property of the configuration object.
 **/
MoblerCards.prototype.getConfigVariable = function (varname) {
    return this.models.configuration.configuration[varname];
};

/**
 * It adds a property in the local storage for the configuration object and assigns a value to it.
 * @prototype
 * @function setConfigVariable
 * @param {String} varname, {Boolean, String} varvalue
 **/
MoblerCards.prototype.setConfigVariable = function (varname, varvalue) {
    if (!this.models.configuration.configuration) {
        this.models.configuration.configuration = {};
    }
    this.models.configuration.configuration[varname] = varvalue;
    this.models.configuration.storeData();
};

MoblerCards.prototype.resizeHandler = function () {
    //   new Orientation Layout
    var orientationLayout = false; // e.g. Portrait mode
    var w = $(window).width(),
        h = $(window).height();
    if (w / h > 1) {
        orientationLayout = true;
        console.log("we are in landscape mode");
    } // e.g. Landscape mode
    // window.width / window.height > 1 portrait
//    this.activeView.changeOrientation(orientationLayout, w, h);
};

/**
 * Checks if any other element of the view has been tapped/clicked
 * after the statistics icon  has been clicked in either the course list view or landing view.
 * @prototype
 * @function checkclickOutOfStatisticsIcon
 * @return {Boolean}, true or false.  It returns true if any other element has been clicked, and false if only the statistics icon has been clicked and the user is waiting.
 */
MoblerCards.prototype.checkclickOutOfStatisticsIcon = function () {
    console.log("check click out of statistics icon is" + this.clickOutOfStatisticsIcon);
    return this.clickOutOfStatisticsIcon;
};


MoblerCards.prototype.injectStyle = function () {
    console.log("enter inject Style");
    var h = $(window).height(),
        w = $(window).width();

    if (h < w) { // oops we are in ladscape mode
        var t = w;
        w = h;
        h = t;
    }

    // calculate the heights once and forever. 
    var cfl = w - 54,
        cfp = h - 54,
        cl = w - 102,
        cp = h - 108;
    var style;

    style = '@media all and (orientation:portrait) { ';
    style += '   .content { height: ' + cp + "px; }";
    style += '   .content.full { height: ' + cfp + "px; }";
    style += "} ";
    style += '@media all and (orientation:landscape) { ';
    style += '   .content { height: ' + cl + "px; }";
    style += '   .content.full { height: ' + cfl + "px; }";
    style += "} ";

    var e = $('<style/>', {
        'type': 'text/css',
        'text': style
    });

    $('head').append(e);
}

/**
 * 	Does the aproropriate calculations when we click on a course item
 * 	either it is featured content or exclusive content.
 *  and after loading the data and setting the correct course id we do
 *  the transiton to the question view as long as we have valid data.
 *  @function selectCourseItem
 * 	@ param{string or number}, courseId, the id of the current course
 * */
MoblerCards.prototype.selectCourseItem = function (courseId) {
    this.models.questionpool.reset(); 
    //add it within the loadData, similar with statistics (setcurrentCourseId function)...
    this.models.questionpool.loadData(courseId);
    if (this.models.questionpool.dataAvailable()) {
        this.models.answer.setCurrentCourseId(courseId);
        console.log("enters clickFeauturedItem");
        this.changeView("question");
    } else {
        console.log("[ERROR]@selectCourseItem()");
    }
}