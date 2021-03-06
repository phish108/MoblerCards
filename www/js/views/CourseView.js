/**
 * THIS COMMENT MUST NOT REMAIN INTACT
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0  or see LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Copyright: 2012-2014 ETH Zurich, 2015 Mobinaut
 */

/*jslint white: true */
/*jslint vars: true */
/*jslint sloppy: true */
/*jslint devel: true */
/*jslint plusplus: true */
/*jslint browser: true */
/*jslint todo: true */

/*global jQuery, jstap*/

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
     *
     * NOTE This view does not respond to a specific course id whenever
     * NOTE the content broker signals an updated course.
     * NOTE Instead it refreshes completely and checks the internal course
     * NOTE state. This minimizes the logic of this view.
     */
    jQuery(document).bind("CONTENT_COURSELIST_UPDATED", refresh);
    jQuery(document).bind("CONTENT_COURSE_UPDATED",     refresh);
    jQuery(document).bind("LRS_CALCULATION_DONE",       refresh);
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
        this.app.models.learningrecordstore.calculateOverviewStats();
        this.model.clearActiveCourse();
    }

    this.app.resetSourceTrace(1); // strip the source trace.
};

/**
 * call the functions to set up the course list.
 *
 * @protoype
 * @function update
 * @param {NONE}
 */
CourseView.prototype.update = function () {
    var self = this;

    var cstats = this.app.models.learningrecordstore.getOverviewStats();

    var courseModel = self.model;
    var ctmpl = this.app.templates.getTemplate("courselistbox");

    var cList = courseModel.getCourseList(); // get all courses

    if (cList &&
        cList.length) {

        cList.forEach(function (course) {

            if (course.title &&
                course.id &&
                course.nQuestions) {

                var courseid = course.lmsId + "_" + course.id;

                ctmpl.attach(courseid);
                ctmpl.courselabel.text = course.title;

                if (cstats[courseid] &&
                     cstats[courseid].avg !== undefined) {

                    var cls = "blue",
                        avg = cstats[courseid].avg;

                    if (avg >= 0) {

                        cls = "red plain";

                        if (avg >= 0.5) {
                            cls = "yellow";
                        }
                        if (avg >= 0.75) {
                            cls = "green";
                        }
                    }

                    ctmpl.coursedash.addClass(cls);
                }

                // the default button icon is the loading icon, therefore
                // it is necessary to set the stats icon if the course is
                // ready
                if (!course.lmsSyncActive &&
                    !course.activeLoad) {

                    // if we are waiting to move into the question view
                    // and a refresh occurs, we MUST not change the
                    // loading icon.

                    self.setStatsIcon();
                }
            }
        });
    }
    else {
        // TODO: use warning templates in the HTML instead of updating dynamically
        // TODO: remove the warning from the list template and make it a static part of the view
        // NOTE: This requires CoreView changes to allow co-existing dynamic and static components
        // NOTE: Widgets might be an alternative.

        ctmpl.attach("warning");
        ctmpl.courseimage.addClass("hidden");
        ctmpl.courselist.removeClass("touchable");

        ctmpl.courselabel.text = jQuery.i18n.prop("msg_courses_warning");

        if (self.firstLoad) {

            self.firstLoad = false;
        }
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

    // only respond to tap if not loading.
    if (this.template.courseimg.hasClass("icon-bars")) {

        if (course[0] === "courselist" &&
            course[2] !== "warning") {

            this.setLoadingIcon();
            this.model.activateCourseById(lmsId, cId);

            this.app.changeView("question", "CONTENT_QUESTION_READY");
            this.models.contentbroker.nextQuestion();
        }

        if (course[0] === "courseimage") {

            this.setLoadingIcon();
            this.model.activateCourseById(lmsId, cId);
            this.app.changeView("statistics", "LRS_CALCULATION_DONE");

            var courseid = this.model.getCourseUrl();
            this.app.models.learningrecordstore.calculateStats(courseid);
        }
    }
};

CourseView.prototype.setLoadingIcon = function () {

    this.template.courseimg.removeClass("icon-bars");
    this.template.courseimg.addClass("entypo-spinner");
    this.template.courserotate.addClass("loadingrotation");
};

CourseView.prototype.setStatsIcon = function () {

    this.template.courseimg.removeClass("entypo-spinner");
    this.template.courserotate.removeClass("loadingrotation");
    this.template.courseimg.addClass("icon-bars");
};


CourseView.prototype.tap_courseheader = function () {

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

    jQuery("#course" + courseId + " .icon-loading")
        .addClass("icon-bars")
        .removeClass("icon-loading loadingrotation");
};
