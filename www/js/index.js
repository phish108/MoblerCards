/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */

/*global $, jQuery, Connection, jstap*/

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
    self.MoblerVersion = 3.0;
    self.appLoaded = false;
    self.clickOutOfStatisticsIcon = true;

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
    this.models.contentbroker.idprovider         = this.models.identityprovider;
    this.models.contentbroker.lrs                = this.models.learningrecordstore;

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
    this.initBasics();

    this.appLoaded = true;
    this.chooseView("course", "landing");
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
