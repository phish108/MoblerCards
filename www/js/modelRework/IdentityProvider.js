/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */
/*global $, hex_sha1, faultylabs, LMSModel, UserModel, device*/

/**	THIS LICENSE INFORMATION MUST NOT BE REMOVED AND REMAIN INTACT
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
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
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

function IdentityProvider () {
    var language  = navigator.language.split("-");
    this.language = language ? language[0] : "en";

    this.lmsMgr = new LMSModel(this);
    this.usrMgr = new UserModel(this);
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
 * variant for accessing only LMSes without user tokens
 */
IdentityProvider.prototype.eachLMSPublic = function (cbFunc, bind) {
    this.lmsMgr.eachLMSPublic(cbFunc, bind);
};

/**
 * @prototype
 * @function hasLMS
 */
IdentityProvider.prototype.hasLMS = function (lmsurl) {
    return this.lmsMgr.findServerByURL(lmsurl);
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

IdentityProvider.prototype.updateAllLMS = function () {
    this.lmsMgr.updateAllServerRSD();
};

/**
 * @protoype
 * @function loadLMS
 * @param {NONE}
 */
IdentityProvider.prototype.getActiveLMS = function (cbFunc, bind) {
    this.lmsMgr.getActiveLMS(cbFunc, bind);
};

IdentityProvider.prototype.getActiveLMSID = function () {
    return this.lmsMgr.activeLMS &&
           this.lmsMgr.activeLMS.hasOwnProperty("id") ?
               this.lmsMgr.activeLMS.id : undefined;
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
 * @param {STRING} serverid
 * @return {STRING} serviceURL
 */
IdentityProvider.prototype.serviceURL = function (serviceName, serverid, path) {
    return this.lmsMgr.getServiceURL(serviceName, serverid, path);
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
IdentityProvider.prototype.setSessionHeader = function (xhr, url, method, tokenType) {
    var token = this.lmsMgr.getActiveToken();

    if (token) {
        console.log("set session header for " + url + " using " + JSON.stringify(token));
        if (token.type === "device" || token.type === "user") {
            // legacy headers
            console.log("set legacy headers");
            this.usrMgr.setSessionHeader(xhr);
            this.lmsMgr.setSessionHeader(xhr);
        }
        else if (!(tokenType && tokenType.length) ||
                  tokenType.indexOf(token.type) >= 0) {
            console.log("set new headers");

            var authCode = this.signObject(url, method);

            if (authCode && authCode.length) {
                xhr.setRequestHeader("Authorize", authCode);
            }
        }
    }
    // if no Token is requested, we will set no Auth headers in the new API
};

IdentityProvider.prototype.sessionHeader = function (tokenType) {
    var self = this;
    var tt   = tokenType;
    return function (xhr, settings) {
        var tp = "GET";
        if (settings.type) {
            tp = settings.type;
        }
        self.setSessionHeader(xhr, settings.url, tp, tt);
    };
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

IdentityProvider.prototype.setSyncState = function(lmsId) {
    this.lmsMgr.setSyncStateForServer(lmsId);
};

/**
 * @prototye
 * @function addToken
 * @param {Object} token
 *
 * stores a new token for the active LMS. There can be exactly one token per
 * token type. This function is called from the internal userModel during
 * authentication.
 */
IdentityProvider.prototype.addToken = function(token) {
    this.lmsMgr.addToken(token);
};

/**
 * @prototye
 * @function removeToken
 * @param {STRING} token type
 *
 * Removes the given token type from the token chain of the active LMS.
 */
IdentityProvider.prototype.removeToken = function (tokenType) {
    this.lmsMgr.removeToken(tokenType);
};

/**
 * @prototye
 * @function signWithToken
 * @param {STRING} sign string
 *
 * signs the sign string with the app's request token
 */
IdentityProvider.prototype.signWithToken = function (signString) {
    if (typeof signString === "string" && signString.length) {
        var signObject = this.lmsMgr.getActiveRequestToken();
        var token = "";
        if (typeof signObject === "string") {
            // old device token
            token = signObject;
        }
        else if (signObject.hasOwnProperty("token")) {
            token = signObject.token;
        }
        return hex_sha1(signString + token);
    }
    return undefined;
};

IdentityProvider.prototype.signObject = function (URL, method) {
    var bOK = true, signString = "", resultString = "";

    var signObject = this.lmsMgr.getActiveToken();

    if (typeof method === "string" && method.length) {
        signObject.method = method;
    }

    signObject.nonce = this.nonce(7);
    signObject.url = URL;
    if ( window.device && device.uuid) {
        signObject.client = device.uuid;
    }

    switch (signObject.type) {
        case "Bearer":
            resultString = signObject.type + " " + signObject.token;
            break;
        case "Request":
            /* falls through */
        case "MAC":
            signObject.sequence.forEach(function(field) {
                if (signObject.hasOwnProperty(field)) {
                    signString += encodeURIComponent(signObject[field]);
                }
                else {
                    bOK = false;
                }
            });

            if (bOK) {
                 resultString = signObject.type + " ";
                /**
                 * TODO: add supprot for more sign methods.
                 *
                 * The RFC OAuth Draft (https://tools.ietf.org/html/draft-ietf-oauth-v2-http-mac-05)
                 * refers to the HMAC-SHA1 and HMAC-SHA-256 algorithms.
                 *
                 * hex_hmac_sha1() is supported by the sha1 module, but PowerTLA does not support it yet.
                 */
                switch (signObject.algorithm.toLowerCase()) {
                    case "md5":
                        signObject.key = faultylabs.MD5(signString);
                        break;
                    case "sha1":
                        signObject.key = hex_sha1(signString);
                        break;
                }

                signObject.paramerter.forEach(function (field) {
                    resultString += field + "=" + encodeURIComponent(signObject);
                });
            }
            break;
    }
    return resultString;
};

IdentityProvider.prototype.nonce = function nonce(length) {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var rnum, i, result = "";
        for (i = 0; i < length; ++i) {
            rnum = Math.floor(Math.random() * chars.length);
            result += chars.substring(rnum, rnum+1);
        }
        return result;
};
