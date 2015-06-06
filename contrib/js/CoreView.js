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

    function findIDEl(el){
        while (el.parentElement) {
            if (el.id && el.id.length) {
                return el.id;
            }
            el = el.parentElement;
        }
        return undefined;
    }

function CoreView(app, domid, theDelegate) {
    var self = this;

    this.app        = app;
    this.container  = $('#'+ domid);

    // we register only 1 (one) move event to the container!
    // elsewhere the move class is ignored by CoreView!

    // callMyTap is a helper function to ensure that we only use one callback
    function callMyTap(ev) {
        if (self.active) {
            var d = self.delegate;
            var id = findIDEl(ev.target);
            if (id && typeof d["tap_"+id] === 'function') {
                d["tap_"+id](ev, id);
            }
            else {
                d.tap(ev, id);
            }

            d = self.updateDelegate;
            if (d) {
                if (id && typeof d["tap_"+id] === 'function') {
                    d["tap_"+id](ev, id);
                }
                else {
                    d.tap(ev, id);
                }
            }
        }
    }

    function callMyClick(ev) {
        if (self.active) {
            var d = self.delegate;
            var id = findIDEl(ev.target);
            if (id && typeof d["click_"+id] === 'function') {
                d["click_"+id](ev);
            }
            else {
                d.click(ev, id);
            }
            d = self.updateDelegate;
            if (d) {
                if (id && typeof d["click"+id] === 'function') {
                    d["click"+id](ev, id);
                }
                else {
                    d.click(ev, id);
                }
            }
        }
    }

    function callMyBlur(ev) {
        console.log("blur ");
        if (self.active) {
            var d = self.delegate;
            var id = findIDEl(ev.target);
            if (id && typeof d["blur_"+id] === 'function') {
                d["blur_"+id](ev);
            }
            else {
                d.blur(ev, id);
            }
            d = self.updateDelegate;
            if (d) {
                if (id && typeof d["blur_"+id] === 'function') {
                    d["blur"+id](ev, id);
                }
                else {
                    d.blur(ev, id);
                }
            }
        }
    }

    function callMyFocus(ev) {
        if (self.active) {
            var d = self.delegate;
            var id = findIDEl(ev.target);

            if (id && typeof d["focus_"+id] === 'function') {
                d["focus_"+id](ev);
            }
            else {
                d.focus(ev, id);
            }

            d = self.updateDelegate;
            if (d) {
                if (id && typeof d["focus_"+id] === 'function') {
                    d["focus_"+id](ev, id);
                }
                else {
                    d.focus(ev, id);
                }
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
            if (!tmpT && this.content[0]) {
                tmpT = this.content[0].dataset.touch;
            }
            if (!tmpM && this.content[0]) {
                tmpM = this.content[0].dataset.mouse;
            }
            if (tmpT) {
                touch = tmpT.split(' ');
            }
            if (tmpM) {
                mouse = tmpM.split(' ');
            }

            if (this.container[0].dataset.keyboard) {
                keyboard = this.container[0].dataset.keyboard.split(' ');
                // console.log("keyboard " + keyboard.join(','));
            }
        }

        // find interactive elements
        // .move - register start, move, end
        // .tap   - register tap
        var bMove = false,
            tMove = false;

        if (touch.indexOf('move') >= 0) {
            tMove = true;
            jester(this.container[0]).start(function (e,t) {
                var d = self.delegate;
                if (self.active && t.numTouches() === 1) {
                    bMove = true;
                    d.startMove(e,t);
                    if (self.updateDelegate) {
                        self.updateDelegate.startMove(e,t);
                    }
                }
            });
        }

        if (touch.indexOf('tap') >= 0) {
            // console.log("register tap on container " + domid);
            jester(this.container[0]).tap(callMyTap);
        }

        if (touch.indexOf('pinch') >= 0) {
            jester(window).pinchwiden(function (e,t) {
                if (self.active) {
                    self.delegate.pinch(e,t,1);
                    if (self.updateDelegate) {
                        self.updateDelegate.pinch(e,t,1);
                    }
                }
            });
            jester(window).pinchnarrow(function (e,t) {
                if (self.active) {
                    self.delegate.pinch(e,t,-1);
                    if (self.updateDelegate) {
                        self.updateDelegate.pinch(e,t,-1);
                    }
                }
            });
        }

        if (mouse.indexOf('click') >= 0) {
            this.container[0].addEventListener('click', callMyClick, false);
        }

        if (keyboard.indexOf('blur') >= 0) {
            // console.log("register blur call back");
            this.container[0].addEventListener('blur', callMyBlur, false);
        }

        if (keyboard.indexOf('focus') >= 0) {
            this.container[0].addEventListener('focus', callMyFocus, false);
        }

        this.container.find("[data-touch]").each(function() {
            var seTouch = this.dataset.touch.split(' ');
            if (seTouch.indexOf('tap') >= 0) {
                console.log("register tap on container " + this.id);
                jester(this).tap(callMyTap);
            }

            if (seTouch.indexOf('move') >= 0) {
                tMove = true;
                jester(this).start(function (e,t) {
                    var d = self.delegate;
                    if (self.active && t.numTouches() === 1) {
                        bMove = true;
                        d.startMove(e,t);
                        if (self.updateDelegate) {
                            self.updateDelegate.startMove(e,t);
                        }
                    }
                });
            }
        });

        if (tMove) {
            // register the move and end events only once per view
            jester(window).move(function (e,t) {
                var d = self.delegate;
                if (self.active &&
                    bMove &&
                    t.numTouches() === 1) {
                    d.duringMove(e,t);
                    if (self.updateDelegate) {
                        self.updateDelegate.duringMove(e,t);
                    }
                }
            });
            jester(window).end( function (e,t) {
                var d = self.delegate;
                if (self.active && bMove) {
                    d.endMove(e,t);
                    if (self.updateDelegate) {
                        self.updateDelegate.endMove(e,t);
                    }
                    bMove = false;
                }

            });
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

CoreView.prototype.useDelegate = function (delegateName) {
    if (typeof delegateName === "string" &&
        delegateName.length &&
        this.widgets &&
        this.widgets.hasOwnProperty(delegateName)) {
        this.updateDelegate = this.widgets[delegateName];
    }
};


CoreView.prototype.mapDelegate = function (delegateOrigName, delegateName) {
    if (typeof delegateName === "string" &&
        typeof delegateOrigName === "string" &&
        this.widgets &&
        this.widgets.hasOwnProperty(delegateOrigName) &&
        !this.widgets.hasOwnProperty(delegateName)) {
        this.widgets[delegateName] = this.widgets[delegateOrigName];
    }
};

CoreView.prototype.initDelegate = function (theDelegate, delegateName, opts) {
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

    if (typeof delegateName === "string" && delegateName.length) {
        // widgets/subviews should know their masterview (READ ONLY)
        Object.defineProperties(delegateBase, {
            'master': {'get': function () { return self.delegate; }}
        });
    }
    else {
        // allow normal view delegates to trigger our functions. Exclude widgets from doing so.
        delegateBase.back         = function () { self.back(); };
        delegateBase.open         = function () { self.open(); };
        delegateBase.close        = function () { self.close(); };
        delegateBase.refresh      = function () { self.refresh(); };
        delegateBase.clear        = function () { self.clear(); };

        delegateBase.useDelegate  = function (dName) {
            self.useDelegate(dName);
        };

        delegateBase.mapDelegate = function (odName,dName) {
            self.mapDelegate(odName,dName);
        };

        delegateBase.delegate     = function (dClass, dName, opts) {
            if (typeof dName === "string" && dName.length) {
                self.initDelegate(dClass, dName, opts);
            }
        };
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
            //case "active":
            case "data":
            case "master":
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
                Object.defineProperty(theDelegate.prototype,
                                      pname,
                                      Object.getOwnPropertyDescriptor(delegateProto, pname));
                break;
        }
    });

    if (typeof delegateName === "string" && delegateName.length) {
        if (!(self.widgets.hasOwnProperty(delegateName))) {
            // initialize the same widget name only once
            self.widgets[delegateName] = new theDelegate(opts || {});
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

    this.isVisible = true;

    this.delegate.prepare();

    if (this.isVisible && this.updateDelegate) {
        this.updateDelegate.prepare();
    }
    // if the delegate decides to switch the view during the preparation
    // this happens when the delegate calls "changeView" during prepare.
    if (this.isVisible) {
        this.refresh();
    }
    // again if changeView is called during refresh(), the view must not be opened
    if (this.isVisible && this.container) {
        this.container.addClass('active');
    }
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

    if (!(a.hasOwnProperty('CoreView'))) {
        a.CoreView = CoreView;
    }
})(window);
