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

    var idp; // helper for url building

    function cbDbOk(res) {
        console.log("database action ok");
    }

    function cbDbError(err) {
        console.log("database error: " + err.message);
    }

    /**
     * find out which upgrade to process first
     */
    function nextUpdate(db, version) {
        if (version < 3.1) {
            return upgrade031(db);
        }

        // add new upgrade function here!

        // last list/ Make certain that this is not accidentally reached.
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
                cbHandleActionRow31(actions.pop());
            }
            else {
                // done
                w.localStorage.setItem(versionkey, 3.1);

                // trigger update finish;
                $(document).trigger("UPDATE_STEP_DONE");

                // check if there is another update
                nextUpdate(db, 3.1);
            }
        }

        function handleContext31(ctxtObject) {
            db.insert("contextindex", ctxtObject)
                .then(nextContext31)
                .catch(nextAction31);
        }

        function nextContext31() {
            if (contexts.length) {
                handleContext31(contexts.pop());
            }
            else {
                nextAction31();
            }
        }

        function buildContextIndex31(uuid, stored, action) {
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
                        ctxtParent  = n + ".";
                        Object.getOwnPropertyNames(action.context.contextActivities).forEach(handleContextActivities);

                    }
                    else if (n === "extensions") {
                        Object.getOwnPropertyNames(action.context.extensions).forEach(handleContextExtensions);

                    }
                    else {
                        contexts.push({uuid: uuid, stored: stored, type: ctxtType, contextid: action.context[n]});
                    }
                });
            }

            nextContext31();
        }

        function updgradeAction31(action, courseid) {
            if (action.verb.id === "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt") {
                // add course context
                var aCourse = courseid.split("_");
                var courseURI = idp.serviceURL("powertla.content.courselist",
                                               aCourse[0],
                                               [aCourse[1]]);
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
                        use = false;
                    }
                }
                if (use) {
                    action.context.contextActivities.parent.push({id:courseURI});
                }
            }

            return action;
        }

        function cbAllActions31(res) {
            actions = [];

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
            nextAction31();
        }

        dbversion = w.localStorage.getItem(versionkey);

        // as long no version key is set,
        if (dbversion < 3.1) {
            var q1 = {
                from: "action",
                result: ["uuid", "record", "stored", "courseid"]
            };

            db.select(q1)
                .then(cbAllActions31)
                .catch(cbDbError);
        }
        else {
            nextUpdate();
        }
    }

    function upgradeDB(appVersion, app) {

        versionkey = app.id + ".version";
        var dbversion = w.localStorage.getItem(versionkey);

        idp = app.models.identityprovider;

        if (!dbversion) {
            dbversion = 0.0;
            w.localStorage.setItem(versionkey, dbversion);
        }

        // open the database

        var db = w.LearningRecordStore.getDb();

        nextUpdate(db, dbversion);
    }

    /**
     * expose the update function
     */
    w.UpdateModel = {
        upgrade: upgradeDB
    };
} (window));
