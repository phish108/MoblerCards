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


/** @author Isabella Nake
 * @author Evangelia Mitsopoulou
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

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
 * @param {String} controller
 */
function CourseView(controller) {

    var self = this;
    this.controller = controller;

    self.tagID = 'coursesListView';
    self.controller = controller;
    self.active = false;
    self.firstLoad = true;
    var featuredContent_id = FEATURED_CONTENT_ID;

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
        if ((self.tagID === self.controller.activeView.tagID) && (self.controller.models.configuration.configuration.loginState === "loggedIn")) {
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
        if ((self.tagID === self.controller.viewId) && 
            (self.controller.models['authentication'].configuration.loginState === "loggedIn")) {
            console.log("course list update called");
            self.firstLoad = false;
            if (self.active) {
                console.log("course list view is active");
                self.update();
            }
        }
    });

    function setOrientation() {
        self.setIconSize();
    }

    //when orientation changes, set the new width and height
    //resize event should be caught, too, because not all devices
    //send an orientationchange even
    window.addEventListener("orientationchange", setOrientation, false);
    window.addEventListener("resize", setOrientation, false);
}

/**
 * updates the course list and shows it
 * @prototype
 * @function open
 **/
CourseView.prototype.prepare = function (featuredContent_id) {
    console.log("open course list view");
    this.active = true;
    this.update(featuredContent_id);
    this.firstLoad = false;
    this.setIconSize();
};

/**
 * empties the course list
 * @prototype
 * @function close
 **/
CoursesListView.prototype.cleanup = function () {
    console.log("clean course list view");
    this.active = false;
    this.controller.models.course.loadFromServer();
    $("#coursesList").empty();
};

CourseView.prototype.tap = function (event) {
    var id = event.target.id;
    var featuredContent_id = FEATURED_CONTENT_ID;
    var courseID = this.controller.models.course.getId();
    
    if (id === "coursesListSetIcon") {
        this.controller.changeView("settings");
    }
    else if (id === "courseListIcon") {
        this.clickFeaturedStatisticsIcon(featuredContent_id);
    }
    else if (id === "courseTitle" + courseID) {
        event.stopPropagation();
        this.clickCourseItem($(this).parent().attr('id').substring(6));
    }
    else if (id === "courseListIcon" + courseID) {
        event.stopPropagation();
        this.clickStatisticsIcon($(this).parent().attr('id').substring(6));
    }
};

/**
 * pinch leads to settings view
 * @prototype
 * @function handlePinch
 **/
CourseView.prototype.pinch = function (event) {
    this.controller.changeView("settings"):
};

/**
 * click on course item loads the appropriate question pool
 * @prototype
 * @function clickCourseItem
 **/
CoursesListView.prototype.clickCourseItem = function (course_id) {
    if (this.controller.models.course.isSynchronized(course_id)) {
        selectCourseItem(course_id);
    }
};

/**
 * click on statistic icon calculates the appropriate statistics and shows them
 * @prototype
 * @function clickStatisticsIcon
 */
CoursesListView.prototype.clickStatisticsIcon = function (courseID) {
    console.log("statistics button clicked");

    if ($("#courseListIcon" + courseID).hasClass("icon-bars")) {
        $("#courseListIcon" + courseID).addClass("icon-loading loadingRotation").removeClass("icon-bars");

        //icon-loading, icon-bars old name
        //all calculations are done based on the course id and are triggered
        //within setCurrentCourseId
        this.controller.changeView("statistics", courseID);
    }
};


/**
 * updates the course list
 * @prototype
 * @function update
 */
CoursesListView.prototype.update = function (featuredContent_id) {
    var featuredContent_id = FEATURED_CONTENT_ID;
    var self = this;

    var courseModel = self.controller.models.course;
    var statisticsModel = self.controller.models.statistics;
    var featuredModel = self.controller.models.featured;
    courseModel.reset();
    $("#coursesList").empty();

    console.log("First course id: " + courseModel.getId());

    //featured content

    var liF = $("<li/>", {
        "id": "featured" + featuredContent_id,
        "class": " courseLiContainer gradient2"
    }).appendTo("#coursesList");

    var dashDivF = $("<div/>", {
        "class": "dashContainer lineContainer selectItemContainer"
    }).appendTo(liF);

    var spanDashF = $("<span/>", {
        "class": "dashGrey icon-dash"
    }).appendTo(dashDivF);

    var mydivF = $("<div/>", {
        "class": "text textShadow marginForCourseList labelContainer",
        text: featuredModel.getTitle()
    }).appendTo(liF);

    var sBF = $("<div/>", {
        "class": "separatorBlock"
    }).appendTo(liF);

    var separatorF = $("<div/>", {
        "id": "separator" + featuredContent_id,
        "class": "radialCourses lineContainer separatorContainerCourses"
    }).appendTo(sBF);

    var divclassF = "lineContainer selectItemContainer";
    divclassF += (featuredModel.isSynchronized(featuredContent_id) ? " icon-bars" : "icon-loading loadingRotation");

    var rightdivF = $("<div/>", {
        "id": "courseListIcon" + featuredContent_id,
        "class": "gridContainer lineContainer selectItemContainer white icon-bars"
    }).appendTo(liF);

    //	divF = $("<div/>", {
    //		"class" : " courseListIcon lineContainerCourses "
    //	}).appendTo(rightdivF);
    //	
    //	spanF = $("<div/>", {
    //		"id":"courseListIcon"+ featuredContent_id,
    //		"class" : "icon-bars"
    //	}).appendTo(divF);
    //	

    // ?? FIXME ?? which ID are we talking about here??
    jester(mydivF[0]).tap(function (e) {
        self.clickFeaturedItem(featuredContent_id);
    });

    if (courseModel.courseList.length == 0) {
        var li = $("<li/>", {}).appendTo("#coursesList");

        $("<div/>", {
            "class": "text textShadow",
            text: (self.firstLoad ? "Courses are being loaded" : "No Courses"),
        }).appendTo(li);

    } else {
        do {
            var courseID = courseModel.getId();

            var li = $("<li/>", {
                "class": "courseLiContainer gradient2",
                "id": "course" + courseID
            }).appendTo("#coursesList");

            //			span = $("<div/>", {
            //				"id":"courseListIcon"+ courseID,
            //				"class" : (courseModel.isSynchronized(courseID) ? " icon-bars" : "icon-loading loadingRotation")
            //			}).appendTo(div);
            //			

            //			var leftDiv = $("<div/>", {
            //				"class" : "labelContainer"
            //			}).appendTo(li);
            //			

            var dashDiv = $("<div/>", {
                "class": "dashContainer lineContainer selectItemContainer"
            }).appendTo(li);

            var spanDash = $("<span/>", {
                "class": "dashGrey icon-dash"
            }).appendTo(dashDiv);

            var mydiv = $("<div/>", {
                "id": "courseTitle" + courseID,
                "class": "text textShadow marginForCourseList labelContainer",
                text: courseModel.getTitle()
            }).appendTo(li);

            var sB = $("<div/>", {
                "class": "separatorBlock"
            }).appendTo(li);
            var separator = $("<div/>", {
                "id": "separator" + courseID,
                "class": "radialCourses lineContainer separatorContainerCourses"
            }).appendTo(sB);

            var divclass = "lineContainer selectItemContainer white ";
            divclass += (courseModel.isSynchronized(courseID) ? " icon-bars" : "icon-loading loadingRotation");
            var rightDiv = $("<div/>", {
                "class": "gridContainer " + divclass,
                "id": "courseListIcon" + courseID
            }).appendTo(li);

            //			var div = $("<span/>", {
            //				"class" : divclass
            //			}).appendTo(rightDiv);
        } while (courseModel.nextCourse());
        self.setIconSize();
    }

    var lastli = $("<li/>", {}).appendTo("#coursesList");

    var shadoweddiv = $("<div/>", {
        "id": "shadowedLi",
        "class": "gradient1"
    }).appendTo(lastli);

};

/**
 * changes the loading icon to the statistics icon for the specified course id
 * @prototype
 * @function courseIsLoaded
 */
CoursesListView.prototype.courseIsLoaded = function (courseId) {
    console.log("courseIsLoaded: " + courseId);
    console.log("selector length: " + $("#course" + courseId + " .icon-loading").length);
    $("#course" + courseId + " .icon-loading").addClass("icon-bars").removeClass("icon-loading loadingRotation");
};

/**
 * sets the height property of the course list icon
 * @prototype
 * @function setIconSize
 */
CoursesListView.prototype.setIconSize = function () {
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
CoursesListView.prototype.clickFeaturedItem = function (featuredContent_id) {

    //if (this.controller.models['featured'].isSynchronized(featuredContent_id)) {
    //	NEW
    //	var featuredModel = self.controller.models['featured'];
    //	var feauturedId= featuredModel.getId();
    selectCourseItem(featuredContent_id);
    //}end of isSynchronized
};

/**
 * click on statistic icon calculates the appropriate statistics and shows them
 * while we are registered in courses list view
 * @prototype
 * @function clickFeaturedStatisticsIcon
 */
CoursesListView.prototype.clickFeaturedStatisticsIcon = function (featuredContent_id) {
    console.log("statistics button in landing view clicked");

    if ($("#courseListIcon" + featuredContent_id).hasClass("icon-bars")) {
        console.log("select arrow landing has icon bars");
        $("#courseListIcon" + featuredContent_id).addClass("icon-loading loadingRotation").removeClass("icon-bars");

        //icon-loading, icon-bars old name
        //all calculations are done based on the course id and are triggered
        //within setCurrentCourseId
        this.controller.changeView("statistics", featuredContent_id);
    }
};
