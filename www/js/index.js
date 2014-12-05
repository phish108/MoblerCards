function MoblerCards() {
    var self = this;
    
    self.viewId = "splashScreen";
    self.MoblerVersion = 2.0;
    self.appLoaded = false;
    self.clickOutOfStatisticsIcon = true;
    
    var startTime = new Date().getTime();
//    var featuredContent_id = FEATURED_CONTENT_ID;
    var presentVersion = localStorage.getItem("MoblerVersion");
    
    document.addEventListener('pause', function (ev) {self.onPause(ev);} , false);
    document.addEventListener('resume', function (ev) {self.onResume(ev);}, false);
    document.addEventListener('backbutton', function (ev) {self.onBack(ev);}, false);
    
    this.init();
}

MoblerCards.prototype.init = function () {
    console.log("init mc");    
//    this.setupLanguage();
};

MoblerCards.prototype.onPause = function () {
    
};

MoblerCards.prototype.onResume = function () {
    
};

MoblerCards.prototype.onBack = function () {
    
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

var app = new MoblerCards();
