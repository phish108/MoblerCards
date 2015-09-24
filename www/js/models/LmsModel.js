/*jslint white:true*/      // we have a different indentation style
/*jslint vars: true*/      // don't complain about multiple variable declarations.
/*jslint sloppy: true*/    // dont't expect use strict.
/*jslint plusplus: true*/  // allow the ++ operator
/*jslint browser: true */  // ignore all browser globals
/*jslint unparam: true*/   // allow unused parameters in function signatures

/**
 * Remove the following lines for production
 */

/*jslint todo: true*/      // allow todo comments

/*jslint regexp: true*/    // allow [^\[] for cloze question preprocessing

/*global $, device, Promise */

/**	THIS COMMENT MUST NOT BE REMOVED
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt

 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * @author Christian Glahn
 * @author Evangelia Mitsopoulou
 */

/**
 * @class LMSModel
 *
 * The LMSModel represents the super set of all LMSes that are registered with
 * Mobler Cards. It is useful to other models for providing the URLs to the
 * service APIs.
 *
 * This model is responsible for managing the connections to the different LMSes the device
 * is registered to. The model accepts to connect to any URL, but it will check whether the
 * URL is actually backed by the valid Service interfaces.
 *
 * The LMS needs to provide at its core URL a file called rsd.json (rsd stands for really simple
 * discovery). Instead of the original XML format the TLA uses a JSON variation using the following
 * format.
 *
 * ```json
 * {
 *      "engine": {
 *          "link": "http(s)://your.lmshost.edu/your/lms/basepath",
 *          "type": "Ilias",
 *          "version": "4.4"
 *      },
 *      "name": "YOUR LMS OFFICIAL NAME",
 *      "logolink": "relative/path/to/logo.png",
 *      "tlaversion": "MBC.1.0"
 *      "language": "en",
 *      "apis": [
 *         {
 *              "name": "Official API name (e.g. XAPILRS)",
 *              "link": "relative/path/to/api"
 *          }
 *      ]
 * }
 * ```
 *
 * The LMS Model expects an RSD to provide the system's default interface language,
 * so it can switch to that language one the lms is selected or activated.
 *
 * A working system needs to provide 4 APIs
 *
 *  * LRS (statistics) service
 *  * Identity service for devices (client) and user registration
 *  * QTI service that returns all questions for a course
 *  * Course Service to get all courses for the active user
 *
 * The baseurl needs to be the same as the base url for the RSD file. The
 * RSD file contains server information, the pointers to the available
 * services, and generic default settings of the backend, such as the system's
 * default language and the logo image URL. The logo url needs to point to a
 * valid PNG file with the size of 32x32 pixels.
 *
 * All urls in the RSD have to be relative to the baseurl of the engine.
 *
 * The LMS Model will connect to any LMS that satisfies the following steps.
 *
 * 1. Responds with a valid rsd.json file.
 * 2. Provides the APIs for the 4 required services in the RSD.
 * 3. Responds with 200 and content-type "image/png"
 * 4. Responds with 200 to /about requests to all 4 services using the urls
 *    given in the rsd.json.
 * 5. Allows the device to register against the Identity service
 *
 * The LMS will get added to the LMS list if step 1-3 succeed.
 * The LMS will be only selectable by the user if step 4 and 5 succeed as well.
 * These steps may fail due to system maintenance. However, they MUST NOT
 * return 404 errors in this case the system is flagged as invalid.
 *
 * As soon a LMS is registered for the device the LMS is stored in the app's
 * LMS list. The model extends the service object with an "key" object. This
 * key object holds three keys:
 *
 *  * "device"
 *  * "userid"
 *  * "userkey"
 *
 * These keys are used to authenticate the individual requests against the
 * various services.
 *
 * Finally, the model generates an internal serverid that identifies a LMS
 * uniquely in the context of the app on the device.
 *
 * This model sends the following signals
 *
 * LMS_AVAILABLE: sent if a new LMS has been successfully registered to the
 *                app
 * LMS_UNAVAILABLE: sent if a LMS URL cannot be registered to the app
 * LMS_DEVICE_READY: send if the LMS as provided a device key to the app
 * LMS_DEVICE_NOTALLOWED: sent the app is not allowed to register itself for the LMS
 * LMS_NOSERVICE: sent if a service for a registered LMS is responding with an error
 */

(function (w) {
    // set the default inactive timeout to 1h
    var inactiveTimeout = 60 * 60 * 1000;

    /**
     * @private @property lmsData
     *
     * The list of registered LMSes.
     * This list is actually an object that refers each serverID to the registered RSD info.
     */
    var lmsData = {},
        activeServer,
        activeLMS,
        previousLMS;

    /**
     * @private @function loadData()
     *
     * Loads the data from the local storage (key = "configuration") therefore the
     * string is converted into a json object
     */
    function loadData() {
        try {
            lmsData = JSON.parse(localStorage.getItem("LMSData"));
        }
        catch (err) {
            lmsData = {};
            localStorage.setItem("LMSData", "{}");
        }

        if (lmsData === null && typeof lmsData === "object") {
            lmsData = {};
            localStorage.setItem("LMSData", "{}");
        }

        if (lmsData.hasOwnProperty("activeServer")) {
            activeServer = lmsData.activeServer;
            delete lmsData.activeServer;
            localStorage.setItem("LMSactiveServer", activeServer);
        }

        activeServer = localStorage.getItem("LMSactiveServer");
    }

    /**
     * @private @function storeData
     *
     * Stores the data into the local storage (key = "urlsToLMS") therefore the
     * json object is converted into a string
     */
    function storeData() {
        try {
            localStorage.setItem("LMSData", JSON.stringify(lmsData));
        }
        catch (err) {
            localStorage.setItem("LMSData", "{}");
            lmsData = {};
        }

        localStorage.setItem("LMSactiveServer", activeServer);
    }

    /**
     * @private @function getServiceURL(rsd, serviceName)
     * @param {Object} rsd - the service's RSD data object
     * @param {String} serviceName - the name of the service
     *
     * getServiceURL() creates a fully qualified URL to the requested service API.
     * This allows Models to request their APIs without considering any server side
     * organisation or setup.
     */
    function getServiceURL(rsd, serviceName, path) {
        var url = "";
        if (rsd && serviceName && serviceName.length) {
            rsd.apis.forEach(function(api){
                if (api.name === serviceName) {
                    url = rsd.engine.servicelink + api.link;
                    if (path && Array.isArray(path) && path.length) {
                        url += "/" + path.join("/");
                    }
                }
            });
        }
        return url;
    }

    function setInactiveFlag(serviceid) {
        lmsData[serviceid].inactive = (new Date()).getTime();
        storeData();
    }

    function addToken(serviceid, token) {
        if (serviceid &&
            lmsData[serviceid].keys) {
            if (typeof token === "string") {
                token = {"type": "device", "token": token};
            }

            // we are bold and override the old token if it exists
            lmsData[serviceid].keys[token.type] = token;
            storeData();
        }
    }

    /**
     * @private @function registerDevice(rsd)
     * @param {Object} rsd - the service's RSD data object
     *
     * fetches the device key from the LMS' Auth service.
     */
    function registerDevice(serverRSD) {
        var APP_ID = "org.mobinaut.mobler";
        var serviceid = serverRSD.id;

        function registerOK(data) {
            addToken(serviceid, data);
            $(document).trigger("LMS_DEVICE_READY");
            previousLMS = null;
        }

        function registerFail(r) {
            setInactiveFlag(serviceid);
            $(document).trigger("LMS_DEVICE_NOTALLOWED", [serviceid]);
            activeLMS = previousLMS;
            activeServer = activeLMS.id;
            previousLMS = null;
        }

        var serviceName = "powertla.identity.client",
            registerURL = getServiceURL(serverRSD, serviceName);

        if (registerURL.length) {
            var rObj = {
                "url": registerURL,
                "dataType": "json",
                "error": registerFail
            };

            switch (serviceName) {
                case "powertla.identity.client":
                    rObj.type = "PUT";
                    rObj.data = JSON.stringify({"client": device.uuid,
                                                "domain": APP_ID});
                    rObj.contentType = "application/json";
                    rObj.success     = registerOK;
                    break;
                default:
                    break;
            }

            $.ajax(rObj);
        }
        else {
            $(document).trigger("LMS_UNAVAILABLE");
            setInactiveFlag(serverRSD.id);
        }
    }

    /**
     * @private function checkRSD
     * @param {OBJECT} RSD data
     *
     * validates incoming RSD objects
     */
    function checkRSD(rsddata) {
        if (rsddata &&
            rsddata.hasOwnProperty("apis") &&
            rsddata.apis.length &&
            rsddata.hasOwnProperty("engine") &&
            rsddata.engine.link &&
            rsddata.engine.link.length
           ) {
            // eurl = rsddata.engine.link;

            var apiOK = {
                "ch.isn.lms.statistics": false,
                "ch.isn.lms.auth": false,
                "ch.isn.lms.courses": false,
                "ch.isn.lms.questions": false,
                "gov.adlnet.xapi.lrs": false,
                "powertla.identity.client": false,
                "org.ieee.papi": false,
                "powertla.content.courselist": false,
                "powertla.content.imsqti": false
            };

            rsddata.apis.forEach(function (api) {
                if (apiOK.hasOwnProperty(api.name)) {
                    apiOK[api.name] = true;
                }
            });

            /**
             * validate either against the old or the new API.
             * The validation forbids mixing the APIs!
             */
            if (apiOK["powertla.identity.client"] &&
                 apiOK["org.ieee.papi"] &&
                 apiOK["powertla.content.courselist"] &&
                 apiOK["powertla.content.imsqti"]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @private @method validateRSD(rsddata)
     *
     * helper function to validate the rsd response from a server.
     *
     * If the RSD is valid, this method generates a new serverid and stores the
     * RSD data persistently into the LMS data
     */
    function validateRSD(rsddata) {
        if (checkRSD(rsddata)) {
            // got my APIs from the rsd, generate a new ID
            var ts = (new Date()).getTime();
            rsddata.id = "lms" + ts;
            rsddata.keys = {};

            lmsData["lms" + ts] = rsddata;
            storeData();

            // inform the app that the service is OK
            $(document).trigger("LMS_AVAILABLE", [rsddata.id]);

            if (!rsddata.hasOwnProperty("inaccessible")) {
                registerDevice(rsddata);
            }
// TODO Fetch Logo
//                if (rsddata.hasOwnProperty("logolink")) {
//
//                }
        }
        else {
            $(document).trigger("LMS_UNAVAILABLE", [rsddata.id]);
        }
    }

    /**
     * @constructor
     * It loads data from the local storage. In the first time there are no data
     * in the local storage and sets as active server the default server.
     */
    function LMSModel(idp) {
        this.idp = idp; // the calling identifyprovider
        loadData();
        if (activeServer) {
            activeLMS = lmsData[activeServer];
        }
        else {
            activeLMS = null;
        }

        var self = this;

        // ensure that all LMSes are properly registered
        document.addEventListener("online",
                                  function () {self.synchronize();},
                                  false);

        // FUTURE enable selective logout for an individual server
        // FUTURE allow pending logouts (again)
        var prepLogout      = false,
            lrsLogoutReady  = false,
            cbLogoutReady   = false,
            serviceid       = null;

        function cbDropKey() {
            // delete the keys ONLY if we really need to delete them.

            if (serviceid && prepLogout) {
                delete lmsData[serviceid].keys.MAC;
                delete lmsData[serviceid].keys.Bearer;
                storeData();
            }

            $(document).trigger("ID_LOGOUT_OK", [serviceid]);

            serviceid       = null;
            prepLogout      = false;
            lrsLogoutReady  = false;
            cbLogoutReady   = false;
        }

        function removeAccessKey() {
            if (serviceid &&
                prepLogout &&
                cbLogoutReady &&
                lrsLogoutReady) {
                // send delete to profile service

                if (lmsData &&
                    lmsData[serviceid] &&
                    lmsData[serviceid].keys &&
                    (lmsData[serviceid].keys.MAC || lmsData[serviceid].keys.Bearer)) {

                    if(self.idp.app.isOnline()) {
                        $.ajax({
                            type: "DELETE",
                            beforeSend: self.idp.sessionHeader(["MAC", "Bearer"]),
                            url: self.getServiceURL("org.ieee.papi", serviceid),
                            success: cbDropKey,
                            error: cbDropKey
                        });
                    }
                    else {
                        // TODO remember pending logout

                        // inform views about pending logout
                        $(document).trigger("ID_LOGOUT_OK", [serviceid]);
                    }
                }
            }
        }

        $(document).bind("ID_LOGOUT_REQUESTED",  function (evt, serverid) {

            serviceid = serverid;
            prepLogout = true;
            removeAccessKey();
        });

        $(document).bind("LRS_LOGOUT_READY",     function (evt, serverid) {
            // if this log is not present the logout will fail
            console.log("LRS READY 4 LOGOUT");

            serviceid = serverid;
            lrsLogoutReady = true;
            removeAccessKey();
        });

        $(document).bind("CONTENT_LOGOUT_READY", function (evt, serverid) {
            // if this log is not present the logout will fail
            console.log("CB READY 4 LOGOUT");

            serviceid = serverid;
            cbLogoutReady = true;
            removeAccessKey();
        });
    }

    /**
     * @public
     * @function findServerInfo(serverid)
     * @param {STRING} serverid
     *
     * Finds the serverid in the internal LMS list and returns the server info
     *
     * If the server id is not found this method returns undefined.
     */
    LMSModel.prototype.findServerByID = function (serverid) {
        return lmsData[serverid];
    };

    /**
     * @public
     * @function findServerByURL(serverURL)
     * @param {STRING} serverURL
     * @returns {OBJECT} rsd
     *
     * looks up the service RSD that is associated to the provided URL.
     *
     * If the URL has no associated RSD, the function returns undefined.
     */
    LMSModel.prototype.findServerByURL = function (serverURL) {
        serverURL.trim();
        var serverid;

//        if (serverURL.search(/^https?:\/\//i) !== 0) {
//             add the protocol to the front. assume https, refuse anything else
//            serverURL = "https://" + serverURL;
//        }

        for (serverid in lmsData) {
            if (lmsData.hasOwnProperty(serverid) &&
                lmsData[serverid].engine &&
                lmsData[serverid].engine.link === serverURL) {
                return lmsData[serverid];
            }
        }
        return undefined;
    };

    /**
     * @public
     * @function registerDevice(serverid)
     * @param {STRING} serverid
     *
     * Tries to get a request token for the provided serverid.
     *
     * The serverid needs a valid RSD for the given ID.
     *
     * call this function only after getServerRSD(serverURL) has succeeded.
     */
    LMSModel.prototype.registerDevice = function(serverid) {
        if (!(serverid && serverid.length) &&
            activeServer &&
            activeServer.length){
            // register active server
            serverid = activeServer;
        }
        registerDevice(this.findServerByID(serverid));
    };

    /**
     * @public
     * @function getServerRSD(serverURL)
     *
     * tries to fetch the rsd.json for the given serverURL
     */
    LMSModel.prototype.getServerRSD = function getServerRSD(serverURL) {
        /**
         * @private @method rsdFail()
         *
         * informs the app that the provided URL is not available for our app.
         * The UI needs to provide sufficient information to the user.
         */
        function rsdFail() {
            $(document).trigger("LMS_INVALID", [serverURL]);
        }

        serverURL.trim(); // trim whitespaces

        // strip any "index.*" from the end of the URL
        serverURL = serverURL.replace(/\/index\.[^\/\.]+$/i, "/");

        // first check whether the URL is already registered
        if (this.findServerByURL(serverURL)) {
            // nothing has to be done the LMS is already available
            $(document).trigger("LMS_AVAILABLE");
        }
        else {
            // check for a trailing slash
            if (serverURL.search(/\/$/) === -1) {
                // add a slash
                serverURL = serverURL + "/";
            }

            // our RSD files are always inside the TLA directory
            if (serverURL.search(/\/tla\//) === -1) {
                serverURL = serverURL + "tla/";
            }

            // add the rsd.json to the URL
            serverURL = serverURL + "rsd";

            var self = this;
            this.fetchRSD(serverURL + ".json")
                .then(validateRSD)
                .catch(function(xhr) {
                if (xhr.status > 0) {
                    self.fetchRSD(serverURL + ".php")
                        .then(validateRSD)
                        .catch(rsdFail);
                }
                else {
                    rsdFail(xhr);
                }
            });
        }
    };

    LMSModel.prototype.updateAllServerRSD = function () {
        // for each LMS secure the keys
        Object.keys(lmsData).forEach(this.updateServerRSD,this);

    };

    LMSModel.prototype.updateServerRSD = function (serverID) {
        // secure the LMS tokens
        var self = this;
        var keys = lmsData[serverID].keys,
            ts = (new Date()).time();

        function cbCheckRSD(rsddata) {
            if (checkRSD(rsddata)) {
                rsddata.id = serverID;
                rsddata.keys = keys;

                lmsData[serverID] = rsddata;
                storeData();

                // inform the app that the service is OK
                $(document).trigger("LMS_AVAILABLE");

// TODO Fetch Logo
//                if (rsddata.hasOwnProperty("logolink")) {
//
//                }

            }
        }

        // check if an update is possible
        var rsd = lmsData[serverID];
        if (rsd.inaccessible > 0) {
            var delta = ts - rsd.inaccessible;
            if (delta > 3600000) { // wait for one hour
                delete rsd.inaccessible;
                storeData();
            }
        }

        if (!rsd.hasOwnProperty("inaccessible")) {
            var url = rsd.engine.link + "/rsd";
            this.fetchRSD(url + ".json")
                .then(cbCheckRSD)
                .catch(function () {
                self.fetchRSD(url + ".php")
                    .then(cbCheckRSD);
                // if another error happens we leave the old RSD
            });
        }
    };

    LMSModel.prototype.fetchRSD = function (url) {
        return new Promise(function (resolve, reject) {
             $.ajax({
                    "type": "GET",
                    "url": url,
                    "dataType": "json",
                    "success": resolve,
                    "error": reject
                });
        });
    };

    LMSModel.prototype.eachLMSraw = function (cbFunc, bind) {
        if (!bind) {
            bind = this;
        }

        var ts = (new Date()).getTime();

        Object.getOwnPropertyNames(lmsData).forEach(function (lmsid) {
            var rsd = lmsData[lmsid];
            if (rsd.inaccessible > 0) {
                var delta = ts - rsd.inaccessible;
                if (delta > inactiveTimeout) { // wait for one hour
                    delete rsd.inaccessible;
                    storeData();
                }
            }
            cbFunc.call(bind, rsd);
        });

    };

    /**
     * @public @method eachLMS(callbackFunction, bindObject)
     * @param callback   - the callback function to handle the LMS data
     * @param bindObject - the object that should be used as this for the
     *                     callback
     * @param authstate  - which LMS to fetch
     *
     * This method loops through the registered LMSes and passes a simplified
     * RSD to the callback function. The callback function accepts 1 parameter.
     * This parameter is an object with the following keys.
     *
     *  * "name"      - the displayname of the LMS
     *  * "id"        - the app ID of the LMS
     *  * "logofile" - the file for the logo associated with the LMS
     *
     * This is list can be used to display the list of registered LMSes for the
     * app. I suppose that most users have only one or two LMSes registered.
     *
     * authState = 0 means get all LMS
     * authState = 1 means get only LMS with auth keys
     * authState = -1 means get only LMS without authkeys
     */
    LMSModel.prototype.eachLMS = function (cbFunc, bind, authState) {
        if (!bind) {
            bind = this;
        }
        var self = this;

        var ts = (new Date()).getTime();

        Object.getOwnPropertyNames(lmsData).forEach(function (lmsid) {
            var rsd = lmsData[lmsid];
            if (rsd.inaccessible > 0) {
                var delta = ts - rsd.inaccessible;
                if (delta > inactiveTimeout) { // wait for one hour
                    delete rsd.inaccessible;
                    storeData();
                }
            }
            var isSelected = (activeLMS && activeLMS.id === lmsid) ? 1 : 0;

            if (!authState ||
                (authState === 1 && self.authState(lmsid)) ||
                (authState === -1 && !self.authState(lmsid))) {
                cbFunc.call(bind, {"id": rsd.id,
                                   "name": rsd.name,
                                   "logofile": rsd.logolink,
                                   "inactive": ((rsd.inactive &&
                                                rsd.inactive > 0) ? 1 : 0),
                                   "selected": isSelected});
            }
        });
    };

    /**
     * @prototype
     * @function authstate(lmsid)
     * @param {STRING} lmsid
     *
     * returns true if access keys exist for the LMS
     */
    LMSModel.prototype.authState = function (lmsid) {
        return (lmsData[lmsid].keys.hasOwnProperty("user") ||
                lmsData[lmsid].keys.hasOwnProperty("Bearer") ||
                lmsData[lmsid].keys.hasOwnProperty("MAC"));
    };

    /**
     * @public @method activeLMS(callback, bindObject)
     *
     * @param {FUNCTION} callback - the callback function to handle the LMS
     *                              data
     * @param {OBJECT} bindObject - the object that should be used as this
     *                              for the callback
     *
     * activeLMS returns the simplified RSD for the active LMS. It provides
     * the same data to
     * the callback as eachLMS().
     */
    LMSModel.prototype.getActiveLMS = function (cbFunc, bind) {
        if (!bind) {
            bind = this;
        }

        if (activeLMS) {
            var rsd = activeLMS,
                ts = (new Date()).getTime();

            // clear the inaccessible flag after some time.
             if (rsd.inactive > 0) {
                var delta = ts - rsd.inactive;
                if (delta > 3600000) { // wait for one hour
                    this.clearInactiveFlag();
                }
            }

            cbFunc.call(bind, {"id": rsd.id,
                               "name": rsd.name,
                               "logofile": rsd.logolink,
                               "inactive": ((rsd.inactive &&
                                            rsd.inactive > 0) ? 1 : 0),
                               "selected": 1});
        }
    };

    /**
     * @public @method setActiveLMS(serverid)
     * @param serverid - the lms id for the presently active server.
     *
     * This method sets the active LMS that is used for the following LMS
     * operations.
     *
     * Presently, it is used only for authentication and request signing.
     */
    LMSModel.prototype.setActiveLMS = function (serverid) {
        var tmpLMS = lmsData[serverid];
        if (tmpLMS) {
            if (!previousLMS) {
                previousLMS = activeLMS;
            }
            activeLMS = tmpLMS;
            activeServer = serverid;
            storeData();

            if (tmpLMS.keys &&
                tmpLMS.keys.hasOwnProperty("device")) {
                $(document).trigger("LMS_DEVICE_READY");
                previousLMS = null;
            }
            else {
                // register the device in a second stage
                registerDevice(tmpLMS);
            }
        }
    };

    /**
     * @prototype
     * @function getLMSStatus
     * @param {STRING} serverid
     * @return {BOOL} inaccessible flag
     *
     * returns true if the LMS is accessible.
     * returns false if the LMS is inaccessible.
     *
     * This function does not take the online state into account.
     *
     * If the inaccessible flag times out, the function returns true
     */
    LMSModel.prototype.getLMSStatus = function (serverid) {
        if (!serverid) {
            serverid = activeServer;
        }
        var tmpLMS = this.findServerByID(serverid);
        if (tmpLMS) {
            if (!tmpLMS.hasOwnProperty('inactive') &&
                !tmpLMS.hasOwnProperty('inaccessible')) {
                return true;
            }

            // NOTE inactive and inaccessible may exist but are deactivated.
            if (!tmpLMS.inactive &&
                !tmpLMS.inaccessible) {
                return true;
            }

            var dt = (new Date()).getTime() - tmpLMS.inactive;
            if (dt > inactiveTimeout) {
                this.clearInactiveFlag(serverid);
                return true;
            }
        }

        return false;
    };

    /**
     * @function getDefaultLanguage
     * @return {String} defaultLanguage, the default language of the active/selected server
     *
     * This is function takes only the default language for the active server into account.
     * It does NOT reflect the device language or the user's preferred language.
     * This information must get extracted from the configuration or the identity model.
     */
    LMSModel.prototype.getDefaultLanguage = function () {
        if (activeLMS &&
            activeLMS.language &&
            activeLMS.language.length) {
            return activeLMS.language;
        }
        return undefined;
    };

    /**
     * @public @function getServiceURL(serviceName, serverid, path)
     * @param {String} serviceName - the name of the service
     * @param {STRING} serverid - the internal id of the server
     * @param {ARRAY} path - optional, additional pathinfo variables
     * @return {String} serviceURL - the url to the service for the active server.
     *
     * getServiceURL() returns the full URL to a service for the active LMS. If the
     * service is not provided by the LMS, the response will be undefined.
     */
    LMSModel.prototype.getServiceURL = function (serviceName, serverid, path) {
        var rsd = activeLMS;
        if (serverid) {
            rsd = lmsData[serverid];
        }
        if (rsd) {
            return getServiceURL(rsd, serviceName, path);
        }
        return undefined;
    };

    /**
     * @public @method restoreActiveServer()
     *
     * if the selected server is not available for some reason,
     * this function switches back to the previous active server.
     */
    LMSModel.prototype.restoreActiveServer = function () {
        if (previousLMS) {
            activeLMS = previousLMS;
            activeServer = previousLMS.id;
            storeData();
            previousLMS = null;
        }
    };

    /**
     * @public @function getActiveToken()
     *
     * returns the requestToken (keys.device) for the activeServer
     */
    LMSModel.prototype.getActiveToken = function (id) {
        if (!id) {
            id = activeServer;
        }

        if (id &&
            lmsData[id] &&
            lmsData[id].keys) {
            if (lmsData[id].keys.hasOwnProperty("MAC")) {
                return lmsData[id].keys.MAC;
            }
            if (lmsData[id].keys.hasOwnProperty("Bearer")) {
                return lmsData[id].keys.Bearer;
            }
            if (lmsData[id].keys.hasOwnProperty("Request")) {
                return lmsData[id].keys.Request;
            }
            return lmsData[id].keys.device;
        }
        return undefined;
    };

    LMSModel.prototype.getActiveRequestToken = function () {
        if (activeServer &&
            lmsData[activeServer] &&
            lmsData[activeServer].keys) {
            if (lmsData[activeServer].keys.hasOwnProperty("Request")) {
                return lmsData[activeServer].keys.Request;
            }
            return lmsData[activeServer].keys.device;
        }
        return undefined;
    };

    /**
     * @public @function addToken(newToken)
     *
     * adds a new token to the active server's keys
     */
    LMSModel.prototype.addToken = function (token) {
        if (activeServer &&
            lmsData[activeServer]) {
            addToken(activeServer, token);
        }
    };

    /**
     * @public @function removeToken(tokenType)
     *
     * removes the token with the given tokenType from the LMS's key chain.
     */
    LMSModel.prototype.removeToken = function (tokenType) {
        if (activeServer &&
            lmsData[activeServer] &&
            lmsData[activeServer].keys &&
            lmsData[activeServer].keys.hasOwnProperty(tokenType)) {
            delete lmsData[activeServer].keys[tokenType];
            storeData();
        }
    };

    /**
     * @prototype
     * @function sessionHeader
     * @param {OBJECT} xhr
     *
     * DEPRECIATED sets the active RequestToken to the Header.
     */
    LMSModel.prototype.setSessionHeader = function (xhr) {
        if (lmsData[lmsData.activeServer].keys.device) {
            xhr.setRequestHeader('RequestToken',
                                 lmsData[lmsData.activeServer].keys.device);
        }
    };

    /**
     * manage the syncstate centrally.
     *
     * Allow the server to toggle the timeout time.
     */
    LMSModel.prototype.setSyncStateForServer = function (serverid) {
        if (!serverid) {
            serverid = activeServer;
        }

        lmsData[serverid].lastSyncTime = (new Date()).getTime();
        if (!lmsData[serverid].syncTimeOut) {
            lmsData[serverid].syncTimeOut = inactiveTimeout;
        }
        storeData();
    };

    /**
     * @public @method clearInactiveFlag(serviceid)
     *
     * clears the inactive timestamp for the active server
     */
    LMSModel.prototype.clearInactiveFlag = function (serviceid) {
        if (!serviceid) {
            serviceid = activeServer;
        }
        delete lmsData[serviceid].inactive;
        storeData();
    };

    /**
     * @public @method setInactiveFlag()
     *
     * sets the inactive timestamp for the active server
     */
    LMSModel.prototype.setInactiveFlag = function (serviceid) {
        if (!serviceid) {
            serviceid = activeServer;
        }

        setInactiveFlag(serviceid);
    };

    LMSModel.prototype.synchronize = function () {
        // checks all servers for request tokens, if no token is available then a new token is collected from the service.
        if (this.idp && this.idp.app && this.idp.app.isOnline()) {
            Object.getOwnPropertyNames(lmsData).forEach(function (v) {
               if (lmsData[v].keys && !lmsData[v].keys.Request) {
                    // has no request token
                    registerDevice(lmsData[v]);
                }
            }, this);
        }
    };

    // in a future release the models should be moved into a static objects
    // under the window object, so they are already instantiated when the
    // views come into play.
    w.LMSModel = LMSModel;
}(window));
