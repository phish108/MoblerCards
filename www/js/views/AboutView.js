/**
 * THIS COMMENT MUST NOT REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Copyright: 2012-2014 ETH Zurich, 2015 Mobinaut
 */

/*jslint white: true */
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */

/*global $*/

/**
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class AboutView
 * View for displaying general information about the app such as:
 * - Copyright
 * - License
 * - URL to project's site on Github, where the code is documented
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns event handler when taping on close button
 **/
function AboutView() {return;}

AboutView.prototype.tap_aboutcross = function () {
    this.app.chooseView("settings", "landing");
};

AboutView.prototype.tap_opensourceicon = function (event) {
    $(event.target).addClass("gradientSelected");
    window.open("https://github.com/ISN-Zurich/ISN-Learning-Cards");
};

AboutView.prototype.tap_licenseicon = function (event) {
    $(event.target).addClass("gradientSelected");
    window.open("http://www.apache.org/licenses/LICENSE-2.0");
};

AboutView.prototype.tap_abouttitlelist = function() {
    // Don't provide access to the testing view in production
    if (this.app.development) {
        this.app.changeView("testing");
    }
};

/**
 * leads to logout confirmation view
 * @prototype
 * @function logout
 **/
AboutView.prototype.logout = function () {
    this.app.chooseView("logout", "landing");
};
