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
 * @author Christian Glahn
 **/

/**
 *A global property/variable that is used during the creation of a new table in the database.
 *It is the version number of the database.
 *
 *@property DB_VERSION
 *@default 1
 *
 **/

var DB_VERSION = 1;

/**
 * @class Answer Model,
 * The answer model holds/handles the answers of a question of every type
 * @constructor
 * It initializes basic properties such as:
 *  - the answer list of a question,
 *  - the answer score of a question,
 *  - the answer score list of all the answered questions,
 *  - the id of the current course, the id of the current question
 *  - the start time point that the user reached a question
 * It opens the local html5-type database. If it doesn't exist yet it is initiated in the constructor.
 */
function AnswerModel(controller) {
    this.answerList = [];
    this.answerScoreList = [];
    this.answerScore = -1;

    this.controller = controller;
    this.currentCourseId = -1;
    this.currentQuestionId = -1;
    this.start = -1;
    // var featuredContentId = FEATURED_CONTENT_ID;
    this.db = window.openDatabase('ISNLCDB', '1.0', 'ISN Learning Cards Database',
        100000);
    if (!localStorage.getItem("db_version")) {
        this.initDB();
    }
}

/**
 * Sets the answer list
 * @prototype
 * @function setAnswers
 * @param {String} tickedAnswers, a string array containing the selected answers by the user
 **/
AnswerModel.prototype.setAnswers = function (tickedAnswers) {
    this.answerList = tickedAnswers;
};

/**
 * Gets the selected answers of the user
 * @prototype
 * @function getAnswers
 * @return {String} answerList, a string array containing the selected answers by the user
 **/
AnswerModel.prototype.getAnswers = function () {
    return this.answerList;
};

/**
 * @prototype
 * @function getScoreList
 * @return {String} answerScoreList, a string array containing the score list
 **/
AnswerModel.prototype.getScoreList = function () {
    return this.answerScoreList;
};

/**
 * Deletes the answer data of the user by emptying the answer list, the answer score list and by reseting the answer score to -1.
 * @prototype
 * @function deleteData
 **/
AnswerModel.prototype.deleteData = function () {
    this.answerList = [];
    this.answerScoreList = [];
    this.answerScore = -1;
};

/**
 * @prototype
 * @function getAnswerResults
 * @return {String}, "Excellent" if answer score is 1, "Wrong" if answer score is 0, otherwise "PariallyCorrect"
 **/
AnswerModel.prototype.getAnswerResults = function () {
    if (this.answerScore === 1) {
        console.log("Excellent");
        return "Excellent";
    }

    if (this.answerScore === 0) {
        console.log("Wrong");
        return "Wrong";
    }

    console.log("PartiallyCorrect");
    return "PartiallyCorrect";

};



/**
 * Calculates the score for single choice questions. It can be either 1 or 0.
 * @prototype
 * @function calculateSingleChoiceScore
 **/
AnswerModel.prototype.calculateSingleChoiceScore = function () {
    var clickedAnswerIndex = this.answerList[0];
    if (this.controller.models.questionpool.getScore(clickedAnswerIndex) > 0) {
        console.log("the score is 1");
        this.answerScore = 1;
    }
    else {
        this.answerScore = 0;
    }
};


/**
 * Calculates the score for multiple choice questions, which can be 0, 0.5 or 1.
 * The score is calculated based on 3 helping variables:
 * -number of correct answers
 * -number of ticked correct answers
 * -number of ticked wrong answers
 * The exact value of the score is assigned based on specific agreed conditions.
 * @prototype
 * @function calculateMultipleChoiceScore
 **/
AnswerModel.prototype.calculateMultipleChoiceScore = function () {
    var i,
        questionpool = this.controller.models.questionpool;

    var numberOfAnswers = questionpool.getAnswer().length;

    var correctAnswers = 0;
    var corr_ticked = 0;
    var wrong_ticked = 0;

    for (i = 0; i < numberOfAnswers; i++) {
        console.log("answer " + i + ": " + questionpool.getScore(i));
        //if the current answer item is correct, then its score value in the database is set to 1 (or at least greater than 1).
        if (questionpool.getScore(i) > 0) {
            correctAnswers++;
            //check if the user has clicked on the correct answer item
            if (this.answerList.indexOf(i) !== -1) {
                corr_ticked++;
                console.log("corr_ticked");
            }
        }
        else {
            //the user has clicked on the wrong answer item
            if (this.answerList.indexOf(i) === -1) {
                wrong_ticked++;
                console.log("wrong_ticked");
            }
        }
    }

    console.log("Number of answers: " + numberOfAnswers);
    console.log("Correct ticked: " + corr_ticked);
    console.log("Wrong ticked: " + wrong_ticked);

    if ((corr_ticked + wrong_ticked) === numberOfAnswers || corr_ticked === 0) {
        // if all answers are ticked or no correct answer is ticked, we assign 0
        // to the answer score
        this.answerScore = 0;
    } else if ((corr_ticked > 0 && corr_ticked < correctAnswers) || (corr_ticked === correctAnswers && wrong_ticked > 0)) {
        // if some but not all correct answers are ticked or if all correct
        // answers are ticked but also some wrong one,
        // we assign 0.5 to the answer score
        this.answerScore = 0.5;
    } else if (corr_ticked === correctAnswers && wrong_ticked === 0) {
        // if all correct answers and no wrong ones, we assign 1 to the answer
        // score
        this.answerScore = 1;
    }
};

/**
 * Calculate the score for text sorting questions (horizontal and vertical ones) by creating an array
 * that contains for each answer item an assigned score.
 * It uses the following helping variables:
 * - scores: a helping array that contains the scores of each item in the answer list
 * - followingCorrAnswers: the number of correct answers in a sequence
 * - currAnswer: a variable that holds the current answered item
 * - i: an index that traverses through the answer list
 * - j: an index that traverses through a correct sequence of answered items
 * - answerList[followingIndex++]: the next item in the answer list or in other words the next item that we answered
 * - ++currAnswer: the index of the next item after the current Answer item in the answer view.
 * @prototype
 * @function calculateTextSortScore
 **/
AnswerModel.prototype.calculateTextSortScore = function () {
    var i,j, currAnswer, followingIndex, followingCorrAnswers, itemScore,
        scores = [];

    this.answerScore = 0;

    for (i = 0; i < this.answerList.length; i++) {

        // 1. Check for correct sequences
        //The currAnswer is the index of the answered item in the answer view
        currAnswer = this.answerList[i];
        followingIndex = i + 1;
        followingCorrAnswers = 0;
        // Count the number of items in sequence and stop if we loose the sequence.
        // The sequence is detected when the next item in the answer list is the same with the next item after the currAnswer.
        while (followingIndex < this.answerList.length && this.answerList[followingIndex++] === String(++currAnswer)) {
            followingCorrAnswers++;
        }

        // 2. calculate the score for all elements in a sequence
        itemScore = 0;
        // if the item is in the correct position we assign a low score
        console.log("the answerlist at position " + i + " has value: " + this.answerList[i]);
        if (this.answerList[i] === i) {
            itemScore += 0.5;
        }
        // if the item is in a sequence, we assign a higher score
        if (followingCorrAnswers + 1 > this.answerList.length / 2) {
            itemScore += 1;
            this.answerScore = 0.5;
        }
        //if all the answered items are in the correct sequence we assign the highest score
        if (followingCorrAnswers + 1 === this.answerList.length) {
            this.answerScore = 1;
        }

        // 3. assign the score for all items in the sequence
        for (j = i; j <= i + followingCorrAnswers; j++) {
            scores[this.answerList[j]] = itemScore;
        }

        // 4. skip all items that we have handled already
        i = i + followingCorrAnswers;
    }
//  an array that contains for each item in the answer list an assigned score
    this.answerScoreList = scores;
    console.log("The final answerscorelist: " + this.answerScoreList);
};


/**
 * Calculates the answer score for numeric questions
 * It can be either 1 or 0.
 * @prototype
 * @function calculateNumericScore
 **/
AnswerModel.prototype.calculateNumericScore = function () {
    var questionpoolModel = this.controller.models.questionpool;

    if (questionpoolModel.getAnswer()[0] === this.getAnswers()) {
        // if the answers provided in the question pool are the same with the
        // ones the user selected
        this.answerScore = 1;
    } else {
        this.answerScore = 0;
    }
};


/**
 * Calculates the answer score for cloze question type
 * It can be:
 * - 0 (wrong): if none of the gaps are filled in or filled in correctly
 * - 0.5 (partially correct): if at least one of the gaps is filled in correctly
 * - 1 (fully correct): if all gaps are filled in with the correct values
 * The function compares the values that the user typed and with actual correct ones.
 * It uses
 * @prototype
 * @function calculateClozeQuestionScore
 * @return {number} answerScore, it can be either 0, 0.5 or 1.
 **/
AnswerModel.prototype.calculateClozeQuestionScore = function () {
    var answerModel = this; //FIXME
    var filledAnswers = answerModel.getAnswers();
    var gaps = [], // a helper array that will store the result of the comparison between
        i;

    // the actual and the filled answers,
    // 1 is assigned as a value  if the answer was filled correctly for the specific (index i) gap and 0 if not
    var actualCorrectGaps;
    for (i = 0; i < filledAnswers.length; i++) {
        // FIXME getCorrectGaps must be member of QuestionPoolModel
        actualCorrectGaps = getCorrectGaps(i); // an array containing the correct answers for the gap with the index i in the
        // object that is returned from the server
        console.log("actual Correct Gaps for gap " + i + " is " + actualCorrectGaps);
        if (actualCorrectGaps.indexOf(filledAnswers[i]) !== -1) {
            gaps[i] = 1;
        } else {
            gaps[i] = 0;
        }
    }

    this.answerScore = this.calculateAnswerScoreValue();

    // TODO: where does this function belong to!?
    function calculateAnswerScoreValue() {
        console.log("calculates answre score value in cloze questions");
        var sumValue = 0, // a helper variable that calculates the sum of the values of the gaps array
            gapindex;

        for (gapindex = 0; gapindex < gaps.length; gapindex++) {
            sumValue = sumValue + gaps[gapindex];
        }
        console.log("sumvalue is " + sumValue);
        if (sumValue === 0) {
            this.answerScore = 0;
        } else if (sumValue === gaps.length) { // if all gaps are filled in correctly, then all elements of the gaps array have value 1
            // so the sum of these values is equal to the length of the array
            this.answerScore = 1;
        } else {
            this.answerScore = 0.5;
        }
        console.log("answer score value within function is " + this.answerScore);
        return this.answerScore;
    }
};

/**
 * Sets the course id
 * @prototype
 * @function setCurrentCourseId
 **/
AnswerModel.prototype.setCurrentCourseId = function (courseId) {
    this.currentCourseId = courseId;
    console.log("currentCourseId " + this.currentCourseId);
};

/**
 * Starts the timer for the specified question. The timer begins when the user start reading the question.
 * @prototype
 * @function startTimer
 **/
AnswerModel.prototype.startTimer = function () {
    this.start = (new Date()).getTime();
    console.log("this.start in startTimer is " + this.start);
    console.log("currentQuestionId: " + this.currentQuestionId);
};

/**
 * Checks if the the timer for the specified question has started or not.
 * @prototype
 * @function hasStarted
 * @return {Boolean}, true if timer has started, otherwise false
 **/
AnswerModel.prototype.hasStarted = function () {
    return this.start !== -1;
};

/**
 * Resets the timer
 * @prototype
 * @function resetTimer
 **/
AnswerModel.prototype.resetTimer = function () {
    this.start = -1;
};

/**
 * Creates a statistics table in the database if it doesn't exist yet
 * @prototype
 * @function initDB
 **/
AnswerModel.prototype.initDB = function () {
    this.db.transaction(function (transaction) {
        transaction
            .executeSql(
                'CREATE TABLE IF NOT EXISTS statistics (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, course_id TEXT, question_id TEXT, day INTEGER, score NUMERIC, duration INTEGER);', []);
        /**
         * time
         * activty_tracking JSON
         * timestamp
         * type
         * synchronised bool
         * lms
         * course
         * qp
         *
         */
    });
    // add in the local storage the created table
    localStorage.setItem("db_version", DB_VERSION);
};

/**
 * Inserts the score into the local database.
 * @prototype
 * @function storeScoreInDB
 ***/
AnswerModel.prototype.storeScoreInDB = function () {
    console.log("enter score in DB");
    var self = this;
    var day = new Date();
    var duration = (new Date()).getTime() - this.start;
    console.log("duration is " + duration);
    // FIXME this should be handled in the statistics model.
    this.db
        .transaction(function (transaction) {
            transaction
                .executeSql(
                    'INSERT INTO statistics (course_id, question_id, day, score, duration) VALUES (?, ?, ?, ?, ?)', [self.currentCourseId, self.currentQuestionId,
      day.getTime(), self.answerScore, duration],
                    function () {
                        console.log("successfully inserted SCORE IN db for course " + self.currentCourseId);

                        /**It is triggered after the successful insertion of the score in the local database
                         * @event checkachievements
                         * @param:a callback function that sets the id for the current course
                         */
                        // Now our statistics are no longer correct if we have calculated them
                        if (self.controller.models.statistics.currentCourseId === self.currentCourseId) {
                            // force that the course statistics have to be recalculated the next time the user requests the course statistics.
                            self.controller.models.statistics.currentCourseId = -1;
                        }
                        $(document).trigger("checkachievements", self.currentCourseId);
                    }, function (tx, e) {
                        console.log("error! NOT inserted: " + e.message);
                    });
        });
    // resets the time in order to start the time recording for the next question
    this.resetTimer();
};


/**
 *Deletes everything from the statistics table of the local database
 * @prototype
 * @function deleteDB
 **/
AnswerModel.prototype.deleteDB = function () {
    //console.log("featured content id in deleteDB is "+featuredContentId);
    var self = this;
    //localStorage.removeItem("db_version"); // this line is from before we had featured content.
    var courseList = self.controller.models.course.getCourseList();
    //var courseList = this.controller.models["course"].courseList;
    console.log("course list for the specific user is " + JSON.stringify(courseList));
    this.db.transaction(function (tx) {
        //DELETE FROM statistics WHERE course_id IN (CID LIST FOR THE USER)
        var qm = [];
        //courseList.each(function() {qm.push("?");}); // generate the exact number of parameters for the IN clause
        $.each(courseList, function () {
            qm.push("?");
        });
        tx.executeSql('DELETE FROM statistics where course_id IN (' + qm.join(",") + ')', courseList, function () {
            // tx.executeSql("DELETE FROM statistics where course_id != ?", [featuredContentId], function() {
            console.log("statistics table cleared");
        }, function () {
            console.log("error: statistics table not cleared");
        });
    });
    //localStorage.removeItem("courses");
};

/**
 *Calculate the score depending on the specific question type
 * @prototype
 * @function calculateScore
 **/
AnswerModel.prototype.calculateScore = function () {
    var questionpoolModel = this.controller.models.questionpool;
    var questionType = questionpoolModel.getQuestionType();
    switch (questionType) {
    case 'assSingleChoice':
        this.calculateSingleChoiceScore();
        break;
    case 'assMultipleChoice':
        this.calculateMultipleChoiceScore();
        break;
    case 'assOrderingQuestion':
        this.calculateTextSortScore();
        break;
    case 'assOrderingHorizontal':
        this.calculateTextSortScore();
        break;
    case 'assNumeric':
        this.calculateNumericScore();
        break;
    case 'assClozeTest':
        this.calculateClozeQuestionScore();
        break;
    default:
        break;
    }
};

/**
 * Checks if the filled gap by the user
 * is among the correct gaps.
 * @prototype
 * @function checkFilledAnswer
 * @param {string array, number} filledAnswer, gapIndex
 * @ return true if the filled answer is among the correct answers, false in the opposite case
 **/
AnswerModel.prototype.checkFilledAnswer = function (filledAnswer, gapIndex) {
    // FIME: CorrectGaps in QuestionPoolModel
    var correctGaps = getCorrectGaps(gapIndex);
    if (correctGaps.indexOf(filledAnswer) !== -1) {
        return true;
    }
    return false;
};


/**
 * checks the existence and validity
 * of the answer list
 * @prototype
 * @function dataAvailable
 */
AnswerModel.prototype.dataAvailable = function () {
    if (this.answerList) {
        return true;
    }
    return false;
};

AnswerModel.prototype.initAttempt = function (questionid) {
    // TODO check if timer works correctly
    if (this.currentQuestionId !== questionid) {
        // create a new attempt
        this.currentQuestionId = questionid;
        this.startTimer();
    }
};

/**
 * Create an XAPI statement for the statistics model
 */
AnswerModel.prototype.createAttemptReport = function () {
    var now = (new Date()).getTime();
    var duration = now - this.start;
    var questionPoolURL = this.app.models.lms.getServiceURL("ch.isn.lms.questions") + "/" + this.app.models.questionpool.getCourseID();
    var report = {
        "ID": this.controller.models.statistics.generateUUID(),
        "Actor": {
            "objectType": "Agent",
            "name": this.controller.models.configuration.getUserId()
        },
        "Verb": {
            "id": "http://www.mobinaut.io/mobler/verbs/IMSQTIAttempt"
        },
        "Object": {
            "id": this.currentQuestionId,
            "ObjectType": "Activity"
        },
        "timestamp": now, // FIXME: output ISO Time
        "result": {
            "duration": duration, // FIXME output ISO time
            "score": this.answerScore,
            "success": this.answerScore === 1 ? true : false,
            "extensions": {
                "http://www.mobinaut.io/mobler/xapiextensions/IMSQTIResult": this.getAnswers()
            }
        },
        "context": {
            "contextActivities": {
                "parent": [
                    {"id": questionPoolURL}, 
                    {"id": questionPoolURL + "/" + this.app.models.questionpool.getPoolID()}
                ]
            }
        }
    };
    return report;
};

AnswerModel.prototype.finishAttempt = function () {
    // END TIMER + CALC SCORE
    this.calculateScore();
    var report = this.createAttemptReport();

    // TODO: inform statistics model about the results.
    this.controller.models.statistics.storeAttempt(report);

    this.resetTimer();
};