/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */
/*global $, Promise */

/**	THIS COMMENT MUST NOT BE REMOVED  AND REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
*/

/**
 * @author Christian Glahn
 * @author Dijan Helbling
 */
(function (w) {
    /**
     * there is only one courseList for the entire system.
     * The content broker is just the interface to that list.
     */
    var courseList      = {}; // persistent

    /**
     * @private @method loadCourseList()
     *
     * loads the global course list from local storage
     */
    function loadCourseList() {
        var tl;
        try {
            tl = JSON.parse(localStorage.getItem("contentCourseList"));
        }
        catch (err) {
            tl = {};
            localStorage.setItem("contentCourseList", "{}");
        }

        courseList      = tl;
    }

    /**
     * @private @method storeCourseList()
     *
     * writes the global course list to local storage.
     */
    function storeCourseList() {
        if (!courseList) {
            courseList = {};
        }
        localStorage.setItem("contentCourseList",  JSON.stringify(courseList));
    }

    /**
     * @private @method ignoreCourse(courseList, course)
     * @param {OBJECT} course
     *
     * finds a course in a courseList and removes the course.
     *
     * This happens every time a course has no question pools.
     */
    function ignoreCourse(tCourseList, courseId) {
        tCourseList.some(function (c, i) {
            if (c.id === courseId) {
                tCourseList.splice(i, 1);
                return true;
            }
            return false;
        });

        return tCourseList;
    }

    /**
     * @private @method ignoreCourseForLMS(lmsId, courseId)
     *
     * ignores a course that is already in local storage
     */
    function ignoreCourseForLMS(lmsId, courseId) {
        if (!courseList) {
            courseList = {};
        }

        if (courseList[lmsId] &&
            Array.isArray(courseList[lmsId])) {
            var tLen = courseList[lmsId].length;
            courseList[lmsId] = ignoreCourse(courseList[lmsId], courseId);
            storeCourseList();
            // was course actually removed?
            if (tLen > courseList[lmsId].length) {
                // remove the course data from local storage
                localStorage.removeItem("course_" + lmsId + "_" + courseId);
            }
        }
    }

    /**
     * @private @method addCoursesForLMS(lmsId, courseList)
     *
     * adds a course list that has been reported by an lms
     */
    function setCourseListForLMS(lmsId, lmsCourseList) {
        var idList = {};
        if (!courseList) {
            courseList = {};
        }

        if (!courseList[lmsId]) {
            // cleanup the existing questionpools
            courseList[lmsId] = [];
        }

        // update the course list
        courseList[lmsId].forEach(function (ocl) {
            idList[ocl.id] = 1;
        });

        courseList[lmsId] = lmsCourseList;

        storeCourseList();

        // remove those question pools that continue to exit
        courseList[lmsId].forEach(function (ncl) {
            ncl.lmsId = lmsId; // we need this for setting the LRS context
            delete idList[ncl.id];
        });

        // remove the remaining items in the idList
        Object.getOwnPropertyNames(idList).forEach(function (id) {
            localStorage.removeItem("course_" + lmsId + "_" + id);
        });
    }

    /**
     * @private @function getCourseList(LMSList)
     * @optional @param {ARRAY} lmsId List
     *
     * returns an Array with all courses in the system.
     */
    function getCourseList(lmsList) {
        if (!courseList) {
            courseList = {};
        }

        var bSelectLMS = false;
        if (lmsList && Array.isArray(lmsList) && lmsList.length) {
            bSelectLMS = true;
        }

        var courses = [];

        console.log(JSON.stringify(courseList));

        Object.getOwnPropertyNames(courseList).forEach(function (cl) {
            console.log(cl);

            if ((!bSelectLMS &&
                 cl &&
                 Array.isArray(courseList[cl])) ||
                (bSelectLMS &&
                 lmsList.indexOf(cl) >= 0 &&
                 cl &&
                 Array.isArray(courseList[cl]))) {
                courseList[cl].forEach(function (c) {
                    courses.push(c);
                });
            }
        });

        return courses;
    }

    /**
     * @private @method getCourseForLMS(lmsId, courseID, arrayIncludePools)
     *
     * returns an array with all questions for the course
     */
    function getCourseForLMS(lmsId, courseId, arrayIncludePools) {
        if (!courseList) {
            courseList = {};
        }

        var incl = true, questionPool = [];
        if (courseList[lmsId] &&
            Array.isArray(courseList[lmsId])) {
            var qpList;
            courseList[lmsId].some(function (c) {
                if (c.id === courseId) {
                    // now fetch the questions
                    try {
                        qpList = JSON.parse(localStorage.getItem("course_" + lmsId + "_" + courseId));
                    }
                    catch (err) {
                        qpList = [];
                        console.log("no questions in the course " + courseId);
                    }

                    if (qpList &&
                        Array.isArray(qpList) &&
                        qpList.length) {
                        qpList.forEach(function (qp) {
                            if (arrayIncludePools &&
                                Array.isArray(arrayIncludePools) &&
                                arrayIncludePools.length) {
                                if (arrayIncludePools.indexOf(qp.id) >= 0) {
                                    incl = false;
                                }
                            }
                            if (incl &&
                                qp.questions &&
                                Array.isArray(qp.questions) &&
                                qp.questions.length) {
                                qp.questions.forEach(function (q) {
                                    questionPool.push(q);
                                });
                            }
                            incl = true;
                        });
                    }
                    return true;
                }
            });
        }

        return questionPool;
    }

    /**
     * @private @method setCourseForLMS(lmsId, courseId, questionPool)
     *
     * sets the question pool list for a course that is returned by an LMS.
     */
    function setCourseForLMS(lmsId, courseId, questionPool) {
        if (questionPool &&
            Array.isArray(questionPool) &&
            questionPool.length) {
            questionPool.forEach(function (qp) {
                if (qp.questions &&
                    Array.isArray(qp.questions) &&
                    qp.questions.length) {
                    qp.questions.forEach(function (q) {
                        // precache the context information for the LRS interaction
                        q.courseId = courseId;
                        q.lmsId    = lmsId;
                        q.poolId   = qp.id;
                    });
                }
            });
            localStorage.setItem("course_" + lmsId + "_" +courseId,
                                 JSON.stringify(questionPool));
        }
    }

    function ContentBroker () {
        var self = this;

        loadCourseList();

        /** Variables
         * this.courseList              List of all courses connected to your account.
         * this.currentCourseId         Identification number of the course, also used as the id in the HTML list element.
         * this.questionpoolList        List of all questionpools in the current course.
         * this.currentQuestionpool     Active questionpool in the current course.
         * this.questionList            The list of all questions in the questionpool.
         * this.activeQuestion          Active question in the current questionpool.
         * this.responseList            The list of user selected answers.
         */

        function cbSyncAll() {
            if (self.app) {
                console.log("refresh lms content");
                self.synchronizeAll();
            }
        }

        $(document).bind("online",               cbSyncAll);
        $(document).bind("APP_READY",            cbSyncAll);
        $(document).bind("ID_AUTHENTICATION_OK", cbSyncAll);
        $(document).bind("LMS_AVAILABLE",        cbSyncAll);
    }

    /**
     * @protoype
     * @function nextQuestion
     * @param {NONE}
     *
     * instruction - indentify the new active question.
     */
    ContentBroker.prototype.nextQuestion = function () {
        var randomId,
            qList         = [],
            qSel          = [],
            questions     = [],
            newQuestions  = [];

        this.mixed = false;
        this.mixedAnswers = [];

        this.lrs.getEntropyMap(function (eM) {
            var entropyMap = eM;

            if (entropyMap && entropyMap.questions) {
                // entropyMap.selection contains only the min entropy questions
                qSel      = entropyMap.selection;
                // entropyMap.questions contains the list of all active questions in the map
                questions = entropyMap.questions;
            }

            if (this.questionPool &&
                Array.isArray(this.questionPool) &&
                this.questionPool.length) {

                // identify the unanswered questions and weed out the "hot" questions
                this.questionPool.forEach(function (q) {
                    if (!questions.length ||
                        questions.indexOf(q.id) < 0) {
                        newQuestions.push(q);
                    }
                    else if (qSel &&
                             qSel.length &&
                             qSel.indexOf(q.id) >= 0) {
                        qList.push(q);
                    }
                });

                // prioritize the unanswered questions
                if (newQuestions.length) {
                    qList = newQuestions;
                }

                randomId = Math.floor(Math.random() * qList.length);
                this.activeQuestion = qList[randomId];

                // reset the response list.
                this.responseList = [];
            }
            console.log("trigger CONTENT_QUESTION_READY " + JSON.stringify(this.activeQuestion));
            $(document).trigger("CONTENT_QUESTION_READY");
        }, this);
    };

    /**
     * @protoype
     * @function activateCourse
     * @param {VARIABLE} courseId
     * instruction - when a tap occurs on a course in the course view, then register the current course.
     */
    // FUTURE limit the questions to selected question pools
    ContentBroker.prototype.activateCourseById = function (lmsId, courseId) {
        var idurl;

        if (this.currentLMSId !== lmsId) {
            this.lrs.endLRSContext(this.currentLMSId);
        }

        if (this.currentCourseId !== courseId) {
            this.lrs.endContext("contextActivities.parent",
                                this.currentCourseContext);
            this.currentCourseContext = null;
        }

        this.currentCourseId = courseId;
        this.currentLMSId    = lmsId;
        // this.questionPool contains all ACTIVE questions
        this.questionPool    = getCourseForLMS(lmsId, courseId);

        this.lrs.startLRSContext(lmsId);

        idurl = this.idprovider.serviceURL("powertla.content.imsqti",
                                           this.currentLMSId,
                                           [courseId]);

        this.currentCourseContext = idurl;
        if (idurl) {
            this.lrs.startContext("contextActivities.parent", idurl);
        }
    };

    ContentBroker.prototype.activateCourse = function (course) {
        this.activateCourseById(course.lmsId, course.id);
    };

    ContentBroker.prototype.deactivateCourse = function () {
        if (this.currentLMSId) {
            this.lrs.endLRSContext(this.currentLMSId);
        }

        if (this.currentCourseId) {
            this.lrs.endContext("contextActivities.parent",
                                this.currentCourseContext);
            this.currentCourseContext = null;
        }
    };

    /**
     * @protoype
     * @function getQuestionInfo
     * @param {NONE}
     * @return {OBJECT} partActiveQuestion - is part of the activeQuestion object
     *
     * returns the question information of the active question
     */
    ContentBroker.prototype.getQuestionInfo = function () {
        var aQ = this.activeQuestion;
        return {
            "id":       aQ.id,
            "type":     aQ.type,
            "question": aQ.question
        };
    }; // done, not checked

    /**
     * @protoype
     * @function getAnswerList
     * @param {NONE}
     * @return {ARRAy} answerList
     *
     * returns the possible answers of the question
     */
    ContentBroker.prototype.getAnswerList = function (mix) {
        if (mix) {
            if (!this.mixed) {
                this.mixedAnswers = [];

                var tmpArray = this.activeQuestion.answer.slice(0),
                    random, answ;
                while (tmpArray.length) {
                    random = Math.floor((Math.random() * tmpArray.length));
                    answ = tmpArray.splice(random, 1);
                    this.mixedAnswers.push(answ.pop());
                }
                this.mixed = true;
            }
            return this.mixedAnswers;
        }
        return this.activeQuestion.answer;
    }; // done, not checked

    /**
     * @protoype
     * @function addResponse
     * @param {ARRAY} response
     *
     * Adds a new Response to the response list.
     *
     * verifies the response with the active answer
     */
    ContentBroker.prototype.addResponse = function (response) {
        var index = this.responseList.indexOf(response);

        // TODO: verify that the response is a valid answer

        if (index < 0) {
            this.responseList.push(response);
        }
        else {
            this.responseList.splice(index, 1);
        }
    }; // done, not checked

    /**
     * @protoype
     * @function getResponseList
     * @param {NONE}
     * @return {ARRAY} responseList
     */
    ContentBroker.prototype.getResponseList = function () {
        return this.responseList;
    }; // done, not checked

    /**
     * @protoype
     * @function resetResponseList
     * @param {NONE}
     *
     * Convenience function: resets the response list to an empty response.
     */
    ContentBroker.prototype.resetResponseList = function () {
        this.responseList = [];
    };

    /**
     * @protoype
     * @function checkResponse
     * @param {NONE}
     * @return {DOUBLE} - 1 if the entire response is correct, 0.5 partially correct, 0 wrong
     *
     * Validates the given response.
     */
    ContentBroker.prototype.checkResponse = function () {
        // old code won't work
        return true;
    }; // done, not checked

    /**
     * @protoype
     * @function getFeedback
     * @param {NONE}
     * @return {ARRAY} feedback;
     */
    ContentBroker.prototype.getFeedback = function () {
        // FIXME checkResponse will not determine if the answer is correct!
        if (this.checkResponse()) {
            return this.activeQuestion.correctFeedback;
        }
        return this.activeQuestion.errorFeedback;
    }; // done, not checked

    /**
     * instruction - calls the LRS to start the question
     * @protoype
     * @function startAttempt
     * @param {NONE}
     */
    ContentBroker.prototype.startAttempt = function () {
        var self = this;
        var objectId = this.idprovider.serviceURL("powertla.content.imsqti",
                                                  this.activeQuestion.lmsId,
                                                  [this.activeQuestion.courseId,
                                                   this.activeQuestion.poolId,
                                                   this.activeQuestion.id]);

        var record = {
            "Verb": {
                "id": "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"
            },
            "Object": {
                "id": objectId,
                "ObjectType": "Activity"
            }
        };

        this.lrs.startAction(record)
        .then(function (res) {
            self.attemptUUID = res.insertID;
        })
        .catch(function (err) {
            console.log(err);
        });

    }; // done, not checked

    /**
     * @protoype
     * @function finishAttempt
     * @param {NONE}
     *
     * finish the attempt before receiving feedback
     */
    ContentBroker.prototype.finishAttempt = function () {
        var record = {
            "result": {
                "duration": -1,
                "score": this.answerScore,
                "extensions": {
                    "http://www.mobinaut.io/mobler/xapiextensions/IMSQTIResult": this.getResponseList()
                }
            }
        };

        this.lrs.finishAction(this.attemptUUID, record);
        this.attemptUUID = null;
    };

    ContentBroker.prototype.cancelAttempt = function () {
        if (this.attemptUUID) {
            this.lrs.cancelAction(this.attemptUUID);
        }
    };

    ContentBroker.prototype.isAttempt = function () {
        return typeof this.attemptUUID === "string";
    };

    /****** Questionpool Management ******/

    /**
     * @protoype
     * @function checkQuestionpool
     * @param {Object} questionpool
     * @return {BOOL}
     *
     * is called when a new questionpool arrives from the LMS backend.
     *
     * returns true when the Question Pool has been added locally.
     *
     * removes invalid question pools from the list.
     */
    ContentBroker.prototype.checkQuestionpool = function (questionpool) {
        var i, bad = false;
        var questions = questionpool.questions;

        function checkImage(a, j) {
            if (a.hasOwnProperty("image") && a.image && a.image.length) {
                console.log("bad question with image at pos " + j);
                bad = true;
            }
        }

        for (i = 0; i < questions.length; i++) {
            switch (questions[i].type) {
                case "assSingleChoice":
                case "assMultipleChoice":
                    questions[i].answer.forEach(checkImage);
                    break;
                case "assOrderingQuestion":
                case "assOrderingHorizontal":
                case "assClozeTest":
                case "assNumeric":
                    break;
                default:
                    // restrict the questionpool
                    console.log("bad question of type " + questions[i].type);
                    bad = true;
                    break;
            }

            // TODO also check for images and other incompatible features.

            if (bad) {
                console.log("bad question pool");
                return false;
            }
        }
        console.log("QP validated");
        return true;
    }; // done, not checked

    /****** Course Management ******/

    /**
     * @protoype
     * @function checkCourse
     * @param {OBJECT} course
     * @return {BOOL}
     *
     * is called when the course list arrives from the LMS backend.
     *
     * returns false if the present course has no active question pools to offer.
     * In this case the course is removed from the local list.
     */
    ContentBroker.prototype.checkCourse = function (course) {
        return (course["content-type"].indexOf("x-application/imsqti") >= 0);
    };

    /**
     * @prototype
     * @function getCourseList;
     * @param {BOOL} public
     *
     * if public is set (== true), then return only "featured courses".
     * "Featured Courses" are courses that are available even without an
     * active Access Token.
     */
    ContentBroker.prototype.getCourseList = function (bPublic) {
        var lmsList = [];
        if (bPublic) {
            this.idprovider.eachLMSPublic(function (lms) {
                console.log("got lms");
                console.log(lms);
                lmsList.push(lms.id);
            });
        }
        console.log("LMSLIST: "+ lmsList.join("; "));
        return getCourseList(lmsList);
    };


    /****** Synchronize Management ******/

    /**
     * @protoype
     * @function synchronizeAll
     * @param {NONE}
     *
     * loops through the lms list and synchronises them.
     */
    ContentBroker.prototype.synchronizeAll = function (force) {
        var now = (new Date()).getTime();

        this.idprovider.eachLMS(function(lms) {
            console.log(JSON.stringify(lms));

            if (force || !lms.lastSyncTime ||
                (now - lms.syncTimeOut) < lms.lastSyncTime) {
                this.synchronize(lms.id);
            }
        }, this);
    }; // done, not checked

    /**
     * @prototype
     * @function synchronize
     * @param {NONE}
     *
     * synchronizes the data with the backend content broker.
     */
    ContentBroker.prototype.synchronize = function (lmsid) {
        var self = this;
        if (typeof lmsid !== "string") {
            this.synchronizeAll();
            return;
        }

        this.fetchCourseList(lmsid)
        .then(function (courseList) {
            // load one course after the other
            self.verifyCourseData(courseList, lmsid);
        })
        .catch(function (msg){
            // send apologise signal depending on error
            console.log("server error 0: " + msg);
            // TODO: trigger correct event
            $(document).trigger("MY_SERVER_ERROR");
        });
    }; // done, not checked


    ContentBroker.prototype.verifyCourseData = function (courseList, lmsId) {
        var self = this,
            tList = [];

        courseList.forEach(function (c) {
            if (c["content-type"].indexOf("x-application/imsqti") >= 0) {
                tList.push(c);
            }
        });

        courseList = tList;

        setCourseListForLMS(lmsId, courseList);
        $(document).trigger("CONTENT_COURSELIST_UPDATED", [lmsId]);

        // load the question pools for the courses

        /**
         * question pool loading is performed sequentially per LMS. This
         * will reduce the load per server, but take slightly longer if there are many courses
         * on a LMS. The sequential approach has been chosen in order to limit the amount
         * of active data connections. This way there will be only as many concurrent
         * requests open as there are LMSes registered.
         */
        var i = 0,
            course;

        function loadPool() {
            if (i < courseList.length) {
                course = courseList[i];
                self.fetchQuestionpoolList(course,lmsId)
                    .then(handleCourse)
                    .catch(function (msg) {
                         console.log("server error " + msg  + " on "+ lmsId + " ("+courseList[i]+")");
                        // TODO: trigger correct event

                });
            }
            else {
                self.idprovider.setSyncState(lmsId);
            }
        }

        function handleCourse(qpools) {
            var k = 0;

            console.log(qpools);

            qpools.forEach(function (questionPool, id) {
                if (self.checkQuestionpool(questionPool)) {
                    k++;
                }
                else {
                    // remove the question pool from the pool list
                    qpools.splice(id,1);
                }
            });

            if (k) {
                console.log("got valid course");
                setCourseForLMS(lmsId, course.id, qpools);
            }
            else {
                // ignore this course, because it has no or invalid question pools
                console.log("ignore course");
                ignoreCourseForLMS(lmsId, course.id);
            }
            // the event is always triggerd, because a course update could be
            // that the course is removed.
            $(document).trigger("CONTENT_COURSE_UPDATED", [lmsId, course.id]);

            // fetch the next course
            i++;
            loadPool();
        }

        loadPool();
    };

    /** NETWORK REQUESTS **/

    /**
     * @protoype
     * @function fetchCourseList
     * @param {INTEGER} lmsId
     * @return {OBJECT} Promise
     *
     * Performs the network request for fetchug the CourseList from the LMS Backend.
     */
    ContentBroker.prototype.fetchCourseList = function (lmsId) {
        return this.fetchService("powertla.content.courselist", lmsId);
    }; // done, not checked

    /**
     * @protoype
     * @function fetchQuestionpoolList
     * @param {INTEGER} courseId
     * @param {INTEGER} lmsId
     * @return {OBJECT} Promise
     *
     * get CourseList from the LMS Backend
     */
    ContentBroker.prototype.fetchQuestionpoolList = function (course, lmsId) {
        if (course && this.checkCourse(course)) {
            return this.fetchService("powertla.content.imsqti", lmsId, [course.id]);
        }

        return Promise.reject("ERR_COURSE_CONTENT_NOT_SUPPORTED");
    }; // done, not checked

    /**
     * @prototype
     * @method fetchService(servicename, lmsId, pathvalues)
     *
     * @param {STRING} servicename - name of the service to fetch data from
     * @param {STRING} lmsId - internal ID of the LMS.
     * @param {ARRAY} pathvalues - additional pathinfo parameters
     */
    ContentBroker.prototype.fetchService = function (servicename, lmsId, pathvalues) {
        if (servicename && lmsId) {
            var self = this,
                serviceURL = this.idprovider.serviceURL(servicename,
                                                        lmsId,
                                                        pathvalues);
            if (serviceURL) {
                return new Promise(function (resolve, reject) {
                    $.ajax({
                        type: "GET",
                        url: serviceURL,
                        dataType: 'json',
                        beforeSend: self.idprovider.sessionHeader(["MAC", "Bearer"]),
                        success: resolve,
                        error:   reject
                    });
                });
            }
        }

        console.log("no service url");
        return Promise.reject("ERR_NO_SERVICE_URL");
    };

    w.ContentBroker = ContentBroker;
}(window));
