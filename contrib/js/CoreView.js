/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true */

// instantiate as following:
//     myClass.prototype = Object.create(CoreView.prototype);
//     myClass.prototype.constuctor = myClass;
//
// call CoreView Constructor (ideally the first thing in your constructor)
//     CoreView.call(this, app, domid);

function CoreView(app, domid) {
    this.app = app;
    this.container = $('#'+ domid);
    if(this.container) {
        this.content   = this.container.find('#'+ domid + 'box'); // find content box within the view!
        if (this.content) {
            // find main content template
            this.template = this.app.templates.getTargetTemplate(domid + 'box');
            if (!this.template) {
                this.template = this.app.templates.getTargetTemplate(domid);
            }
        }

        // find interactive elements
        // .move - register start, move, end
        // .tap   - register tap
        var self = this;
        // we register only 1 (one) move event to the container!
        // elsewhere the move class is ignored by CoreView!

        // callMyTap is a helper function to ensure that we only use one callback
        function callMyTap(ev) {
            self.tap(ev, this.id);
        }

        function callMyClick(ev) {
            self.click(ev, this.id);
        }

        if( this.container.hasClass('move')) {
            var bMove = false;
            jester(this.container[0]).start(function (e,t) {bMove = true; self.startMove(e,t);});
            jester(window).move(function (e,t) {if (bMove) {self.duringMove(e,t);}});
            jester(window).end( function (e,t) {if (bMove) {self.endMove(e,t); bMove = false;}});
        }

        if (this.container.hasClass('tap')) {
            jester(this.container[0]).tap(callMyTap);
        }
        if (this.container.hasClass('click')) {
            this.container[0].addEventListener('click', callMyClick, false);
        }

        // the gesture events are mapped directly to the target elements, where possible
        // NOTE - the tap class won't work with list templates!
        this.container.find('.tap').each(function () {
            var tapid = this.id;
            if (tapid && tapid.length) {
                var tName = 'tap_' + tapid;
                // only register the tap event if an appropriate tap handler is defined
                // tap handlers require the format 'tap_tagid' where tagid is the id
                // of the tag with the tap class
                if (self[tName] && typeof self[tName] === 'function') {
                    jester(this).tap(function (e) {self[tName](e, this.id);});
                }
                else {
                    jester(this).tap(callMyTap);
                }
            }
        });

        this.container.find('.click').each(function () {
           var tapid = this.id;
            if (tapid && tapid.length) {
                var tName = 'click_' + tapid;
                // only register the tap event if an appropriate tap handler is defined
                // tap handlers require the format 'tap_tagid' where tagid is the id
                // of the tag with the tap class
                if (self[tName] && typeof self[tName] === 'function') {
                    this.addEventListener('click', function (e) {self[tName](e, this.id);}, false);
                }
                else {
                    this.addEventListener('click', callMyClick, false);
                }
            }
        });

    }
}

Object.defineProperties(CoreView.prototype, {
    'active' : {
        'get': function() { return (this.app && this.app.isActiveView) ? this.app.isActiveView(this) : false; }
    }
});

CoreView.prototype.startMove        = function (ev, touches) {};
CoreView.prototype.endMove          = function (ev, touches) {};
CoreView.prototype.duringMove       = function (ev, touches) {};
CoreView.prototype.tap              = function (ev, tagid) {};
CoreView.prototype.back             = function () {
    if (this.app && this.app.changeView) {
        this.app.changeView(this.app.sourceView);
    }
};

/**
 * @public @method update()
 *
 * helper function that updates the content of the main content box.
 */
CoreView.prototype.update = function () {};   // update data during open
CoreView.prototype.prepare = function () {};  // update data during open
CoreView.prototype.cleanup = function () {};  // cleanup during close

CoreView.prototype.clear = function () {
    if (this.content && !(this.content.hasClass('static') || this.content.find('container').length)) {
        this.content.empty();
    }
};

/**
 * @public @method refresh()
 *
 * The refresh function encapsulates the clear and the update function.
 *
 * While the actual view's update function is responsible for rendering the
 * content, the refresh function must get used for triggering a screen update.
 */
CoreView.prototype.refresh = function () {
    if (this.active) {
        this.clear();
        this.update();
    }
};

CoreView.prototype.open = function () {
    this.prepare();
    this.refresh();
    if (this.container) {
        this.container.addClass('active');
    }
};

CoreView.prototype.close = function () {
    if (this.container) {
        this.container.removeClass('active');
    }
    this.cleanup();
};
