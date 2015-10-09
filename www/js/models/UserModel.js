/*jslint white:true*/      // we have a different indentation style
/*jslint vars: true*/      // don't complain about multiple variable declarations.
/*jslint sloppy: true*/    // dont't expect use strict.
/*jslint plusplus: true*/  // allow the ++ operator
/*jslint browser: true */  // ignore all browser globals
/*jslint unparam: true*/   // allow unused parameters in function signatures

/**
 * Remove the following lines for production
 */
/*jslint devel: true*/     // allow console log
/*jslint todo: true*/      // allow todo comments

/*global $, jQuery, faultylabs*/

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
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/**
 * @class UserModel
 * This model holds the data about the current configuration
 * @constructor
 * It initializes basic properties such as:
 *  - the configuration object of the local storage
 *  - the url of the selected server,
 *  - the image and the logo of the selected server,
 * It loads data from the local storage. In the first time there are no data in the local storage.
 * It specifies the data for the selected server.
 * It listens to an event that is triggered when statistics are sent to the server.
 * @param {String} app
 */

/**
 * TODO SEND requests only when the device is online.
 */

function UserModel(idprovider) {
    this.idprovider = idprovider;
    //initialization of model's variables
    this.configuration = {};
    this.urlToLMS = "";
    this.logoimage = "";
    this.logolabel = "";
    this.syncFlags = {};

    // load data from the local storage if any
    this.loadData();
}

/**
 * Stores the data into the local storage (key = "configuration") therefore the
 * json object is converted into a string
 * @prototype
 * @function storeData
 */
UserModel.prototype.storeData = function () {

    var configString;

    try {
        configString = JSON.stringify(this.configuration);
    } catch (err) {
        configString = "";
    }

    localStorage.setItem("configuration", configString);
};

/**
 * Loads the data from the local storage (key = "configuration") therefore the
 * string is converted into a json object
 * @prototype
 * @function
 */
UserModel.prototype.loadData = function () {

    var configObject;

    //if there is an item in the local storage with the name "configuration"
    //then get it by parsing the string and convert it into a json object
    try {

        configObject = JSON.parse(localStorage.getItem("configuration"));
    } catch (err) {

        configObject = null;
    }

    // when the app is launched and before the user logs in there is no local storage
    // in this case there is no configuration object and it is stated in one of its properties
    // that its login status is set to "loggedOut".
    if (!configObject) {

        configObject = {
            loginState: "loggedOut",
            statisticsLoaded: "false"
        };
    }

    this.configuration = configObject;
};

UserModel.prototype.setSessionHeader = function (xhr) {

    if (this.configuration.userAuthenticationKey) {

        xhr.setRequestHeader('sessionkey',
                             this.configuration.userAuthenticationKey);
    }
};

/**
 * Logs in user. The user types a username and a password. Therefore the username and a challenge are
 *sent to the server. The algorithm that is executed to compute the challenge is based on:
 *1. the application key that is bound to a UUID
 *2. the user's password (its MD5 hashed value)
 *3. the user's name
 * @prototype
 * @function login
 */
UserModel.prototype.login = function (username, password) {

    var challenge;

    // NOTE: we need to lowercase the password hash.
    challenge = this.idprovider.signWithToken(username +
                                              faultylabs.MD5(password).toLowerCase());

    var auth = {
        "username": username,
        "challenge": challenge
    };

    //send username and challenge to the server
    this.sendAuthToServer(auth);
};

/**
 * Logs out user. When logging out the statistics are sent to the server and the
 * local storage (courses, questions) is cleared
 * @prototype
 * @function logout
 */
UserModel.prototype.logout = function () {

    //TODO send statistics data to server
    if (this.isLoggedIn())  {

        this.configuration.loginState = "loggedOut";
        localStorage.setItem("configuration", JSON.stringify(this.configuration));

        $(document).trigger("ID_LOGOUT_REQUESTED", [this.idprovider.getActiveLMSID()]);
    }
};


/**
 * Sends an authentication request (uuid, appid, username, challenge) to the server
 * In case of successful authentication, we store back to the local storage the following:
 * 1. user authentication key
 * 2. learner information such as userId, userName, displayName, emailAddress, langauge
 * 3. we set the login state to "logged in".
 * Both in successfull or failed authentication an appropriate event is triggered to notify about the status of it.
 * @prototype
 * @function sendAuthToServer
 */
UserModel.prototype.sendAuthToServer = function (authData) {
    
    var self = this;

    var serviceName = "org.ieee.papi",
        activeURL   = self.idprovider.serviceURL(serviceName),
        serverid    = self.idprovider.getActiveLMSID();

    function authOK(data) {

        self.idprovider.addToken(data);
        $(document).trigger("ID_AUTHENTICATION_OK",
                            [serverid]);

        self.loadProfile();
    }

    function authFail(request) {

        switch (request.status) {
            case 401:
            case 403:
                $(document).trigger("ID_AUTHENTICATION_FAILED",
                                    [serverid]);
                break;
            case 500:
            case 404:
                self.idprovider.disableLMS();
                $(document).trigger("ID_SERVER_FAILURE",
                                    [serverid]);
                break;
            default:
                $(document).trigger("ID_CONNECTION_FAILURE",
                                    [serverid]);
                break;
        }
    }

    var rObj = {
        url: activeURL,
        error: authFail
    };

    switch(serviceName) {
        case "org.ieee.papi":
            rObj.success      = authOK;
            rObj.type         = "PUT";
            rObj.dataType     = 'json';
            rObj.contentType  = "application/json";
            rObj.beforeSend   = self.idprovider.sessionHeader();
            rObj.data         = JSON.stringify(authData);
            break;
        default:
            // should never happen!
            rObj = null;
            break;
    }

    if (rObj && rObj.url === activeURL) {
        if (self.idprovider.getLMSStatus()) {
            $.ajax(rObj);
        }
        else {
            $(document).trigger("ID_SERVER_UNAVAILABLE",
                                [serverid]);
        }
    }
};

/**
 * @prototype
 * @function sendLogoutToServer
 * @param userAuthenticationKey
 *
 * Sends a delete request to the server in order to invalidates the specified
 * session key or if no session key is specified the current session key.
 * We send via header the session key. After the delete request is sent to the
 * server, we clear the local storage. We keep only the request token.
 */
UserModel.prototype.sendLogoutToServer = function () {
    var self = this;
    var serviceName = "org.ieee.papi",
        activeURL   = self.idprovider.serviceURL(serviceName),
        serverid    = self.idprovider.getActiveLMSID();

    if (!activeURL.length) {
        serviceName = "";
        activeURL = self.idprovider.serviceURL(serviceName);
    }

    function logoutFail(request) {
        if (request.status === 403) {

            self.idprovider.disableLMS();
        }
    }

    function logoutOK() {
        // remove all access tokens
        self.idprovider.removeToken("MAC");
        self.idprovider.removeToken("Bearer");

        // KEEP
        $(document).trigger("ID_LOGOUT_OK",
                            [serverid]);
    }

    var rObj = {
        "url": activeURL,
        "type": 'DELETE',
        "dataType": 'json',
        "success": logoutOK,
        "error": logoutFail,
        "beforeSend": self.idprovider.sessionHeader()
    };

    if (self.idprovider.getLMSStatus()) {
        $.ajax(rObj);
    }
    else {
        $(document).trigger("ID_SERVER_UNAVAILABLE",
                            [serverid]);
    }
};

/**
 * @function loadProfile()
 *
 * loads the learner information profile from the profile service.
 *
 * This method is only availble for the new API services.
 */
UserModel.prototype.loadProfile = function (serverid) {
    var self = this;

    if (!serverid) {
        serverid = self.idprovider.getActiveLMSID();
    }

    function loadProfile(data) {

        self.configuration = {learnerInformation: data};
        var configString = JSON.stringify(self.configuration);

        localStorage.setItem("configuration", configString);

        delete self.syncFlags[serverid];
    }

    function failProfile(request) {
        delete self.syncFlags[serverid];
        switch (request.status) {
            case 401:
            case 403:
                $(document).trigger("ID_TOKEN_REJECTED",
                                    [serverid]);
                break;
            case 404:
            case 500:
                self.idprovider.disableLMS();
                $(document).trigger("ID_SERVER_FAILURE",
                                    [serverid]);
                break;
            default:
                break;
        }
    }

    if (!self.syncFlags.hasOwnProperty(serverid)) {
        self.syncFlags[serverid] = true;

        var serviceName = "org.ieee.papi";
        var activeURL = self.idprovider.serviceURL(serviceName);

        if (self.idprovider.getLMSStatus() && self.isLoggedIn()) {
            $.ajax({
                url: activeURL,
                success: loadProfile,
                error: failProfile,
                dataType: "json",
                beforeSend: self.idprovider.sessionHeader(["MAC", "Bearer"]),
                type: "GET"
            });
        }
        else {
            $(document).trigger("ID_SERVER_UNAVAILABLE",
                                [serverid]);
        }
    }
};


UserModel.prototype.synchronize = function () {
    var self = this;

    function loadProfileFromServer(serverid) {
        if (self.idprovider.app.isOnline() &&
            self.idprovider.getLMSStatus(serverid) &&
            self.isLoggedIn(serverid)) {
            self.loadProfile(serverid);
        }
    }

    this.idprovider.eachLMS(function (server) {
        loadProfileFromServer(server.id);
    });
};

/**
 * Invalidates the specified session key or if no session key is specified the
 * current session key
 * @prototype
 * @function isLoggedIn
 * @return true if user is logged in, otherwise false
 */
UserModel.prototype.isLoggedIn = function (id) {
    var token = this.idprovider.lmsMgr.getActiveToken(id);

    if (token && (token.type === "MAC" ||
                  token.type === "Bearer" ||
                  token.type === "user")) {
        return true;
    }

    return false;
};

/**
 * @prototype
 * @function getDisplayName
 * @return {String} displayName, the full name of the user that is stored in the configuration object
 */
UserModel.prototype.getDisplayName = function () {
    return this.configuration.learnerInformation.name;
};

/**
 * @prototype
 * @function getUserName
 *  @return {String} displayName, the username that is stored in the configuration object
 */
UserModel.prototype.getUserName = function () {
    return this.configuration.learnerInformation.login;
};

/**
 * @prototype
 * @function getUserId
 * @return {Number} userId, the user id that is stored in the configuration object
 */
UserModel.prototype.getUserId = function (lmsid) {
    if (!this.configuration.learnerInformation) {
        return undefined;
    }
    return this.configuration.learnerInformation.id;
};

/**
 * @prototype
 * @function getEmailAddress
 * @return {String} emailAddress, the email address of the user as it is stored in the configuration object
 */
UserModel.prototype.getEmailAddress = function () {
    return this.configuration.learnerInformation.email;
};

/**
 * Gets the language of the interface for the specific user. By default it is the selected language of
 * the user on the lms. If there is no specified language, then the language of the device is used.
 * @prototype
 * @function getLanguage
 * @return {String} language, the language of the user
 */
UserModel.prototype.getLanguage = function () {

    if (this.configuration.learnerInformation &&
        this.configuration.learnerInformation.language &&
        this.configuration.learnerInformation.language.length) {
        return this.configuration.learnerInformation.language;
    }

    return "";
};

/**
 * @prototype
 * @function getSessionKey
 * @return {String} userAuthenticationKey, the session key of the user
 */
UserModel.prototype.getSessionKey = function () {
    return this.configuration.userAuthenticationKey;
};
