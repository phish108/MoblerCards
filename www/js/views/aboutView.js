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


/** @author Isabella Nake
 * @author Evangelia Mitsopoulou
   
*/

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @Class AboutView
 * View for displaying general information about the app such as:
 * - Copyright
 * - License
 * - URL to project's site on Github, where the code is documented
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns event handler when taping on close button
 *
 **/
function AboutView() {
    var self = this;

    jester($('#closeAboutIcon')[0]).tap(function () {
        self.closeAbout();
    });

}

AboutView.prototype.prepare = function () {
    this.loadData();
    this.controller.models.configuration.loadFromServer();
};

/**
 * Pinch leads to course list
 * It works currently only on iOS devices
 * @prototype
 * @function handlePinch
 **/
AboutView.prototype.pinch = function () {
    console.log("pinch in AboutView");
    this.controller.changeView("settings");
};

/**
 * When user clicks on the close button
 * it leads to the courses list
 * @prototype
 * @function closeAbout
 **/
AboutView.prototype.closeAbout = function () {
    console.log("close settings button clicked");
    this.controller.changeView('settings');
};

/**
 * leads to logout confirmation view
 * @prototype
 * @function logout
 **/
AboutView.prototype.logout = function () {
    this.controller.changeView("logout");
};

/**
 * Loads the data of the about view. Most of its
 * content has been initialized in the localization in
 * the controller. 	In this function, the data  that are
 * loaded are the logos.
 * @prototype
 * @function loadData
 **/
AboutView.prototype.loadData = function () {
    var config = this.controller.models.configuration;

    $("#logos").show();
};