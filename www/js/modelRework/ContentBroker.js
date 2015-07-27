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

function ContentBroker (app) {
    var self = this;
    this.app = app;

    this.lrs        = app.models.LearningRecordStore;
    this.idprovider = app.models.IdentityProvider;

    /** Variables
     * this.courseList              List of all courses connected to your account.
     * this.currentCourseId         Identification number of the course, also used as the id in the HTML list element.
     * this.questionpoolList        List of all questionpools in the current course.
     * this.currentQuestionpool     Active questionpool in the current course.
     * this.questionList            The list of all questions in the questionpool.
     * this.activeQuestion          Active question in the current questionpool.
     * this.responseList            The list of user selected answers.
     */

    /**
	 * @event online
	 * @param {FUNCTION} switchToOnline() - courses(and any pending questions) are loaded from the server
	 */
	$(document).bind("online", function() {
        console.log("Bind event 'online' detected");
        self.synchronizeAll();
    });

    /**
     * It is triggered in the identity provider.
	 * @event authenticationready
	 * @param {FUNCTION} loadFromServer() - loads the courses from the server
	 **/
	$(document).bind("authenticationready", function() {
        console.log("Bind event 'authenticationready' detected");
		self.synchronizeAll();
	});
}



/**
 * instruction - tell the model to give a new active question.
 * @protoype
 * @function nextQuestion
 * @param {NONE}
 */
ContentBroker.prototype.nextQuestion = function () {
    var temporaryQuestions = [];
    var randomId, i;

    this.loadNewQuestions();
    /*  if there are still unanswered questions, get one of those randomly. */
    if (this.questionList.length) {
        randomId = Math.floor(Math.random() * this.questionList.length);
        this.activeQuestion = this.questionList[randomId];
    }
    /*  otherwise, get the question with the lowest entropy, if there is more
        than one with the same entropy, choose one randomly. */
    else {
        for (i = 0; i < this.newQuestions.length; i++) {
            if (this.newQuestions[i].entropy === this.newQuestions[i - 1].entropy) {
                temporaryQuestions[i] = this.newQuestions[i];
            }
            else {
                i = this.newQuestions.length;
            }
        }
        randomId = Math.floor(Math.random() * temporaryQuestions.length);
        this.activeQuestion = temporaryQuestions[randomId];
    }
}; // done, not checked

/**
 * @protoype
 * @function loadNewQuestion
 * @param {NONE}
 */
ContentBroker.prototype.loadNewQuestions = function () {
    this.newQuestions = this.lrs.getEntropyMap();
};

/**
 * @protoype
 * @function getQuestionInfo
 * @param {NONE}
 * @return {OBJECT} partActiveQuestion - is part of the activeQuestion object
 */
ContentBroker.prototype.getQuestionInfo = function () {
    var aQ = this.activeQuestion;
    var partActiveQuestion = {
        "id":       aQ.id,
        "type":     aQ.type,
        "question": aQ.question,
        "answer":   aQ.answer
    };

    return partActiveQuestion;
}; // done, not checked

/**
 * @protoype
 * @function getAnswerList
 * @param {NONE}
 * @return {ARRAy} answerList
 */
ContentBroker.prototype.getAnswerList = function () {
    return this.activeQuestion.answer;
}; // done, not checked

/**
 * @protoype
 * @function addResponse
 * @param {ARRAY} response
 */
ContentBroker.prototype.addResponse = function (response) {
    var index = this.responseList.indexOf(response);

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
 * @function checkResponse
 * @param {NONE}
 * @return {BOOL} - answer is correct if true
 */
ContentBroker.prototype.checkResponse = function () {
    var answerList = this.getAnswerList();
    var i;

    if (this.responseList.length !== answerList.length) {
        return false;
    }
    for (i = 0; i < answerList.length; i++) {
        if (this.responseList.indexOf(answerList[i]) < 0) {
            return false;
        }
    }
    return true;
}; // done, not checked

/**
 * @protoype
 * @function getFeedback
 * @param {NONE}
 * @return {ARRAY} feedback;
 */
ContentBroker.prototype.getFeedback = function () {
    if (this.checkResponse) {
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
    var record = {
        "Verb": {
            "id": "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"
        },
        "Object": {
            "id": this.currentQuestionId,
            "ObjectType": "Activity"
        }
    };

    this.lrs.startAction(record);
}; // done, not checked

/**
 * @protoype
 * @function finishAttempt
 * @param {NONE}
 *
 * delete the answered question from the questionlist.
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
    var uuid = this.lrs.getAttemptUUID(); // FIXME SUDO CODE

    this.lrs.finishAttempt(uuid, record);

    var index = this.questionList.indexOf(this.activeQuestion);
    this.questionList.splice(index, 1);
};


/****** Questionpool Management ******/

/**
 * @protoype
 * @function fetchQuestionpoolList
 * @param {INTEGER} courseId
 * @param {INTEGER} lmsId
 * @return {OBJECT} Promise
 *
 * get CourseList from the LMS Backend
 */
ContentBroker.prototype.fetchQuestionpoolList = function (courseId, lmsId) {
    var self = this;
    if (!self.idprovider) {
        self.idprovider = self.app.models.identityprovider;
    }

    return new Promise(function (resolve, reject) {
        var serviceURL = self.idprovider.serviceURL("powertla.content.imsqti", lmsId);
        if (serviceURL) {
            $.ajax({
                url: serviceURL + "/" + courseId,
                type: "GET",
                beforeSend: function (xhr, settings) {
                    self.idprovider.sessionHeader(xhr,
                                                  settings.url,
                                                  settings.type,
                                                  ["MAC", "Bearer"]);
                },
                success: function (datalist) {
                    if (datalist && Array.isArray(datalist)) {
                        resolve(datalist);
                    }
                    else {
                        reject("ERR_NO_LIST_RECEIVED");
                    }
                },
                error: function () {
                    reject("ERR_SERVER_ERROR");
                }
            });
        }
        else {
            reject("ERR_NO_SERVICE_URL");
        }
    });

}; // done, not checked

/**
 * @protoype
 * @function loadQuestionpool
 * @param {NONE}
 */
ContentBroker.prototype.loadQuestionpool = function () {
    try {
        this.questionpoolList = JSON.parse(localStorage.getItem("questionpool_" + this.currentCourseId)) || {};
    }
    catch (error) {
        console.log("The question list could not be loaded: " + error);
        this.questionpoolList = {};
    }
}; // done, not checked

/**
 * @protoype
 * @function storeQuestionpool
 * @param {ARRAY} questionPool
 * @param {INTEGER} courseId
 */
ContentBroker.prototype.storeQuestionpool = function (questionpool, courseId) {
    localStorage.setItem("questionpool_" + courseId, JSON.stringify(questionpool));
}; // done, not checked

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
    var i;
    var questions = questionpool.questions;

    for (i = 0; i < questions.length; i++) {
        switch (questions[i].type) {
            case "assSingleChoice":
            case "assMultipleChoice":
            case "assOrderingQuestion":
            case "assOrderingHorizontal":
            case "assClozeTest":
            case "assNumeric":
                break;
            default:
                questions.splice(questions.indexOf(questions[i]), 1);
                break;
        }
        // TODO also check for images and other incompatible features.
    }
}; // done, not checked

/**
 * @protoype
 * @function activeAllQuestionpool
 * @param {NONE}
 */
ContentBroker.prototype.activateAllQuestionpool = function () {
    this.loadQuestionpool();
    this.questionpoolList.forEach(function (questionpool) {
        this.activeQuestionpool.push(questionpool);
    });
}; // done, not checked

/**
 * @protoype
 * @function activeQuestionpool
 * @param {VARIABLE} poolId
 */
ContentBroker.prototype.activateQuestionpool = function (poolId) {
    if (!this.activeQuestionpool) {
        this.activeQuestionpool = [];
    }
    if (this.activeQuestionpool.indexOf(poolId) < 0) {
        this.activeQuestionpool.push(poolId);
    }

}; // done, not checked

/**
 * @protoype
 * @function resetActiveQuestionpool
 * @param {NONE}
 */
ContentBroker.prototype.resetActiveQuestionpool = function () {
    this.activeQuestionpool = [];
}; // done, not checked

/****** Course Management ******/

/**
 * @protoype
 * @function fetchCourseList
 * @param {INTEGER} lmsId
 * @return {OBJECT} Promise
 *
 * get CourseList from the LMS Backend
 */
ContentBroker.prototype.fetchCourseList = function (lmsId) {
    var self = this;
    if (!self.idprovider) {
        self.idprovider = self.app.models.identityprovider;
    }
    return new Promise(function (resolve, reject) {
        var serviceURL = self.idprovider.serviceURL("powertla.content.courselist",lmsId);
        if (serviceURL) {
            $.ajax({
                "type": "GET",
                url: serviceURL,
                beforeSend: function (xhr, settings) {
                    self.idprovider.sessionHeader(xhr,
                                                  settings.url,
                                                  settings.type,
                                                  ["MAC", "Bearer"]);
                },
                success: function (datalist) {
                    if (datalist && Array.isArray(datalist)) {
                        resolve(datalist);
                    }
                    else {
                        reject("ERR_NO_LIST_RECEIVED");
                    }
                },
                error: function () {
                    reject("ERR_SERVER_ERROR");
                }
            });
        }
        else {
            reject("ERR_NO_SERVICE_URL");
        }
    });

}; // done, not checked

/**
 * @protoype
 * @function loadCourseList
 * @param {INTEGER} lmsId
 */
ContentBroker.prototype.loadCourseList = function (lmsId) {
    var courseObject;
    try {
        courseObject = JSON.parse(localStorage.getItem("courselist_" + lmsId)) || {};
    }
    catch (error) {
        console.log("course list not initialized, initialize now!");
        courseObject = {};
        localStorage.setItem("courselist", JSON.stringify(courseObject));
    }

    this.courseList   = courseObject.courses      || [];
    this.syncDateTime = courseObject.syncDateTime || (new Date()).getTime();
	this.syncState    = courseObject.syncState    || false;
	this.syncTimeOut  = courseObject.syncTimeOut  || 6000;
}; // done, not checked

/**
 * @protoype
 * @function storeCourseList
 * @param {OBJECT} course
 * @param {INTEGER} lmsId
 */
ContentBroker.prototype.storeCourseList = function (courseList, lmsId) {
    localStorage.setItem("courselist_" + lmsId, JSON.stringify(courseList));
}; // done, not checked

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
    if (course.content.type.indexOf("x-application/imsqti") >= 0) {
        return true;
    }
    return false;
}; // done, not checked

/**
 * instruction - when a tap occurs on a course in the course view, then register the current course.
 * @protoype
 * @function activateCourse
 * @param {VARIABLE} courseId
 */
ContentBroker.prototype.activateCourse = function (courseId) {
    this.currentCourseId = courseId;
    // TODO set context activity.parent in learning record store.
};

/**
 * @protoype
 * @function ignoreCourse
 * @param {VARIABLE} courseId
 *
 * IgnoreCourse removes courses provided by the LMS Backend that do not comply to
 * the Mobler Cards Requirements.
 *
 * This function is called from checkQuestionpool()
 */
ContentBroker.prototype.ignoreCourse = function (courseId) {
    var index = this.currentCourseId.indexOf(courseId);

    if (index) {
        this.currentCourseId.splice(index, 1);
    }
}; // done, not checked

/****** Synchronize Management ******/

/**
 * @prototype
 * @function synchronize
 * @param {NONE}
 *
 * synchronizes the data with the backend content broker.
 */
ContentBroker.prototype.synchronize = function (lmsId) {
    var self = this;

    if (this.synchronizeNeeded) {
        this.fetchCourseList(lmsId)
        .then(function (courseList) {
            courseList.forEach(function (course) {
                if (self.checkCourse(course)) {
                    self.fetchQuestionpoolList(course.id,lmsId)
                    .then(function (questionPoolList) {
                        // self.checkQuestionpools(questionPoolList);
                        questionPoolList.forEach(function (questionPool) {
                            if (self.checkQuestionpool(questionPool)) {
                                self.storeQuestionpool(questionPool, course.id);
                            }
                        });
                        $(document).trigger("QUESTIONPOOL_IS_LOADED");
                    });
                }
                else {
                    courseList.splice(courseList.indexOf(course), 1);
                }
            });
            self.storeCourseList(courseList, lmsId);
        })
        .catch(function (){
            // send apologise signal depending on error
            $(document).trigger("MY_SERVER_ERROR");
        });
    }
}; // done, not checked

/**
 * @protoype
 * @function synchronizeAll
 * @param {NONE}
 *
 * loops through the lms list and synchronises them.
 */
ContentBroker.prototype.synchronizeAll = function () {
    if(!this.idprovider) {
        this.idprovider = this.app.models.identityprovider;
    }
    this.idprovider.eachLMS(function(lms) {
        this.synchronize(lms.id);
    }, this);

}; // done, not checked

/**
 * @protoype
 * @function synchronizeNeeded
 * @param {NONE}
 * @return {BOOL}
 */
ContentBroker.prototype.synchronizeNeeded = function () {
    if ((Date().getTime - this.syncDateTime) > this.syncTimeOut) {
        return true;
    }
    return false;
}; // done, not checked
