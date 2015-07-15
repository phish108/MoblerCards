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
        if (self.app.isActiveView(self.tagID) && self.app.getLoginState()) {
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
    $(document).bind("courselistupdate", function (e) {
        if (self.app.isActiveView(self.tagID) && self.app.getLoginState()) {
            console.log("course list update called");
            self.firstLoad = false;
            if (self.active) {
                console.log("course list view is active");
                self.update();
            }
        }
    });
}

/**
 * check login state, if not logged in redirect to landing
 * @protoype
 * @function prepare
 * @param {NONE}
 */
CourseView.prototype.prepare = function () {
    if (!this.app.getLoginState()) {
        this.app.changeView("landing");
    }
    else {
        this.active = true;
        this.firstLoad = false;
    }
};

/**
 * call the functions to set up the course list.
 * FIXME The default course needs to be removed.
 * FIXME If no courses are being loaded, there is no update when there are actually courses!
 * @protoype
 * @function update
 * @param {NONE}
 */
CourseView.prototype.update = function () {
    this.setDefaultCourse();
    this.setCourse();
};

/**
 * @protoype
 * @function cleanup
 * @param {NONE}
 */
CourseView.prototype.cleanup = function () {
    this.active = false;
    this.app.models.course.loadFromServer();
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
CourseView.prototype.tap = function (event) {
    var id = event.target.id;
    console.log(">>>>> [tap registered] ** " + id + " ** <<<<<");

    var courseId = this.app.models.course.getId();
    var course = id.split("_");

    // ensure that you cannot enter an empty course.
    if (course.length > 2 &&
        course[0] === "courselist") {
        if (course.length === 4 &&
            course[3] === "fd") {
            if (this.app.selectCourseItem(course[3])) {
                this.app. changeView("question");
            }
        }
        else if (this.app.models.course.isSynchronized(course[2])) {
            if (this.app.selectCourseItem(course[2])) {
                this.app.changeView("question");
            }
        }
    }

    if (course[0] === "courseimage" &&
        this.app.models.course.isSynchronized(course[2])) {
        this.app.changeView("statistics");
    }
};

CourseView.prototype.tap_coursecross = function (event) {
    if (this.app.getLoginState()) {
        this.app.changeView("settings");
    }
    else {
        this.app.changeView("landing");
    }
};

/*
 * generates all the current courses you are enrolled in.
 * @prototype
 * @function setCourse
 * @param {NONE}
 */
CourseView.prototype.setCourse = function () {
    var self = this;

    var courseModel = self.app.models.course;
    var ctmpl = this.app.templates.getTemplate("courselistbox");
    var courseId, courseTitle;

    if (courseModel.courseList.length > 0) {
        courseModel.reset();
        do {
            courseId = courseModel.getId();
            courseTitle = courseModel.getTitle();

            if (courseTitle !== "false" && courseId !== "false") {
                ctmpl.attach(courseId);
                ctmpl.courselabel.text = courseTitle;

                this.setCourseIcon(ctmpl, courseId);
            }
        } while (courseModel.nextCourse());
    }
    else {
        ctmpl.attach("waiting");
        ctmpl.courselabel.text = self.firstLoad ? "Courses are being loaded" : "No Courses";
    }
};

/*
 * generates the default course.
 * FIXME need to get rid of this function.
 * @prototype
 * @function setDefaultCourse
 * @param {NONE}
 */
CourseView.prototype.setDefaultCourse = function () {
    var self = this;

    var featuredModel = self.app.models.featured;
    var ctmpl = this.app.templates.getTemplate("courselistbox");
    var featuredId = featuredModel.getId();

    ctmpl.attach(featuredId + "_fd");
    ctmpl.courselabel.text = featuredModel.getTitle();

    // this is a temporary solution
    ctmpl.courseimg.addClass("icon-bars");
};

/*
 * generates the icon specific to your course, if your course is not synchronised a loading icon will appear.
 * TODO the model synchronisation is not working properly, remark just the featured model id was disfunctional
 * @prototype
 * @function setCourseIcon
 * @param {TEMPLATE} ctmpl - holds the course template.
 * @param {INTEGER} modelId - reference to the current course.
 */
CourseView.prototype.setCourseIcon = function (ctmpl, modelId) {
    if (this.app.models.course.isSynchronized(modelId)) {
        ctmpl.courseimg.addClass("icon-bars");
    }
    else {
        ctmpl.courseimg.addClass("icon-loading");
        ctmpl.courserotate.addClass("loadingrotation");
    }
};

/**
 * if the course has been synchronized the proper icon will be shown.
 * FIXME the courseId and the elements id have changed.
 * @prototype
 * @function courseIsLoaded
 * @param {INTEGER} courseId - reference to the current course.
 */
CourseView.prototype.courseIsLoaded = function (courseId) {
    console.log("courseIsLoaded: " + courseId);
    console.log("selector length: " + $("#course" + courseId + " .icon-loading").length);
    $("#course" + courseId + " .icon-loading").addClass("icon-bars").removeClass("icon-loading loadingrotation");
};
