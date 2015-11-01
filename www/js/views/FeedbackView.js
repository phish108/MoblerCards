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

/*global $, jQuery, MultipleChoiceWidget, TextSortWidget, NumericQuestionWidget, ClozeWidget, ApologizeWidget, jstap*/

/**
 * @author Christian Glahn
 * @author Isabella Nake
 * @author Evangelia Mitsopoulou
 * @author Dijan Helbling
 */

/**
 * @Class FeedbackView
 * View for displaying the feedback
 * @constructor
 * - it sets the tag ID for the settings view
 * - assigns event handler when taping on various elements of the answer view
 * - bind 2 events, that are related with the loading of statistics and
 *   the calculation of all the statistics metrics. We want to prevent the loading of
 *   statistics view in this case, and we load the feedback body
 * - it resizes the button's height when it detects orientation change
 * @param {String} controller
 */
function FeedbackView() {

    this.tagID = this.app.viewId;

    var bActive = false;

    // init widget delegates
    this.delegate(MultipleChoiceWidget,
                  'assSingleChoice',
                  {
        single: true,
        interactive: bActive,
        template: "listbox"
    });
    this.delegate(MultipleChoiceWidget,
                  'assMultipleChoice',
                  {
        single: false,
        interactive: bActive,
        template: "listbox"
    });
    this.delegate(TextSortWidget,
                  'assOrderingQuestion',
                  {
        interactive: bActive,
        template: "sortlist"
    });
    this.delegate(NumericQuestionWidget,
                  'assNumeric',
                  {
        interactive: bActive,
        template: "inputbox"
    });
    this.delegate(ClozeWidget,
                  'assClozeTest',
                  {
        interactive: bActive,
        template: "inputbox"
    });
    this.delegate(ApologizeWidget,
                  'apologize',
                  {
        interactive: bActive
    });

    this.mapDelegate('assOrderingQuestion',
                     'assOrderingHorizontal');
}

/**
 * Ensure that the correct widget is being used.
 * @prototype
 * @function prepare
 * @param {NONE}
 */
FeedbackView.prototype.prepare = function () {

    var qt = this.model.getQuestionInfo().type;

    $("#feedbacktip").hide();

    switch (qt) {
        case 'assSingleChoice':
        case 'assMultipleChoice':
        case 'assOrderingQuestion':
        case 'assOrderingHorizontal':
        case 'assNumeric':
        case 'assClozeTest':
            break;
        default:
            qt = "apologize";
            break;
    }

    this.useDelegate(qt);
    this.scroll = true;
};

/**
 * Calculates the answer score.
 * Updates the feedback title and body.
 * @prototype
 * @function update
 * @param {NONE}
 **/
FeedbackView.prototype.update = function () {
    this.showFeedbackTitle();
    this.showFeedbackBody();
};

/**
 * Delete any data related to the current question. Move the cursor in questionpool to the next question.
 * @protoype
 * @function cleanup
 * @param {NONE}
 */
FeedbackView.prototype.cleanup = function () {
    $("#feedbackbox").show();
    $("#feedbacktip").hide();

    this.content.html(""); // remove everything from the content

    // hack for scrolling the content box into place.
    this.container.addClass("active");
    this.container.scrollTop(0);
    this.container.removeClass("active");
};

/**
 * Scrolling during move events
 *
 * We need to manage the scrolling ourselves, because Android refuses to scroll
 * if preventDefault has been called during move events.
 */
FeedbackView.prototype.duringMove = function () {
    if (this.scroll) {
        this.doScroll();
    }
};

/**
 * Scroll helper - can be used by the widgets if they want to scroll
 *
 * TODO: include doScroll() in CoreView, so we don't have to bother here.
 */
FeedbackView.prototype.doScroll = function () {
    var dY = jstap().touches(0).delta.y();
    this.container.scrollTop(this.container.scrollTop() - dY);
};

/**
 * Handles action when a tap occurs.
 * @protoype
 * @function tap
 * @param {object} event - contains all the information for the touch interaction.
 */
FeedbackView.prototype.tap_feedbackfooter = function () {
    this.app.changeView("question", "CONTENT_QUESTION_READY");
    this.model.nextQuestion();
};

FeedbackView.prototype.tap_feedbackcontent = FeedbackView.prototype.tap_feedbackfooter;

FeedbackView.prototype.tap_feedbackinfo = function () {
     this.getFeedbackInfo(); // fixme - create a separate view
};
FeedbackView.prototype.tap_feedbackheader = function () {
    this.app.changeView("question");
};
FeedbackView.prototype.tap_feedbackcross = function () {
    // reset all content contexts.
    this.model.deactivateCourse();
    this.app.chooseView("course", "landing");
};

/**
 * click on feedback more button toggles the feedback body and the tip
 * @prototype
 * @function getFeedbackInfo
 * @param {NONE}
 */
FeedbackView.prototype.getFeedbackInfo = function () {
    $("#feedbackbox").toggle();
    $("#feedbacktip").toggle();
};


/**Shows the title area of the feedback view,
 * containing title and corresponding icon
 * @prototype
 * @function showFeedbackTitle
 * @param {NONE}
 */
FeedbackView.prototype.showFeedbackTitle = function () {
    var score                 = this.model.score,
        currentFeedbackTitle  = "Wrong";

    if (score >= 1) {
        // the score should be max 1, but we never know.
        currentFeedbackTitle = "Excellent";
    }
    else if (score > 0) {
        currentFeedbackTitle = "PartiallyCorrect";
    }

    var icon  = jQuery.i18n.prop('ico_' + currentFeedbackTitle + '_icon'),
        title = jQuery.i18n.prop('msg_' + currentFeedbackTitle + 'Results_title');

    $("#feedbacktitle").text(title);
    $("#feedbackdynamicicon").attr('class', icon);
};

/**
 * Calls the appropriate widget to show the feedback body
 * based on the specific question type
 * It is displayed within the main body area of the feedback view
 * @prototype
 * @function showFeedbackBody
 * @param {NONE}
 */

// FIXME - move into separate view
FeedbackView.prototype.showFeedbackBody = function () {
    var feedbackText = this.model.getFeedback();

    if (feedbackText && feedbackText.length > 0) {
        $("#feedbacktip").html(feedbackText);
        $("#feedbackinfo").show();
    }
    else {
        $("#feedbackinfo").hide();
    }
};
