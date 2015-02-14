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
        if (self.active) {
            var d = self.updateDelegate || self.delegate;
            if (typeof d["tap_"+this.id] === 'function')) {
                d["tap_"+this.id](ev);
            }
            else {
                d.tap(ev, this.id);
            }
        }
    }

    function callMyClick(ev) {
        if (self.active) {
            var d = self.updateDelegate || self.delegate;
            if (typeof d["click_"+this.id] === 'function')) {
                d["click_"+this.id](ev);
            }
            else {
                d.click(ev, this.id);
            }
        }
    }

    function callMyBlur(ev) {
        console.log("blur ");
        if (self.active) {
            var d = self.updateDelegate || self.delegate;
            if (typeof d["blur_"+this.id] === 'function')) {
                d["blur_"+this.id](ev);
            }
            else {
                d.blur(ev, this.id);
            }
        }
    }

    function callMyFocus(ev) {
        if (self.active) {
            var d = self.updateDelegate || self.delegate;
            if (typeof d["focus_"+this.id] === 'function')) {
                d["focus_"+this.id](ev);
            }
            else {
                d.focus(ev, this.id);
            }
        }
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
            jester(this.container[0]).start(function (e,t) {
                var d = self.updateDelegate || self.delegate;
                if (self.active && t.numTouches() === 1) {
                    bMove = true; d.startMove(e,t);
                }
            });
            jester(window).move(function (e,t) {
                var d = self.updateDelegate || self.delegate;
                if (self.active && bMove && t.numTouches() === 1) {
                    d.duringMove(e,t);
                }
            });
            jester(window).end( function (e,t) {
                var d = self.updateDelegate || self.delegate;
                if (self.active && bMove) {
                    d.endMove(e,t);
                    bMove = false;
                }
            });
        }

        if (touch.indexOf('tap') >= 0) {
            jester(this.container[0]).tap(callMyTap);
        }

        if (touch.indexOf('pinch') >= 0) {
            jester(window).pinchwiden(function (e,t) {if (self.active) { var d = self.updateDelegate || self.delegate; d.pinch(e,t,1);}});
            jester(window).pinchnarrow(function (e,t) {if (self.active) { var d = self.updateDelegate || self.delegate; d.pinch(e,t,-1);}});
        }

        if (mouse.indexOf('click') >= 0) {
            this.container[0].addEventListener('click', callMyClick, false);
        }

        if (keyboard.indexOf('blur') >= 0) {
            console.log("register blur call back");
            this.container[0].addEventListener('blur', callMyBlur, false);
        }

        if (keyboard.indexOf('focus') >= 0) {
            this.container[0].addEventListener('focus', callMyFocus, false);
        }
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

CoreView.prototype.useDelegate      = function (delegateName) {
    if (typeof delegateName === "string" &&
        this.widgets &&
        this.widgets.length &&
        this.widgets.hasOwnProperty(delegateName)) {
        this.updateDelegate = this.widgets[delegateName];
    }
};

CoreView.prototype.initDelegate     = function (theDelegate, delegateName) {
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

    // allow normal view delegates to trigger our functions. Exclude widgets from doing so.
    if (!(typeof delegateName === "string" && delegateName.length)) {
        delegateBase.back         = function () { self.back(); };
        delegateBase.open         = function () { self.open(); };
        delegateBase.close        = function () { self.close(); };
        delegateBase.refresh      = function () { self.refresh(); };
        delegateBase.clear        = function () { self.clear(); };
        delegateBase.useDelegate  = function (dName) { self.useDelegate(dName); };
        delegateBase.delegate     = function (dClass, dName) { if (typeof dName === "string" && dName.length) self.initDelegate(dClass, dName); };
    }

    delegateBase.update     = noop;
    delegateBase.prepare    = noop;
    delegateBase.cleanup    = noop;
    delegateBase.tap        = noop;
    delegateBase.click      = noop;
    delegateBase.blur       = noop;
    delegateBase.focus      = noop;
    delegateBase.pinch      = noop;
    delegateBase.startMove  = noop;
    delegateBase.duringMove = noop;
    delegateBase.endMove    = noop;

    // subclass the delegate.
    theDelegate.prototype = Object.create(delegateBase);

    // roll back the delegate functions (and overload the functions where required)
    Object.getOwnPropertyNames(delegateProto).forEach(function (pname) {
        switch (pname) {
            case "app":
            case "container":
            case "content":
            case "template":
            case "active":
            case "data":
            case "back":
            case "open":
            case "close":
            case "refresh":
            case "clear":
            case "delegate":
            case "useDelegate":
                // don't override core view internals
                break;
            default:
                Object.defineProperty(theDelegate.prototype, pname, Object.getOwnPropertyDescriptor(delegateProto, pname));
                break;
        }
    });

    if (typeof delegateName === "string" && delegateName.length) {
        if (!(delegateName in self.widgets)) {
            // initialize the same widget name only once
            self.widgets[delegateName] = new theDelegate();
        }
    }
    else {
        self.widgets = {};
        self.delegate = new theDelegate();
    }
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
        if (this.updateDelegate) {
            this.updateDelegate.update();
        }
        // allow the view to still do updates to itself
        this.delegate.update();
    }
};

CoreView.prototype.open = function (viewData) {
    this.viewData = viewData || {};
    this.delegate.prepare();
    if (this.updateDelegate) {
        this.updateDelegate.prepare();
    }
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
    if (this.updateDelegate) {
        this.updateDelegate.cleanup();
        this.updateDelegate = null;
    }
    this.delegate.cleanup();
};

    if (!('CoreView' in a)) {
        a.CoreView = CoreView;
    }
})(window);
