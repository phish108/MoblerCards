/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** 
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling 
 */

/**
 * @Class SettingsView
 *  View for displaying the settings which are:
 *  - name (first name and last name) of the user
 *  - email address of user
 *  - selected language
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns various event handlers when taping on various elements of the view
 *    such as the close button, the logout button and the "more info" icon.
 *  - it binds the event that is triggered when the authentication is ready
 **/
function SettingsView() {
    var self = this;
    
    this.tagID = this.app.viewId;

    /**
     * When all authentication data are received and stored in the local storage
     * the authenticationready event is triggered and binded here
     * @event authenticationready
     * @param e, userID, the user id
     */
    $(document).bind("authenticationready", function (e, userID) {
        console.log("authentication ready called " + userID);
        self.loadData();
    });
}

SettingsView.prototype.prepare = function () {
    this.app.models.featured.loadFeaturedCourseFromServer();
    this.app.models.course.loadFromServer();
    this.loadData();
};

SettingsView.prototype.tap = function (event) {
    var id = event.target.id;
    
    if (id === "settingsclose") {
        if (this.app.getLoginState()) {
            this.app.changeView("course");
        } else {
            this.app.changeView("landing");
        }
    }
    else if (id === "settingslogout") {
        if (this.app.getLoginState()) {
            this.app.changeView("logout");
        }
        else {
            this.app.changeView("landing");
        }
    }
    else if (id === "settingsabout") {
        if (this.app.getLoginState()) {
            this.app.changeView("about");
        }
        else {
            this.app.changeView("landing");
        }
    }
};

/**
 * loads the statistics data
 * @prototype
 * @function loadData
 **/
SettingsView.prototype.loadData = function () {
    $("#deactivateLi").hide();
    var self = this;
    var config = this.app.models.configuration;
    var lmsModel = this.app.models.lms;
    var servername = lmsModel.lmsData.activeServer;

    console.log("deactivate flag is " + lmsModel.lmsData.ServerData[servername].deactivateFlag);
    if (lmsModel.lmsData.ServerData[servername].deactivateFlag === true) {
        console.log("deactivate flag is: will show deactive msg");
        $("#deactivateLi").show();
    } else {
        console.log(" deactivate flag is: will NOT show deactivate msg");
    }

    $("#aboutMore").show();
    $("#settingslmsimg").attr("src", self.app.getActiveLogo());
    $("#settingslmslabel").text(self.app.getActiveLabel());
    $("#nameItemSet").text(config.getDisplayName());
    $("#usernameItemSet").text(config.getUserName());
    $("#emailItemSet").text(config.getEmailAddress());
    $("#languageItemSet").text(jQuery.i18n.prop('msg_' + config.getLanguage() + '_title'));
};