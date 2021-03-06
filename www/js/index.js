/**
 * THIS COMMENT MUST NOT REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Copyright: 2015 Mobinaut
 */

/*jslint white: true */
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */
/*jslint todo: true */

/*jslint unparam: true*/   // allow unused parameters in function signatures

/*global $, jQuery, Connection, jstap, device, UpdateModel*/

/**
 * @author Christian Glahn
 */

function MoblerCards() {
    var self = this;

    self.id = "org.mobinaut.mobler";

    self.development = true;
    // deactivate for production branches
    //self.development = false;

    self.viewId = "splash";

    // TODO Get the version information from the manifest files for the
    //      platforms
    self.MoblerVersion = 3.1;
    self.appLoaded = false;
    self.clickOutOfStatisticsIcon = true;

    self.backTap = 0; // needed for double tap

    if (device.platform === "iOS") {
        // the IOS UI is overlaying the app, so extra styles are required
        $('<link href="css/ios.css" rel="stylesheet" type="text/css">').appendTo("head");
    }
    if (device.platform === "Android") {
        var aV = device.version.split(".");
        aV.pop();

        // Old Android Versions also make trouble
        switch (aV.join(".")) {
            case "4.1":
            case "4.2":
            case "4.3":
                $('<link href="css/fixedScreen.css" rel="stylesheet" type="text/css">').appendTo("head");
                break;
            default:
                break;
        }
    }

   // var featuredContentId = FEATURED_CONTENT_ID;
   // var startTime = new Date().getTime();

    jstap().options({
        'tapTime': 1000,
        'swipeDistance': 100
    });

    $.ajaxSetup({
        cache: false
    });

    /**
     * @EVENT ID_PROFILE_OK
     *
     * Whenever a user profile arrives, we need to check if the app's language has to get changed.
     */
    $(document).bind("ID_PROFILE_OK", function() {
        self.setupLanguage();
    });

    // Double click to exit the Application.
    function onBack() {
        var date = new Date().getTime();

        if (date - self.backTap < 350) {
            navigator.app.exitApp();
        }
        else {
            self.backTap = date;
            self.rollbackView();
        }
    }

    document.addEventListener("backbutton", onBack, false);
}

/**
 * @static
 * @Constant MoblerCards.DefaultLMS
 *
 * points to the predefined LMS of the app.
 */
//MoblerCards.DefaultLMS = "https://beta.mobinaut.org";
MoblerCards.DefaultLMS = "https://mobler.mobinaut.io";

/**
 * @public @method resetSourceTrace
 *
 * removes all views from the interaction trajectory
 */
MoblerCards.prototype.resetSourceTrace = function (n) {
    var i;
    // pop one item from the stacktrace
    // this function is used by the feedback view
    for (i = 0; i < n; i++) {
        this.sourceTrace.pop();
    }
};

/**
 * @public @method previousView()
 *
 * returns the return view for the active view.
 *
 * This method is used by CoreApplication's back() method.
 */
MoblerCards.prototype.previousView = function () {
    var view;

    // assess the active view
    switch (this.viewId) {
        case "landing":
        case "splash":
            // there is no exit from the landing and the splash screen
            break;
        case "settings":
            view = "course";
            break;
        case "question":
            if (this.models.contentbroker.isAttempt()) {
                view = "answer";
            }
            else if (this.models.contentbroker.score >= 0) {
                view = "feedback";
            }
            else {
                view = this.sourceTrace[this.sourceTrace.length - 1];
            }
            break;
        case "course":
            view = "settings";
            break;
        default:
            view = this.sourceTrace[this.sourceTrace.length - 1];
            break;
    }

    return view;
};

/**
 * Returns the present connection state of the app.
 * @prototype
 * @function isOnline
 * @return {Boolean} true if the connection state is offline, otherwise false
 */
MoblerCards.prototype.isOnline = function () {
    var networkState = navigator.connection.type;

    if (networkState === Connection.NONE) {
        return false;
    }

    return true;
};

/**
 * @prototype
 * @function isOffline
 * @return {boolean} true if the connection state is offline, otherwise false
 **/
MoblerCards.prototype.isOffline = function () {
    return !this.isOnline();
};

MoblerCards.prototype.initialize = function () {

    var self = this;

    // setup helper references for the models
    this.models.contentbroker.idprovider    = this.models.identityprovider;
    this.models.contentbroker.lrs           = this.models.learningrecordstore;

    this.models.learningrecordstore.cbroker      = this.models.contentbroker;

    var kList = Object.getOwnPropertyNames(this.models);

    kList.forEach(function(m){
        this.models[m].app = this;
    }, this);

    this.setupLanguage();

    // setup the default LMS if not done so already (needed for initial launch)

    function cbDefaultLMS(evt, id) {
        if (!self.models.identityprovider.getActiveLMSID()) {
            self.models.identityprovider.activateLMS(id);
        }
        $(document).unbind(cbDefaultLMS);
    }

    // add default LMS
    // console.log("add default LMS " + MoblerCards.DefaultLMS);
    var rsd = this.models.identityprovider.hasLMS(MoblerCards.DefaultLMS);
    if (!rsd) {

        $(document).bind("LMS_AVAILABLE",
                         cbDefaultLMS);

        this.models.identityprovider.addLMS(MoblerCards.DefaultLMS);
    }
    else if (!self.models.identityprovider.getActiveLMSID()) {

        this.models.identityprovider.activateLMS(rsd.id);
    }

    $(document).trigger("APP_READY");
};

/**
 * @prototype
 * @function sessionHeader
 * @param {OBJECT} xhr
 *
 * Signs an active request with the active session header,
 * so the backend can authorize the client request.
 */
MoblerCards.prototype.sessionHeader = function (xhr) {

    this.models.identityprovider.sessionHeader(xhr);
};

/**
 * @prototype
 * @function serviceURL
 * @param {STRING} servicename
 * @param {ARRAY} path array (optional)
 *
 * returns the URL to the requested service protovol for the active
 * LMS. This function is a proxy to the identityprovider function
 */
MoblerCards.prototype.serviceURL = function (servicename, aPath) {

    return this.models.identityprovider.serviceURL(servicename,
                                                   null,
                                                   aPath);
};

/**
 * Changes to the correct view for authenticated and non-authenticated sessions
 * @prototype
 * @function chooseView
 * @param {STRING} authorizedViewName
 * @param {STRING} unauthorizedViewName
 */
MoblerCards.prototype.chooseView = function (authView, unauthView) {

    if (this.models.identityprovider.sessionState()) {

        this.changeView(authView);
    }
    else {

        this.changeView(unauthView);
    }
};


MoblerCards.prototype.openFirstView = function () {

    this.synchronizeAll(true);
    this.appLoaded = true;
    this.chooseView("course", "landing");

};

/**
 * @public @method synchronizeAll(bInit)
 *
 * triggers the data synchronization process during.
 *
 * bInit is set true only during the first tearup and should not be set for normal uses.
 */
MoblerCards.prototype.synchronizeAll = function (bInit) {

    this.models.identityprovider.synchronize();
    this.models.learningrecordstore.synchronize();
    this.models.contentbroker.synchronizeAll(!bInit);
};

/**
 * @public @method updateVersion()
 *
 * implements our own updateVersion.
 * The UpdateModel signals the UPDATE_DONE
 */
MoblerCards.prototype.updateVersion = function () {

    // set to 1 for testing the latest upgrading function, use 0 for app store versions
    UpdateModel.debug(0);
    UpdateModel.upgrade(this.MoblerVersion, this);
};

/**
 * Initial Interface logic localization. Sets the correct strings depending on the language that is specified in the configuration model.
 * Make use of i18n jQuery plugin and apply its syntax for localization.
 *
 * @prototype setupLanguage
 * */
MoblerCards.prototype.setupLanguage = function () {
    jQuery.i18n.properties({
        name: 'textualStrings',
        path: 'translations/',
        mode: 'both',
        language: this.models.identityprovider.getLanguage(),
        callback: function () { // initialize the static strings on all views
            Object.getOwnPropertyNames(jQuery.i18n.map).forEach(function (prop) {
                var p = prop.split("_"),
                    m = jQuery.i18n.prop(prop),
                    attr;

                // check for a valid prop message
                if (m) {
                    // use prefixes for indicating the message type
                    switch (p[0]) {
                        case "html":
                            $('#' + prop).html(m);
                            break;
                        case "attr":
                            p.pop();
                            attr = p.pop();
                            $('#' + prop).attr(attr, m);
                            break;
                        case "ico":
                            $('#' + prop).addClass(m);
                            break;
                        default:
                            $('#' + prop).text(m);
                            break;
                    }
                }
            });

            // TODO: fix Achievements View

            $("#stackHandlerIcon").addClass(jQuery.i18n.prop('ico_achievements_Handler_icon'));
            $("#stackHandlerTitle").text(jQuery.i18n.prop('msg_achievementsHandler_title'));
            $("#stackHandlerExplanation").text(jQuery.i18n.prop('msg_achievementsHandler_explanation'));
            $("#starterStackHandler").text(jQuery.i18n.prop('msg_achievements_text1'));
            $("#doneStackHandler").text(jQuery.i18n.prop('msg_achievements_text2'));
            $("#cardBurnerIcon").addClass(jQuery.i18n.prop('ico_achievements_Burner_icon'));
            $("#cardBurnerTitle").text(jQuery.i18n.prop('msg_achievementsBurner_title'));
            $("#cardBurnerExplanation").text(jQuery.i18n.prop('msg_achievementsBurner_explanation'));
            $("#starterCardBurner").text(jQuery.i18n.prop('msg_achievements_text1'));
            $("#doneCardBurner").text(jQuery.i18n.prop('msg_achievements_text2'));
        }
    });
};

/**
 * @prototype
 * @function getLoginState
 * @return {boolean} true if the user is logged in (he has an authentication key stored in the local storage) and false if not.
 **/
MoblerCards.prototype.getLoginState = function () {
    return this.models.identityprovider.sessionState();
};
