/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, todo: true */
/*global $*/

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
 * @author Christian Glahn
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

    function refresh() {
        self.refresh();
    }
    /**
     * refresh if the content broker reports changes ...
     */
    $(document).bind("CONTENT_COURSELIST_UPDATED", refresh);
    $(document).bind("CONTENT_COURSE_UPDATED",     refresh);
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
    var self = this;

    var courseModel = self.model;
    var ctmpl = this.app.templates.getTemplate("courselistbox");

    var cList = courseModel.getCourseList(); // get all courses

    if (cList) {
        cList.forEach(function (course) {
            if (course.title && course.id) {
                ctmpl.attach(course.lmsId + "_" + course.id);
                ctmpl.courselabel.text = course.title;
                // TODO add course status
                ctmpl.courseimg.addClass("icon-bars");
            }
        });
    }
    else {
        ctmpl.attach("waiting");
        // FIXME: Translatable text!
        ctmpl.courselabel.text = self.firstLoad ? "Courses are being loaded" : "No Courses";
    }};

/**
 * @protoype
 * @function cleanup
 * @param {NONE}
 */
CourseView.prototype.cleanup = function () {
    this.active = false;
    // this.app.models.course.loadFromServer();
};

/**
 * Scrolling during move events
 *
 * We need to manage the scrolling ourselves, because Android refuses to scroll
 * if preventDefault has been called during move events.
 */
CourseView.prototype.duringMove = function () {
    this.doScroll();
};

/**
 * Scroll helper - can be used by the widgets if they want to scroll
 * TODO: include doScroll() in CoreView, so we don't have to bother here.
 */
CourseView.prototype.doScroll = function () {
    var dY = jstap().touches(0).delta.y();
    this.container.scrollTop(this.container.scrollTop() - dY);
};


/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
CourseView.prototype.tap = function (event) {
    var id = event.target.id,
        course = id.split("_");
    var cId, lmsId;

    if (course.length === 4) {
        cId     = course.pop();
        lmsId   = course.pop();

        // ensure that we activate the correct template item
        this.template.find(lmsId + "_" + cId);
    }

    if (course[0] === "courselist") {
        console.log(">>>>> [tap registered] ** " + id + " ** <<<<<");

        this.setLoadingIcon();
        this.model.activateCourseById(lmsId, cId);

        this.app.changeView("question", "CONTENT_QUESTION_READY");
        this.models.contentbroker.nextQuestion();
    }

    if (course[0] === "courseimage") {
        this.setLoadingIcon();
        this.model.activateCourseById(lmsId, cId);
        this.app.changeView("statistics", "LRS_CALCULATION_DONE");
        this.app.models.learningrecordstore.calculateStats(this.app.models.contentbroker.getCourseId());
    }
};

CourseView.prototype.setLoadingIcon = function () {
    this.template.courseimg.removeClass("icon-bars");
    this.template.courseimg.addClass("entypo-spinner");
    this.template.courserotate.addClass("loadingrotation");
};

CourseView.prototype.setStatsIcon = function () {
    this.template.courseimg.removeClass("entypo-spinner");
    this.template.courserotrate.removeClass("loadingrotation");
    this.template.courseimg.addClass("icon-bars");
};


CourseView.prototype.tap_courseheader = function () {
    console.log("Tap course header - force synchronisation");
    this.app.synchronizeAll();
};

CourseView.prototype.tap_coursecross = function () {
    this.app.chooseView("settings", "landing");
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
        ctmpl.courseimg.addClass("entypo-spinner");
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
    $("#course" + courseId + " .icon-loading")
        .addClass("icon-bars")
        .removeClass("icon-loading loadingrotation");
};
