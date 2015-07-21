/*jslint
  white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true
 */

/*global QUnit, LearningRecordStore*/


QUnit.test( "LRS Tests", function( assert ) {
    var lrs = new LearningRecordStore();
    assert.ok(lrs, "LRS initialized");

    /**
     * Context Tests
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

    lrs.endLRSContext(lrsIds[2]);
    assert.equal(lrs.lrscontext.length, 2, "removed 1st LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs2", "LRS reference inplace");
    assert.equal(lrs.lrscontext[1], "lrs4", "LRS reference properly removed");

    lrs.endLRSContext(lrsIds[3]);
    assert.equal(lrs.lrscontext.length, 1, "removed 1st LRS reference");
    assert.equal(lrs.lrscontext[0], "lrs2", "LRS reference inplace");
    assert.notOk(lrs.lrscontext[1], "LRS reference properly removed");

    /**
     * Cleanup
     */
    lrs.killDB();
});
