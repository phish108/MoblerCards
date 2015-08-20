/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, unparam: true, todo: true */

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

(function (w) {

    var DB;

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
            "duration":     "INTEGER"
        },
        "contextindex": {    // the index for the filters
            "uuid":         "TEXT",  // the action UUID
            "type":         "TEXT",
            "contextid":    "TEXT",
            "stored":       "INTEGER"
        },
        "syncindex": {      // the index for synchronising data to the backends
            "uuid":         "TEXT",
            "lrsid" :       "TEXT",
            "userid":       "TEXT", // this is used for pending logouts, keep deferred access tokens in localStorage
            "synchronized": "INTEGER" // timestamp
        }
    };

    var defaultFilters = [];

    function initDB () {
        DB = new DBHelper({
            'name': 'lrsdb',
            'version': 1,
            'title': 'Learning Record Store',
            'size': 20 * 1024 * 1024 // 20MB LRS
        });

        DB.init(tableDef)
            .then(function() {
                console.log("database is OK");
            })
            .catch(function() {
                console.error("database is broken");
            });
    }

    function LearningRecordStore (app) {
        this.app = app;
        this.clearContext();
        this.clearLRSContext();

        this.loadFilter();

        this.actor = {
          "objectType": "Agent"
        };

        initDB();

        $(document).bind("ID_LOGOUT_REQUESTED", function (evt, serverid) {
            // TODO: synchronise the server if possible
            $(document).trigger("LRS_LOGOUT_READY", [serverid]);
        });
    }

    /**
     * @static
     * @function getUUID
     *
     * returns a fresh UUID
     */
    LearningRecordStore.getUUID = function () {
        return DB.createUUID();
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
     */
    LearningRecordStore.prototype.startContext = function (contextType, contextId) {
        var promise;
        if (typeof contextType === "string" &&
            typeof contextId === "string") {
            var self = this, bh = true;
            contextType = contextType.trim();
            contextId = contextId.trim();
            if (contextType.length && contextId.length) {
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
        this.actor.openid = this.app.serviceURL("org.ieee.papi", ["user", actorToken]);
    };

    /**
     * @protoype
     * @function initFilter
     * @param {NONE}
     *
     *
     */
    LearningRecordStore.prototype.initFilter = function () {
    };

    /**
     * @protoype
     * @function loadFilter
     * @param {NONE}
     *
     *
     */
    LearningRecordStore.prototype.loadFilter = function () {

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

    };

    /**
     * @protoype
     * @function indexActions
     * @param {OBJECT} filter
     *
     *
     */
    LearningRecordStore.prototype.indexOneAction = function (filter, action) {
        var self = this;

        return new Promise(function (fullfill, reject) {

        });
    };


    /****** Action Tracking ******/

    /**
     * @protoype
     * @function startAction
     * @param {OBJECT} record
     * @return {STRING} UUID
     */
    LearningRecordStore.prototype.startAction = function (record, ctxt) {
        var myUUID;

        if (typeof record === 'object' &&
            record.hasOwnProperty("verb") &&
            record.hasOwnProperty("object")) {
            myUUID = DB.createUUID();

            var mom = moment();
            var created = mom.valueOf();

            record.ID = myUUID;
            record.timestamp = mom.format();
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
        if (typeof UUID === "string" && UUID.length && typeof record === "object") {
            var self = this, end   = moment();
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
     */
    LearningRecordStore.prototype.finishAction = function (UUID, record, ctxt) {
        // sets the duration - now - created
        if (typeof UUID === "string" && UUID.length && typeof record === "object") {
            var self = this, end   = moment();
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

                    if (!ar.hasOwnProperty("Result")) {
                        ar.result = {};
                    }

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
                        if (ctxt.score !== undefined) {
                            iData.score = ctxt.score;
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
                 console.log("record cancelled");
             })
             .catch(function (err) {
                 console.log("cancelling failed: " + JSON.stringify(err));
             });
         }
    };

    /**
     * @protoype
     * @function recordAction
     * @param {OBJECT} record
     * @return {PROMISE} db promise
     *
     * DONT USE uses the wrong DB schema
     */
    LearningRecordStore.prototype.recordAction = function (record) {
        if (typeof record === 'object' &&
            record.hasOwnProperty("verb") &&
            record.hasOwnProperty("object")) {
            var self = this,
                UUID = DB.createUUID(),
                mom = moment(),
                created = mom.valueOf();

            record.ID = UUID;
            record.timestamp = mom.format();
            record.actor = this.actor;
            if (this.context &&
                Object.getOwnPropertyNames(this.context).length) {
                record.context = this.context;
            }

            return new Promise(function(fullfill, reject){

                DB.insert("actions", {
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
                })
                .then(function (res) {
                    res.insertID = UUID;
                    var pa = [];
                    self.lrscontext.forEach(function (lrsid) {
                        pa.push(DB.insert("syncindex", {
                            "uuid": UUID,
                            "lrsid": lrsid
                        }));
                    });

                    var appCtxt = JSON.stringify(self.appcontext);
                    self.context.forEach(function (lrsid) {
                        pa.push(DB.insert("syncindex", {
                            "uuid": UUID,
                            "lrsid": lrsid
                        }));
                    });

                    return Promise.all(pa);
                });
            });
        }

        return Promise.reject({"error": {message: "Invalid Record"}});
    };

    /**
     * @prototype
     * @function indexAction
     * @param {OBJECT} record
     *
     * applies all filter conditions to the record and indecees them.
     */
    LearningRecordStore.prototype.indexAction = function (record) {};

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

        var courseid = context.courseId,
            n = Math.pow(context.n, 2),
            min = 100000000, // start with a high value
            minE= 0.1,
            totalE= 0;

        DB.select({
            from: {
                ta: 'actions',
                sa: {
                     from: 'actions k',
                     result: ["k.objectid",
                              "k.courseid",
                              "k.score",
                              ["max(k.stored)", "t"],
                              ["count(k.objectid)", "a"],
                              ["total(k.score)", "s"]],
                     where: {"=": "courseid"},
                     group: "objectid"
                }
            },
            result: ["count(ta.uuid) p", "sa.objectid", "sa.score", "a", "t", "s"],
            where: {"and": [{">=": ["ta.stored", "sa.t"]},
                    {"=": ["ta.courseid", "sa.courseid"]}]},
            order: {"sa.t": "d"},
            group: ["sa.objectid"]
        }, [courseid])
            .then(function(res) {
            var p = 0, m = res.rows.length;
            var map = [];
            var q = [];
            var d, eo, p1;

            // skip the position 0 as it is out present element
            for (p = 0; p < m; p++) {
                d = res.rows.item(p);
                q.push(d.object);
                eo = {
                    id: d.object,
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
     * loads the statistics for a course.
     *
     * emits LRS_CALCULATION_DONE when all stats arrived.
     */
    LearningRecordStore.prototype.calculateStats = function (courseId) {
        this.stats = {
            today: {
                attempts: 0,
                score: 0,
                speed: 100000000000,
                progress: 0
            },
            last: {
                attempts: 0,
                score: 0,
                speed: 100000000000,
                progress: 0
            },
        };
        var self = this,
        i = 0,
        today = moment().format("YYYYMMDD");

        // SELECT count(uuid) attempts, avg(score) score, avg(duration) speed
        DB.select({
            from: "actions",
            result: ["day",
                     "count(uuid) a",
                     "avg(score) score",
                     "avg(duration) speed"],
            where: {"and": [
                {"=": "courseid"},
                {"=": "verbid"}
            ]},
            order: {day: "desc"},
            group: ["day"]
        }, [courseId,
            "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"])
        .then(function (res) {
            var r, k = 0, bDay, bScore = 0, bAtt = 0 ;
            if (res.rows.length) {
                 r = res.rows.item(0);
                if (r) {
                    if (r.day == today) {
                        self.stats.today.attempts = r.a;
                        self.stats.today.score =    r.score.toFixed(2);
                        self.stats.today.speed =    Math.round(r.speed/1000);

                        if (res.rows.length > 1) {
                            r = res.rows.item(1);
                            if (r) {
                                self.stats.last.attempts = r.a;
                                self.stats.last.score =    r.score.toFixed(2);
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
                // best day == day with the highest score

                for (k = 0; k < res.rows.length; k++) {
                    r = res.rows.item(k);
                    if (!bDay || (r.score > bScore && r.attempts > bAtt)) {
                        bDay    = r.day;
                        bScore  = r.score;
                        bAtt    = r.attempts;
                    }
                }

                bDay = bDay.toString().replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1-$2-$3');
                self.bestDay = {
                    date: bDay,
                    score: bScore.toFixed(2)
                };

                console.log(self.bestDay);
                console.log(self.stats);
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
            console.log(err);
            i++;
            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        });
        DB.select({
            from: "actions",
            result: ["day",
                     "count(uuid) progress"],
            where: {"and": [
                {"=": "courseid"},
                {"=": "verbid"},
                {"=": "score"}
            ]},
            order: {day: "desc"},
            group: ["day"]
        }, [courseId,
            "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt",
            "1"])
        .then(function (res) {
            if (res.rows.length) {
                var r = res.rows.item(0);
                if (r) {
                    if (r.day === today) {
                        self.stats.today.progress = r.progress;

                        r = res.rows.item(1);
                        if (r) {
                            self.stats.last.progress = r.progress;
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
            console.log(err);
            i++;
            if (i > 1) {
                $(document).trigger("LRS_CALCULATION_DONE");
            }
        });

    };

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
                                 this.stats.last.progress)
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
                                 this.stats.last.score)
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
                                 this.stats.last.speed)
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
                                 this.stats.last.attempts)
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

    };

    /**
     * @prototype
     * @function synchronise
     * @param {NONE}
     *
     * synchronises the action statements with the backend LRS.
     */
    LearningRecordStore.prototype.synchronize = function () {
        return;
    };

    /**
     * @prototype
     * @function ready
     * @param {NONE}
     * @return {BOOL}
     *
     * returns true if the LRS is ready.
     * This should be always ready.
     */
    LearningRecordStore.prototype.ready = function () {
        return true;
    };

    w.LearningRecordStore = LearningRecordStore;

}(window));
