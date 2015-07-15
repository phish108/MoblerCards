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
 
function IdentityProvider (app) {
    this.lrs     = app.models.LearningRecordStore;
    this.content = app.models.IdentityProvider;
}

/****** LMS Management ******/

/**
 * @protoype
 * @function addLMS
 * @param {STRING} LMSURL
 * @return {STRING} LMSId
 */
IdentityProvider.prototype.addLMS = function (LMSURL) {
    var LMSId;
    
    return LMSId;
};

/**
 * @protoype
 * @function loadLMS
 * @param {NONE}
 */
IdentityProvider.prototype.loadLMS = function () {
    
};

/**
 * @protoype
 * @function checkLMS
 * @param {NONE}
 */
IdentityProvider.prototype.checkLMS = function () {
    
};

/**
 * @protoype
 * @function ativateLMS
 * @param {STRING} LMSId
 */
IdentityProvider.prototype.ativateLMS = function (LMSId) {
    
};

/**
 * @protoype
 * @function lockLMS
 * @param {NONE}
 */
IdentityProvider.prototype.lockLMS = function () {
    
};

/**
 * @protoype
 * @function unlockLMS
 * @param {NONE}
 */
IdentityProvider.prototype.unlockLMS = function () {
    
};

/**
 * @protoype
 * @function getServiceURL
 * @param {STRING} serviceId
 */
IdentityProvider.prototype.getServiceURL = function (serviceId) {
    
};

/****** Connection Management ******/

/**
 * @protoype
 * @function startSession
 * @param {OBJECT} userCredentials - username and password
 */
IdentityProvider.prototype.startSession = function (userCredentials) {
    
};

/**
 * @protoype
 * @function finishSession
 * @param {NONE}
 */
IdentityProvider.prototype.finishSession = function () {
    
};

/**
 * @protoype
 * @function getSession
 * @param {NONE}
 * @return {OBJECT} session
 */
IdentityProvider.prototype.getSession = function () {
    var sessionTokens;
    
    return sessionTokens;
};

/**
 * @protoype
 * @function getUserProfile
 * @param {NONE}
 * @return {OBJECT} profile
 */
IdentityProvider.prototype.getUserProfile = function () {
    var profile;
    
    return profile;
};