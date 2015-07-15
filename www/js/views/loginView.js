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
            self.showErrorMessage(jQuery.i18n.prop('msg_connection_message'));
            break;
        case "nouser":
            console.log("no user error");
            self.showErrorMessage(jQuery.i18n.prop('msg_authenticationFail_message'));
            break;
        case "invalidclientkey":
            self.showErrorMessage(jQuery.i18n.prop('msg_connection_message'));
            break;
        default:
            console.log("unknown error");
            break;
        }
    }

    function cbLoginTemporaryFailure(servername) {
        console.log("enter cbLogin tempoerary failure");
        console.log("will show the deactivate message");
        self.showDeactivateMessage(jQuery.i18n.prop('msg_login_deactivate_message'));
    }

    /**
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        console.log(" hide error message loaded ");
        self.hideErrorMessage();
    });

    $(document).bind("DEVICE_ONLINE", function () {
        self.hideErrorMessage();
    });

    $(document).bind("DEVICE_OFFLINE", function () {
        self.showErrorMessage(jQuery.i18n.prop('msg_network_message'));
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
        this.hideErrorMessage();
        this.hideWarningMessage();
        this.hideDeactivateMessage();
        $("#selectLMS").removeClass("gradientSelected");
        this.active = true;
        this.app.models.lms.registerDevice();
        this.app.models.featured.loadFeaturedCourseFromServer();
    }
};

LoginView.prototype.update = function () {
    var activeLMS = {};
    this.app.models.lms.getActiveLMS(function (data) {
        activeLMS = data;
    });

    $("#loginimg").attr("src", activeLMS.logofile);

    // TODO: TRANSFORM STRING TO i18n.prop
    $("#loginlmslabel").text(activeLMS.name);

    this.hideErrorMessage();
    this.hideDeactivateMessage();

    if (this.app.models.connection.isOffline()) {
        this.showErrorMessage(jQuery.i18n.prop('msg_network_message'));
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
    this.active = false;
    this.app.injectStyle();
};


LoginView.prototype.tap_loginfooter = function () {
    this.clickLoginButton();
};

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
 * click on the login button sends data to the authentication model,
 * data is only sent if input fields contain some values
 * after successful login the course list is displayed
 * @prototype
 * @function clickLoginButton
 */
LoginView.prototype.clickLoginButton = function () {
    var self = this;

    console.log("check logIn data");
    if ($("#usernameInput").val() && $("#password").val()) {
        if (!self.app.models.connection.isOffline()) {
            console.log("has logIn data");

            self.showWarningMessage(jQuery.i18n.prop('msg_warning_message'));
            this.app.models.configuration.login($("#usernameInput").val(), $("#password").val());
        }
    // use else to display an error message that the internet connectivity is lost, or remove the if sanity check (offline)
    // the isOffline seems to work not properly
    }
    else {
        self.showErrorMessage(jQuery.i18n.prop('msg_authentication_message'));
    }
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LoginView.prototype.showErrorMessage = function (message) {
    $("#warningmessage").hide();
    $("#deactivatemessage").hide();
    $("#errormessage").text(message);
    $("#errormessage").show();
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LoginView.prototype.showDeactivateMessage = function (message) {
    console.log("show deactivate message");
    $("#warningmessage").hide();
    $("#errormessage").hide();
    $("#deactivatemessage").text(message);
    $("#deactivatemessage").show();
};

/**
 * shows the specified warning message
 * @prototype
 * @function showWarningMessage
 */
LoginView.prototype.showWarningMessage = function (message) {
    $("#errormessage").hide();
    $("#deactivatemessage").hide();
    $("#warningmessage").text(message);
    $("#warningmessage").show();
};

/**
 * hides the specified error message
 * @prototype
 * @function hideErrorMessage
 **/
LoginView.prototype.hideErrorMessage = function () {
    $("#errormessage").text("");
    $("#errormessage").hide();
};

/**
 * hides the specified warning message
 * @prototype
 * @function hideWarningMessage
 **/
LoginView.prototype.hideWarningMessage = function () {
    $("#warningmessage").text("");
    $("#warningmessage").hide();
};

/**
 * hides the specified dectivate message
 * @prototype
 * @function hideDeactivateMessage
 **/
LoginView.prototype.hideDeactivateMessage = function () {
    console.log("enter hide deactivate message");
    $("#deactivatemessage").text("");
    $("#deactivatemessage").hide();
    console.log("hided deactivate message");
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