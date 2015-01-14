/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** 
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
    var self = this;
}

LogoutView.prototype.tap = function (event) {
    var id = event.target.id;
    var featuredContentId = FEATURED_CONTENT_ID;
    
    if (id === "closeIcon") {
        if (this.app.getLoginState()) {
            this.app.changeView("settings");
        }
        else {
            this.app.changeView("landing");
        }
    }
    else if (id === "logOut") {
        this.logout(featuredContentId);
    }
};

/**
 * click on the logout button logs the user out and
 * shows the login view
 */
LogoutView.prototype.logout = function (featuredContentId) {
    var config = this.app.models.configuration;
    config.logout(featuredContentId);
    this.app.changeView("login", featuredContentId);
};
