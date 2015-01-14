/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** 
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class AboutView
 * View for displaying general information about the app such as:
 * - Copyright
 * - License
 * - URL to project's site on Github, where the code is documented
 *  @constructor
 *  - it sets the tag ID for the settings view
 *  - assigns event handler when taping on close button
 **/
function AboutView() {
    var self = this;
}

AboutView.prototype.prepare = function () {
    this.app.models.configuration.loadFromServer();
};

AboutView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log("[AboutView] tap registered: " + id);
    
    if (id === "aboutclose") {
        if (this.app.getLoginState()) {
            this.app.changeView("settings");
        }
        else {
            this.app.changeView("landing");
        }
    }
};

/**
 * leads to logout confirmation view
 * @prototype
 * @function logout
 **/
AboutView.prototype.logout = function () {
    if (this.app.getLoginState()) {
        this.app.changeView("logout");
    }
    else {
        this.app.changeView("landing");
    }
};
