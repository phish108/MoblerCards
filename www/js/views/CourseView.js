/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/** 
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class AnswerView
 * View for displaying the course list
 *
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on the settings icon
 * - bind 2 events, that are related with loading of courses and questions
 *   and they handle the  display of the list of courses as well as
 *   the transformation of the loading icon to statistics icon
 */
function CourseView() {
    var self = this;

    this.tagID = this.app.viewId;
    this.active = false;
    this.firstLoad = true;
    
    var featuredContentId = FEATURED_CONTENT_ID;

    /**
     * In some rare cases an automated transition from login view to course list view takes place.
     * This might have happened because a synchronization of questions ( pending questions exist in the local storage) took place.
     * So when the courseListView or the CourseModel bind/listen to that event (because it was triggered when pending questions were loaded), we should check
     * IF WE ARE LOGGED IN in order to perform the callback function
     * @event questionpoolready
     * @param a callback function that transforms the loading icon next to a course item, to the statistics icon. this means
     *        that the specific course including all its questions has been fully loaded
     */
    $(document).bind("questionpoolready", function (e, courseID) {
        if ((self.app.isActiveView(self.tagID)) && 
            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
            console.log("view questionPool ready called " + courseID);
            self.courseIsLoaded(courseID);
        }
    });

    /**
     * In some rare cases an automated transition from login view to course list view takes place.
     * This might have happened because a synchronization of courses pending questions took place and when the "courseListUpdate" event was triggered
     * then the the courses list view (which binds/listens to this event) was displayed by the execution of the update function below.
     * So we should check IF WE ARE LOGGED IN in order to perform the call back function
     * @event courselistupdate
     * @param a callback function that loads the body of the courses list view, which is the list of courses
     */
//
//    $(document).bind("courselistupdate", function (e) {
//        if ((self.app.isActiveView(self.tagID)) && 
//            (self.app.models.configuration.configuration.loginState === "loggedIn")) {
//            console.log("course list update called");
//            self.firstLoad = false;
//            if (self.active) {
//                console.log("course list view is active");
//                self.generateCourses();
//            }
//        }
//    });

    function setOrientation() {
        self.setIconSize();
    }

    //when orientation changes, set the new width and height
    //resize event should be caught, too, because not all devices
    //send an orientationchange even
    window.addEventListener("orientationchange", setOrientation, false);
    window.addEventListener("resize", setOrientation, false);
}

CourseView.prototype.prepare = function () {
    console.log("open course list view");
    this.active = true;
    this.firstLoad = false;
    this.setIconSize();
};

CourseView.prototype.update = function () {
//    this.template.attach("courselistbox");
    this.setDefaultCourse();
    this.setCourse();
};

/**
 * empties the course list
 * @prototype
 * @function close
 **/
CourseView.prototype.cleanup = function () {
    console.log("clean course list view");
    this.active = false;
    this.app.models.course.loadFromServer();
    $("#coursesList").empty();
};

CourseView.prototype.tap = function (event) {
    var id = event.target.id;
    var featuredContentId = FEATURED_CONTENT_ID;
    var courseID = this.app.models.course.getId();
    
    console.log("[CourseView] tap registered " + id);
    
    if (id === "coursesListSetIcon") {
        if (this.app.getLoginState()) {
            this.app.changeView("settings");
        }
        else {
            this.app.changeView("landing");
        }
    }
    else if (id === "courseListIcon") {
        this.clickFeaturedStatisticsIcon(featuredContentId);
    }
    else if (id === "courseTitle" + courseID) {
        this.clickCourseItem($(this).parent().attr('id').substring(6));
    }
    else if (id === "courseListIcon" + courseID) {
        this.clickStatisticsIcon($(this).parent().attr('id').substring(6));
    }
};

/**
 * click on course item loads the appropriate question pool
 * @prototype
 * @function clickCourseItem
 **/
CourseView.prototype.clickCourseItem = function (course_id) {
    if (this.app.models.course.isSynchronized(course_id)) {
        this.app.selectCourseItem(course_id);
    }
};

/**
 * click on statistic icon calculates the appropriate statistics and shows them
 * @prototype
 * @function clickStatisticsIcon
 */
CourseView.prototype.clickStatisticsIcon = function (courseID) {
    console.log("statistics button clicked");

    if ($("#courseListIcon" + courseID).hasClass("icon-bars")) {
        $("#courseListIcon" + courseID).addClass("icon-loading loadingRotation").removeClass("icon-bars");

        //icon-loading, icon-bars old name
        //all calculations are done based on the course id and are triggered
        //within setCurrentCourseId
        this.app.changeView("statistics", courseID);
    }
};

CourseView.prototype.setCourse = function () {
    var self = this;
    
    var courseModel = self.app.models.course;
    var ctmpl = this.app.templates.getTemplate("courselistbox");
    var courseId;
    
    if (courseModel.courseList.length === 0) {
        ctmpl.attach("waiting");
        ctmpl.courselistelement.text = self.firstLoad ? "Courses are being loaded" : "No Courses";
    } 
    else {
        do {
//            was used for the icons
            courseId = courseModel.getId();
          
            ctmpl.attach(courseId);
            ctmpl.coursecontentbox.text = courseModel.getTitle();
            ctmpl.courselisticon.addClass("icon-bars");
        } while (courseModel.nextCourse());
        self.setIconSize();
    }
};

CourseView.prototype.setDefaultCourse = function () {
    var self = this;
    
    var featuredModel = self.app.models.featured;
    var ctmpl = this.app.templates.getTemplate("courselistbox");
    var featuredId = featuredModel.getId();
    
    ctmpl.attach(featuredId);
    ctmpl.coursecontentbox.text = featuredModel.getTitle();
    ctmpl.courselisticon.addClass("icon-bars");
};

/**
 * changes the loading icon to the statistics icon for the specified course id
 * @prototype
 * @function courseIsLoaded
 */
CourseView.prototype.courseIsLoaded = function (courseId) {
    console.log("courseIsLoaded: " + courseId);
    console.log("selector length: " + $("#course" + courseId + " .icon-loading").length);
    $("#course" + courseId + " .icon-loading").addClass("icon-bars").removeClass("icon-loading loadingRotation");
};

/**
 * sets the height property of the course list icon
 * @prototype
 * @function setIconSize
 */
CourseView.prototype.setIconSize = function () {
    $("#coursesList li").each(function () {
        var height = $(this).height();
        $(this).find(".courseListIcon").height(height);
        $(this).find(".courseListIcon").css("line-height", height + "px");
    });
};

/**
 * click on featured content which is on top of
 * courses list view, right before the exclusive content
 * loads the questions of the featured course question pool
 * @prototype
 * @function clickFeaturedItem
 */
CourseView.prototype.clickFeaturedItem = function (featuredContentId) {

    //if (this.app.models['featured'].isSynchronized(featuredContentId)) {
    //	NEW
    //	var featuredModel = self.app.models['featured'];
    //	var feauturedId= featuredModel.getId();
    this.app.selectCourseItem(featuredContentId);
    //}end of isSynchronized
};

/**
 * click on statistic icon calculates the appropriate statistics and shows them
 * while we are registered in courses list view
 * @prototype
 * @function clickFeaturedStatisticsIcon
 */
CourseView.prototype.clickFeaturedStatisticsIcon = function (featuredContentId) {
    console.log("statistics button in landing view clicked");

    if ($("#courseListIcon" + featuredContentId).hasClass("icon-bars")) {
        console.log("select arrow landing has icon bars");
        $("#courseListIcon" + featuredContentId).addClass("icon-loading loadingRotation").removeClass("icon-bars");

        //icon-loading, icon-bars old name
        //all calculations are done based on the course id and are triggered
        //within setCurrentCourseId
        this.app.changeView("statistics", featuredContentId);
    }
};
