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

function LearningRecordStore (app) {
    this.identity = app.models.IdentityProvider;
    this.content  = app.models.ContentBroker;
}

/****** Context Handling ******/

/**
 * @protoype
 * @function startContext
 * @param {STRING} contextType
 * @param {STRING} contextId
 */
LearningRecordStore.prototype.startContext = function (contextType, contextId) {

};

/**
 * @protoype
 * @function endContext
 * @param {STRING} contextType
 * @param {STRING} contextId
 */
LearningRecordStore.prototype.endContext = function (contextType, contextId) {
};


/**
 * @protoype
 * @function clearContext
 * @param {STRING} contextType
 * @param {STRING} contextId
 *
 * clears all contexts
 */
LearningRecordStore.prototype.endContext = function () {};



/**
 * @protoype
 * @function startLRSContext
 * @param {STRING} targetLRS
 *
 * Defines the target LRS backend for the incoming actions.
 * It is possible to report the same actions to different LRS.
 */
LearningRecordStore.prototype.startLRSContext = function (targetLRS) {

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

};

/**
 * @protoype
 * @function clearLRSContext
 * @param {STRING} targetLRS
 *
 * removes all LRS backends from the reporting.
 */
LearningRecordStore.prototype.clearLRSContext = function () {

};





/**
 * @protoype
 * @function setActor
 * @param {STRING} actorId
 */
LearningRecordStore.prototype.setActor = function (actorId) {

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

    return UUID;
};

/**
 * @protoype
 * @function updateAction
 * @param {STRING} UUID
 * @param {OBJECT} record
 */
LearningRecordStore.prototype.updateAction = function (UUID, record) {

};

/**
 * @protoype
 * @function finishAction
 * @param {STRING} UUID
 * @param {OBJECT} record
 */
LearningRecordStore.prototype.finishAction = function (UUID, record) {

};

/**
 * @protoype
 * @function recordAction
 * @param {OBJECT} record
 * @return {STRING} UUID
 */
LearningRecordStore.prototype.recordAction = function (record) {
    var UUID;

    return UUID;
};

/**
 * @protoype
 * @function trackAction
 * @param {NONE}
 */
LearningRecordStore.prototype.trackAction = function (record, callback) {

};

/****** Activity Analytics ******/

/**
 * @protoype
 * @function getEntropyMap
 * @param {NONE}
 */
LearningRecordStore.prototype.getEntropyMap = function () {

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
