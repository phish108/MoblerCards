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




/**@author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @Class LoginView
 * View for displaying the login form and the default lms
 * Additionally it displays error and warning messages while
 * the user is trying to authenticate,depending on the problem
 * fox example: lost of internet connectivity, wrong user name etc.
 * In the bottom part of the view are displayed the logos of the organisation
 *  @constructor
 *  - it sets the tag ID for the login view
 *  - assigns various event handlers when taping on the elements of the
 *    login form such as username, password, login button
 *  - it binds synhronization events such as the sending of statistics to the server,
 *    the update of courses and questions. It prevents the display of the appropriate
 *    views that are also binded with the aforementioned events by displaying the
 *    login form itself.
 *  @param {String} controller
 **/
function LoginView() {
    var self = this;
    this.tagID = this.app.viewId;
    this.active = false;
    this.fixedRemoved = false;

    /** 
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        console.log(" hide error message loaded ");
        self.hideErrorMessage();
    });

    // if keyboard is displayed, move the logos up
    // if keyboard is not displayed anymore, move logos down
    $("#usernameInput")[0].addEventListener("focus", self.focusLogos);
    $("#password")[0].addEventListener("focus", self.focusLogos);
    $("#usernameInput")[0].addEventListener("blur", self.unfocusLogos);
    $("#password")[0].addEventListener("blur", self.unfocusLogos);
} //end of constructor

/**
 * shows the login form after firstly hide the error messages
 * that might be displayed because of connection failure
 * due to various reasons (wrong data, no internet etc)
 * @prototype
 * @function open
 **/
LoginView.prototype.prepare = function () {
    console.log("loginView: open sesame");
    $("#loginButton").show();
    // hide unnecessary errors and warnings 
    this.hideErrorMessage();
    this.hideWarningMessage();
    this.hideDeactivateMessage();
    $("#selectLMS").removeClass("gradientSelected");
    this.showForm();
    this.active = true;
    this.app.models.featured.loadFeaturedCourseFromServer();
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

/**
 *
 * @prototype
 * @function handleTap
 **/
LoginView.prototype.tap = function (event) {
    var id = event.target.id;
    
    console.log("[LoginView] tap registered: " + id);
    
    if (id === "selectarrow") {
        this.clickLoginButton();
    }
    else if (id === "loginViewBackIcon") {
        this.clickCloseLoginButton();
    }
    else if (id === "usernameInput") {
        this.focusLogos(event);
    }
    else if (id === "password") {
        this.focusLogos(event);
    }
    else if (id === "loginLmsLabel") {
        this.selectLMS();
    }
};

LoginView.prototype.focusLogos = function () {
        $("#loginButton").removeClass("fixed");
        var fixedRemoved = true;
        $("#logos").removeClass("bottom");
        $("#logos").addClass("static");
};

LoginView.prototype.unfocusLogos = function () {
        $("#loginButton").addClass("fixed");
        $("#loginButton").show();
        var fixedRemoved = false;
        $("#logos").addClass("bottom");
        $("#logos").removeClass("static");
};
        
/**
 * click on the login button sends data to the authentication model,
 * data is only sent if input fields contain some values
 * after successful login the course list is displayed
 * @prototype
 * @function clickLoginButton
 */
LoginView.prototype.clickLoginButton = function () {
    var user, password;
    var self = this;

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
        self.showDeactivateMessage(jQuery.i18n.prop('msg_login_deactivate_message'))
    }

    console.log("check logIn data");
    if ($("#usernameInput").val() && $("#password").val()) {
        if (!self.app.models.connection.isOffline()) {
            console.log("has logIn data");

            $(document).bind("authenticationready", cbLoginSuccess);
            $(document).bind("authenticationfailed", cbLoginFailure);
            $(document).bind("authenticationTemporaryfailed", cbLoginTemporaryFailure);

            self.showWarningMessage(jQuery.i18n.prop('msg_warning_message'));
            this.app.models.configuration.login($("#usernameInput").val(), $("#password").val());
        } //use else to display an error message that the internet connectivity is lost, or remove the if sanity check (offline)
        // the isOffline seems to work not properly
    } else {
        self.showErrorMessage(jQuery.i18n.prop('msg_authentication_message'));
    }
};

/**
 * displays the login form
 * @prototype
 * @function showForm
 */
LoginView.prototype.showForm = function () {
    console.log("show form in login view");
    console.log("active server in login view is ");
    $("#lmsImage").attr("src", this.app.getActiveLogo());
    $("#loginLmsLabel").text(this.app.getActiveLabel());

    this.hideErrorMessage();
    this.hideDeactivateMessage();
    $("#loginViewHeader").show();
    $("#loginViewBackIcon").show();
    $("#loginBody").show();

    if (this.app.models.connection.isOffline()) {
        this.showErrorMessage(jQuery.i18n.prop('msg_network_message'));
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
 * when user taps on the select lms button
 * it leads to lms list view
 * @prototype
 * @function selectLMS
 **/
LoginView.prototype.selectLMS = function () {
    var self = this;
    console.log("select lms");
    $("#selectLMS").removeClass("textShadow");
    $("#selectLMS").addClass("gradientSelected");
    self.storeSelectedLMS();
    setTimeout(function () {
        self.app.changeView("lms");
    }, 100);
};

/** 
 * storing the selected LMS  in an array
 * @prototype
 * @function storeSelectedLMS
 * */
LoginView.prototype.storeSelectedLMS = function () {
    var selectedLMS = $("#loginLmsLabel").text();
    console.log("stored selected lms is" + JSON.stringify(selectedLMS));
    this.app.models.lms.setSelectedLMS(selectedLMS);
};

/**
 * handles dynamically any change that should take place on the layout
 * when the orientation changes.
 *  - the width of the lms label in select widget is adjusted dynamically
 * @prototype
 * @function changeOrientation
 **/
LoginView.prototype.changeOrientation = function (orientationLayout, w, h) {
    var self = this;

    console.log("change orientation in login view");

    if (orientationLayout == false || self.fixedRemoved == true) //we are in portrait mode and previously
    // we had removed the fixed position of login button
    {
        $("#loginButton").removeClass("fixed");
    } else if (self.fixedRemoved == false) {
        $("#loginButton").addClass("fixed");
    };


    //we are in landscape mode and previously we had removed the fixed position of login button
    if (self.fixedRemoved == false) {
        $("#loginButton").addClass("fixed");
    };


    var buttonwidth, window_width = $(window).width();
    buttonwidth = window_width - 2;
    $(".forwardButton").css("width", buttonwidth + "px");

};

/**
 * transition to landing view when tapping on the
 * ,pr button on the up right corner of login view
 * @prototype
 * @function clickCloseLoginButton
 * */
LoginView.prototype.clickCloseLoginButton = function () {
    //set the active server to be the previous server
    var lmsModel = this.app.models.lms;
    var activeServer = lmsModel.getActiveServer();
    lmsModel.storePreviousServer(activeServer);
    this.app.changeView("landing");
};