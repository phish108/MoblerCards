/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true */

function CoreApplication()   {
    this.views = {};
    this.viewReg = {};
    this.models = {};
    this.modelReg = {};
    this.sourceView = null;
    this.sourceTrace = [];
}

CoreApplication.prototype.start = function () {
    var self = this;

    function initApplication() {
        self.ready();
    }

    if (window.cordova) {
        // init for cordova applications
        document.addEventListener('deviceready', initApplication, false);
    }
    else {
        // init for web applications
        $(document).ready(initApplication);
    }

    this.bindEvents();
};

CoreApplication.prototype.ready = function () {
    this.initTemplates();
    this.initModels();
    this.initViews();

    this.initialize();
    this.openFirstView();
};

CoreApplication.prototype.registerView = function (fn) {
    var fname = fn.name;
    this.viewReg[fname] = fn;
};

CoreApplication.prototype.registerModel = function (fn){
    var fname = fn.name;
    this.modelReg[fname] = fn;
};

CoreApplication.prototype.initTemplates = function () {
    this.templates = new TmplFactory();
    if (!this.templates) {
        console.log('templates failed');
    }
};

CoreApplication.prototype.initModels = function () {
    for (var k in this.modelReg) {
        this.models[k.replace('Model', '').toLowerCase()] = new this.modelReg[k](this);
    }
};

CoreApplication.prototype.initViews = function () {
    var self = this;
    $('.screen, .menu, .actions, .infobar').each(function () {
        var tagid = this.id;
        this.className.split(' ').some(function (className) {
            var rv = false;
            if (window[className] && typeof window[className] === 'function') {
                // make implicit view definition the default.
                // As soon a view class is present in the global namespace, we will load it
                // this may cause problems in some rare case of misguided class uses. In this case
                // we may want to introduce some forbidden classes.
                self.views[tagid] = new window[className](self, tagid);
                rv = true;
            }
            else if (self.viewReg[className]) {
                // allow explicit view registration
                self.views[tagid] = new self.viewReg[className](self, tagid);
                rv = true;
            }
            return rv;
        }); // end some()
    }); // end each()
};

CoreApplication.prototype.isActiveView = function (viewObject) {
    return (this.views[this.viewId] === viewObject);
};

CoreApplication.prototype.changeView = function chView(viewname) {
    if (viewname &&
        typeof viewname === 'string' &&
        this.views[viewname] &&
        this.viewId !== viewname) {
        if (viewname === this.sourceView) {
            this.sourceView = this.sourceTrace.pop();
        }
        else {
            this.sourceTrace.push(this.sourceView);
            this.sourceView = this.viewId; // this is used for back operations in CoreView
        }
        this.views[this.viewId].close();
        this.viewId = viewname;
        this.views[this.viewId].open();
    }
};

CoreApplication.prototype.openFirstView = function() {};
CoreApplication.prototype.initialize = function () {};
CoreApplication.prototype.bindEvents = function () {};
