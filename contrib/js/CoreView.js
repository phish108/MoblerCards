/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

// instantiate as following:
//     myClass.prototype = Object.create(CoreView.prototype);
//     myClass.prototype.constuctor = myClass;
//
// call CoreView Constructor (ideally the first thing in your constructor)
//     CoreView.call(this, app, domid);

(function (a) {
    var jester = a.jester;
    var $ = a.$;

    function noop() {}

function CoreView(app, domid, theDelegate) {
    var self = this;

    this.app        = app;
    this.container  = $('#'+ domid);

    // we register only 1 (one) move event to the container!
    // elsewhere the move class is ignored by CoreView!

    // callMyTap is a helper function to ensure that we only use one callback
    function callMyTap(ev) {
        if (self.active) self.delegate.tap(ev, this.id);
    }

    function callMyClick(ev) {
        if (self.active) self.delegate.click(ev, this.id);
    }

    function callMyBlur(ev) {
        console.log("blur ");
        if (self.active) self.delegate.blur(ev, this.id);
    }

    function callMyFocus(ev) {
        if (self.active) self.delegate.focus(ev, this.id);
    }

    this.isVisible = false;
    this.isDynamic = false;
    this.isStatic  = true;

    if(this.container) {
        this.content   = this.container.find('#'+ domid + 'box'); // find content box within the view!
        if (this.content) {
            // find main content template
            this.template = this.app.templates.getTargetTemplate(domid + 'box');
            if (!this.template) {
                this.template = this.app.templates.getTargetTemplate(domid);
            }

            this.isStatic = (this.content.hasClass('static') || this.content.find('container').length);
            this.isDynamic = !this.isStatic;
        }

        this.initDelegate(theDelegate);

        var touch = [], mouse = [], keyboard = [];

        if (this.container[0].dataset) {
            var tmpT = this.container[0].dataset.touch;
            var tmpM = this.container[0].dataset.mouse;
            if (tmpT) {
                touch = tmpT.split(' ');
            }
            if (tmpM) {
                mouse = tmpM.split(' ');
            }

            if (this.container[0].dataset.keyboard) {
                keyboard = this.container[0].dataset.keyboard.split(' ');
                console.log("keyboard " + keyboard.join(','));
            }
        }

        // find interactive elements
        // .move - register start, move, end
        // .tap   - register tap


        if (touch.indexOf('move') >= 0) {
            var bMove = false;
            ['startMove', 'duringMove', 'endMove'].forEach(function (pname) {
                if (!(pname in self.delegate)) {
                    self.delegate[pname] = noop;
                }
            });

            jester(this.container[0]).start(function (e,t) {if (self.active && t.numTouches() === 1) {bMove = true; self.delegate.startMove(e,t);}});
            jester(window).move(function (e,t) {if (self.active && bMove && t.numTouches() === 1) {self.delegate.duringMove(e,t);}});
            jester(window).end( function (e,t) {if (self.active && bMove) {self.delegate.endMove(e,t); bMove = false;}});
        }

        if (touch.indexOf('tap') >= 0) {
            if (!('tap' in this.delegate)) {
                this.delegate.tap = noop;
            }
            jester(this.container[0]).tap(callMyTap);
        }

        if (touch.indexOf('pinch') >= 0) {
            if (!('pinch' in self.delegate)) {
                self.delegate.pinch = noop;
            }
            jester(window).pinchwiden(function (e,t) {if (self.active) { self.delegate.pinch(e,t,1);}});
            jester(window).pinchnarrow(function (e,t) {if (self.active) { self.delegate.pinch(e,t,-1);}});
        }

        if (mouse.indexOf('click') >= 0) {
            if (!('click' in this.delegate)) {
                this.delegate.click = noop;
            }
            this.container[0].addEventListener('click', callMyClick, false);
        }

        if (keyboard.indexOf('blur') >= 0) {
            console.log("register blur call back");
            if (!('blur' in this.delegate)) {
                this.delegate.blur = noop;
            }
            this.container[0].addEventListener('blur', callMyBlur, false);
        }

        if (keyboard.indexOf('focus') >= 0) {
            if (!('focus' in this.delegate)) {
                this.delegate.focus = noop;
            }
            this.container[0].addEventListener('focus', callMyFocus, false);
        }


        // the gesture and mouse events for decending elemets are mapped directly to the
        // target elements, where possible
        // NOTE - the tap class won't work with list templates! Map the tap event to the
        // wrapping element outside of the template
        this.container.find('[data-touch~=tap]').each(function () {
            var tapid = this.id;
            if (tapid && tapid.length) {
                var tName = 'tap_' + tapid;
                // only register the tap event if an appropriate tap handler is defined
                // tap handlers require the format 'tap_tagid' where tagid is the id
                // of the tag with the tap class
                if (tName in self.delegate && typeof self.delegate[tName] === 'function') {
                    jester(this).tap(function (e) {self.delegate[tName](e, this.id);});
                }
                else {
                    jester(this).tap(callMyTap);
                }
            }
        });

        this.container.find('[data-mouse~=click]').each(function () {
           var tapid = this.id;
            if (tapid && tapid.length) {
                var tName = 'click_' + tapid;
                // only register the tap event if an appropriate tap handler is defined
                // tap handlers require the format 'tap_tagid' where tagid is the id
                // of the tag with the tap class
                if (tName in self.delegate && typeof self.delegate[tName] === 'function') {
                    this.addEventListener('click', function (e) {self.delegate[tName](e, this.id);}, false);
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
        'get': function() {
            if (this.isVisible) {
                return true;
            }
            return (this.app && this.app.isActiveView) ? this.app.isActiveView(this) : false;
        }
    }
});

CoreView.prototype.initDelegate     = function (theDelegate) {
    var self = this;

    var delegateProto = theDelegate.prototype;
    var delegateBase  = {};

    // hook important information into the delegate
    Object.defineProperties(delegateBase, {'app':       {get: function () {return self.app;}},
                                           'container': {get: function () {return self.container;}},
                                           'content':   {get: function () {return self.content;}},
                                           'template':  {get: function () {return self.template;}},
                                           'active':    {get: function () {return self.active;}},
                                           'data':      {get: function () {return self.viewData;}}
                                          });

    // allow delegate to trigger our functions.
    delegateBase.back     = function () { self.back(); };
    delegateBase.open     = function () { self.open(); };
    delegateBase.close    = function () { self.close(); };
    delegateBase.refresh  = function () { self.refresh(); };
    delegateBase.clear    = function () { self.clear(); };

    // subclass the delegate.
    theDelegate.prototype = Object.create(delegateBase);

    // roll back the delegate functions (and overload the bas functions where required)
    Object.getOwnPropertyNames(delegateProto).forEach(function (pname) {
        Object.defineProperty(theDelegate.prototype, pname, Object.getOwnPropertyDescriptor(delegateProto, pname));
    });

    // ensure minimum prototype requirements
    ['update', 'prepare', 'cleanup'].forEach(function (pname) {
        if (!(pname in delegateProto)) { // only default if the delegate did not implement them.
            theDelegate.prototype[pname] = noop;
        }
    });

    self.delegate = new theDelegate();
};

CoreView.prototype.back = function () {
    if (this.app && this.app.changeView) {
        this.app.changeView(this.app.sourceView);
    }
};

CoreView.prototype.clear = function () {
    // content might be not a screenbox.
    if (this.content && this.isDynamic) {
        this.content.empty();
    }

    // clear all non static screenboxes, too
    this.container.find('.screenbox').each(function(i, tag) {
        if (!tag.classList.contains('static')) {
            tag.innerHTML = "";
        }
    });
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
        this.delegate.update();
    }
};

CoreView.prototype.open = function (viewData) {
    this.viewData = viewData || {};
    this.delegate.prepare();
    this.refresh();
    if (this.container) {
        this.container.addClass('active');
    }
    this.isVisible = true;

};

CoreView.prototype.close = function () {
    this.isVisible = false;
    if (this.container) {
        this.container.removeClass('active');
    }
    this.delegate.cleanup();
};

    if (!('CoreView' in a)) {
        a.CoreView = CoreView;
    }
})(window);
