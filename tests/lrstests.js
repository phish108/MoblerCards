/*jslint
  white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true
 */

/*global QUnit, LearningRecordStore*/

/**
 * LRS Tests
 *
 * This test suite c
 */
QUnit.test( "LRS Tests", function( assert ) {
    var lrs = new LearningRecordStore();
    assert.ok(lrs, "LRS initialized");

    /**
     * LRS Context Tests
     */
    assert.equal(lrs.lrscontext.length, 0, "vanilla LRS Backend Context");
    var lrsIds = ["lrs1", " lrs2", "lrs3 ", " lrs4 ", " "];

    lrs.startLRSContext(lrsIds[0]);
    assert.equal(lrs.lrscontext.length, 1, "added LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs1", "LRS reference stored");

    lrs.clearLRSContext();
    assert.equal(lrs.lrscontext.length, 0, "cleared LRS Backend Context");

    lrs.startLRSContext(lrsIds[0]);
    assert.equal(lrs.lrscontext.length, 1, "added LRS reference again");
    assert.equal(lrs.lrscontext[0], "lrs1", "LRS reference stored");

    lrs.startLRSContext(lrsIds[0]);
    assert.equal(lrs.lrscontext.length, 1, "LRS reference not added twice");
    assert.notOk(lrs.lrscontext[1], "no second LRS added");

    lrs.startLRSContext(lrsIds[1]);
    assert.equal(lrs.lrscontext.length, 2, "added 2nd LRS reference again");
    assert.equal(lrs.lrscontext[1], "lrs2", "LRS reference stored");

    lrs.endLRSContext(lrsIds[0]);
    assert.equal(lrs.lrscontext.length, 1, "removed 1st LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs2", "LRS reference properly removed");

    lrs.startLRSContext(lrsIds[2]);
    assert.equal(lrs.lrscontext.length, 2, "added 3rd LRS reference again");
    assert.equal(lrs.lrscontext[1], "lrs3", "LRS reference stored");

    lrs.startLRSContext(lrsIds[3]);
    assert.equal(lrs.lrscontext.length, 3, "added 4th LRS reference again");
    assert.equal(lrs.lrscontext[2], "lrs4", "LRS reference stored");

    lrs.startLRSContext(lrsIds[4]);
    assert.equal(lrs.lrscontext.length, 3, "whitespace LRS id will be ignored");
    assert.notOk(lrs.lrscontext[3], "no whitespace LRS added");

    lrs.endLRSContext(lrsIds[2]);
    assert.equal(lrs.lrscontext.length, 2, "removed 1st LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs2", "LRS reference inplace");
    assert.equal(lrs.lrscontext[1], "lrs4", "LRS reference properly removed");

    lrs.endLRSContext(lrsIds[3]);
    assert.equal(lrs.lrscontext.length, 1, "removed 1st LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs2", "LRS reference inplace");
    assert.notOk(lrs.lrscontext[1], "LRS reference properly removed");

    lrs.clearLRSContext();

    /**
     * XAPI Contexts
     *
     * Must accept only valid XAPI contexts.
     * Supported Contexts
     * - registration
     * - contextActivities
     *   - parent
     *   - grouping
     *   - category
     *   - other
     * - statement
     * - language
     *
     * Multilevel contexts are passed using the dot notation for the contextType.
     * E.g., contextActivities.parent
     *
     * Language codes need to be ISO 2 or 5 character codes. The 5 character code
     * has one '-' at position 2.
     */

    assert.notOk(lrs.context.hasOwnProperty("extensions"), "browsers have no device id");

    // add a registration
    var uuid = LearningRecordStore.getUUID();
    lrs.startContext('registration', uuid);
    assert.ok(true, "registration set");
    assert.equal(lrs.context.registration, uuid, "registration successfully set");

    lrs.endContext('registration', uuid);
    assert.notOk(lrs.context.hasOwnProperty("registration"), "registration successfully unset");

    // add a 2 char code language
    lrs.startContext('language', "en");
    assert.ok(lrs.context.language, "language context set");
    assert.equal(lrs.context.language, "en", "language 2 successfully set");

    lrs.endContext("language", "en");
    assert.notOk(lrs.context.hasOwnProperty("language"), "language successfully unset");

    lrs.startContext('language', "en-uk");
    assert.ok(lrs.context.language, "language context set");
    assert.equal(lrs.context.language, "en-uk", "language 5 successfully set");

    // try to overwrite with an invalid 5 char code
    lrs.startContext('language', "enguk");
    assert.equal(lrs.context.language, "en-uk", "invalid 5 char lang code rejected");

    lrs.startContext('language', "en-guk");
    assert.equal(lrs.context.language, "en-uk", "invalid 6 char lang code rejected");

    lrs.startContext('language', "eng");
    assert.equal(lrs.context.language, "en-uk", "invalid 3 char lang code rejected");

    lrs.startContext('language', "enuk");
    assert.equal(lrs.context.language, "en-uk", "invalid 4 char lang code rejected");



    /**
     * Cleanup
     */
    lrs.killDB();
});
