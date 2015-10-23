/*jslint white:true*/      // we have a different indentation style
/*jslint vars: true*/      // don't complain about multiple variable declarations.
/*jslint sloppy: true*/    // dont't expect use strict.
/*jslint plusplus: true*/  // allow the ++ operator
/*jslint browser: true */  // ignore all browser globals
/*jslint unparam: true*/   // allow unused parameters in function signatures

/**
 * Remove the following lines for production
 */
/*jslint devel: true*/     // allow console log
/*jslint todo: true*/      // allow todo comments/*jslint white:true*/

/*jslint regexp: true*/    // allow [^\[] for cloze question preprocessing

/*global $, jQuery, jstap*/

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
 */

/**
 * Display the list of question pools.
 *
 * Provide traffic light stats to inform the user about the current state of the
 * question pool.
 */
function QuestionPoolView() {
    return this;
}

QuestionPoolView.prototype.tap_questionpoolscross = function () {
    // return to statistics view
    this.app.changeView("statistics", "LRS_CALCULATION_DONE");

    var courseid = this.model.getCourseUrl();
    this.app.models.learningrecordstore.calculateStats(courseid);
};

QuestionPoolView.prototype.tap = function (event) {
    var id = event.target.id,
        qp = id.split("_"),
        qpid = qp.pop();

    console.log("tap on question pool " + qpid);
    // TODO #143 select question pools to focus learning
};

QuestionPoolView.prototype.duringMove = function () {
    if (this.scroll) {
        this.doScroll();
    }
};

/**
 * Scroll helper - can be used by the widgets if they want to scroll
 *
 * TODO: include doScroll() in CoreView, so we don't have to bother here.
 */
QuestionPoolView.prototype.doScroll = function () {
    var dY = jstap().touches(0).delta.y();
    this.container.scrollTop(this.container.scrollTop() - dY);
};

QuestionPoolView.prototype.update = function () {
    var self = this;

    function renderQuestionPool(qp) {

        self.template.attach(qp.id);
        self.template.questionpoolname.text = qp.title;

        // TODO #145 question pool level traffic light stats
    }

    var tQP = self.model.getQuestionPools(1);
    tQP.forEach(renderQuestionPool);

};
