/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */

/*global $, jQuery, Connection, jstap, device, UpdateModel*/

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
 * @author Christian Glahn
 */

function MoblerCards() {
    var self = this;

    self.id = "org.mobinaut.mobler";

    self.development = true;
    // deactivate for production branches
    //self.development = false;

    self.viewId = "splash";
    self.lastView = null;

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

MoblerCards.prototype.resetSourceTrace = function (n) {
    // pop one item from the stacktrace
    // this function is used by the feedback view
    for (var i = 0; i < n; i++) {
        this.sourceTrace.pop();
    }
};

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
        case "course":
            view = "settings";
            break;
        default:
            view = this.sourceTrace.pop();
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

    // setup the models
    this.models.contentbroker.idprovider    = this.models.identityprovider;
    this.models.contentbroker.lrs           = this.models.learningrecordstore;

    this.models.learningrecordstore.cbroker      = this.models.contentbroker;

    var kList = Object.getOwnPropertyNames(this.models);

    kList.forEach(function(m){
        this.models[m].app = this;
    }, this);

    this.setupLanguage();

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
    return this.models.identityprovider.serviceURL(servicename, null, aPath);
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
    var self = this;

    $(document).bind("UPDATE_DONE", function () {
        self.initBasics();
        self.appLoaded = true;
        self.chooseView("course", "landing");
    });

    // set to 1 for testing the latest upgrading function, use 0 for app store versions
    UpdateModel.debug(0);
    UpdateModel.upgrade(this.MoblerVersion, this);
};

MoblerCards.prototype.initBasics = function () {
    this.models.identityprovider.synchronize();
    this.models.learningrecordstore.synchronize();
    this.models.contentbroker.synchronize();
};

MoblerCards.prototype.synchronizeAll = function () {
    this.models.identityprovider.synchronize();
    this.models.learningrecordstore.synchronize();
    this.models.contentbroker.synchronizeAll(true);
};

MoblerCards.prototype.checkVersion = function () {
    var presentVersion = localStorage.getItem("MoblerVersion");
    if (!presentVersion || presentVersion !== this.MoblerVersion) {
        this.migrate(presentVersion); //upgrade to the latest version
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
