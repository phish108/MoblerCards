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

/*global $, DBHelper, Promise, device, moment */

/** **************************************************************************
 * Update Model
 *
 * The Update Model is responsible for handling the complexities of database
 * updating.
 *
 * The model is only internally used by the controller and is not part of the
 * normal models structure. At the time this model is running all core
 * structures MUST be initialized
 *
 * The update model is a singleton and will not get instantiated rather than
 * triggered.
 */

(function (w) {

    var idp, // helper for url building
        versionkey,
        targetversion;

    // this is an helper array to ensure that we run every update routine only once.
    var arrUpdate = [],
        debugFlag = false;

    // add here the hooks for the upgrade functions.
    var upgradeFunctions = {
        "3.1": upgrade031
    };

    /** ******************************************************************** *
     * Upgrader functions
     *
     * Each function here is a self contained upgrade script.
     * In order to link the script
     * ********************************************************************* */

    /**
     * function upgrade031
     *
     * upgrades the initial 3.0 data to the 3.1 data.
     *
     * this includes 2 Steps
     *
     * 1. upgrade the action contexts in the LRS to correctly include the
     *    course context
     * 2. build the contextindex
     */
    function upgrade031(db) {

        var dbversion = 0.0,
            actions = [],
            contexts = [];

        function cbHandleActionRow31(oAction) {

            console.log(oAction);

            console.log("update a single action " + oAction.uuid);

            var newRecord = updgradeAction31(oAction.record,
                                             oAction.courseid);

            buildContextIndex31(oAction.uuid,
                                oAction.stored,
                                newRecord);

            db.update({
                set: {record: JSON.stringify(newRecord)},
                from: "actions",
                where: {"=": {uuid: oAction.uuid}}
            })
                .then(nextContext31)
                .catch(cbDbError);
        }

        function nextAction31() {

            if (actions.length) {
                console.log("handle next action. " + actions.length + " actions left");
                cbHandleActionRow31(actions.shift());
            }
            else {
                console.log("all actions updates to 3.1");

                // done
                w.localStorage.setItem(versionkey, 3.1);

                // trigger update finish;
                $(document).trigger("UPDATE_STEP_DONE");

                // check if there is another update
                nextUpdate(db, 3.1);
            }
        }

        function handleContext31(ctxtObject) {
            console.log( "add context " + ctxtObject.type + " => " + ctxtObject.contextid);

            db.insert("contextindex", ctxtObject)
                .then(nextContext31)
                .catch(nextAction31);
        }

        function nextContext31() {
            if (contexts.length) {
                console.log("next update");
                handleContext31(contexts.shift());
            }
            else {
                console.log("all contexts updated move to next action");
                nextAction31();
            }
        }

        function buildContextIndex31(uuid, stored, action) {
            console.log("build context index from action");
            console.log(action);

            contexts = [];

            var ctxtType, ctxtParent;

            function pushContextId(val) {
                contexts.push({uuid: uuid,
                               stored: stored,
                               type: ctxtType,
                               contextid: val.id});
            }

            function handleContextActivities(act) {
                ctxtType = ctxtParent + act;
                if (Array.isArray(action.context.contextActivities[act])) {

                    console.log("add context activity list");

                    action.context.contextActivities[act].forEach(pushContextId);
                }
                else {

                    console.log("add single context activity");

                    pushContextId(action.context.contextActivities[act]);
                }
            }

            function handleContextExtensions(ext) {
                console.log("add context extension");

                contexts.push({uuid: uuid,
                               stored: stored,
                               type: ext,
                               contextid: action.context.extensions[ext]});
            }

            if (action &&
                action.context) {

                console.log("setup contexts");

                Object.getOwnPropertyNames(action.context).forEach(function (n) {
                    ctxtType = n;

                    if (n === "contextActivities") {
                        console.log("nested context objects");
                        ctxtParent  = n + ".";
                        Object.getOwnPropertyNames(action.context.contextActivities).forEach(handleContextActivities);

                    }
                    else if (n === "extensions") {
                        console.log("nested context extensions");
                        Object.getOwnPropertyNames(action.context.extensions).forEach(handleContextExtensions);

                    }
                    else {
                        console.log("simple objects");
                        contexts.push({uuid: uuid, stored: stored, type: ctxtType, contextid: action.context[n]});
                    }
                });
            }
        }

        function updgradeAction31(action, courseid) {
            if (courseid &&
                courseid.indexOf('_') > 0 &&
                action &&
                action.verb.id === "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt") {

                console.log("update response action");

                // add course context
                var aCourse = courseid.split("_");
                var courseURI = idp.serviceURL("powertla.content.courselist",
                                               aCourse[0],
                                               [aCourse[1]]);

                console.log("got course uri for :" + aCourse[0] + " & " + aCourse[1] + " -> "+ courseURI);

                if (!action.context) {

                    action.context = {};
                }

                if (!action.context.hasOwnProperty("contextActivities")) {

                    action.context.contextActivities = {};
                }

                if (!action.context.contextActivities.hasOwnProperty("parent")) {

                    action.context.contextActivities.parent = [];
                }

                // only upgrade if the action is not already in the correct format
                var i = 0, use = true;
                for (i =0; i < action.context.contextActivities.parent.length; i++) {

                    if (action.context.contextActivities.parent[i].id === courseURI) {

                        console.log("actions is already in the correct format.");

                        use = false;
                    }
                }
                if (use) {
                    console.log("add course context");
                    action.context.contextActivities.parent.push({id:courseURI});
                }
            }

            return action;
        }

        function cbAllActions31(res) {
            actions = [];

            var i = 0,
                len = res.rows.length,
                oRecord,
                row;

            console.log("update all " + res.rows.length + " actions");

            for (i = 0; i < len; i++) {

                row = res.rows.item(i);

                oRecord = JSON.parse(row.record);

                if (oRecord) {

                    actions.push({uuid: row.uuid,
                                  record: oRecord,
                                  stored: row.stored,
                                  courseid:row.courseid});
                }
            }

            // next action
            console.log("iterate through the actions " +  JSON.stringify(actions));
            nextAction31();
        }

        dbversion = w.localStorage.getItem(versionkey);

        var q1 = {
            from: "actions",
            result: ["uuid", "record", "stored", "courseid"]
        };

        db.select(q1)
            .then(cbAllActions31)
            .catch(cbDbError);
    } // END upgrader 3.1

    /** ******************************************************************** *
     * Upgrader Interface functions
     *
     * Do not touch the functions beyond this point.
     * ********************************************************************* */

    function cbDbOk(res) {
        console.log("database action ok");
    }

    function cbDbError(err) {
        console.log("database error: ");
        console.log(err);
    }

    /**
     * checkUpdateRequierment()
     *
     * helper funtion to test whether to run an update or not. If the update
     * should get executed, it returns true.
     *
     * Per startup this version can only run ONCE, because the function
     * also handles some sanity checks to avoid infinite loops.
     */
    function checkUpdateRequirement(targetVersion, currentVersion) {

        if (((!debugFlag && currentVersion < targetVersion) || // production
            (debugFlag && currentVersion <= targetVersion)) && // development
            arrUpdate.indexOf(targetVersion) < 0) {

            console.log("update to " + targetVersion);
            arrUpdate.push(3.1);

            return true;
        }

        return false;
    }

    /**
     * find out which upgrade to process first
     *
     * nextUpdate() is the place to locate the update logic.
     *
     */
    function nextUpdate(db, version) {
        console.log("next update");

        // unfinished will be true if the some function executes a upgrader
        var unfinished = Object.getOwnPropertyNames(upgradeFunctions)
            .sort(function (a,b) {

                 return parseFloat(a) - parseFloat(b);
            })
            .some(function (tVersion) {
                if (checkUpdateRequirement(parseFloat(tVersion),
                                           parseFloat(version))) {

                    upgradeFunctions[tVersion](db);
                    return true;
                }
            });

        if (!unfinished) {
            // last list/ Make certain that this is not accidentally reached.
            console.log("update done");
            $(document).trigger("UPDATE_DONE");
        }
    }

    function upgradeDB(appVersion, app) {

        versionkey = app.id + ".version";
        targetversion = appVersion;

        console.log("update database " + versionkey);

        var dbversion = w.localStorage.getItem(versionkey);

        idp = app.models.identityprovider;

        if (!dbversion) {
            dbversion = 0.0;
            w.localStorage.setItem(versionkey, dbversion);
        }

        console.log("update from version " + dbversion);

        // open the database

        var db = w.LearningRecordStore.getDb();

        if (db) {
            console.log("db looks ok");
        }

        nextUpdate(db, dbversion);
    }

    /**
     * set the debug flag true to invoke the upgrader up until the current
     * app version
     *
     * use the following code:
     *
     *     UpdateModel.debug(1);
     *
     * you can deactivte the flag by setting it back to 0
     */
    function setDebugFlag(flag) {
        debugFlag = flag ? true : false;
    }

    /**
     * expose the update function
     */

    w.UpdateModel = {
        upgrade: upgradeDB,
        debug: setDebugFlag
    };

} (window));
