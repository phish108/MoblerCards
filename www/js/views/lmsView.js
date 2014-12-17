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
 * * @author Evangelia Mitsopoulou
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

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
    
    this.tagID = this.app.views.id;
    this.active = false;
    this.firstLoad = true;
    this.didApologize = false;
    this.messageShown = false;
    this.previousSelectedLMSname;

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
        console.log("previouslms in bind is " + previousLMS);
        var previousLMS = self.app.models.lms.getPreviousServer();
        self.showLMSRegistrationMessage(jQuery.i18n.prop('msg_lms_registration_message'), servername, previousLMS);
    });

    /**It is triggered when the registration of an lms fails because of any reason
     * @event registrationfailed
     * @param:a callback function that displays a message to the user that the server is not available and the
     *		  registration cannot take place
     */
    $(document).bind("registrationfailed", function (e, servername) {
        console.log("previous lms in bind 2 is " + previousLMS);
        var previousLMS = self.app.models.lms.getPreviousServer();
        self.showLMSRegistrationMessage(jQuery.i18n.prop('msg_lms_registration_message'), servername, previousLMS);
    });

    /**It is triggered when the registration of an lms fails because the backend is not activated
     * @event registrationfailed
     * @param:a callback function  that displays a message to the user that the server is not available temporarily
     */
    $(document).bind("registrationTemporaryfailed", function (e, servername, previousLMS) {
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
}

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
    this.app.resizeHandler();
    this.refresh();

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
};

/**
 * tap does nothing
 * @prototype
 * @function handleTap
 **/
LMSView.prototype.tap = function (event) {
    var id = event.target.id;
    var sn = id.substring(5);
   
    console.log("[LMSView] tap registered: " + id + " " + sn);
    
    if (id === "closeLMSIcon") {
        this.back();
    }
    else if (id.substring(0,5) === "label")  { 
        this.clickLMSItem(sn, $(this));
        if ($("#lmsWaiting" + sn).hasClass("icon-cross red")) {
            $("#selectLMSitem" + this.previousSelectedLMSname).addClass("gradientSelected");
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
LMSView.prototype.refresh = function () {
    var lmsObj = this.app.models.lms;

    console.log("[LMSView] refresh");
    
    $("#lmsbody").empty();
    var lmsData = lmsObj.getLMSData(), 
        i = 0;

    console.log("[LMSView] refresh, lmsData: " + lmsData[i]);
    if (lmsData && lmsData.length) {
        //creation of lms list
        var ul = $("<ul/>", {
            "id": "lmsList"
        }).appendTo("#lmsbody");

        for (i = 0; i < lmsData.length; i++) {
            this.createLMSItem(ul, lmsData[i]);
        } //end of for

        var lastli = $("<li/>", {}).appendTo("#lmsList");

        var shadoweddiv = $("<div/>", {
            "id": "shadowedLiLMS",
            "class": "gradient1 shadowedLi"
        }).appendTo(lastli);

        var marginli = $("<li/>", {
            "class": "spacerMargin"
        }).appendTo(ul);

    } //end of if
    else {
        this.didApologize = true;
        doApologize();
    }
};

/**
 * creation of the lms list
 * @prototype
 * @function createLMSItem
 * @param {string,string} ul,lmsData
 * 
 * FIXME rewrite as templatefactory code.
 */
LMSView.prototype.createLMSItem = function (ul, lmsData) {
    var self = this;
    var sn = lmsData.servername;
    var lmsModel = self.app.models.lms;
    var selectedLMS = this.app.models.lms.getSelectedLMS();

    var li = $(
        "<li/>", {
            "id": "selectLMSitem" + sn,
            "class": (selectedLMS === lmsData.logoLabel ? "gradientSelected" : "gradient2 textShadow")
        }).appendTo(ul);

    var rightDiv = $("<div/>", {
        "id": "rightDivLMS" + sn,
        "class": "right "
    }).appendTo(li);

    var separator = $("<div/>", {
        "id": "separator" + sn,
        "class": "radialCourses lineContainer separatorContainerLMS "
    }).appendTo(rightDiv);

    var div = $("<div/>", {
        "id": "imageContainer" + sn,
        "class": " courseListIconLMS lmsIcon "
    }).appendTo(rightDiv);
     
    var img = $("<img/>", {
        "id": "lmsImage" + sn,
        "class": (lmsModel.isRegistrable(sn) ? "imageLogoLMS" : "hidden"),
        "src": lmsData.logoImage
    }).appendTo(div);

    $("<div/>", {
        "id": "lmsWaiting" + sn,
        "class": (lmsModel.isRegistrable(sn) ? "hidden" : "icon-cross red") 
    }).appendTo(div);

    var div1 = $("<div/>", {
        "class": "left lineContainer selectItemContainer"
    }).appendTo(li);

    var span = $("<span/>", {
        "id": "lmsDash" + sn,
        "class": (lmsModel.isRegistrable(sn) ? "select icon-dash" : "dashGrey icon-dash")
    }).appendTo(div1);

    var mydiv = $("<div/>", {
        "id": "label" + sn,
        "class": (lmsModel.isRegistrable(sn) ? "text marginForCourseList" : "text marginForCourseList lightgrey"), 
        // check if the lms has failed to register for less than 24 hours 
        // and display light grey font color
        "text": lmsData.logoLabel
    }).appendTo(li);    
};

/**
 * applies a specific gradient color and textshadows to the selected lms
 * in order to be differentiated from the rest lms items
 * @prototype
 * @function selectItemVisuals
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.selectItemVisuals = function (servername) {
    $("#selectLMSitem" + servername).addClass("lightShadow gradientSelected ");
    $("#selectLMSitem" + servername).removeClass("textShadow");
};

/**
 * deselect the gradient color and text shadow of an already selected lms
 * after the attempt of registrating has been finished
 * @prototype
 * @function deselectItemVisuals
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.deselectItemVisuals = function (servername) {
    $("#selectLMSitem" + servername).removeClass("lightShadow gradientSelected ");
    $("#selectLMSitem" + servername).addClass("textShadow");
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
    $("#lmsWaiting" + servername).removeClass("icon-loading loadingRotation");
    $("#lmsWaiting" + servername).addClass("icon-cross red");
    $("#lmsWaiting" + servername).show();
    $("#lmsImage" + servername).hide();
    
    $("#label" + servername).addClass("lightgrey");
    $("#lmsDash" + servername).removeClass("select").addClass("dashGrey");
};

/**when an lms has been temporarily (for one hour) been abanded 
 * from trying to be registered due to an 403 server error.
 * the lms is activated when the one hour has passed.
 * @prototype
 * @function deactivateLMS
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.activateLMS = function (servername) {
    $("#lmsWaiting" + servername).removeClass("icon-cross red");
    $("#lmsWaiting" + servername).show();
    $("#lmsImage" + servername).show();
    
    $("#label" + servername).removeClass("lightgrey");
    $("#lmsDash" + servername).removeClass("dashGrey").addClass("select");
};

/**
 * when the attempt of registering an lms with the server is finished,
 * the loading rotating icon is beeing replaced by the image
 * @prototype
 * @function hideRotation
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.hideRotation = function (servername) {
    $("#lmsWaiting" + servername).removeClass("icon-loading loadingRotation");
    $("#lmsWaiting" + servername).hide();
    $("#lmsImage" + servername).show();
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
    if ($("#lmsImage" + servername).is(":visible")) {
        console.log("removed imagea and added loading icon");
        $("#lmsImage" + servername).hide();
        $("#lmsWaiting" + servername).addClass("icon-loading loadingRotation");
        $("#lmsWaiting" + servername).show();
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
    var lmsModel = self.app.models.lms;

    self.checkLoadingStatus(servername);
 
    if ($("#lmsImage" + servername).is(":visible")) {
        this.previousSelectedLMSname = lmsitem.parent().find("li.gradientSelected").attr("id").substring(13);
        
        //store in the model the previous selected lms and not pass it as an argument in the setActive server
        this.app.models.lms.storePreviousServer(this.previousSelectedLMSname);
        //or previousLMS=lmsModel.getPreviousServer();
        lmsitem.removeClass("gradientSelected").addClass("gradient2 textShadow");
        this.selectItemVisuals(servername);
        setTimeout(function () {
            this.app.models.lms.setActiveServer(servername);
        }, 650);
    }
};

/**checks if an lms is trying to be registered.
 * this is achieved by checking if the loading icon is displayed instead of the image and if has also a dark gradient color.
 * @prototype
 * @function checkLoadingStatus
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.checkLoadingStatus = function (servername) {
    if ($("#lmsWaiting" + servername).hasClass("icon-loading loadingRotation") && $("#selectLMSitem" + servername).hasClass("gradientSelected")) {
        console.log("deactivate li item when trying to connect");
    }
};

/**
 * @prototype
 * @function checkInactiveStatus
 * @param {String} servername, the name of the selected server
 **/
LMSView.prototype.checkInactiveStatus = function (servername) {
    if ($("#lmsWaiting" + servername).hasClass("icon-loading loadingRotation") && $("#selectLMSitem" + servername).hasClass("gradientSelected")) {
        console.log("deactivate li item when trying to connect");
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
    self.checkLoadingStatus(servername);

    var warningLi = $('<li/>', {
        "id": "lmserrormessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_connection_message')
    });

    $("#selectLMSitem" + servername).after(warningLi);
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
    self.checkLoadingStatus(servername);

    var warningLi = $('<li/>', {
        "id": "lmsregistrationmessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_registration_message')
    });

    $("#selectLMSitem" + servername).after(warningLi);
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
        console.log("previouslms is " + previouslms);
        // activate the previsous LMS before changing the visuals
        var previouslms = this.app.models.lms.getPreviousServer();
        self.app.models.lms.setActiveServer(previouslms);
        $("#selectLMSitem" + previouslms).addClass("gradientSelected");
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
    self.checkLoadingStatus(servername);

    var warningLi = $('<li/>', {
        "id": "lmstemporaryregistrationwaitingmessage" + servername,
        "class": "gradientMessages lmsmessage",
        "text": jQuery.i18n.prop('msg_lms_deactivate_message')
    });

    $("#selectLMSitem" + servername).after(warningLi);
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
        self.app.models.lms.storeActiveServer(previousLMS);
        $("#selectLMSitem" + previousLMS).addClass("gradientSelected");
    }, 2800);


    //	after one hour check if the server is active 
    //	if yes activated it 
    //	we need firstly to check if the active view is the lms list view	
    if (self.active) {
        console.log("lms is active, try setTimeOut again");
        setTimeout(function () {
            console.log("reactivation?");
            self.app.models.lms.storeActiveServer(servername);
            self.app.models.lms.register(servername);
        }, 60 * 1000);
    } //if the active view is the lms list view

    function myTimer() {
        console.log("reactivation?");
        self.app.models.lms.register(servername); //instead of executing the whole registration we can just send the ajax request
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

/**
 * handles dynamically any change that should take place on the layout
 * when the orientation changes.
 * - the height of the lms item, as well as the separtor next to it are being calculated dynamically
 ** @prototype
 * @function changeOrientation
 * @param {String, Number, Number}  orientation mode, number, number, the orientation mode
 * which could be either horizontal or vertical, the width and the height of the detected orientation mode.
 */
LMSView.prototype.changeOrientation = function (o, w, h) {
    console.log("change orientation in lms view " + o + " , " + w + ", " + h);
    this.setLMSHeight(o, w, h);
};

/**
 * @prototype
 * @function setLMSHeight
 * @param {String, Number, Number} orientation mode, number, number, the orientation mode
 * which could be either horizontal or vertical, the width and the height of the detected orientation mode
 */
LMSView.prototype.setLMSHeight = function (orientationLayout, w, h) {
    var twidth = w - 65;
    twidth = twidth + "px";
    $("#lmsbody ul li").each(function () {
        $(this).find(".text").css("width", twidth);
        var height = $(this).height() - 18;
        $(this).find(".separatorContainerLMS").css("height", height + "px");
        $(this).find(".radial").css("height", height + "px");
    });
};