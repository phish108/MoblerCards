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
/*jslint todo: true */

/*global $*/

/**
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class LogoutView
 *  View for displaying the settings which are:
 *  - name (first name and last name) of the user
 *  - email address of user
 *  - selected language
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns various event handlers when taping on various elements of the view
 *    such as the close button, the final logout button
 **/
function LogoutView() {
    return;
}

LogoutView.prototype.prepare = function () {
    this.unsetWaitingIcon();
};

LogoutView.prototype.setWaitingIcon = function () {
    $("#logoutcross").removeClass("touchable");
    $("#logoutfooter").removeClass("touchable");
    $("#logoutbutton").addClass("hidden");
    $("#logoutwait").removeClass("hidden");
};
LogoutView.prototype.unsetWaitingIcon = function () {
    $("#logoutcross").addClass("touchable");
    $("#logoutfooter").addClass("touchable");
    $("#logoutbutton").removeClass("hidden");
    $("#logoutwait").addClass("hidden");
};

LogoutView.prototype.tap_logoutcross = function () {
    this.app.chooseView("settings", "landing");
};

LogoutView.prototype.tap_logoutfooter = function () {
    if (!this.app.isOffline()) {
        this.setWaitingIcon();

        this.app.changeView("landing", "ID_LOGOUT_OK");
        this.model.finishSession();
    }
};
