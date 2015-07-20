/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */
/*global $, faultylabs, LMSModel, UserModel*/

/**	THIS LICENSE INFORMATION MUST REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements.  See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.  The
 *  ASF licenses this file to you under the Apache License, Version 2.0 (the
 *  "License"); you may not use this file except in compliance with the
 *  License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 *  License for the specific language governing permissions and limitations
 *  under the License.
 */

/**
 * @author Christian Glahn
 * @author Dijan Helbling
 */

/**
 * This model manages all LMS connections and the login state per
 * service and server.
 *
 * The IdentityProvider is used by the user and LMS connection-related views.
 *
 * The Identity Provider Integrates all connection related operations,
 *  including the LMS Connection, Service Authentication, User
 *  Authentication, and User Preferences.
 */

function IdentityProvider (app) {
    this.app      = app;
    this.lrs      = app.models.learningrecordstore;
    this.content  = app.models.contentbroker;

    var language  = navigator.language.split("-");
    this.language = language ? language[0] : "en";

    this.lmsMgr = new LMSModel(app);
    this.usrMgr = new UserModel(app);
}

/****** LMS Management ******/
/**
 * The LMS Management provides a front-end for the LMSModel Class.
 */

/**
 * @protoype
 * @function getLMSList
 * @param {STRING} callbackFunction
 * @return {OBJECT} bind
 *
 * Iterates through the list of registered LMSes and calls
 * the callbackFunction for each LMS in the list.
 *
 * The callback receives an object with 5 elements
 *
 * 1. the LMS id
 * 2. the LMS name
 * 3. The LMS logofile (optional)
 * 4. The LMS connection state
 * 5. The LMS selection state
 *
 * The selection state represents the users last LMS selection.
 */
IdentityProvider.prototype.eachLMS = function (cbFunc, bind) {
    this.lmsMgr.eachLMS(cbFunc, bind);
};


/**
 * @protoype
 * @function addLMS
 * @param {STRING} LMSURL
 *
 * @event LMS_AVAILABLE
 * @event LMS_REJECTED
 * @event LMS_UNAVAILABLE
 *
 * Adds a new LMS and tries to register the app with the LMS.
 *
 * The function will try to register the app with the LMS.
 * If successful it will emit an LMS_OK event.
 * If the device is rejected by the LMS then it emits an LMS_REJECTED
 * If the LMS has no RSD file it emits an LMS_NO_RSD event
 *
 */
IdentityProvider.prototype.addLMS = function (LMSURL) {
    // - check if the server has an RSD
    this.lmsMgr.getServerRSD(LMSURL);
};

/**
 * @protoype
 * @function loadLMS
 * @param {NONE}
 */
IdentityProvider.prototype.getActiveLMS = function (cbFunc, bind) {
    this.lmsMgr.getActiveLMS(cbFunc, bind);
};

/**
 * @protoype
 * @function activateLMS
 * @param {STRING} LMSId
 *
 * sets the LMSId to be active for the comming actions
 */
IdentityProvider.prototype.activateLMS = function (LMSId) {
    this.lmsMgr.setActiveLMS(LMSId);
};

/**
 * @protoype
 * @function enableLMS
 * @param {STRING} LMSId
 *
 * sets the LMSId to be active for the comming actions
 */
IdentityProvider.prototype.enableLMS = function (LMSId) {
    this.lmsMgr.clearInactiveFlag(LMSId);
};

/**
 * @protoype
 * @function getLMSStatus
 * @param {STRING} LMSId
 *
 * checks if the backend services are available.
 * if no LMSID is provided, the active LMS will be tested.
 */
IdentityProvider.prototype.getLMSStatus = function (LMSId) {
    this.lmsMgr.getLMSStatus(LMSId);
};

/**
 * @protoype
 * @function disableLMS
 * @param {STRING} LMSId
 *
 * sets the LMSId to be active for the comming actions
 */
IdentityProvider.prototype.disableLMS = function (LMSId) {
    this.lmsMgr.setInactiveFlag(LMSId);
};

/**
 * returns the URL for a service protocol of the active server.
 *
 * @protoype
 * @function serviceURL
 * @param {STRING} serviceName
 * @return {STRING} serviceURL
 */
IdentityProvider.prototype.serviceURL = function (serviceName) {
    this.lmsMgr.getServiceURL(serviceName);
};

/****** Session Management ******/

/**
 * @protoype
 * @function startSession
 * @param {STRING} username
 * @param {STRING} password
 */
IdentityProvider.prototype.startSession = function (username, password) {
    username = username.trim();
    password = password.trim();
    if (username.length && password.length){
        this.usrMgr.login(username, faultylabs.MD5(password));
    }
};

/**
 * @protoype
 * @function finishSession
 * @param {NONE}
 */
IdentityProvider.prototype.finishSession = function () {
    this.usrMgr.logout();
};

/**
 * @protoype
 * @function sessionState
 * @param {NONE}
 * @return {BOOL} - true if an active session is set
 */
IdentityProvider.prototype.sessionState = function () {
    return this.usrMgr.isLoggedIn();
};

/**
 * @protoype
 * @function sessionHeader
 * @param xmlHTTPRequest Object
 *
 * sets the session header for all connections. Other models call this
 * via their app property.
 */
IdentityProvider.prototype.sessionHeader = function (xhr) {
    this.usrMgr.setSessionHeader(xhr);
};

/**
 * user by views to obtain the user details
 *
 * @protoype
 * @function getUserProfile
 * @param {FUNCTION} callbackFunction
 * @param {OBJECT} bind
 *
 * The callback function needs to expect a user object.
 *
 * The user object is NULL if there is no active session.
 *
 * The bind parameter is for setting the this variable correctly.
 */
IdentityProvider.prototype.getUserProfile = function (cbFunc, bind) {
    var userInfo = null;

    if (!bind) {
        bind = this;
    }
    if (this.usrMgr.isLoggedIn()) {
        userInfo = {
            "displayName": this.usrMgr.getDisplayName(),
            "userName": this.usrMgr.getUserName(),
            "userId": this.usrMgr.getUserId(),
            "email": this.usrMgr.getEmailAddress(),
            "language": this.usrMgr.getLanguage()
        };
    }

    if (typeof cbFunc === "function") {
        cbFunc.call(bind, userInfo);
    }
};

/**
 * @protoype
 * @function getLanguage
 * @param {NONE}
 * @return {OBJECT} language base
 *
 * Will return the language for the app UI.
 *
 * it will use the device language by default and will override it
 * with the LMS default language and the learners preferred language
 * on the LMS.
 */
IdentityProvider.prototype.getLanguage =  function () {
    var lang = this.language,
        lmsLang = this.lmsMgr.getDefaultLanguage(),
        usrLang = this.usrMgr.getLanguage();

    if (lmsLang && lmsLang.length) {
        lang = lmsLang;
    }

    if (usrLang && usrLang.length) {
        lang = usrLang;
    }

    return lang;
};

/**
 * @protoype
 * @function synchronize
 * @param {NONE}
 *
 * Synchronizes identity information with the backend service.
 *
 * This will also determine whether the backend is online
 */
IdentityProvider.prototype.synchronize = function() {
    this.usrMgr.loadFromServer();
};

IdentityProvider.prototype.signWithToken = function (signString) {
    return faultylabs.MD5(signString + this.lmsMgr.getActiveRequestToken());
}
