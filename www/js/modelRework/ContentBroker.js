/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

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
 
function ContentBroker (app) {
    this.lrs      = app.models.LearningRecordStore;
    this.identity = app.models.IdentityProvider;
}

/****** Questionpool Management ******/

/**
 * instruction - tell the model to load the current questions
 * @protoype
 * @function loadQuestionpool
 * @param {NONE}
 */
ContentBroker.prototype.loadQuestionpool = function () {
    try {
        this.questionList = JSON.parse(localStorage.getItem("questionpool_" + this.currentCourseId) || "{}");
    }
    catch (error) {
        console.log("The question list could not be loaded: " + error);
        this.questionList = {};
    }
};

/**
 * @protoype
 * @function checkQuestionpool
 * @param {NONE}
 */
ContentBroker.prototype.checkQuestionpool = function () {
    
};

/**
 * @protoype
 * @function activeQuestionpool
 * @param {VARIABLE} poolId
 */
ContentBroker.prototype.activateQuestionpool = function (poolId) {
    this.currentQuestion = poolId;
};

/**
 * instruction - tell the model to give a new active question.
 * @protoype
 * @function nextQuestion
 * @param {NONE}
 */
ContentBroker.prototype.nextQuestion = function () {
    var newQuestions = this.loadNewQuestions();
    var temporaryQuestions, randomId, i;
    
    /*  if there are still unanswered questions, get one of those randomly. */
    if (this.questionList.length) {
        randomId = Math.floor(Math.random() * this.questionList.length);
        this.activeQuestion = this.questionList[randomId];
    }
    /*  otherwise, get the question with the lowest entropy, if there is more
        than one with the same entropy, choose one randomly. */
    else {
        for (i = 0; i < newQuestions.length; i++) {
            if (newQuestions[i].entropy === newQuestions[i - 1].entropy) {
                temporaryQuestions[i] = newQuestions[i];
            }
            else {
                i = newQuestions.length;
            }
        }
        randomId = Math.floor(Math.random() * temporaryQuestions.length);
        this.activeQuestion = temporaryQuestions[randomId];
    }
};

/**
 * @protoype
 * @function loadNewQuestion
 * @param {NONE}
 */
ContentBroker.prototype.loadNewQuestions = function () {
    var entropyMap = this.lrs.getEntropyMap();
    
};

/**
 * @protoype
 * @function getQuestionInfo
 * @param {NONE}
 */
ContentBroker.prototype.getQuestionInfo = function () {
    
};

/**
 * @protoype
 * @function getAnswerList
 * @param {NONE}
 * @return {ARRAy} answerList
 */
ContentBroker.prototype.getAnswerList = function () {
    var answerList;
    
    return answerList;
};

/**
 * @protoype
 * @function addResponse
 * @param {VARIABLE} response
 */
ContentBroker.prototype.addResponse = function (response) {
    
};

/**
 * @protoype
 * @function getResponseList
 * @param {NONE}
 * @return {ARRAY} responseList
 */
ContentBroker.prototype.getResponseList = function () {
    var responseList;
    
    return responseList;
};

/**
 * @protoype
 * @function checkResponse
 * @param {NONE}
 */
ContentBroker.prototype.checkResponse = function () {
    
};

/**
 * @protoype
 * @function getFeedback
 * @param {NONE}
 * @return {ARRAY} feedback;
 */
ContentBroker.prototype.getFeedback = function () {
    var feedback;
    
    return feedback;
};

/**
 * @protoype
 * @function startAttempt
 * @param {NONE}
 */
ContentBroker.prototype.startAttempt = function () {
    
};

/**
 * @protoype
 * @function finishAttempt
 * @param {NONE}
 */
ContentBroker.prototype.finishAttempt = function () {
    // 1. speichere beantwortete Frage in der entropy map
    // 2. lösche die beantwortete Frage aus der Question List.
    
};

/****** Course Management ******/

/**
 * @protoype
 * @function endAttempt
 * @param {NONE}
 */
ContentBroker.prototype.loadCourses = function () {
    
};

/**
 * @protoype
 * @function endAttempt
 * @param {NONE}
 */
ContentBroker.prototype.getCourseList = function () {
    
    
};

/**
 * @protoype
 * @function endAttempt
 * @param {VARIABLE} courseId
 */
ContentBroker.prototype.activateCourse = function (courseId) {
    this.currentCourseId = courseId;
};

/**
 * @protoype
 * @function endAttempt
 * @param {VARIABLE} courseId
 */
ContentBroker.prototype.ignoreCourse = function (courseId) {
    
};