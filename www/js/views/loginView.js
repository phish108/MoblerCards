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
function LoginView(controller) {
    var self = this;
    this.controller = controller;
    this.tagID = this.controller.views.id;
    this.active = false;
    this.fixedRemoved = false;

    /** 
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        moblerlog(" hide error message loaded ");
        self.hideErrorMessage();
    });

    // if keyboard is displayed, move the logos up
    // if keyboard is not displayed anymore, move logos down
    $("#usernameInput")[0].addEventListener("focus", focusLogos);
    $("#password")[0].addEventListener("focus", focusLogos);
    $("#usernameInput")[0].addEventListener("blur", unfocusLogos);
    $("#password")[0].addEventListener("blur", unfocusLogos);

    function focusLogos(e) {
        e.stopPropagation();
        e.preventDefault;

        moblerlog("focus logos " + e.currentTarget);
        $("#loginButton").removeClass("fixed");
        var fixedRemoved = true;
        $("#logos").removeClass("bottom");
        $("#logos").addClass("static");
    }

    function unfocusLogos(e) {
        e.stopPropagation();
        e.preventDefault;
        moblerlog("unfocus logos " + e.currentTarget);
        $("#loginButton").addClass("fixed");
        $("#loginButton").show();
        moblerlog("loginButton is now fixed");
        var fixedRemoved = false; //it is back on its old position
        $("#logos").addClass("bottom");
        $("#logos").removeClass("static");
    }
} //end of constructor

/**
 * shows the login form after firstly hide the error messages
 * that might be displayed because of connection failure
 * due to various reasons (wrong data, no internet etc)
 * @prototype
 * @function open
 **/
LoginView.prototype.prepare = function () {
    moblerlog("loginView: open sesame");
    $("#loginButton").show();
    // hide unnecessary errors and warnings 
    this.hideErrorMessage();
    this.hideWarningMessage();
    this.hideDeactivateMessage();
    $("#selectLMS").removeClass("gradientSelected");
    this.showForm();
    this.active = true;
    this.controller.models.featured.loadFeaturedCourseFromServer();
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
    injectStyle();
};

/**
 *
 * @prototype
 * @function handleTap
 **/
LoginView.prototype.tap = function (event) {
    var id = event.target.id;
        
//    move to prepare()    
//    $("#loginButton").show();
    
    if (id === "loginButton") {
        this.clickLoginButton();
    }
    else if (id === "loginViewBackIcon") {
        this.clickCloseLoginButton();
    }
    else if (id === "usernameInput") {
        focusLogos(event);
    }
    else if (id === "password") {
        focusLogos(event);
    }
    else if (id === "selectLMS") {
        this.selectLMS();
    }
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
            if (this.controller.getLoginState()) {
                this.controller.changeView("course");
            } else {
                this.controller.changeView("landing");
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
        if (!self.controller.models["connection"].isOffline()) {
            console.log("has logIn data");

            $(document).bind("authenticationready", cbLoginSuccess);
            $(document).bind("authenticationfailed", cbLoginFailure);
            $(document).bind("authenticationTemporaryfailed", cbLoginTemporaryFailure);

            self.showWarningMessage(jQuery.i18n.prop('msg_warning_message'));
            this.controller.models.configuration.login(
                $("#usernameInput").val(), $("#password").val());
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
    $("#lmsImage").attr("src", this.controller.getActiveLogo());
    $("#loginLmsLabel").text(this.controller.getActiveLabel());

    this.hideErrorMessage();
    this.hideDeactivateMessage();
    $("#loginViewHeader").show();
    $("#loginViewBackIcon").show();
    $("#loginBody").show();

    if (this.controller.models.connection.isOffline()) {
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
    moblerlog("show deactivate message");
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
        self.controller.changeView("lms");
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
    this.controller.models.lms.setSelectedLMS(selectedLMS);
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
    var lmsModel = this.controller.models.lms;
    var activeServer = lmsModel.getActiveServer();
    lmsModel.storePreviousServer(activeServer);
    this.controller.changeView("landing");
};