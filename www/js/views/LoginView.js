/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true*/

/*global jstap*/

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
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class LoginView
 * View for displaying the login form and the default lms
 * Additionally it displays error and warning messages while
 * the user is trying to authenticate,depending on the problem
 * fox example: lost of internet connectivity, wrong user name etc.
 * In the bottom part of the view are displayed the logos of the organisation
 *
 * FIXME click event must not select the password input
 **/
var $ = window.$, jQuery = window.jQuery;

function LoginView() {
    var self = this;
    this.tagID = this.app.viewId; // obsolete
    this.active = false;
    this.fixedRemoved = false;

    function cbLoginSuccess() {
        if (self.active) {
            console.log("is logIn");
            $(document).trigger("trackingEventDetected", ["Login"]);
            if (self.app.getLoginState()) {
                self.app.changeView("course");
            } else {
                self.app.changeView("landing");
            }
        }
    }

    function cbLoginFailure(e, errormessage) {
        console.log("authentication failed, reason: " + errormessage);
        switch (errormessage) {
        case "connectionerror":
            self.showErrorMessage('msg_connection_message');
            break;
        case "nouser":
            console.log("no user error");
            self.showErrorMessage('msg_authenticationFail_message');
            break;
        case "invalidclientkey":
            self.showErrorMessage('msg_connection_message');
            break;
        default:
            console.log("unknown error " + errormessage);
            break;
        }
    }

    function cbLoginTemporaryFailure() {
        console.log("enter cbLogin tempoerary failure");
        console.log("will show the deactivate message");
        self.showDeactivateMessage('msg_login_deactivate_message');
    }

    $(document).bind("ID_SERVER_UNAVAILABLE", cbLoginFailure);

    /**
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        console.log(" hide error message loaded ");
        self.hideMessage();
    });

    $(document).bind("online", function () {
        self.hideMessage();
    });

    $(document).bind("offline", function () {
        self.showErrorMessage('msg_network_message');
    });

    $(document).bind("authenticationready", cbLoginSuccess);
    $(document).bind("authenticationfailed", cbLoginFailure);
    $(document).bind("authenticationTemporaryfailed", cbLoginTemporaryFailure);
}

/**
 * shows the login form after firstly hide the error messages
 * that might be displayed because of connection failure
 * due to various reasons (wrong data, no internet etc)
 * @prototype
 * @function open
 **/
LoginView.prototype.prepare = function () {
    console.log("loginView: open sesame");
    if (this.app.getLoginState()) {
        this.app.changeView("course");
    }
    else {
        // hide unnecessary errors and warnings
        this.hideMessage();

        $("#selectLMS").removeClass("gradientSelected");
        this.active = true;
//        this.app.models.lms.registerDevice();
//        this.app.models.featured.loadFeaturedCourseFromServer();
    }
};

LoginView.prototype.update = function () {
    var activeLMS = {};

    this.app.models.identityprovider.getActiveLMS(function (data) {
        activeLMS = data;
    });
    console.dir(this.app.models);

    // TODO convert to Template Format
    // clear logo image

    // NOTE: use background styles in separate style tags instead of image files

    // skip logo
    // $("#loginimg").attr("src", activeLMS.logofile);

    $("#loginimg").addClass("entypo-mortar-board");
    $("#loginlmslabel").text(activeLMS.name);

    $("#usernameInput").focus();

    this.hideMessage();

    if (this.app.isOffline()) {
        this.showErrorMessage('msg_network_message');
    }
};

/**
 * closes the view after firstly clearing
 * the input fields of the login form
 * @prototype
 * @function close
 **/
LoginView.prototype.cleanup = function () {
    $("#password").val("");
    $("#usernameInput").val("");
    $("#password").blur();
    $("#usernameInput").blur();

    // hack for scrolling the content box into place.
    this.container.addClass("active");
    this.container.scrollTop(0);
    // console.log("container during cleanup at " + this.container.scrollTop());
    this.container.removeClass("active");
};

LoginView.prototype.tap_loginnamelabel = function () {
    $("#usernameInput").focus();
};

LoginView.prototype.tap_loginpwlabel = function () {
    $("#password").focus();
};

/**
 * @prototype
 * @function tap_loginfooter()
 *
 * tap on the login button sends data to the authentication model,
 * data is only sent if input fields contain some values
 * after successful login the course list is displayed
 */
LoginView.prototype.tap_loginfooter = function () {
    console.log("check logIn data");
    if ($("#usernameInput").val() && $("#password").val()) {
        if (!this.app.isOffline()) { // refuse to run while being offline
            this.app.deferredChangeView("ID_AUTHENTICATION_OK", "landing");
            this.showWarningMessage('msg_warning_message');
            this.model.startSession($("#usernameInput").val(),
                                    $("#password").val());
        }
        // offline message should be already on display
    }
    else {
        this.showErrorMessage('msg_authentication_message');
    }};

LoginView.prototype.tap_logincross = function () {
    this.clickCloseLoginButton();
};

LoginView.prototype.tap_courselistlms = function () {
    $("#selectLMS")
        .removeClass("textShadow")
        .addClass("gradientSelected");

    this.app.changeView("lms");
};

/**
 * @prototype
 * @function displayMessage(targetId, messageCode)
 * @param {STRING} targetId
 * @param {STRING} messageCode
 *
 * The targetId is the id of the message type as it appears in the dom.
 *
 * The messageCode is the I18N code as it appears in the language files.
 *
 * If the messageCode is not in the language files it will be displayed directly.
 */
LoginView.prototype.displayMessage = function (target, i18nMsg) {
    var atargets = [
        "warningmessage",
        "deactivatemessage",
        "errormessage"
    ];

    if (target && atargets.indexOf(target) < 0) {
        return; // invalid target
    }

    atargets.forEach(function (t) {
        $("#" + t).hide();
    });

    var msg = jQuery.i18n.prop(i18nMsg);
    if (!msg) {
        msg = i18nMsg;
    }

    $("#"+ target).text(msg).show();
};

/**
 * @prototype
 * @function hideMessage()
 *
 * clears and hides all messages.
 */
LoginView.prototype.hideMessage = function () {
    var atargets = [
        "warningmessage",
        "deactivatemessage",
        "errormessage"
    ];

    atargets.forEach(function (t) {
        $("#" + t).text("").hide();
    });

};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LoginView.prototype.showErrorMessage = function (message) {
    this.displayMessage("errormessage", message);
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LoginView.prototype.showDeactivateMessage = function (message) {
    this.displayMessage("deactivatemessage", message);
};

/**
 * shows the specified warning message
 * @prototype
 * @function showWarningMessage
 */
LoginView.prototype.showWarningMessage = function (message) {
    this.displayMessage("warningmessage", message);
};

/**
 * transition to landing view when tapping on the
 * ,pr button on the up right corner of login view
 * @prototype
 * @function clickCloseLoginButton
 * */
LoginView.prototype.clickCloseLoginButton = function () {
    //set the active server to be the previous server
    this.app.changeView("landing");
};

LoginView.prototype.duringMove = function () {
    this.doScroll();
};

LoginView.prototype.doScroll = function () {
    var dY = jstap().touches(0).delta.y();
    this.container.scrollTop(this.container.scrollTop() - dY);
};

