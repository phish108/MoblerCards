/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */
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
            "uuid":      "TEXT PRIMARY KEY",
            "record":    "TEXT",
            "stored":    "INTEGER",
            "course":    "TEXT",      // course context
            "qpool":     "TEXT",      // question pool id
            "question":  "TEXT"       // the question id
        },
        "actionindex": {    // the index for the filters
            "uuid":         "TEXT",  // the action UUID
            "filter":       "TEXT",  // filtername
            "valuehash":    "TEXT",  // the filter's keylist
            "targetdata":   "TEXT"   // the filter's result data (either JSON or String)
        },
        "syncindex": {      // the index for synchronising data to the backends
            "uuid":         "TEXT",
            "lrsid" :       "TEXT",
            "synchronized": "INTEGER" // timestamp
        }
    };

    function initDB () {
//    try {
            DB = new DBHelper({
                'name': 'lrsdb',
                'version': 1,
                'title': 'Learning Record Store',
                'size': 20 * 1024 * 1024 // 20MB LRS
            });
//    }
//    catch (err) {
//        console.log("no websql!");
//    }

        DB.init(tableDef)
            .then(function() {
                console.log("database is OK");
            })
            .catch(function() {
                console.error("database is broken");
            });
    }

    function LearningRecordStore (app) {
        this.idprovider = app.models.IdentityProvider;
        this.content  = app.models.ContentBroker;

        this.clearContext();
        this.clearLRSContext();

        this.actor = {
          "objectType": "Agent",
          "account": {}
        };

        initDB();
    }



/****** Context Handling ******/

/**
 * @protoype
 * @function startContext
 * @param {STRING} contextType
 * @param {STRING} contextId
 */
LearningRecordStore.prototype.startContext = function (contextType, contextId) {
    if (typeof contextType === "string" && typeof contextId === "string") {
        var self = this, bh = true;
        contextType.trim();
        contextId.trim();
        if (contextType.length && contextId.length) {
            var arContext = contextType.split(",");
            switch (arContext[0]) {
                case "registration":
                    DB.select({result: "uuid",
                               distinct: true,
                               where: {"=": "uuid"}
                              }, [contextId])
                    .then(function() {
                        self.context.registration = contextId;
                    });
                    break;
                case "contextActvities":
                    if (!this.context.hasOwnProperty("contextActivities")) {
                        this.context.contextActivities = {};
                    }
                    switch (arContext[1]) {
                        case "parent":
                        case "grouping":
                        case "category":
                        case "other":
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
                            break;
                        default:
                            break;
                    }
                    break;
                case "statement":
                    DB.select({result: "uuid",
                               distinct: true,
                               where: {"=": "uuid"}
                              }, [contextId])
                    .then(function() {
                        self.context.statement = {"type": "StatementRef",
                                                  "id": contextId};
                    });
                    break;
                default:
                    break;
            }
        }
    }
};

/**
 * @protoype
 * @function endContext
 * @param {STRING} contextType
 * @param {STRING} contextId
 */
LearningRecordStore.prototype.endContext = function (contextType, contextId) {
     if (typeof contextType === "string" && typeof contextId === "string") {
        contextType.trim();
        contextId.trim();
        if (contextType.length && contextId.length) {
            var arContext = contextType.split(",");
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
                        if (!this.context.contextActivities.getOwnPropertyNames().length) {
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
    this.context = {
        extensions: {"http://mobinaut.io/xapi/context/device": device.uuid}
    };
};



/**
 * @protoype
 * @function startLRSContext
 * @param {STRING} targetLRS
 *
 * Defines the target LRS backend for the incoming actions.
 * It is possible to report the same actions to different LRS.
 *
 * The targetLRS is a server ID from the Identity Provider.
 * This is used for synchronizing the data to the correct LRS backend.
 */
LearningRecordStore.prototype.startLRSContext = function (targetLRS) {
    if (this.lrscontext.indexOf(targetLRS) < 0) {
        this.lrscontext.push(targetLRS);
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
    var i = this.lrscontext.indexOf(targetLRS);
    if (i >= 0) {
        this.lrscontext.splice(i, 1);
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
 * sets the actor's acount.
 * uses the org.ieee.papi service to refer to the user information.
 */
LearningRecordStore.prototype.setActor = function (actorId) {
    this.actor.account.name = actorId;
    this.actor.account.homepage = this.app.serviceURL("org.ieee.papi") + "/" + actorId;
};

/****** Action Tracking ******/

/**
 * @protoype
 * @function startAction
 * @param {OBJECT} record
 * @return {STRING} UUID
 */
LearningRecordStore.prototype.startAction = function (record) {
    var UUID;

    if (typeof record === 'object' &&
        record.hasOwnProperty("Verb") &&
        record.hasOwnProperty("Object")) {
        UUID = DB.createUUID();

        var mom = moment();
        var created = mom.valueOf();

        record.ID = UUID;
        record.timestamp = mom.format();
        record.actor = this.actor;
        if (this.context &&
            this.context.getOwnPropertyNames().length) {
            record.context = this.context;
        }

        return DB.insert("actions", {
            "uuid":     UUID,
            "record":   JSON.stringify(record),
            "stored":   created,
            "qpool":    this.content.getQuestionPoolID(),
            "course":   this.content.getCourseID(),
            "question": this.content.getQuestionID()
                                    })
        .then(function (res) {
            res.insertID = UUID;
            return this;
        });
    }

    return new Promise(function (resolve, reject) {
        // immediately reject.
        reject({}, new Error("Invalid Record"));
    });
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
                k = record.getOwnPropertyNames();
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
LearningRecordStore.prototype.finishAction = function (UUID, record) {
    // sets the duration - now - created
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
                k = record.getOwnPropertyNames();
                for (i = 0; i < k.length; i++) {
                    if (!ar.hasOwnProperty(k[i])) {
                        ar[k[i]] = record[k[i]];
                    }
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
                DB.update({
                    set: {record: JSON.stringify(ar)},
                    from: "actions",
                    where: {"=": {uuid: UUID}}
                });
                self.lrscontext.forEach(function (lrsid) {
                DB.insert("syncindex", {
                    "uuid": UUID,
                    "lrsid": lrsid
                });
            });
            }
        });
    }
};

/**
 * @protoype
 * @function recordAction
 * @param {OBJECT} record
 * @return {PROMISE} db promise
 */
LearningRecordStore.prototype.recordAction = function (record) {
    if (typeof record === 'object' &&
        record.hasOwnProperty("Verb") &&
        record.hasOwnProperty("Object")) {
        var self = this,
            UUID = DB.createUUID(),
            mom = moment(),
            created = mom.valueOf();

        record.ID = UUID;
        record.timestamp = mom.format();
        record.actor = this.actor;
        if (this.context &&
            this.context.getOwnPropertyNames().length) {
            record.context = this.context;
        }

        return DB.insert("actions", {
            "uuid":     UUID,
            "record":   JSON.stringify(record),
            "stored":   created,
            "qpool":    this.content.getQuestionPoolID(),
            "course":   this.content.getCourseID(),
            "question": this.content.getQuestionID()
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
            return Promise.all(pa);
        });
    }

    return new Promise(function (resolve, reject) {
        // immediately reject.
        reject({}, new Error("Invalid Record"));
    });
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

/****** Activity Analytics ******/

/**
 * @protoype
 * @function getEntropyMap
 * @param {NONE}
 * @return {ARRAY} entropyMap
 */
LearningRecordStore.prototype.getEntropyMap = function (cbFunc, binder) {
	if (!binder) {
        binder = this;
    }
    var entropyMap = {};
    cbFunc.call(binder, entropyMap);
};

/**
 * @protoype
 * @function getDailyProgress
 * @param {NONE}
 */
LearningRecordStore.prototype.getDailyProgress = function () {

};

/**
 * @protoype
 * @function getDailyScore
 * @param {NONE}
 */
LearningRecordStore.prototype.getDailyScore = function () {

};

/**
 * @protoype
 * @function getDailyAvgSpeed
 * @param {NONE}
 */
LearningRecordStore.prototype.getDailyAvgSpeed = function () {

};

/**
 * @protoype
 * @function getDailyActions
 * @param {NONE}
 */
LearningRecordStore.prototype.getDailyActions = function () {

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
