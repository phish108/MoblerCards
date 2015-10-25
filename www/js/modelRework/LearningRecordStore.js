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
 * @author Dijan Helbling
 */

/**
 * Learning Record Store Local Model
 */

(function (w) {
    var DB,
        bSyncFlag             = false,
        cntActiveTransactions = 0;

    var logoutSync = {};

    var pendingSync;

    var tableDef = {
        "actions" : {    // the actual records
            "uuid":         "TEXT PRIMARY KEY",
            "record":       "TEXT",
            "stored":       "INTEGER",
            "year":         "INTEGER", // partitioning
            "month":        "INTEGER", // partitioning
            "day":          "INTEGER", // partitioning
            "hour":         "INTEGER", // sampling
            "week":         "INTEGER", // sampling
            "weekday":      "INTEGER", // sampling
            "score":        "INTEGER",
            "verbid":       "TEXT",    // partitioning
            "objectid":     "TEXT",    // internal id
            "courseid":     "TEXT",    // partitioning
            "duration":     "INTEGER",
            "lrsid":        "TEXT"     // synchronisation; unused -> moved to syncindex table
        },
        "contextindex": {              // the index for the filters
            "uuid":         "TEXT",    // the action UUID
            "type":         "TEXT",
            "contextid":    "TEXT",
            "stored":       "INTEGER", // unused
            "lrsid":        "TEXT"     // unused
        },
        "syncindex": {      // the index for synchronising data to the backends
            "uuid":         "TEXT",
            "lrsid" :       "TEXT",
            "userid":       "TEXT", // this is used for pending logouts, keep deferred access tokens in localStorage
            "synchronized": "INTEGER" // timestamp
        }
    };

//    var defaultFilters = [];

    function initDB () {
        DB = new DBHelper({
            'name': 'lrsdb',
            'version': 1,
            'title': 'Learning Record Store',
            'size': 20 * 1024 * 1024 // 20MB LRS
        });

        DB.init(tableDef)
            .then(function() {
//                console.log("database is OK");
                if (typeof pendingSync === "function") {
                    pendingSync.call();
                    pendingSync = null;
                }
            })
            .catch(function() {
                console.error("database is broken");
            });
    }

    function loadLrsUuidList(lmsid) {
        var key = "uuidlist_" + lmsid;
        var val = localStorage.getItem(key);

        if (val && val.length) {
            return JSON.parse(val);
        }
        return [];
    }

    function storeLrsUuidList(lmsid, list) {
        var key = "uuidlist_" + lmsid;
        if (list === undefined) {
            list = [];
        }
        localStorage.setItem(key, JSON.stringify(list));
    }

    function dropLrsUuidList(lmsid) {
        var key = "uuidlist_" + lmsid;
        localStorage.removeItem(key);
    }

    /**
     * @private @method privMakeStatEntry
     *
     * small helper function for the statistics accessors
     */
    function privMakeStatEntry(today, last) {
        var change = today -  last;

        var cTrend = 0;
        if (change > 0) {
            cTrend = 1;
        }
        if (change < 0) {
            cTrend = -1;
        }

        return {
            today:    today,
            previous: last,
            trend: cTrend
        };
    }

    function LearningRecordStore (app) {
        var self = this;
        this.app = app;
        this.clearContext();
        this.clearLRSContext();

        this.courseStats = {};

        this.loadFilter();

        this.actor = {
          "objectType": "Agent"
        };

        initDB();

        $(document).bind("ID_LOGOUT_REQUESTED", function (evt, serverid) {
            // TODO: synchronise the server if possible
            //console.log("sync LRS before logging out " + serverid);
            //console.log("state of bSync " + bSyncFlag);
            logoutSync[serverid] = true;
            self.synchronize(serverid);
        });
    }

    LearningRecordStore.Default_Speed = 100000000;

    /**
     * @static
     * @function getUUID
     *
     * returns a fresh UUID
     */
    LearningRecordStore.getUUID = function () {
        return DB.createUUID();
    };

    LearningRecordStore.getDb = function () {
        return DB;
    };

    /**
     * @prototype
     * @function resetDB
     * @param {NONE}
     *
     * helper functions to reset the local LRS for testing
     */
    LearningRecordStore.prototype.resetDB = function () {
        DB.dropAllTables().then(function() {
            DB.intallAllTables();
        });
    };

    // cleanup
    LearningRecordStore.prototype.killDB = function () {
        DB.dropAllTables();
    };

    /** ***** Context Handling ***** */

    /**
     * @protoype
     * @function startContext
     * @param {STRING} contextType
     * @param {STRING} contextId - the external contextID (the qti.php request)
     *
     * whenever the context changes, the statistics MUST be reset.
     */
    LearningRecordStore.prototype.startContext = function (contextType, contextId) {
        var promise;
        if (typeof contextType === "string" &&
            typeof contextId === "string") {
            var self = this, bh = true;
            contextType = contextType.trim();
            contextId = contextId.trim();
            if (contextType.length && contextId.length) {
                // split the context into an array
                var arContext = contextType.split(".");
                switch (arContext[0]) {
                    case "registration":
                        self.context.registration = contextId;
                        promise = Promise.resolve();
                        break;
                    case "contextActivities":
                        switch (arContext[1]) {
                            case "parent":
                            case "grouping":
                            case "category":
                            case "other":
                                if (!this.context.hasOwnProperty("contextActivities")) {
                                    this.context.contextActivities = {};
                                }
                                if (!this.context.contextActivities.hasOwnProperty(arContext[1])) {
                                    this.context.contextActivities[arContext[1]] = [];
                                }
                                // check if the context id already exists

                                this.context.contextActivities[arContext[1]].forEach(function(o) {
                                    if (o.id === contextId) {
                                        bh = false;
                                    }
                                });
                                if (bh) {
                                    this.context.contextActivities[arContext[1]].push({id: contextId});
                                }
                                promise = Promise.resolve();
                                break;
                            default:
                                promise = Promise.reject("invalid contextActivity subtype");
                                break;
                        }
                        break;
                    case "statement":
                        promise = new Promise(function (resolve, reject) {
                            DB.select({result: "uuid",
                                       distinct: true,
                                       from: "actions",
                                       where: {"=": "uuid"}
                                      }, [contextId])
                            .then(function() {
                                self.context.statement = {"type": "StatementRef",
                                                          "id": contextId};
                                resolve();
                            })
                            .catch(reject);
                        });
                        break;
                    case "language":
                        if (typeof contextId === "string" &&
                            (contextId.trim().length === 2 ||
                             (contextId.trim().length === 5 &&
                              contextId.trim().split("-").length === 2))) {
                            self.context.language = contextId.trim();
                            promise = Promise.resolve();
                        }
                        else {
                            promise = Promise.reject("invalid language code");
                        }
                        break;
                    default:
                        promise = Promise.reject("invalid context type");
                        break;
                }
            }
        }
        return promise;
    };

    /**
     * @protoype
     * @function endContext
     * @param {STRING} contextType
     * @param {STRING} contextId
     */
    LearningRecordStore.prototype.endContext = function (contextType, contextId) {
         if (typeof contextType === "string" && typeof contextId === "string") {
            contextType = contextType.trim();
            contextId = contextId.trim();
            if (contextType.length && contextId.length) {
                var arContext = contextType.split(".");
                switch (arContext[0]) {
                    case "registration":
                        if (this.context.registration === contextId) {
                            delete this.context.registration;
                        }
                        break;
                    case "contextActvities":
                        if (this.context.contextActivities &&
                            this.context.contextActivities.hasOwnProperty(arContext[1])) {
                            var objID = -1;
                            this.context.contextActivities[arContext[1]].forEach(function (o,i) {
                                if (o.id === contextId) {
                                    objID = i;
                                }
                            });
                            if (objID >= 0) {
                                this.context.contextActivities[arContext[1]].splice(objID, 1);
                            }
                            if (!this.context.contextActivities[arContext[1]].length) {
                                delete this.context.contextActivities[arContext[1]];
                            }
                            if (!Object.getOwnPropertyNames(this.context.contextActivities).length) {
                                delete this.context.contextActivities;
                            }
                        }
                        break;
                    case "statement":
                         if (this.context.statement &&
                             this.context.statement.id === contextId) {
                            delete this.context.statement;
                        }
                        break;
                    case "language":
                         if (typeof contextId === "string" &&
                            (contextId.trim().length === 2 ||
                             (contextId.trim().length === 5 &&
                              contextId.trim().split("-").length === 2)) &&
                             this.context.language === contextId.trim()) {
                            delete this.context.language;
                        }
                        break;
                    default:
                        break;
                }
            }
         }
    };

    /**
     * @protoype
     * @function clearContext
     * @param {STRING} contextType
     * @param {STRING} contextId
     *
     * clears all contexts
     */
    LearningRecordStore.prototype.clearContext = function () {
        this.context = {};
        if (w.device && device.uuid) {
            this.deviceId = device.uuid;
            this.context.extensions = {"http://mobinaut.io/xapi/context/device": device.uuid};
        }
    };

    /**
     * @protoype
     * @function startLRSContext
     * @param {STRING} targetLRS
     *
     * The LRS context is
     *
     * Defines the target LRS backend for the incoming actions.
     * It is possible to report the same actions to different LRS.
     *
     * The targetLRS is a server ID from the Identity Provider.
     * This is used for synchronizing the data to the correct LRS backend.
     */
    LearningRecordStore.prototype.startLRSContext = function (targetLRS) {
        if (typeof targetLRS === "string" && targetLRS.trim().length ) {
            targetLRS = targetLRS.trim();
            if (this.lrscontext.indexOf(targetLRS) < 0) {
                this.lrscontext.push(targetLRS);
            }
        }
    };

    /**
     * @protoype
     * @function endLRSContext
     * @param {STRING} targetLRS
     *
     * removes the targetLRS backend from the reporting.
     * This does not affect the other LRS contexts
     */
    LearningRecordStore.prototype.endLRSContext = function (targetLRS) {
        if (typeof targetLRS === "string" && targetLRS.trim().length ) {
            targetLRS = targetLRS.trim();
            var i = this.lrscontext.indexOf(targetLRS);
            if (i >= 0) {
                this.lrscontext.splice(i, 1);
            }
        }
    };

    /**
     * @protoype
     * @function clearLRSContext
     * @param {STRING} targetLRS
     *
     * removes all LRS backends from the reporting.
     */
    LearningRecordStore.prototype.clearLRSContext = function () {
        this.lrscontext = [];
    };

    /**
     * @protoype
     * @function setActor
     * @param {STRING} actorId
     *
     * sets the actor's acount for new actions.
     * uses the org.ieee.papi service to refer to the user information.
     *
     * The actor is typically set by the Identity provider at the time of
     * login.
     */
    LearningRecordStore.prototype.setActor = function (actorToken) {
        // requires a idToken
        this.actor.openid = this.app.serviceURL("org.ieee.papi",
                                                ["user", actorToken]);
    };

    /**
     * @protoype
     * @function initFilter
     * @param {NONE}
     *
     *
     */
    LearningRecordStore.prototype.initFilter = function () {
        return;
    };

    /**
     * @protoype
     * @function loadFilter
     * @param {NONE}
     *
     *
     */
    LearningRecordStore.prototype.loadFilter = function () {
        return;
    };

    /**
     * @protoype
     * @function fetchFilter
     * @param {NONE}
     *
     *
     */
    LearningRecordStore.prototype.fetchFilter = function () {
        return;
    };

    /**
     * @protoype
     * @function indexActions
     * @param {OBJECT} filter
     *
     *
     */
    LearningRecordStore.prototype.indexActions = function (filter) {
        return;
    };

    /**
     * @protoype
     * @function indexActions
     * @param {OBJECT} filter
     *
     *
     */
    LearningRecordStore.prototype.indexOneAction = function (filter, action) {
        return;
    };


    /****** Action Tracking ******/

    /**
     * @protoype
     * @function startAction
     * @param {OBJECT} record
     * @return {STRING} UUID
     */
    LearningRecordStore.prototype.startAction = function (record, ctxt) {
        var self = this;

        var myUUID;

        if (typeof record === 'object' &&
            record.hasOwnProperty("verb") &&
            record.hasOwnProperty("object")) {
            myUUID = DB.createUUID();

            var mom = moment();
            var created = mom.valueOf();

            record.id = myUUID;
            record.timestamp = mom.format();
            record.stored = record.timestamp;

            record.actor = this.actor;
            if (this.context &&
                Object.getOwnPropertyNames(this.context).length) {

                record.context = this.context;
            }

            // structure the time
            var iData = {
                "uuid":     myUUID,
                "record":   JSON.stringify(record),
                "stored":   created,
                "year":     mom.format("YYYY"),
                "month":    mom.format("YYYYMM"),
                "day":      mom.format("YYYYMMDD"),
                "week":     mom.format("W"),
                "hour":     mom.format("HH"),
                "weekday":  mom.format("E"),
                "verbid":   record.verb.id
            };

            if (ctxt) {
                if (ctxt.courseId) {
                    iData.courseid = ctxt.courseId;
                }
                if (ctxt.objectId) {
                    iData.objectid = ctxt.objectId;
                }
            }

            return DB.insert("actions", iData)
            .then(function (res) {
                res.insertID = myUUID;

                self.lrscontext.forEach(function (lrsid) {
                    var lstUUID = loadLrsUuidList(lrsid);
                    lstUUID.push(myUUID);
                    storeLrsUuidList(lrsid, lstUUID);
                });

                return res;
            });
        }

        return Promise.reject({error: {message: "Invalid Record"}});
    };

    /**
     * @protoype
     * @function updateAction
     * @param {STRING} UUID
     * @param {OBJECT} record
     */
    LearningRecordStore.prototype.updateAction = function (UUID, record) {
        if (typeof UUID === "string" &&
            UUID.length &&
            typeof record === "object") {

            DB.select({
                'from': 'actions',
                'result': "record",
                'where': {"=": "uuid"}
            }, [UUID])
            .then(function(res) {
                var rr = res.rows.item(0);
                if (rr) {
                    var ar = JSON.parse(rr.record), i, k;
                    k = Object.getOwnPropertyNames(record);
                    for (i = 0; i < k.length; i++) {
                        if (!ar.hasOwnProperty(k[i])) {
                            ar[k[i]] = record[k[i]];
                        }
                    }

                    DB.update({
                        set: {record: JSON.stringify(ar)},
                        from: "actions",
                        where: {"=": {uuid: UUID}}
                    });
                }
            });
        }
    };

    /**
     * @protoype
     * @function finishAction
     * @param {STRING} UUID
     * @param {OBJECT} record
     *
     * This function is OK, because this acts as an internal function.
     *
     * Given that the UUID will not appear for synchronisation BEFORE an action
     * has been completed, it does not violate the XAPI spec.
     */
    LearningRecordStore.prototype.finishAction = function (UUID, record, ctxt) {
        // sets the duration - now - created
        if (typeof UUID === "string" && UUID.length && typeof record === "object") {
            var self  = this,
                end   = moment();

            DB.select({
                'from': 'actions',
                'result': "record",
                'where': {"=": "uuid"}
            }, [UUID])
            .then(function(res) {
                var pa = [];
                var rr = res.rows.item(0);
                if (rr) {
                    var ar = JSON.parse(rr.record), i, k;
                    k = Object.getOwnPropertyNames(record);
                    for (i = 0; i < k.length; i++) {
                        if (ar.hasOwnProperty(k[i])) {
                            this.cancelAction(UUID);
                            return Promise.reject("ERR_XAPI_RECORD_OVERWRITE");
                        }
                        ar[k[i]] = record[k[i]];
                    }

                    var start = moment(ar.timestamp);
                    var duration = moment.duration(end.diff(start));
                    var tD = "PT";
                    if (duration.hours()) {
                        tD = tD + duration.hours() + "H";
                    }
                    if (duration.minutes()) {
                        tD = tD + duration.minutes() + "M";
                    }
                    tD = tD + duration.seconds() + "S";

                    if (!ar.hasOwnProperty("result")) {
                        ar.result = {};
                    }
                    ar.result.duration = tD;

                    ar.stored = end.format();

                    var iData = {
                        record: JSON.stringify(ar),
                        duration: end.valueOf() - start.valueOf()
                    };

                    if (ctxt) {
                        if (ctxt.courseId) {
                            iData.courseid = ctxt.courseId;
                        }
                        if (ctxt.objectId !== undefined) {
                            iData.objectid = ctxt.objectId;
                        }
                        if (ar.result.score !== undefined) {
                            iData.score = ar.result.score;
                        }
                    }

                    ar.result.duration = tD;
                    pa.push(DB.update({
                        set: iData,
                        from: "actions",
                        where: {"=": {uuid: UUID}}
                    }));

                    self.lrscontext.forEach(function (lrsid) {
                        pa.push(DB.insert("syncindex", {
                            "uuid": UUID,
                            "lrsid": lrsid
                        }));
                    });

                    // update the context index
                    self.updateContextIndex(UUID, start.valueOf());

                    return Promise.all(pa);
                }
                return Promise.resolve();
            });
        }
    };

    LearningRecordStore.prototype.cancelAction = function(uuid) {
         if (typeof uuid === "string" && uuid.length) {
             DB.delete({
                'from': 'actions',
                'where': {"=": "uuid"}
            }, [uuid])
             .then(function () {
//                 console.log("record cancelled");
                 return;
             })
             .catch(function (err) {
//                 console.log("cancelling failed: " + JSON.stringify(err));
                 return;
             });
         }
    };

    /**
     * @protoype
     * @function recordAction
     * @param {OBJECT} record
     * @param {OBJECT} db context
     * @return {PROMISE} db promise
     */
    LearningRecordStore.prototype.recordAction = function (record, ctxt) {

        if (typeof record === 'object' &&
            record.hasOwnProperty("verb") &&
            record.hasOwnProperty("object")) {

            var self = this,
                UUID = DB.createUUID(),
                mom = moment(),
                created = mom.valueOf();

            record.id = UUID;
            record.timestamp = mom.format();
            record.stored = record.timestamp;
            record.actor = this.actor;

            if (this.context &&
                Object.getOwnPropertyNames(this.context).length) {

                record.context = this.context;
            }

            return new Promise(function(fullfill, reject){

                var iData = {
                    "uuid":     UUID,
                    "record":   JSON.stringify(record),
                    "stored":   created,
                    "year":     mom.format("YYYY"),
                    "month":    mom.format("YYYYMM"),
                    "day":      mom.format("YYYYMMDD"),
                    "week":     mom.format("W"),
                    "hour":     mom.format("HH"),
                    "weekday":  mom.format("E"),
                    "verbid":   record.verb.id
                };

                if (ctxt) {

                    if (ctxt.courseId) {

                        iData.courseid = ctxt.courseId;
                    }
                    if (ctxt.objectId) {

                        iData.objectid = ctxt.objectId;
                    }
                }

                return DB.insert("actions", iData)
                .then(function (res) {

                    res.insertID = UUID;
                    self.lrscontext.forEach(function (lrsid) {

                        var lstUUID = loadLrsUuidList(lrsid);
                        lstUUID.push(UUID);
                        storeLrsUuidList(lrsid, lstUUID);
                    });

                    return res;
                });
            });
        }

        return Promise.reject({"error": {message: "Invalid Record"}});
    };

    /**
     * This function iterates over the context list and updates the context index
     */
    LearningRecordStore.prototype.updateContextIndex = function (uuid, timestamp, context) {

        var self = this;
        var ctxtParent, ctxtType;

        function cbInsertComplete() {
            console.log("insert complete");
            return;
        }

        function cbInsertFail(err) {
            console.log("insert failed " + JSON.stringify(err));
            return;
        }

        /**
         * insert the context into the database.
         */
        function fnInsertContextIndex(v) {


            var iData = {
                "type": ctxtType,
                "uuid": uuid,
                "contextid": v,
                "stored": timestamp
            };

            DB.insert("contextindex", iData).then(cbInsertComplete).catch(cbInsertFail);
        }

        /**
         * iterate over the activity context (because it is a nested structure)
         */
        function fnHandleContextActivities(name) {

            ctxtType = ctxtParent + name;

            if (Array.isArray(self.context.contextActivities[name])) {
                self.context.contextActivities[name].forEach(function (val) {fnInsertContextIndex(val.id);});
            }
            else {
                fnInsertContextIndex(self.context.contextActivities[name].id);
            }
        }

        function fnInsertContextInfo (ctxt) {
            Object.getOwnPropertyNames(ctxt).forEach(function (n) {

                ctxtType = n;

                if (n === "contextActivities") {

                    ctxtParent  = n + ".";
                    Object.getOwnPropertyNames(ctxt.contextActivities).forEach(fnHandleContextActivities);

                }
                else if (n === "extensions") {
                    Object.getOwnPropertyNames(ctxt.extensions).forEach(function (ext) {
                        ctxtType = ext;
                        fnInsertContextIndex(ctxt.extensions[ext]);
                    });

                }
                else {
                    fnInsertContextIndex(ctxt[n]);
                }
            });
        }

        if (context) {
            fnInsertContextInfo(context);
        }
        else if (self.context) {
            fnInsertContextInfo(self.context);
        }
    };

    /**
     * @prototype
     * @function indexAction
     * @param {OBJECT} record
     *
     * applies all filter conditions to the record and indecees them.
     */
    LearningRecordStore.prototype.indexAction = function (record) {
        return;
    };

    /**
     * @protoype
     * @function trackAction
     * @param {NONE}
     *
     * track action monitors a record pattern. If the pattern is matched,
     * then the callback is triggered.
     *
     * This should get used for badge issuing.
     */
    LearningRecordStore.prototype.trackAction = function (record, callback) {
        return;
    };

    /** ***** Activity Analytics ***** */

    /**
     * @protoype
     * @function getEntropyMap
     * @param {NONE}
     * @return {ARRAY} entropyMap
     *
     * the entropy map determines which questions should get selected next.
     */
    LearningRecordStore.prototype.getEntropyMap = function (cbFunc, binder, context) {
        if (!binder) {
            binder = this;
        }

        var ct = "contextActivities.parent",
            courseid = context.courseId,
            n = Math.pow(context.n, 2),
            min = LearningRecordStore.Default_Speed, // start with a high value for the entropy
            minE= 0.1,
            totalE= 0;

        var aCI = courseid.split("_");
        courseid = this.idp.serviceURL("powertla.content.courselist",
                                       aCI[0],
                                       [aCI[1]]);

        // fetch the entroy map in one go.
        var query = {
            from: {
                ta: {
                    // list of all attempts in a course
                    from: {
                        ci: "contextindex"
                    },
                    where: {"and": [{"=": "ci.type"},
                                    {"=": "ci.contextid"}]},
                    result: ["ci.uuid", "ci.stored"]
                },
                sa: {
                    // all attempt stats in a course
                    from: {
                        a2: "actions",
                        cj: "contextindex"
                    },
                    where: {"and": [{"=": ["a2.uuid", "cj.uuid"]},
                                    {"=": "cj.type"},
                                    {"=": "cj.contextid"}]},
                    group: "a2.objectid",
                    result: ["a2.objectid",
                             "a2.score",
                             ["max(a2.stored)", "t"],
                             ["count(a2.objectid)", "a"],
                             ["total(a2.score)", "s"]]
                }
            },
            where: {">=": ["ta.stored", "sa.t"]},
            group: "sa.objectid",
            order: {"sa.t": "d"},
            result: ["objectid", "score", "a", "t", "s", "count(ta.uuid) p"]
        };

        DB.select(query, [ct, courseid, ct, courseid])
            .then(function(res) {
            var p = 0, m = res.rows.length;
            var map = [];
            var q = [];
            var d, eo;

            // skip the position 0 as it is out present element
            for (p = 0; p < m; p++) {
                d = res.rows.item(p);

                if (!d.objectid) {
                    // skip unidentifiable questions.
                    continue;
                }

                q.push(d.objectid);
                eo = {
                    id: d.objectid,
                    pos: d.p,
                    actions: d.a,
                    allscore: d.s,
                    score: d.score
                };

                /**
                 * We use Entropy in the thermodynamic way: it describes the level
                 * of energy a question its overall success state. The lower a
                 * question's energy, the more likely it is selected as a next
                 * question.
                 *
                 * The over all entropy of the system is the sum of all questions.
                 * The higher the entropy, the better the user performs answering
                 * the questions in the question pool.
                 *
                 * Entropy calculation
                 *
                 * E = S * (1 + As * lastScore) * 2^-C
                 *
                 * where S : QuestionPool Complexity = totalQuestions^2
                 * where As: Attempt Success = attempts ^ 2totalScore
                 * where C: cooldown = (answersSinceLastAttempt-lastScore)/(1 + totalScore)
                 */

                eo.entropy = (n * (1+ Math.pow(d.a, 2 * d.s) * d.score)) * Math.pow(2, (-1 * (d.p - d.score))/(1 + d.s));

                totalE = totalE + eo.entropy;

                if (eo.entropy < min) {
                    min = eo.entropy;
                }

                map.push(eo);
            }

            /**
             * we need a flexible minimum, because if the learners get better
             * their entropy grows and they would not receive any questions.
             */
            if (minE < min) {
                minE = totalE / n;
            }

            if (minE < min) {
                minE += min;
            }

            // sort the entropy map with the lowest entropy on top
            map.sort(function(a, b) {
                return a.entropy - b.entropy;
            });

            var sel = [];

            // add the "cool" questions to the selection list.
            map.some(function(e,i) {
                if (e.entropy > minE) {
                    return true;
                }
                sel.push(e.id);
            });

            var entropyMap = {
                questions: q,
                selection: sel
            };

            // console.log(JSON.stringify(entropyMap));
            cbFunc.call(binder, entropyMap);
        });
    };

    /**
     * @prototype
     * @function calculateStats()
     *
     * loads the main statistics for a course.
     *
     * emits LRS_CALCULATION_DONE when all stats arrived.
     */
    LearningRecordStore.prototype.calculateStats = function (courseId) {
        this.stats = {
            today: {
                attempts: 0,
                score: 0,
                speed: LearningRecordStore.Default_Speed,
                progress: 0
            },
            last: {
                attempts: 0,
                score: 0,
                speed: LearningRecordStore.Default_Speed,
                progress: 0
            }
        };

        this.bestDay = {};

        var self = this,
        i = 0,
        today = moment().format("YYYYMMDD");

        // SELECT count(uuid) attempts, avg(score) score, avg(duration) speed
        DB.select({
            distinct: true,
            from: ["actions", "contextindex"],
            result: ["day",
                     "count(actions.uuid) a",
                     "avg(score) score",
                     "avg(duration) speed"],
            where: {"and": [
                {"=": ["actions.uuid", "contextindex.uuid"]},
                {"=": "contextindex.type"},
                {"=": "contextid"},
                {"=": "verbid"}
            ]},
            order: {day: "desc"},
            group: ["day"]
        }, ["contextActivities.parent",
            courseId,
            "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"])
        .then(function (res) {
            var r,
                k = 0,
                bDay,
                bScore = 0,
                bAtt = 0,
                bPerformance = 0,
                performance;

            if (res.rows.length) {
                r = res.rows.item(0);
                if (r) {
                    if (r.day === Number(today)) {
                        self.stats.today.attempts = r.a;
                        self.stats.today.score =    r.score ? r.score.toFixed(2) : 0;
                        self.stats.today.speed =    Math.round(r.speed/1000);

                        if (res.rows.length > 1) {
                            r = res.rows.item(1);
                            if (r) {
                                self.stats.last.attempts = r.a;
                                self.stats.last.score =    r.score ? r.score.toFixed(2) : 0;
                                self.stats.last.speed =    Math.round(r.speed/1000);
                            }
                        }
                    }
                    else {
                        self.stats.last.attempts = r.a;
                        self.stats.last.score =    r.score.toFixed(2);
                        self.stats.last.speed =    Math.round(r.speed/ 1000);
                    }
                }

                // find the best day
                // best day == day with the highest performance (avg score X n attempts)
                // finding the best day must reverse from the start

                for (k = 0; k < res.rows.length; k++) {
                    r = res.rows.item(k);

                    //console.log(r.day + " :: " + tScore + " :: " + r.a);
                    performance = r.score * r.a;

                    if (performance && performance > bPerformance) {
                        bDay    = r.day;
                        bScore  = r.score ? r.score.toFixed(2) : 0;
                        bAtt    = r.a;
                        bPerformance = performance;
                    }
                }

                if (bDay) {
                    bDay = bDay.toString().replace(/(\d\d\d\d)(\d\d)(\d\d)/,
                                                   '$1-$2-$3');

                    self.bestDay = {
                        date: bDay,
                        score: bScore
                    };
                }
            }

            i++;

            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        })
        .catch(function (err) {
            if (err && err.message) {
                console.error(err.message);
            }
            //console.log(err);
            i++;
            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        });

        DB.select({
            from: ["actions", "contextindex"],
            result: ["day",
                     "count(actions.uuid) progress"],
            where: {"and": [
                {"=": ["actions.uuid", "contextindex.uuid"]},
                {"=": "type"},
                {"=": "contextid"},
                {"=": "verbid"},
                {"=": "score"}
            ]},
            order: {day: "desc"},
            group: ["day"]
        }, ["contextActivities.parent",
            courseId,
            "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt",
            "1"])
        .then(function (res) {
            if (res.rows.length) {
                var r = res.rows.item(0);
                if (r) {
                    if (r.day === Number(today)) {
                        self.stats.today.progress = r.progress;

                        if (res.rows.length > 1) {
                            r = res.rows.item(1);
                            if (r) {
                                self.stats.last.progress = r.progress;
                            }
                        }
                    }
                    else {
                        self.stats.last.progress = r.progress;
                    }
                }
            }
            i++;

            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        })
        .catch(function (err) {
            if (err && err.message) {
                console.error(err.message);
            }
            //console.log(err);
            i++;
            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        });

    };

    LearningRecordStore.prototype.getOverviewStats = function () {
        return this.courseStats;
    }

    /**
     * @prototype
     * @function calculateOverviewStats(courseid)
     *
     * calculates the trafic light stats values
     */
    LearningRecordStore.prototype.calculateOverviewStats = function() {
        var self = this;

        // the course stats provide the avg score value for the courses.
        // the values are:
        // negative values: there are unanswered questions (abs(avg_score) is the actual value
        // 0 <= x < 0.5: insufficient
        // 0.5 <= x < 0.75: weak
        // 0.75 <= x <= 1: ok
        self.courseStats = {};

        // the course stats are calculated sum of all score/n questions per course

        // load the question pools
        var qpinfo = self.cbroker.getCourseMetrices();

        Object.getOwnPropertyNames(qpinfo).forEach(function (qp) {
            qpinfo[qp].score = -1;
            qpinfo[qp].avg   = undefined;
        });

        // load the database values
        DB.select({
            result: ["courseid",
                     "sum(s) score",          // total score
                     "count(objectid) count", // number if distinct questions
                     "sum(a) attempts"],      // total attempts
            from: { ac: {
                result: ["courseid",
                         "objectid",
                         "avg(score) s",
                         "count(uuid) a"],
                from: "actions",
                group: "objectid"
            }},
            group: "courseid"
        })
            .then(function (res) {

                var len = res.rows.length,
                    i = 0,
                    cs,
                    cid;

                for (i; i < len; i++) {

                    cs = res.rows.item(i);
                    cid = cs.courseid;

                    if (typeof cid === "string" &&
                        cid.length) {
                        qpinfo[cid].score = cs.score;

                        // FIXME Wrong calculation
                        qpinfo[cid].avg   = qpinfo[cid].score / qpinfo[cid].count;

                        if (cs.count < qpinfo[cid].count) {

                            if (qpinfo[cid].avg) {
                                qpinfo[cid].avg   = -1 * qpinfo[cid].avg;
                            }
                            else {
                                qpinfo[cid].avg = -0.1;
                            }
                        }
                    }
                }

                self.courseStats = qpinfo;
                $(document).trigger("LRS_CALCULATION_DONE");
            })
            .catch(function(err) {
                console.log(err);
                $(document).trigger("LRS_CALCULATION_DONE");
            });
    };

    /**
     * @prototype
     * @function calculateOverviewStatsQuestionPool(courseid)
     *
     * similar to calculateOverviewStats() but groups the results by questionpool.
     * This allows question pool level stats.
     */
    LearningRecordStore.prototype.calculateOverviewStatsQuestionPool = function (courseid) {};

    /**
     * @protoype
     * @function getDailyProgress
     * @param {NONE}
     */
    LearningRecordStore.prototype.getDailyProgress = function () {
        if (!this.stats) {
            return {today: 0, previous: 0};
        }
        return privMakeStatEntry(this.stats.today.progress,
                                 this.stats.last.progress);
    };

    /**
     * @protoype
     * @function getDailyScore
     * @param {NONE}
     */
    LearningRecordStore.prototype.getDailyScore = function () {
        if (!this.stats) {
            return {today: 0, previous: 0};
        }
        return privMakeStatEntry(this.stats.today.score,
                                 this.stats.last.score);
    };

    /**
     * @protoype
     * @function getDailyAvgSpeed
     * @param {NONE}
     */
    LearningRecordStore.prototype.getDailySpeed = function () {
        if (!this.stats) {
            return {today: 0, previous: 0};
        }
        return privMakeStatEntry(this.stats.today.speed,
                                 this.stats.last.speed);
    };

    /**
     * @protoype
     * @function getDailyActions
     * @param {NONE}
     */
    LearningRecordStore.prototype.getDailyActions = function () {
        if (!this.stats) {
            return {today: 0, previous: 0};
        }
        return privMakeStatEntry(this.stats.today.attempts,
                                 this.stats.last.attempts);
    };

    LearningRecordStore.prototype.getBestDay = function () {
        return this.bestDay || {};
    };

    /**
     * @protoype
     * @function checkBadgeAchievement
     * @param {NONE}
     */
    LearningRecordStore.prototype.checkBadgeAchievement = function () {
        return;
    };

    LearningRecordStore.prototype.synchronizeAll = function () {
        if (!bSyncFlag) {
//            bSyncFlag = true;
            this.idp = this.app.models.identityprovider;
            this.idp.eachLMS(function (lms) {
                this.synchronize(lms.id, true);
            }, this);
        }
    };

    LearningRecordStore.prototype.dropLRSDataOnLogout = function (lmsid) {
        // drop the sync
        // drop the records
        var i = 0;
        // var self = this;

        // all done
        function cbAllDone() {
            // console.log("check if we are done.");
            i++;
            if (i > 1) {

                if (logoutSync.hasOwnProperty(lmsid)) {
                    //console.log("drop everything")
                    delete logoutSync[lmsid];

                    dropLrsUuidList(lmsid);
                    $(document).trigger("LRS_LOGOUT_READY", [lmsid]);
                }
            }
        }

        DB.delete({
            from: "syncindex",
            where: {"=": "lrsid"}
        }, [lmsid])
            .then(cbAllDone)
            .catch(function (err) {
                //console.log("cannot delete syncindex " + err);
                cbAllDone();
            });

        DB.delete({
            from: "actions",
            where: {"LIKE": "courseid"}
        }, [lmsid + "%"])
            .then(cbAllDone)
            .catch(function (err) {
                //console.log("cannot delete actions " + err);
                cbAllDone();
            });
    };

    /**
     * @prototype
     * @function synchronise
     * @param {NONE}
     *
     * synchronises the action statements with theackend LRS.
     */
    LearningRecordStore.prototype.synchronize = function (lmsid, force) {
        // first register the callbacks
        if (lmsid === undefined) {
            this.synchronizeAll();
            return;
        }

        if (this.app &&
            this.app.models &&
            this.app.models.identityprovider) {
            this.idp = this.app.models.identityprovider;
        }

        if (!this.idp.sessionState(lmsid))
        {
            // not logged in, nothin to sync
            return;
        }

        var self          = this,
            url           = self.idp.serviceURL("gov.adlnet.xapi",
                                                lmsid,
                                                ["statements"]),
            sessionHeader = self.idp.sessionHeader(["MAC", "Bearer"]),
            actorToken    = self.idp.getActorToken(lmsid);
        // define the actor for the remote system
        var agent = {
            objectType: "Agent",
            openid: this.app.serviceURL("org.ieee.papi",
                                        ["user", actorToken])
        };

        // we want only our own data
        var qsAgent = "agent=" + encodeURIComponent(JSON.stringify(agent));
        var lstUUID = loadLrsUuidList(lmsid);

        function cbAllDone() {
            //console.log("LRS #### all done for " + lmsid);
            cntActiveTransactions--;
            // console.log("terminate at 0 transactions? " + cntActiveTransactions);
            if (cntActiveTransactions === 0) {
                storeLrsUuidList(lmsid, lstUUID);
                bSyncFlag = false;
            }

            if (!bSyncFlag && logoutSync[lmsid]) {
                //console.log("drop LRS database");
                self.dropLRSDataOnLogout(lmsid);
            }
        }

        function cbSyncError(err) {
            //console.log("LRS #### sync error: " + JSON.stringify(err));
            cbAllDone();
        }

        function cbRequestStream(result) {
            //console.log("LRS #### request stream for " + lmsid);
            var isoDate, r, since, rurl;

            var query = [qsAgent];

            if (result && result.rows.length) {
                r = result.rows.item(0);
                since = new Date(r.t);
                isoDate = since.toISOString();
                query.push("since=" + isoDate);
            }

            rurl = url;
            rurl += "?" + query.join('&');

            return new Promise(function (resolve, reject) {
                $.ajax({
                    type: "GET",
                    url: rurl,
                    dataType: 'json',
                    beforeSend: sessionHeader,
                    success: resolve,
                    error: function (xhr) { resolve([]); }
                });
            });
        }

        function storeSingleAction(action) {
            // strip our index values
            var mom = moment(action.timestamp); // input an iso string
            // ALWAYS IGNORE OUR OWN DATA (but thats ok)
            if (lstUUID.indexOf(action.id) < 0) {

                var aObject = action.object.id.split("/");
                var objId = aObject.pop(),
                    duration = LearningRecordStore.Default_Speed;
                // skip question pool for now
                aObject.pop();
                var courseId = lmsid + "_" + aObject.pop();

                // get duration
                if (action.result &&
                    action.result.duration) {
                    var aDur = action.result.duration.split(/(\D)/);
                    var mul = 1000;
                    var facTM = 60;
                    var facTH = 60;
                    var n = 0, v;
                    while (aDur.length) {
                        v = aDur.pop();
                        if (v.length) {
                            if (v === "T") {
                                break;
                            }
                            if (parseInt(v, 10) > 0) {
                                n += mul * parseInt(v, 10);
                            }
                            else {
                                switch (v) {
                                    case "M":
                                        mul = mul * facTM;
                                        break;
                                    case "H":
                                        if (mul === 1000) {
                                            mul = mul * facTM;
                                        }
                                        mul = mul * facTH;
                                        break;
                                }
                            }
                        }
                    }
                    duration = n;
                }

                // This won't work for all durations

                var iData = {
                    "uuid":     action.id,
                    "record":   JSON.stringify(action),
                    "stored":   mom.valueOf(),
                    "year":     mom.format("YYYY"),
                    "month":    mom.format("YYYYMM"),
                    "day":      mom.format("YYYYMMDD"),
                    "week":     mom.format("W"),
                    "hour":     mom.format("HH"),
                    "weekday":  mom.format("E"),
                    "verbid":   action.verb.id,
                    "duration": duration,
                    "objectid": objId,
                    "courseid": courseId
                };

                if (action.context &&
                    action.context.parent &&
                    action.context.parent.length) {
                    iData.courseid = action.context.parent[0];
                }
                if (action.result) {
                    if (action.result.hasOwnProperty("score")) {
                        iData.score = action.result.score;
                    }

                    if (action.result.hasOwnProperty("duration")) {
                        var dur = moment.duration(action.result.duration);
                        iData.duration = dur.as("milliseconds");
                    }
                }

                return DB.insert("actions", iData)
                    .then(function () {

                        lstUUID.push(action.id);
                        var momA = moment(action.timestamp);

                        var ctxt = action.context;

                        if (!ctxt) {
                            ctxt = {};
                        }

                        self.updateContextIndex(action.uuid, momA.valueOf(), ctxt);
                        return action;
                    });
            }
            return Promise.resolve();
        }

        function storeStream(data) {

            if (data && data.length) {

                var pa = [];
                data.forEach(function (action) {

                    pa.push(storeSingleAction(action));
                });

                if (pa.length) {

                    return Promise.all(pa);
                }
            }
            return Promise.resolve();
        }

        function cbGetLocalActions() {

            return DB.select({
                from: {
                    ta: 'actions',
                    sa: 'syncindex'
                },
                result: ["ta.uuid", "record"],
                where: {"and": [{"=": ["ta.uuid", "sa.uuid"]},
                                {"=": "sa.lrsid"},
                                {"is": ["sa.synchronized", "NULL"]}]},
                order: {"ta.stored": "d"}
            }, [lmsid])
                .then(function (result) {

                var a = [],
                    lstId = [],
                    r,
                    i,
                    m = result.rows.length;

                for (i = 0; i < m; i++) {
                    r = result.rows.item(i);
                    a.push(JSON.parse(r.record));
                    lstId.push(r.uuid);
                }

                return Promise.resolve({"id": lmsid, "stream": a, "idlist": lstId});
            });
        }

        function cbSendStream(stream) {

            if (stream && stream.stream && stream.stream.length) {

                var rurl = url;

                return new Promise(function (resolve, reject) {
                    $.ajax({
                        type: "POST",
                        url: rurl,
                        dataType: 'json',
                        contentType: 'application/json',
                        data: JSON.stringify(stream.stream),
                        beforeSend: sessionHeader,
                        success: resolve,
                        error: function (xhr) { resolve([]); }
                    });
                });
                // var data = "[" + stream.stream.join(",") + "]";

                // now we can send the stream to the server

                // return Promise.resolve(stream.idlist);
            }

            return Promise.resolve([]);
        }

        function cbConfirmStream(result) {

            if (result && result.length) {

                return DB.delete({
                    from: "syncindex",
                    where: {"in": {uuid: result}}
                });
            }

            return Promise.resolve();
        }

        // then run the logic, if the client is logged in
        if (actorToken !== undefined &&
            (!bSyncFlag || force)) {
            cntActiveTransactions++;
//            bSyncFlag = true;

            /**
             * The sync process is bi-directional
             *
             * 1. get the max synctime.
             * 2. get all statements that were reported since the last sync
             * 3. weed out our own sync
             * 4. insert the new actions
             * 5. get the unsynced actions
             * 6. send the unsynced actions
             * 7. update the sync state.
             */
            DB.select({
                result: ["max(synchronized) t"],
                from: "syncindex",
                where: {"=": "lrsid"},
                group: ["lrsid"]
            }, [lmsid])
                .then(cbRequestStream)
                .then(storeStream)
                .then(cbGetLocalActions)
                .then(cbSendStream)
                .then(cbConfirmStream)
                .then(cbAllDone)
                .catch(cbSyncError);
        }
    };

    /**
     * @prototype
     * @function ready
     * @param {NONE}
     * @return {BOOL}
     *
     * returns true if the LRS is not actively synchronizing.
     * This should be always ready if not in sync.
     */
    LearningRecordStore.prototype.ready = function () {
        return !bSyncFlag;
    };

    w.LearningRecordStore = LearningRecordStore;

}(window));
