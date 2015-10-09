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
/*jslint todo: true*/      // allow todo comments/*jslint white:true*/

/*jslint regexp: true*/    // allow [^\[] for cloze question preprocessing

/*global $ */              // allow jquery for event management.

/** THIS COMMENT MUST NOT BE REMOVED AND REMAIN INTACT
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
    var syncFlags       = {}; // run-time only

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

        Object.getOwnPropertyNames(courseList).forEach(function (cl) {
            if ((!bSelectLMS &&
                 cl &&
                 Array.isArray(courseList[cl])) ||
                (bSelectLMS &&
                 lmsList.indexOf(cl) >= 0 &&
                 cl &&
                 Array.isArray(courseList[cl]))) {
                courseList[cl].forEach(function (c) {
                    c.lmsId = cl;
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

        this.lockoutIds = [];

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
                self.synchronizeAll();
            }
        }

        $(document).bind("online",               cbSyncAll);
        $(document).bind("APP_READY",            cbSyncAll);
        $(document).bind("ID_AUTHENTICATION_OK", cbSyncAll);
        $(document).bind("LMS_AVAILABLE",        cbSyncAll);
        $(document).bind("ID_LOGOUT_OK",         cbSyncAll);

        $(document).bind("ID_LOGOUT_REQUESTED", function (evt, serverid) {
            $(document).trigger("CONTENT_LOGOUT_READY", [serverid]);
        });
    }

    /**
     * @protoype
     * @function nextQuestion
     * @param {NONE}
     *
     * instruction - indentify the new active question.
     */
    ContentBroker.prototype.nextQuestion = function () {
        // if there is an attempt, then cancel it.
        if (this.isAttempt()) {
            this.cancelAttempt();
        }

        var randomId,
            activeId,
            qList         = [],
            qSel          = [],
            questions     = [],
            newQuestions  = [];

        // remove the score of the previous question
        this.score = undefined;

        if (this.activeQuestion) {
            activeId = this.activeQuestion.id;
        }

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

                var tList = [];

                // identify the unanswered questions and weed out the "hot" questions
                this.questionPool.forEach(function (q) {
                    // always skip the active question
                    if (q.id !== activeId) {
                        if (this.lockoutIds.indexOf(q.id) >= 0) {
                            tList.push(q);
                        }
                        else {
                            if (!questions.length ||
                                questions.indexOf(q.id) < 0) {
                                newQuestions.push(q);
                            }
                            else if (qSel &&
                                     qSel.length &&
                                     qSel.indexOf(q.id) >= 0) {
                                qList.push(q);
                            }
                        }
                    }
                }, this);

                // prioritize the unanswered questions
                if (newQuestions.length) {
                    qList = newQuestions;
                }

                // if all questions are on the lockout list, then reset the lockout
                if (!qList.length) {
                    qList = tList;
                    this.lockoutIds = [];
                }

                // ensure that the active question is locked out
                // Note - the active question is already not in the qList
                if (activeId) {
                    this.lockoutIds.push(activeId);
                }

                // select a random item from the current entropy selection
                randomId = Math.floor(Math.random() * qList.length);

                this.lockoutIds.push(qList[randomId].id);
                this.activeQuestion = qList[randomId];

                // reset the response list.
                this.responseList = [];
            }

            // signal for deferred view changes
            $(document).trigger("CONTENT_QUESTION_READY");
        }, this, this.context);
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
        this.context         = {courseId: lmsId + "_" + courseId,
                                n: this.questionPool.length};

        this.lrs.startLRSContext(lmsId);

        // getActorToken() returns the LMS identifier token.
        this.lrs.setActor(this.idprovider.getActorToken(lmsId));

        idurl = this.idprovider.serviceURL("powertla.content.courselist",
                                           this.currentLMSId,
                                           [courseId]);

        // idurl = this.idprovider.serviceURL("powertla.content.imsqti",
        //                                    this.currentLMSId,
        //                                    [courseId, questionpollid]);

        // start user context/ note that the LRS syncs only data for the same user.
        this.currentCourseContext = idurl;
        if (idurl) {
            this.lrs.startContext("contextActivities.parent", idurl);
        }
    };

    ContentBroker.prototype.getCourseId = function () {
        if (this.currentCourseId && this.currentLMSId) {
            return this.currentLMSId + "_" + this.currentCourseId;
        }
        return "";
    };

    ContentBroker.prototype.activateCourse = function (course) {
        this.lockoutIds = [];
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
        if (aQ === undefined) {
            return {}; // shit happens :(
        }
        return {
            "id":       aQ.id,
            "type":     aQ.type,
            "question": aQ.question
        };
    };

    /**
     * @protoype
     * @function getAnswerList
     * @param {NONE}
     * @return {ARRAy} answerList
     *
     * returns the possible answers of the question
     */
    ContentBroker.prototype.getAnswerList = function (mix) {
        // question types that must remain sorted
        var sortedQTypes = ["assNumeric", "assClozeTest"];
        if (mix && sortedQTypes.indexOf(this.activeQuestion.type) < 0) {
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
    };

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
    };

    ContentBroker.prototype.isResponse = function (response) {
        if (this.responseList.indexOf(response) >= 0) {
            return true;
        }
        return false;
    };

    /**
     * @protoype
     * @function getResponseList
     * @param {NONE}
     * @return {ARRAY} responseList
     */
    ContentBroker.prototype.getResponseList = function () {
        return this.responseList;
    };

    ContentBroker.prototype.getXAPIResponseList = function () {
        var aR = [];

        this.responseList.forEach(function (v) {
            //v = v.toString();
            switch (this.activeQuestion.type) {
                case "assSingleChoice":
                case "assMultipleChoice":
                    if (this.activeQuestion.answer[v]) {
                        aR.push(this.activeQuestion.answer[v]);
                    }
                    break;
                case "assOrderingQuestion":
                case "assOrderingHorizontal":
                    // TODO how to represent ordering questions
                    break;
                case "assNumeric":
                    // TODO : what is the internal representation
                    // TODO : how to represent the result
                    break;
                case "assClozeTest":
                    // TODO : what is the internal representationw
                    // TODO: how to represent the result (mixture between single questions and numeric?)
                    break;
                default:
                    break;
            }
        }, this);

        return aR;
    };

    /**
     * @protoype
     * @function clearResponseList
     * @param {NONE}
     *
     * Convenience function: resets the response list to an empty response.
     */
    ContentBroker.prototype.clearResponseList = function () {
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
        // checks if the response is correct

        this.score = 0; // wrong by default

        // TODO: Move Type based Score Calculations to individual functions
        switch (this.activeQuestion.type) {
            case "assSingleChoice":
            case "assMultipleChoice":
                /**
                 * Single Choice can be calculated easier, but IMS QTI does not
                 * differentiate between the two.
                 */
                var nCorr = 0,
                    nOK = 0,
                    nBad = 0,
                    tOrder,
                    tLen = this.responseList.length;
                this.activeQuestion.answer.forEach(function (a) {
                    tOrder = a.order.toString();
                    if (a.points_checked > 0) {
                        a.points = a.points_checked;
                    }
                    if (a.points > 0) {

                        nCorr++;
                        if (this.responseList.indexOf(tOrder) >= 0) {
                            nOK++;
                        }
                    }
                    else if (this.responseList.indexOf(tOrder) >= 0) {
                        nBad++;
                    }

                }, this);

                // the score is between 0 and 1
                if (nCorr > 0) {
                    this.score = (nOK - nBad) / nCorr;

                    if (this.score < 0) {
                        this.score = 0;
                    }

                    if (tLen > nCorr &&
                        tLen === this.activeQuestion.answer.length) {
                        // if not all answers are correct but the user ticked all we set wrong!

                        this.score = 0;
                    }
                }
                else if (nBad === 0 && nOK === 0) {
                    this.score = 1;
                }
                break;
            case "assOrderingQuestion":
            case "assOrderingHorizontal":
                var minSequence = 3;
                var maxS = 0, tS = 0, posOK = 0, v;
                var rl = this.responseList;

                rl.forEach(function (r, i) {
                    v = parseInt(r, 10);
                    if (v === i) {
                        posOK++;
                    }
                    // check for sequences
                    if ((v + 1) === rl[i+1]) {
                        tS++;
                        if (maxS < tS) {
                            maxS = tS;
                        }
                    }
                    else if ((v + 1) !== rl.length) { // reset if not on the last response
                       tS = 0;
                    }
                });

                if (posOK === rl.length) {  // if all POS are OK we are good
                    this.score = 1;
                }
                else if (maxS >= minSequence) { // calculate the score if there are sequences
                    this.score = maxS / rl.length;
                }
                break;
            case "assNumeric":
                // TODO : what is the internal representation
                // TODO : inlcude predefined ranges
                break;
            case "assClozeTest":
                // TODO : what is the internal representationw
                break;
            default:
                break;
        }

        this.finishAttempt();
    };

    /**
     * @protoype
     * @function getFeedback
     * @param {NONE}
     * @return {ARRAY} feedback;
     */
    ContentBroker.prototype.getFeedback = function () {
        if (this.score >= 1) {
            return this.activeQuestion.correctFeedback;
        }
        return this.activeQuestion.errorFeedback;
    };

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


        var poolctxt = this.idprovider.serviceURL("powertla.content.imsqti",
                                                 this.activeQuestion.lmsId,
                                                 [this.activeQuestion.courseId,
                                                  this.activeQuestion.poolId]);
        this.lrs.startContext("contextActivities.parent", poolctxt);

        var record = {
            "verb": {
                "id": "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"
            },
            "object": {
                "id": objectId,
                "objectType": "Activity"
            }
        };


        this.lrs.startAction(record)
        .then(function (res) {
            self.attemptUUID = res.insertID;
        })
        .catch(function (err) {
            console.log(err);
        });

    };

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
                "score": this.score,
                "extensions": {
                    "http://www.mobinaut.io/mobler/xapiextensions/IMSQTIResult": this.getXAPIResponseList()
                }
            }
        };

        var context = {
            courseId: this.activeQuestion.lmsId + "_" + this.activeQuestion.courseId,
            objectId: this.activeQuestion.id
        };

        this.lrs.finishAction(this.attemptUUID, record, context);

        // wrap up the question pool context for the active question
        // This is required because the next question might get selected from
        // a different QP
        var poolctxt = this.idprovider.serviceURL("powertla.content.imsqti",
                                                 this.activeQuestion.lmsId,
                                                 [this.activeQuestion.courseId,
                                                  this.activeQuestion.poolId]);
        this.lrs.endContext("contextActivities.parent", poolctxt);

        this.attemptUUID = null;
        this.lockoutIds = [];
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

                bad = true;
            }
        }

        function cbSortOrder(a,b) {return a.order - b.order;}

        function cbProcessGaps(txt, gaps) {
            var retval = [];
            if (typeof txt === 'string') {
                var lstGapText = txt.split(/(\[gap\][^\[]*\[\/gap\])/);

                i = 0;
                lstGapText.forEach(function (gt) {
                    if (gt.indexOf("[gap]") === 0) {
                        gaps[i].answertext = "[gap]";
                        gaps[i].identifier = i;
                        retval.push(gaps[i]);
                        i++;
                    }
                    else {
                        retval.push({answertext: gt});
                    }
                });
            }

            return retval;
        }

        questions.forEach(function (question) {

            switch (question.type) {
                case "assSingleChoice":
                case "assMultipleChoice":
                    question.answer.forEach(checkImage);
                    break;
                case "assOrderingQuestion":
                case "assOrderingHorizontal":
                    // ensure that the remote TLA does not sent mixed answer lists.
                    question.answer.sort(cbSortOrder);
                    break;
                case "assClozeTest":
                    // cloze questions need more preprocessing.
                    question.answer = cbProcessGaps(question.answer.clozeText,
                                                    question.answer.correctGaps) || question.answer;
                    break;
                case "assNumeric":
                    break;
                default:
                    // restrict the questionpool
                    bad = true;
                    break;
            }
        });

        // TODO also check for images and other incompatible features.

        if (bad) {

            return false;
        }

        return true;
    };

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
        function addLMS (lms) {
            lmsList.push(lms.id);
        }
        if (bPublic) {
            this.idprovider.eachLMSPublic(addLMS);
        }

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
        if (this.app.isOnline()) {
            this.idprovider.eachLMS(function(lms) {
                if (force || !lms.lastSyncTime ||
                    (now - lms.syncTimeOut) < lms.lastSyncTime) {
                    this.synchronize(lms.id);
                }
            }, this);
        }
    };

    /**
     * @prototype
     * @function synchronize
     * @param {NONE}
     *
     * synchronizes the data with the backend content broker.
     */
    ContentBroker.prototype.synchronize = function (lmsid) {
        if (this.app.isOnline()) {
            var self = this;
            if (typeof lmsid !== "string") {

                this.synchronizeAll();
                return;
            }

            // do not synchronize while there is already a sync process for the lms
            if (!syncFlags.hasOwnProperty(lmsid)) {

                syncFlags[lmsid] = true;

                this.fetchCourseList(lmsid)
                    .then(function (courseList) {

                        // load one course after the other
                        self.verifyCourseData(courseList, lmsid);
                    })
                    .catch(function (msg){

                        if (msg.status === 200 ||
                            msg.status === 204) {

                            // verify an empty course list.
                            self.verifyCourseData([], lmsid);
                        }
                        else {

                            delete syncFlags[lmsid];
                            // NOTE This error is not caught anywhere.
                            $(document).trigger("CONTENT_SERVER_ERROR");
                        }
                    });
            }
        }
    };


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
                            // TODO: trigger correct event
                        delete syncFlags[lmsId];
                    });
            }
            else {
                // there are no more courses to fetch.
                self.idprovider.setSyncState(lmsId);
                delete syncFlags[lmsId];
            }
        }

        function handleCourse(qpools) {
            var k = 0;

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
                setCourseForLMS(lmsId, course.id, qpools);
            }
            else {
                // ignore this course, because it has no or invalid question pools
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
    };

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
    };

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

        return Promise.reject("ERR_NO_SERVICE_URL");
    };

    w.ContentBroker = ContentBroker;
}(window));
