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

    var versionkey;
    var targetversion;

    var idp; // helper for url building

    function cbDbOk(res) {
        console.log("database action ok");
    }

    function cbDbError(err) {
        console.log("database error: ");
        console.log(err);
    }

    /**
     * find out which upgrade to process first
     */
    function nextUpdate(db, version) {
        console.log("next update");

        if (targetversion < 3.1) {
            console.log("production version is not ready for upgrading");
            $(document).trigger("UPDATE_DONE");
            return;
        }

        if (version < 3.1) {
            console.log("update to 3.1");
            return upgrade031(db);
        }

        // add new upgrade function here!

        // last list/ Make certain that this is not accidentally reached.
        console.log("update done");
        $(document).trigger("UPDATE_DONE");
    }

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

        function cbHandleActionRow31(row) {

            console.log("update a single action " + row.uuid);

            var newRecord = updgradeAction31(row.record,
                                             row.courseid);
            db.update({
                set: {record: JSON.stringify(newRecord)},
                from: "actions",
                where: {"=": {uuid: row.uuid}}
            })
                .then(buildContextIndex31)
                .catch(cbDbError);
        }

        function nextAction31() {

            if (actions.length) {
                console.log("handle next action. " + actions.length + " actions left");
                cbHandleActionRow31(actions.shift());
            }
            else {
                console.log("all actions updates to 3.1")

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
            console.log("build context index from action")
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
                    action.context.contextActivities[act].forEach(pushContextId);
                }
                else {
                    pushContextId(action.context.contextActivities[act]);
                }
            }

            function handleContextExtensions(ext) {
                contexts.push({uuid: uuid,
                               stored: stored,
                               type: ext,
                               contextid: action.context.extensions[ext].id});
            }

            if (action.context) {
                Object.getOwnPropertyNames(action.context).forEach(function (n) {
                    ctxtType = n;

                    if (n === "contextActivities") {
                        console.log("nested context objects")
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

            console.log("itegrate through the context list");
            nextContext31();
        }

        function updgradeAction31(action, courseid) {
            if (action.verb.id === "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt") {
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

            console.log("update all " + res.rows.length + "actions");

            var i = 0, len = res.rows.length, oRecord, row;
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
            console.log("iterate through the actions")
            nextAction31();
        }

        dbversion = w.localStorage.getItem(versionkey);



        // as long no version key is set,
        if (dbversion < 3.1) {

            console.log("need update to version 3.1");

            var q1 = {
                from: "actions",
                result: ["uuid", "record", "stored", "courseid"]
            };

            db.select(q1)
                .then(cbAllActions31)
                .catch(cbDbError);
        }
        else {
            console.log("no update needed, move on to the next update");
            nextUpdate();
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
            console.log("db lookes ok");
        }

        nextUpdate(db, dbversion);
    }

    /**
     * expose the update function
     */
    console.log("expose update model");

    w.UpdateModel = {
        upgrade: upgradeDB
    };
} (window));
