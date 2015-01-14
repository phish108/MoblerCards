/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class LandingView
 * View for displaying the first page that is visible to the user when the app is launched.
 * It contains the courses that are available free to the user, whithout beeing registrated.
 *  @constructor
 *  - assigns various event handlers when taping on the elements of the
 *    landing form such as featured content, exclusive content (and free content soon)
 *  - it binds synchronization events such as the sending of statistics to the server,
 *    the update of courses and questions. It prevents the display of the appropriate
 *    views that are also binded with the aforementioned events by displaying the
 *    login form itself.(FIX ME:. stay here instead of redirecting to the login view)
 *  @param {String} controller
 **/
function LandingView() {
    var self = this;

    /** 
     * It is triggered when an online connection is detected.
     * @event errormessagehide
     * @param: a function that hides the error message from login view
     * **/
    $(document).bind("errormessagehide", function () {
        console.log(" hide error message loaded ");
        self.hideErrorMessage();
    });
    
    //this will be called when a synchronization update takes place
    $(document).bind("featuredContentlistupdate", function (e, featuredCourseId) {
        self.showForm();     
    });
}

LandingView.prototype.prepare = function () {
    console.log("[landingView] prepare");
    this.showForm();
};

LandingView.prototype.showForm = function () {
    var featuredModel = this.app.models.featured;
    
    this.hideErrorMessage();
    
    if (this.app.models.connection.isOffline()) {
        this.showErrorMessage(jQuery.i18n.prop('msg_landing_message'));
    }

    $("#landingfeaturedlabel").text(featuredModel.getTitle());

//    if ($("#selectarrowLanding").hasClass("icon-loading loadingRotation")) {
//        $("#selectarrowLanding").addClass("icon-bars").removeClass("icon-loading loadingRotation");
//    }
};

LandingView.prototype.tap = function (event) {
    var id = event.target.id;
    var featuredContentId = FEATURED_CONTENT_ID;

    console.log("[LandingView] tap registered: " + id);

    if (id === "landingfeaturedimage") {
        this.app.changeView("statistics");
    } else if (id === "landingfeaturedlabel") {
        this.app.selectCourseItem(featuredContentId);
    } else if (id === "landingexclusivelabel") {
        this.app.changeView("login");
    }
};

/**
 * shows the specified error message
 * @prototype
 * @function showErrorMessage
 */
LandingView.prototype.showErrorMessage = function (message) {
    $("#warningmessageLanding").hide();
    $("#errormessageLanding").text(message);
    $("#errormessageLanding").show();
};

/**
 * hides the specified error message
 * @prototype
 * @function hideErrorMessage
 **/
LandingView.prototype.hideErrorMessage = function () {
    $("#errormessageLanding").text("");
    $("#errormessageLanding").hide();
};
