/*jslint white: true, vars: true, sloppy: true, devel: true, todo: true, plusplus: true, browser: true, regexp: true */

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
 * @author Evangelia Mitsopoulou
 * @author Christian Glahn
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
 *  * LRS (statistics) service (name = "Sensor:XAPI LRS")
 *  * Identity service for devices and user registration (name = "Identity:MBC AUTH")
 *  * QTI service that returns all questions for a course (name = "Content:LMS TestPool")
 *  * Course Service to get all courses for the active user (name = "Content:LMS Course")
 *
 * The baseurl needs to be the same as the base url for the RSD file.
 * The logo url needs to point to a valid PNG file with the size of 32x32 pixels.
 *
 * All API urls have to be relative to the baseurl.
 *
 * The TLA version has to be "MBC.1.0" to indicate the initial non-standard
 * interface.
 *
 * The LMS Model will connect to any LMS that satisfies the following steps
 * 1. Responds with a valid rsd.json file.
 * 2. Provides the APIs for the 4 required services in the RSD.
 * 3. Responds with 200 and content-type "image/png"
 * 4. Responds with 200 to /about requests to all 4 services using the urls given in the rsd.json.
 * 5. Allows the device to register against the Identity service
 *
 * The LMS will get added to the LMS list if step 1-3 succeed.
 * The LMS will be only selectable by the user if step 4 and 5 succeed as well. These steps may
 * fail due to system maintenance. However, they MUST NOT return 404 errors in this case the
 * system is flagged as invalid.
 *
 * As soon a LMS is registered for the device the LMS is stored in the app's LMS list.
 * The model extends the service object with an "key" object. This key object holds three keys:
 *  * "device"
 *  * "userid"
 *  * "userkey"
 *
 * These keys are used to authenticate the individual requests against the various services.
 *
 * Finally, the model generates an internal serverid that identifies a LMS uniquely in the
 * context of the app on the device.
 *
 * This model sends the following signals
 *
 * LMS_AVAILABLE: sent if a new LMS has been successfully registered to the app
 * LMS_UNAVAILABLE: sent if a LMS URL cannot be registered to the app
 * LMS_DEVICE_READY: send if the LMS as provided a device key to the app
 * LMS_DEVICE_NOTALLOWED: sent the app is not allowed to register itself for the LMS
 * LMS_NOSERVICE: sent if a service for a registered LMS is responding with an error
 */

(function (w) {
    var $ = w.$;

    // set the default inactive timeout to 1h
    var inactiveTimeout = 60 * 60 * 1000;

    /**
     * @private @property lmsData
     *
     * The list of registered LMSes.
     * This list is actually an object that refers each serverID to the registered RSD info.
     */
    var lmsData = {};

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

        console.log("loaded data >> "+JSON.stringify(lmsData));
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
            // console.log("error while storing");
            localStorage.setItem("LMSData", "{}");
            lmsData = {};
        }

//        console.log("stored data >> "+JSON.stringify(lmsData));
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
    function getServiceURL(rsd, serviceName) {
        var url = "";
        if (rsd && serviceName && serviceName.length) {
            rsd.apis.forEach(function(api){
                if (api.name === serviceName) {
                    url = rsd.engine.link + api.link;
                    console.log("service URL is " + url);
                }
            });
        }
        return url;
    }

    /**
     * @private @function registerDevice(rsd)
     * @param {Object} rsd - the service's RSD data object
     *
     * fetches the device key from the LMS' Auth service.
     */
    function registerDevice(serverRSD) {
        var APP_ID = "org.mobinaut.mobler";

        function setHeaders(xhr) {
            xhr.setRequestHeader('AppID', APP_ID);
            xhr.setRequestHeader('UUID', w.device.uuid);
        }

        function registerOK(data) {
            serverRSD.keys.device = data.ClientKey;
            storeData();
            $(document).trigger("LMS_DEVICE_READY");
        }

        function registerFail() {
            $(document).trigger("LMS_DEVICE_NOTALLOWED");
        }

        console.log("try to register the app to the LMS");
        // first check if the proper OAuth API is present
        var authurl = getServiceURL(serverRSD, "org.oauth.2");
        if (authurl && authurl.length) {
            console.log("try to register using the OAuth Scheme");
            authurl = authurl + "/device";
            if (authurl && authurl.length) {
                $.ajax({
                    "url": authurl,
                    "type": "PUT",
                    "data": JSON.stringify({"uuid": w.device.uuid}),
                    "dataType": "json",
                    "contentType": "application/json",
                    "success": registerOK,
                    "error": registerFail
                });
            }
        }
        else {
            // if there is no OAuth try to use our own poor mans OAuth
            authurl = getServiceURL(serverRSD, "ch.isn.lms.device");
            if (authurl && authurl.length) {
                console.log("try to register using the Mobler Scheme");
                $.ajax({
                    "url": authurl,
                    "type": "GET",
                    "dataType": "json",
                    "success": registerOK,
                    "error": registerFail,
                    "beforeSend": setHeaders
                });
            }
        }
    }

    /**
     * @private @method validateRSD(rsddata)
     *
     * helper function to validate the rsd response from a server.
     *
     * If the RSD is valid, this method generates a new serverid and stores the
     * RSD data persistently into the LMS data
     *
     * FIXME: uncomment the proper RSD validation.
     */
    function validateRSD(rsddata) {
        var apisfound = 0; //, eurl;
        console.log("validate RSD file");

        function storeRSD() {
            apisfound++;
            if (apisfound >= 4) {
                console.log("detected a valid RSD");
                // got my APIs from the rsd, generate a new ID
                var ts = (new Date()).getTime();
                rsddata.id = "lms" + ts;
                rsddata.keys = {};

                lmsData["lms" + ts] = rsddata;
                storeData();

                // inform the app that the service is OK
                $(document).trigger("LMS_AVAILABLE");

                if (!rsddata.hasOwnProperty("inaccessible")) {
                    console.log("register  the device to the new system");
                    registerDevice(rsddata);

                    // TODO: fetch the logo
                }
            }
        }

        /**
        function failCheck(req) {
            if (req.status > 0 &&
                req.status !== 404) {
                // the server responds and the service is found
                console.log("server is available but the service appear to be inactive");

                // store the time when the service was last accessed
                // so we won't immediately try to access the APIs
                // NOTE: if 1 API fails the entire server won't be accessible!
                rsddata.inaccessible = (new Date()).getTime();
                storeRSD();
            }
            else {
                // inform the app that an important service is missing
                console.log("server is not available");
                $(document).trigger("LMS_UNAVAILABLE");
            }
        }
        */

        if (rsddata &&
            rsddata.hasOwnProperty("apis") &&
            rsddata.apis.length &&
            rsddata.hasOwnProperty("engine") &&
            rsddata.engine.link &&
            rsddata.engine.link.length
           ) {
            // eurl = rsddata.engine.link;

            console.log('rsd looks good check if the APIs exist');

            rsddata.apis.forEach(function (api) {
                switch (api.name) {
                    case "gov.adlnet.xapi.lrs":
                    case "ch.isn.lms.statistics":
                    case "ch.isn.lms.auth":
                    case "ch.isn.lms.courses":
                    case "ch.isn.lms.questions":
                        // verify that the APIs do not time out or respond with 404

                        // NOTE the "about" API MUST be present with all services
                        // without authentication. the legacy services will fail

                        // TODO: test the actual presence of the API
                        // This has to remain commented for the time being due to the
                        // bad code in the backend.
//                        $.ajax({
//                            "url":eurl + api.link + "/about",
//                            "success": storeRSD,
//                            "error": failCheck
//                        });

                        console.log("got 1 API " + api.name);
                        // fake validation
                        storeRSD();
                        break;
                    default:
                        break;
                }
            });
            if (apisfound < 4) {
                // not all apis are present
                // FIXME: checking for the API Count is error prone
                $(document).trigger("LMS_UNAVAILABLE");
            }
        }
    }

    /**
     * @constructor
     * It loads data from the local storage. In the first time there are no data
     * in the local storage and sets as active server the default server.
     */
    function LMSModel(app) {
        this.idprovider = app.models.identityprovider;

        loadData();
        if (lmsData.activeServer) {
            this.activeLMS = lmsData[lmsData.activeServer];
        }
        else {
            this.activeLMS = null;
        }
        this.previousLMS = null;
    }

    /**
     * @function findServerInfo(serverid)
     *
     * Finds the serverid in the internal LMS list and returns the server info
     *
     * If the server id is not found this method returns undefined.
     */
    LMSModel.prototype.findServerByID = function (serverid) {
        return lmsData[serverid];
    };

    LMSModel.prototype.findServerByURL = function (serverURL) {
        serverURL.trim();
        var serverid;

        if (serverURL.search(/^https?:\/\//i) !== 0) {
            // add the protocol to the front. assume https, refuse anything else
            serverURL = "https://" + serverURL;
        }
        for (serverid in lmsData) {
            if (lmsData.hasOwnProperty(serverid) &&
                lmsData[serverid].engine &&
                lmsData[serverid].engine.link === serverURL) {
                return lmsData[serverid];
            }
        }
        return undefined;
    };


    LMSModel.prototype.registerDevice = function(serverid) {
        if (serverid && serverid.length) {
            registerDevice(this.findServerByID(serverid));
        }
        else if (lmsData.activeServer && lmsData.activeServer.length){
            // register active server
            var rsd = lmsData[lmsData.activeServer];
            if (!(rsd.keys &&
                  rsd.keys.device &&
                  rsd.keys.device.length)) {
                console.log("missing device token, reregister!");
                registerDevice(rsd);
            }
        }
    };

    /**
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
            console.log("failed to load the rsd, server not found");
            $(document).trigger("LMS_UNAVAILABLE");
        }

        /**
         * @private @method rsdCheckAgain
         *
         * This method checks whether there is a dynamic version of the rsd.json
         * (we expect a php script for Ilias and Moodle)
         */
        function rsdCheckAgain(xhr) {
            if (xhr.status > 0) {
                console.log("check for dynamic rsd file ");
                $.ajax({
                    "url": serverURL + ".php",
                    "dataType": "json",
                    "success": validateRSD,
                    "error": rsdFail
                });
            }
            else {
                // in this case we could not reach the target host
                rsdFail();
            }
        }

        serverURL.trim(); // remove whitespaces

        // strip any "index.*" from the end of the URL
        serverURL = serverURL.replace(/\/index\.[^\/\.]+$/i, "/"); // i means case insensitive

        if (serverURL.search(/^https?:\/\//i) !== 0) {
            // add the protocol to the front. assume https, refuse anything else
            serverURL = "https://" + serverURL;
        }

        // first check whether the URL is already registeed
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

            $.ajax({
                "url": serverURL + ".json",
                "dataType": "json",
                "success": validateRSD,
                "error": rsdCheckAgain
            });
        }
    };

    /**
     * @public @method eachLMS(callbackFunction, bindObject)
     * @param callback - the callback function to handle the LMS data
     * @param bindObject - the object that should be used as this for the callback
     *
     * This method loops through the registered LMSes and passes a simplified RSD
     * to the callback function. The callback function accepts 1 parameter. This
     * parameter is an object with the following keys.
     *
     *  * "name"      - the displayname of the LMS
     *  * "id"        - the app ID of the LMS
     *  * "logofile" - the file for the logo associated with the LMS
     *
     * This is list can be used to display the list of registered LMSes for the
     * app. I suppose that most users have only one or two LMSes registered.
     */
    LMSModel.prototype.eachLMS = function (cbFunc, bind) {
        if (!bind) {
            bind = this;
        }

        var ts = (new Date()).getTime();

        console.log("LMS List: " + JSON.stringify(lmsData));

        Object.keys(lmsData).forEach(function (lmsid) {
            if (lmsid !== "activeServer") {
                var rsd = lmsData[lmsid];
                if (rsd.inaccessible > 0) {
                    var delta = ts - rsd.inaccessible;
                    if (delta > 3600000) { // wait for one hour
                        delete rsd.inaccessible;
                        storeData();
                    }
                }
                var isSelected = (this.activeLMS && this.activeLMS.id === lmsid) ? 1 : 0;

                console.log('server is inaccessible? ' + rsd.inaccessible);

                cbFunc.call(bind, {"id": rsd.id,
                                   "name": rsd.name,
                                   "logofile": rsd.logolink,
                                   "inactive": ((rsd.inaccessible &&
                                                rsd.inaccessible > 0) ? 1 : 0),
                                   "selected": isSelected});
            }
        });
    };

    /**
     * @public @method activeLMS(callback, bindObject)
     *
     * @param callback - the callback function to handle the LMS data
     * @param bindObject - the object that should be used as this for the callback
     *
     * activeLMS returns the simplified RSD for the active LMS. It provides the same data to
     * the callback as eachLMS().
     */
    LMSModel.prototype.getActiveLMS = function (cbFunc, bind) {
        if (!bind) {
            bind = this;
        }

        if (this.activeLMS) {
            var rsd = this.activeLMS,
                ts = (new Date()).getTime();

            // remove the inaccessible flag after some time.
             if (rsd.inaccessible > 0) {
                var delta = ts - rsd.inaccessible;
                if (delta > 3600000) { // wait for one hour
                    delete rsd.inaccessible;
                    storeData();
                }
            }
            console.log('server is inaccessible? ' + rsd.inaccessible);

            cbFunc.call(bind, {"id": rsd.id,
                               "name": rsd.name,
                               "logofile": rsd.logolink,
                               "inactive": ((rsd.inaccessible &&
                                            rsd.inaccessible > 0) ? 1 : 0),
                               "selected": 1});
        }
    };

    /**
     * @public @method setActiveLMS(serverid)
     * @param serverid - the lms id for the presently active server.
     *
     * This method sets the active LMS that is used for the following LMS operations.
     *
     * Presently, it is used only for authentication and request signing.
     */
    LMSModel.prototype.setActiveLMS = function (serverid) {
        this.previousLMS = this.activeLMS;
        var tmpLMS = lmsData[serverid];
        if (tmpLMS) {
            console.log("activate LMS " + JSON.stringify(tmpLMS));
            this.activeLMS = tmpLMS;
            lmsData.activeServer = serverid;
            storeData();

            if (tmpLMS.keys &&
                tmpLMS.keys.hasOwnProperty("device")) {
                $(document).trigger("LMS_DEVICE_READY");
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
            serverid = lmsData.activeServer;
        }
        var tmpLMS = lmsData[serverid];
        if (tmpLMS) {
            if (!tmpLMS.hasOwnProperty('inactive')) {
                return true;
            }

            var dt = (new Date()).getTime() - tmpLMS.inactive;
            if (dt > inactiveTimeout) {
                this.clearInactiveFlag(serverid);
                return true;
            }
        }
        return false
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
        if (this.activeLMS &&
            this.activeLMS.language &&
            this.activeLMS.language.length) {
            return this.activeLMS.language;
        }
        return undefined;
    };

    /**
     * @public @function getServiceURL(serviceName)
     * @param {String} serviceName - the name of the service
     * @return {String} serviceURL - the url to the service for the active server.
     *
     * getServiceURL() returns the full URL to a service for the active LMS. If the
     * service is not provided by the LMS, the response will be undefined.
     */
    LMSModel.prototype.getServiceURL = function (serviceName) {
        return getServiceURL(this.activeLMS, serviceName);
    };

    /**
     * @public @method restoreActiveServer()
     *
     * if the selected server is not available for some reason,
     * this function switches back to the previous active server.
     */
    LMSModel.prototype.restoreActiveServer = function () {
        if (this.previousLMS) {
            this.activeLMS = this.previousLMS;
            lmsData.activeServer = this.previousLMS.id;
            storeData();
            this.previousLMS = null;
        }
    };

    /**
     * @public @function getActiveRequestToken()
     *
     * returns the requestToken (keys.device) for the activeServer
     */
    LMSModel.prototype.getActiveRequestToken = function () {
        return lmsData[lmsData.activeServer].keys.device;
    };

    /**
     * @public @method clearInactiveFlag(serviceid)
     *
     * clears the inactive timestamp for the active server
     */
    LMSModel.prototype.clearInactiveFlag = function (serviceid) {
        if (!serviceid) {
            serviceid = lmsData.activeServer;
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
            serviceid = lmsData.activeServer;
        }
        lmsData[serviceid].inactive = (new Date()).getTime();
        storeData();
    };

    // in a future release the models should be moved into a static objects
    // under the window object, so they are already instantiated when the
    // views come into play.
    w.LMSModel = LMSModel;
}(window));
