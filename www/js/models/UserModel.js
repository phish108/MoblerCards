/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */
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
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Christian Glahn
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
 * @param {String} controller
 */

function UserModel(controller) {
    var self = this;

    this.controller = controller;
    this.idprovider = controller.models.identityprovider;
    //initialization of model's variables
    this.configuration = {};
    this.urlToLMS = "";
    this.logoimage = "";
    this.logolabel = "";

    // load data from the local storage if any
    this.loadData();


    /**It is triggered after all statistics data are sent successful to the server. This happens when the user logsout.
     * @event statisticssenttoserver
     * @param:a callback function that sends pending data to the server and clears all information from the local storage.
     * Only the application key remains in the local storage, because it is unique for a specific device for a specific application.
     *
     * FIXME:
     * Take care that the session key and the server are stored with the pending information so we can send the data
     * with the correct context to the backend i.e. if you have pening information and you login to a different server
     * then the pending information should be sent to the original server for the original user and not
     * to the new server and the new user.
     */

    $(document).bind("statisticssenttoserver", function () {
        console.log("statistics sent to server is bound");
        console.log("self.controller.appLoaded is " + self.controller.appLoaded);
        console.log("self.configuration.loginState is" + self.configuration.loginState);
        if (self.controller.appLoaded && self.configuration.loginState === "loggedOut") {
            console.log("before call sendLogoutToServer");
            self.sendLogoutToServer();
            console.log("user logged out");
        }
    });
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
        console.log("error while storing");
    }
    console.log(configString);
    localStorage.setItem("configuration", configString);
    console.log("Configuration Storage after storeData: " + localStorage.getItem("configuration"));
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
        console.log("error! while loading");
    }

    console.log("configObject: " + JSON.stringify(configObject));

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
    console.log("configuration login state in load data " + this.configuration.loginState);

};

/**
 * Loads the configuration data from the server such as learner information and synchronization state
 * and stores it in the local storage. When all data is loaded, the authenticationready event is triggered
 * If any error occurs during the authentication then an event will be triggered to notify this.
 * @prototype
 * @function loadFromServer
 */
UserModel.prototype.loadFromServer = function () {
    var self = this;
    var activeURL = self.controller.serviceURL("ch.isn.lms.auth");

    //if the user is not authenticated yet
    if (activeURL &&
        activeURL.length &&
        this.configuration.userAuthenticationKey &&
        this.configuration.userAuthenicationKey !== "") {
        // authenticate the user by "GETing" his data/learner information from the server
        $
            .ajax({
                url: activeURL,
                type: 'GET',
                dataType: 'json',
                success: function (data) {
                    console.log("success");
                    console.log("in success before turining off deactivate");
                    self.idprovider.enableLMS(); // FROM common.js
                    console.log("JSON: " + data);
                    var authenticationObject;
                    try {
                        //the authentication data are successfully received
                        //its object format is assigned to the authentication object variable
                        authenticationObject = data;
                        console.log("authenticationData from server");
                    } catch (err) {
                        //the authentication data couln't be parsed properly
                        console.log("Error: Couldn't parse JSON for authentication");
                        authenticationObject = {};
                    }
                    //assign as value to the learner information property of the configuration object
                    //the user authentication data, which were received from server
                    self.configuration.learnerInformation = authenticationObject.learnerInformation;
                    //store in the local storage the synchronization state
                    self.configuration.globalSynchronizationState = authenticationObject.globalSynchronizationState;

                    //store in the local storage the above received data
                    self.storeData();

                    //sets the language interface for the authenticated user
                    //its language preferences were received during the authentication
                    //and  were stored in the local storage in the previous step
                    self.controller.setupLanguage();

                    /**
                     * When all authentication data are received and stored in the local storage
                     * the authenticationready event is triggered
                     * @event authenticationready
                     * @param the user id
                     */
                    $(document).trigger("authenticationready", authenticationObject.learnerInformation.userId);
                },
                // the receive of authenticated data was failed
                error: function (request) {
                    // the specific view should decide on the response.
                    window.showErrorResponses(request); // from common.js
                    switch (request.status) {
                        case 403:
                            console.log("Error while authentication to server");
                            $(document).trigger("authenticationTemporaryfailed");
                            break;
                        default:
                            self.idprovider.disableLMS();
                            $(document).trigger("authenticationfailed");
                            break;
                    }
                },
                // we send the user authentication key as "sessionkey" via headers
                // before the autentication takes plae and in order it to be validated or not
                beforeSend: function setHeader(xhr) {
                    self.sessionHeader(xhr);
                }

            });

    }
};

UserModel.prototype.sessionHeader = function (xhr) {
    xhr.setRequestHeader('sessionkey',
                         this.configuration.userAuthenticationKey);
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
    var self = this;
    var challenge;
    challenge = this.idprovider.signWithToken(username + password);


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
UserModel.prototype.logout = function (featuredContent_id) {
    console.log("enter logout in configuration model");
    //send statistics data to server
    this.configuration.loginState = "loggedOut";
    var configString = JSON.stringify(this.configuration);
    localStorage.setItem("configuration", configString);
    console.log("configuration login state in logout is " + this.configuration.loginState);
    this.controller.models.statistics.sendToServer(featuredContent_id);

    // remove all question pools and all pending question pool requests
    var c, courseList = this.controller.models.course.courseList;
    if (courseList) {
        for (c in courseList) {
            if (courseList.hasOwnProperty(c)) {
                console.log("clear local question pools");
                if (courseList[c].id !== featuredContent_id) {
                    localStorage.removeItem("questionpool_" + courseList[c].id);
                    localStorage.removeItem("pendingQuestionPool_" + courseList[c].id);
                }
            }
        }
    }

    // remove course list and pending course list request
    localStorage.removeItem("pendingCourseList");
    localStorage.removeItem("courses");
    this.controller.models.course.resetCourseList();

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
    console.log("enter send Auth to server " + JSON.stringify(authData));
    var self = this;

    var activeURL = self.controller.serviceURL('ch.isn.lms.auth');
    console.log("url: " + activeURL);
    $
        .ajax({
            url: activeURL,
            type: 'POST',
            dataType: 'json',
            //if any data are sent back during the authentication
            success: function (data) {
                //if  any data are sent during the authentication but they are wrong and they send back different error messages
                if (data && data.message) {
                    switch (data.message) {
                        //1. first error message is that the client key is invalid
                    case "invalid client key":
                        console.log("invalid client key - reregister");
                        //if the client key is invalide, register in order to get a new one
                        self.controller.models.lms.register();
                        /**
                         * The authentication fails if no valid client key is received. An event is triggered
                         * in order notify about the failure and the reason of failure (invalid key)
                         * @event authenticationfailed
                         * @event invalidclientkey
                         */
                        $(document).trigger("authenticationfailed",
                                            "invalidclientkey");
                        break;
                        //2. second error message is that the user name or password were wrong
                    case "wrong user data":
                        console.log("Wrong username or password!");
                        /**
                         * The authentication fails if wrong user name or password are received. An event is triggered
                         * in order notify about the failure and the reason of failure (wrong data)
                         * @event authenticationfailed
                         * @event nouser
                         */
                        $(document).trigger("authenticationfailed",
                                            "nouser");
                        break;
                    default:
                        break;
                    }
                    //if data are sent back from the server during the authentication and they dont contain any error messages
                    //and the user has an authenticaiton key
                } else if (data && data.userAuthenticationKey !== "") {
                    console.log("userAuthenticationKey: " + data.userAuthenticationKey);
                    //store the authenticated data (user authentication key, learner information) in the local storage
                    self.configuration.userAuthenticationKey = data.userAuthenticationKey;
                    self.configuration.learnerInformation = data.learnerInformation;
                    self.configuration.loginState = "loggedIn";
                    self.storeData();
                    localStorage.setItem("pendingLogout", "");
                    self.idprovider.enableLMS();

                    /**
                     * When all authentication data are received and stored in the local storage
                     * the authenticationready event is triggered
                     * @event authenticationready
                     * @param the user authentication key
                     */
                    $(document).trigger("authenticationready",
                        self.configuration.userAuthenticationKey);
                    console.log("authentication is ready, statistics can be loaded from the server");
                    //sets the language interface for the authenticated user
                    //its language preferences were received during the authentication

                    self.controller.setupLanguage();

                    //get statistics data from server
                    self.controller.models.statistics.loadFromServer();
                } else {
                    //no error messages from the server and no userauthentication(session) key received
                    console.log("no error message from server and no session key received");
                    $(document).trigger("authenticationfailed", "connectionerror");
                }
            },
            //the authentication to the server failed because of unknown reason
            error: function (request) {

                if (request.status === 403) {
                    window.turnOnDeactivate(); //from common.js
                    window.showErrorResponses(request); //from common.js
                    console.log("Error while authentication to server");
                    $(document).trigger("authenticationTemporaryfailed");
                } else {
                    console.log("Error while authentication to server: status:" + request.status + ", " + request.responseText);
                    /**
                     * When the authentication to the server fails for any unknown reason that is independent from validity of the received data
                     * but related with any internet connectivity or server issue, the authenticationfailed and connectionerror events are triggered
                     * @event authenticationfailed
                     * @event connectionerror
                     */
                    $(document).trigger("authenticationfailed", "connectionerror");
                }
            },
            //the authentication data (uuid, appid, username, challenge) are sent to the server via headers
            beforeSend: function setHeader(xhr) {
                xhr.setRequestHeader('uuid', window.device.uuid);
                xhr.setRequestHeader('appid', self.app.id);
                xhr.setRequestHeader('authdata', authData.username + ":" + authData.challenge);
            }
        });
};

/**
 * Sends a delete request to the server in order to invalidates the specified session key
 * or if no session key is specified the current session key.
 * We send via header the session key. After the delete request is sent to the server,
 * we clear the local storage. We keep only the app key.
 * @prototype
 * @function sendLogoutToServer
 * @param userAuthenticationKey
 */
UserModel.prototype.sendLogoutToServer = function (userAuthenticationKey, featuredContent_id) {
    console.log("enter send logout to server");
    var sessionKey, self = this;
    var activeURL = self.controller.serviceURL("ch.isn.lms.auth");

    $
        .ajax({
            url: activeURL,
            type: 'DELETE',
            dataType: 'json',
            success: function () {
                console.log("success in logging out");
                localStorage.setItem("pendingLogout", "");
                self.idprovider.enableLMS();
            },
            error: function (request) {

                if (request.status === 403) {
                    self.idprovider.disableLMS();
                    console.log("Error while logging out from server");
                }

                //adding in the local storage the session key of the pending
                localStorage.setItem("pendingLogout", sessionKey);
            },
            //sends via header the session key in order it to be validated
            beforeSend: function setHeader(xhr) {
                self.controller.sessionHeader(xhr);
            }
        });

    this.configuration = {
        "userAuthenticationKey": "",
        "learnerInformation": {
            "userId": 0
        },
        "loginState": "loggedOut",
        //"loginState": this.configuration.loginState;
        "statisticsLoaded": false
    };

    console.log("configuration object after loging out" + JSON.stringify(this.configuration));

    var configString = JSON.stringify(this.configuration);
    localStorage.setItem("configuration", configString);
    console.log("Configuration Storage: " + localStorage.getItem("configuration"));

    //after clearing data from the local storage, save the changes to the local storage item
    //this.storeData();

    // drop statistics data table from local database
    this.controller.models.answer.deleteDB(featuredContent_id);
};

/**
 * Invalidates the specified session key or if no session key is specified the
 * current session key
 * @prototype
 * @function isLoggedIn
 * @return true if user is logged in, otherwise false
 */
UserModel.prototype.isLoggedIn = function () {
    //if (this.configuration.userAuthenticationKey && this.configuration.userAuthenticationKey !== "") {
    console.log("this.configuration.logingState is " + this.configuration.loginState);
    if (this.configuration.loginState && this.configuration.loginState === "loggedIn") {
        return true;
    }

    console.log("configuration.js: is not logged in ... " + this.configuration.userAuthenticationKey);
    return false;
};

/**
 * @prototype
 * @function getDisplayName
 * @return {String} displayName, the full name of the user that is stored in the configuration object
 */
UserModel.prototype.getDisplayName = function () {
    return this.configuration.learnerInformation.displayName;
};

/**
 * @prototype
 * @function getUserName
 *  @return {String} displayName, the username that is stored in the configuration object
 */
UserModel.prototype.getUserName = function () {
    return this.configuration.learnerInformation.userName;
};

/**
 * @prototype
 * @function getUserId
 * @return {Number} userId, the user id that is stored in the configuration object
 */
UserModel.prototype.getUserId = function () {
    return this.configuration.learnerInformation.userId;
};

/**
 * @prototype
 * @function getEmailAddress
 * @return {String} emailAddress, the email address of the user as it is stored in the configuration object
 */
UserModel.prototype.getEmailAddress = function () {
    return this.configuration.learnerInformation.emailAddress;
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

    // if we don't know a user's language we try to use the phone's language.
    var language = navigator.language.split("-");
    var language_root = language[0];

    return this.configuration.defaultLanguage || language_root;
};

/**
 * @prototype
 * @function getSessionKey
 * @return {String} userAuthenticationKey, the session key of the user
 */
UserModel.prototype.getSessionKey = function () {
    return this.configuration.userAuthenticationKey;
};