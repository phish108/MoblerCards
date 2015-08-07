/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, todo: true, browser: true */

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
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 * @author Christian Glahn
 */

// make JSLint happy
var $ = window.$;
var jQuery = window.jQuery;

/**
 * @Class LMS View
 * View for displaying the list with the different lms's
 *
 * @constructor
 * - it sets the tag ID for the lms view
 * - assigns event handler when taping on the close icon
 * - binds 3 events, that are related with loading of courses and questions
 *   and they handle the  display of the list of courses as well as
 *   the transformation of the loading icon to statistics icon
 * @param {String} controller
 */
function LMSView() {
    var self = this;

    this.tagID = this.app.viewId;
    this.active = false;
    this.firstLoad = true;
    this.didApologize = false;
    this.messageShown = false;
    this.preServername = "";

    /**It is triggered when an unregistered lms item is selected and and there is no internet connection
     * @event lmsOffline
     * @param: a callback function that displays a message that states that we are offline and no registration can take place
     * 			for the specific unregistered lms
     */
    $(document).bind("lmsOffline", function (e, servername) {
        console.log("we are offline");
        self.showLMSConnectionMessage(jQuery.i18n.prop('msg_lms_connection_message'), servername);
    });

    /**It is triggered when an lms is online and failed to register for any reason. More specifically
     * it is triggered when no more than 24 hours have been passed from the first failed attempt for registration.
     * @event lmsNotRegistrableYet
     * @param: a callback function that displays a message to the user that the server is not available and the
     * 		   registration cannot take place
     */
    $(document).bind("lmsNotRegistrableYet", function (e, servername) {
        self.refresh();
        self.showLMSRegistrationMessage(jQuery.i18n.prop('msg_lms_registration_message'), servername);
    });

    /**It is triggered when the registration of an lms fails because of any reason
     * @event registrationfailed
     * @param:a callback function that displays a message to the user that the server is not available and the
     *		  registration cannot take place
     */
    $(document).bind("LMS_DEVICE_NOTALLOWED", function (e, servername) {
        // the model must not change the LMS
        self.refresh();        self.showLMSRegistrationMessage(jQuery.i18n.prop('msg_lms_registration_message'), servername);
    });

    /**It is triggered when the registration of an lms fails because the backend is not activated
     * @event registrationfailed
     * @param:a callback function  that displays a message to the user that the server is not available temporarily
     */
    $(document).bind("registrationTemporaryfailed", function (e, servername, previousLMS) {
        self.refresh();
        console.log("previous lms in temporary failed lms is " + previousLMS);
        //var previousLMS=self.app.models['lms'].getPreviousServer();
        self.showLMSTemporaryRegistrationMessage(jQuery.i18n.prop('msg_lms_deactivate_registration_message'), servername, previousLMS);
    });

    /**It is triggered when the registration of an lms has just started
     * @event registrationIsStarted
     * @param:a callback function  that displays the loading icon in the place of the statistics icon
     */
    $(document).bind("registrationIsStarted", function (e, servername) {
        console.log("server name passed " + servername);
        self.showLoadingIcon(servername);
    });

    function closeAddAndRefresh() {
        // a new LMS has been successfully added
        // clear the form an show the placeholder
        self.closeAddForm();
        self.refresh(); // display the new LMS
        // hide waiting cycle
    }

    $(document).bind("LMS_DEVICE_READY", closeAddAndRefresh);
    $(document).bind("LMS_AVAILABLE", closeAddAndRefresh);
    $(document).bind("LMS_UNAVAILABLE", closeAddAndRefresh);


    $("#addlmsform").bind("submit", function (ev) {
        ev.preventDefault(); // prevent reloading before we can have bugs
        console.log("form submit");
        var lmsurl = $("#addlmsinput")[0].value;
        $("#addlmsinput")[0].blur();

        var turl = lmsurl;
        // keep the http if present
        //turl.replace(/^https?:\/\//i, "");

        if (self.app.isOnline() &&
            lmsurl &&
            lmsurl.length &&
            turl &&
            turl.length > 5) {

            console.log("add a new LMS!");
            self.model.addLMS(lmsurl);
            // display waiting circle
            $("#addlmsbutton").addClass("hidden");
            $("#addlmswait").removeClass("hidden");
        }
        else {
            // simply close the form
            console.log("LMSView.closeAddForm " + lmsurl + " :: "+ turl);
            self.closeAddForm();
        }
    });
}

LMSView.prototype.closeAddForm = function () {
    $("#addlmsplaceholder").toggleClass("hidden");
    $("#addlmsinputbox").toggleClass("hidden");
    $("#addlmsinput")[0].value = "";
    $("#addlmsinput")[0].blur();

    if ($("#addlmsbutton").hasClass("hidden")) {
        $("#addlmsbutton").removeClass("hidden");
        $("#addlmswait").addClass("hidden");
    }
};

/**
 * opens the view,
 * it sets the current view is the active
 * it shows the LMS list after clearing previous remaining items
 * @prototype
 * @function open
 **/
LMSView.prototype.prepare = function () {
    console.log("[LMSView] preparing");
    this.active = true;
    $("#lmsList").empty();
    this.firstLoad = false;

    //1. check which lms item has been inactive because of a 403 error
    //2. check if this is OK now, by sending a registration request
    //3. if we don't get back an error (403 or 404) then we should activate the visuals but NOT register without tapping first.
};

/**
 * unsets the closing view from being active
 * and then closes the view.
 * empties afterwards the lms list
 * @prototype
 * @function close
 **/
LMSView.prototype.cleanup = function () {
    console.log("close lms view");
    this.active = false;
    $("#lmsbody").empty();

    $("#lmstemporaryregistrationwaitingmessage").remove();
    // this statement comes from the app TranstitionToLogin
    if (this.appLoaded) {
        this.app.changeView("login");
    }

    $("#addlmsplaceholder").removeClass("hidden");
    $("#addlmsinputbox").addClass("hidden");
    $("#addlmsinput")[0].value = "";
};

/**
 * tap does nothing
 * @prototype
 * @function handleTap
 **/
LMSView.prototype.tap = function (event) {
    var id = event.target.id;
    var sn = id.split("_").pop();

    console.log("[LMSView] tap registered: " + id + " " + sn);

    if (id.indexOf("lmslist") === 0)  {
        this.clickLMSItem(sn, $(event.target));
        if (!($("#lmswait_lmslistbox_" + sn).hasClass("hidden"))) {
            $("#lmslabel_lmslistbox_" + this.preServername).addClass("selected");
        }
    }
};

LMSView.prototype.tap_lmscross = function (event) {
    this.back();
};

LMSView.prototype.tap_addlmsbox = function (event) {
    if ($("#addlmsinputbox").hasClass("hidden")) {
        // add a new LMS
        // TODO if we are offline show a message that "we cannot add new lmses while offline"
        $("#addlmsplaceholder").toggleClass("hidden");
        $("#addlmsinputbox").toggleClass("hidden");
        $("#addlmsinput")[0].value = "";
        $("#addlmsinput")[0].blur();
        $("#addlmsbutton").removeClass("hidden");
    }
    else {
        // check if we can connect to a new LMS
        var lmsurl = $("#addlmsinput")[0].value;
        var turl = lmsurl;
        turl.replace(/^https?:\/\//i, "");

        if (this.app.isOnline() &&
            lmsurl &&
            lmsurl.length &&
            turl &&
            turl.length > 5) {

            console.log("add a new LMS!");

            this.model.addLMS(lmsurl);
            // display waiting circle
            $("#addlmsbutton").addClass("hidden");
            $("#addlmswait").removeClass("hidden");
        }
        else {
            // simply close the form
            $("#addlmsplaceholder").toggleClass("hidden");
            $("#addlmsinputbox").toggleClass("hidden");
            $("#addlmsinput")[0].value = "";
            $("#addlmsinput")[0].blur();
            $("#addlmsbutton").removeClass("hidden");
            $("#addlmswait").addClass("hidden");
        }
    }
};

/**
 * shows the list with the available
 * different lms's.
 * for each lms are displayed:
 * - logo image
 * - label
 * - a separator line between the these two
 * @prototype
 * @function showLMSList
 */
LMSView.prototype.update = function () {
    console.log("[LMSView] refresh");

    // console.log("[LMSView] refresh, lmsData: " + lmsData[i]);

    this.model.eachLMS(function(entrydata) {
        this.createLMSItem(entrydata);
    }, this);
};

/**
 * creation of the lms list
 * @prototype
 * @function createLMSItem
 * @param {string} lmsData
 */
LMSView.prototype.createLMSItem = function (lmsData) {
    var sn = lmsData.name;
    var lmstmpl = this.app.templates.getTemplate("lmslistbox");

    console.log("servername " + sn);
    console.log("logoLabel " + lmsData.logofile);
    console.log(JSON.stringify(lmsData));
    lmstmpl.attach(lmsData.id);

    if (lmsData.selected) {
        lmstmpl.lmslist.addClass("selected");
    }
    else {
        lmstmpl.lmslist.addClass("textShadow");
    }

    lmstmpl.lmsimg.addClass("hidden");
    // lmstmpl.lmslabel.addClass("lightgrey");

    lmstmpl.lmslabel.text = lmsData.name;
    lmstmpl.lmsimg.setAttribute("src", lmsData.logofile);
    if (lmsData.inactive === 1) {
        lmstmpl.lmsimg.addClass("hidden");
        lmstmpl.lmswait.removeClass("hidden");
    }
};

/**
 * applies a specific gradient color and textshadows to the selected lms
 * in order to be differentiated from the rest lms items
 * @prototype
 * @function selectItemVisuals
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.selectItemVisuals = function (servername) {
    $("#lmslist_lmslistbox_" + servername).addClass("selected");
    $("#lmslist_lmslistbox_" + servername).removeClass("textShadow");
};

/**
 * deselect the gradient color and text shadow of an already selected lms
 * after the attempt of registrating has been finished
 * @prototype
 * @function deselectItemVisuals
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.deselectItemVisuals = function (servername) {
    $("#lmslist_lmslistbox_" + servername).removeClass("selected");
    $("#lmslist_lmslistbox_" + servername).addClass("textShadow");
};

/**when the attempt of registrating with the selected lms has failed,
 * the specific lms becomes through this function visually inactive.
 * both the side dash and the tesxt color become grey, as well as
 * a red icon cross replaces the image icon
 * @prototype
 * @function deactivateLMS
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.deactivateLMS = function (servername) {
    if ($("#lmswait_lmslistbox_" + servername).hasClass("hidden")) {
        $("#lmswait_lmslistbox_" + servername).removeClass("icon-loading loadingRotation hidden");
        $("#lmswait_lmslistbox_" + servername).addClass("icon-cross red");
        $("#lmsimg_lmslistbox_" + servername).addClass("hidden");

        $("#lmslabel_lmslistbox_" + servername).addClass("lightgrey");
    }
    else {
        console.log("some typo");
    }
};

/**when an lms has been temporarily (for one hour) been abanded
 * from trying to be registered due to an 403 server error.
 * the lms is activated when the one hour has passed.
 * @prototype
 * @function deactivateLMS
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.activateLMS = function (servername) {
    if ($("#lmsimg_lmslistbox_" + servername).hasClass("hidden")) {
        $("#lmswait_lmslistbox_" + servername).addClass("hidden");
        $("#lmsimg_lmslistbox_" + servername).removeClass("hidden");

        $("#lmslabel_lmslistbox_" + servername).removeClass("lightgrey");
    }
    else {
        console.log("some typo");
    }
};

/**
 * when the attempt of registering an lms with the server is finished,
 * the loading rotating icon is beeing replaced by the image
 * @prototype
 * @function hideRotation
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.hideRotation = function (servername) {
    if ($("#lmsimg_lmslistbox_" + servername).hasClass("hidden")) {
        $("#lmswait_lmslistbox_" + servername).removeClass("icon-loading loadingRotation");
        $("#lmswait_lmslistbox_" + servername).addClass("hidden");
        $("#lmsimg_lmslistbox_" + servername).removeClass("hidden");
    }
};

/**
 * to display a loading icon in the place of the lms image
 * while a registration with a server is being atempted.
 * @prototype
 * @function toggleIconWait
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.toggleIconWait = function (servername) {
    var self = this;
    console.log("toggle icon wait");
    if (!($("#lmswait_lmslistbox_" + servername).hasClass("hidden"))) {
        $("#lmswait_lmslistbox_" + servername).addClass("icon-loading loadingRotation");
        $("#lmswait_lmslistbox_" + servername).removeClass("hidden");
        $("#lmsimg_lmslistbox_" + servername).addClass("hidden");
    }
    else {
        self.hideRotation(servername);
    }
};

/**
 * click on an lms item
 * and sets properties of the selected server
 * @prototype
 * @function clickLMSItem
 * @param {String, string} servername,lmsitem the name of the selected server and the current li element that hosts it
 **/
LMSView.prototype.clickLMSItem = function (servername, lmsitem) {
    var self = this;
    var lb = $("#lmslist_lmslistbox_" + servername);

    if (!lb.hasClass("selected")) {

        lb.removeClass("selected");
        lb.addClass("textShadow");

//        lmsModel.storePreviousServer();
//        this.preServername = lmsModel.getPreviousServer();
//        this.selectItemVisuals(servername);
//        this.deselectItemVisuals(this.preServername);
        console.log("activate " + servername);
        this.model.activateLMS(servername);
    }
};

/**
 * shows the warning message from lms list view
 * that displayed a notification because there was
 * not internet connection and no registration could take place
 * @prototype
 * @function showLMSConnectionMessage
 * @param {String, String} message,servername ,a text containing the warning message, and the name of the
 * selected lms
 */
LMSView.prototype.showLMSConnectionMessage = function (message, servername) {
    var self = this;

    // to display an error message that we are
    // offline and we cannot register with the server
    console.log("enter show lms connection message");

    self.toggleIconWait(servername);

    var warningLi = $('<li/>', {
        "id": "lmserrormessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_connection_message')
    });

    $("#lmslist_lmslistbox_" + servername).after(warningLi);
    $("#lmserrormessage" + servername).hide();
    $("#lmserrormessage" + servername).slideDown(600);
    console.log("lmsmessage for server" + servername);

    setTimeout(function () {
        $("#lmserrormessage" + servername).slideUp(600);
    }, 2300);
    setTimeout(function () {
        self.hideRotation(servername);
    }, 2800);
};

/**
 * shows a warning message regarding an error during the registration
 * of the selected lms. The message is slided down right below the selected lms
 * and as soon as it is slided up, the lms becomes inactive, by getting a grey font color
 * and a red cross in the  place of the image.
 * @prototype
 * @function showLMSRegistrationMessage
 * @param {String,String,String} message,servername, previouslms,
 * a text with containing the warning message, the name of the selected server, thename of the previous selected server
 */
LMSView.prototype.showLMSRegistrationMessage = function (message, servername) {
    var self = this;

    $("#lmsregistrationwaitingmessage").empty();

    self.toggleIconWait(servername);

    var warningLi = $('<li/>', {
        "id": "lmsregistrationmessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_registration_message')
    });

    $("#lmslist_lmslistbox_" + servername).after(warningLi);
    $("#lmsregistrationmessage" + servername).hide();
    $("#lmsregistrationmessage" + servername).slideDown(600);
    console.log("lmsregistrationmessage for server" + servername);

    // to display an error message that
    // there is a problem with the specific server
    // and we cannot register
    console.log("enter show lms registration message");

    setTimeout(function () {
        $("#lmsregistrationmessage" + servername).slideUp(600);
    }, 2300);
    setTimeout(function () {
        //$("#lms"+servername).removeClass("gradientSelected");
        //self.hideRotation(servername);
        self.deselectItemVisuals(servername);
        self.deactivateLMS(servername);
        // activate the previsous LMS before changing the visuals
        var previouslms = this.model.getPreviousServer();
        self.model.activateLMS(previouslms);
        $("#lmslist_lmslistbox_" + previouslms).addClass("selected");
    }, 2800);
};

/**
 * @prototype
 * @function showLMSRegistrationMessage
 * @param {String,String,String} message,servername, previouslms,
 * a text with containing the warning message, the name of the selected server, thename of the previous selected server
 */
LMSView.prototype.showLMSTemporaryRegistrationMessage = function (message, servername, previousLMS) {
    var self = this;
    console.log("enter temporar");
    $("#lmstemporaryregistrationwaitingmessage" + servername).remove();
    self.toggleIconWait(servername);

    var warningLi = $('<li/>', {
        "id": "lmstemporaryregistrationwaitingmessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_deactivate_message')
    });

    $("#lmslist_lmslistbox_" + servername).after(warningLi);
    $("#lmstemporaryregistrationwaitingmessage" + servername).hide();
    $("#lmstemporaryregistrationwaitingmessage" + servername).slideDown(600);

    // to display an message that there is a problem with the specific server
    // and we cannot register for the next hour
    //	slide up this message after a couple of seconds
    setTimeout(function () {
        $("#lmstemporaryregistrationwaitingmessage" + servername).slideUp(600);
    }, 2300);

    //to make visually this lms as inactive
    //and activate the previously selected lms
    setTimeout(function () {
        self.deselectItemVisuals(servername);
        self.deactivateLMS(servername);
        //console.log("previouslms is "+previouslms);
        //var previouslms=this.app.models['lms'].getPreviousServer();
        self.model.activateLMS(previousLMS);
        $("#lmslist_lmslistbox_" + previousLMS).addClass("selected");
    }, 2800);


    //	after one hour check if the server is active
    //	if yes activated it
    //	we need firstly to check if the active view is the lms list view
    if (self.active) {
        console.log("lms is active, try setTimeOut again");
        setTimeout(function () {
            console.log("reactivation?");
            self.model.storeActiveServer(servername);
            self.model.register(servername);
        }, 60 * 1000);
    } //if the active view is the lms list view

    function myTimer() {
        console.log("reactivation?");
        self.model.register(servername); //instead of executing the whole registration we can just send the ajax request
        if (DEACTIVATE) //if we got an 403 again and we are still in deactivate mode
        {
            console.log("is calling itself again");
            setTimeout(this, 60 * 1000);
        } else {
            console.log("yes reactivation");
            self.activateLMS(servername);
        }
    }
};

/**
 * to display a loading icon in the place of the lms image
 * while a registration with a server is being atempted.
 * @prototype
 * @function showLoadingIcon
 * @param {String} servername, the name of the selected server
 */
LMSView.prototype.showLoadingIcon = function (servername) {
    var self = this;
    self.toggleIconWait(servername);
};
