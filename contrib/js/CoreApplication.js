/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

(function (a) {

    var cordova = a.cordova;
    var $ = a.$;
    var TmplFactory = a.TemplateFactory;

function CoreApplication()   {
    this.views = {};
    this.viewReg = {};
    this.models = {};
    this.modelReg = {};
    this.sourceView = null;
    this.sourceTrace = [];
    this.viewId = "";
}

/**
 * @static @method start(controller)
 *
 * This function links CoreApplication to the app's controller logic, so the controller
 * can use all CoreApplication functions and properties as usual.
 *
 * For getting the application going one needs to call
 *
 *    CoreApplication.start(MyController);
 *
 * after all required modules are loaded.
 */
CoreApplication.start = function (controller) {
    function AppHelper() {
        CoreApplication.call(this);
        controller.call(this);
    };

    Class.extend(AppHelper, controller);
    Class.extend(AppHelper, CoreApplication);

    function initApplication() {
        a.app = new AppHelper();
        a.app.bindEvents();
        a.app.ready();
    }

    if (cordova) {
        // init for cordova applications
        document.addEventListener('deviceready', initApplication, false);
    }
    else {
        // init for web applications
        $(document).ready(initApplication);
    }
};

CoreApplication.prototype.setReadOnly = function (name, value) {
    if (!(name in this) && !this[name]) {
        var tmpVal = value;
        Object.defineProperty(this, name, {get: function () {return tmpVal;}});
    }
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
    var meta = document.getElementsByTagName('META');
    for (var i = 0; i < meta.length; i++) {
        if (meta[i].getAttribute('name') === 'app:models') {
            var rs = meta[i].content;
            rs = rs.replace(/\s+/g, '');
            var r = rs.split(/\,/);
            this.modelReg = {};
            for (var j = 0; j < r.length; j++) {
                if (r[j] in window && typeof window[r[j]] === 'function') {
                    this.modelReg[r[j]] = window[r[j]];
                }
            }
            break; // we accept only one data tag
        }
    }

    for (var k in this.modelReg) {
        this.models[k.replace('Model', '').toLowerCase()] = new this.modelReg[k](this);
    }

};

CoreApplication.prototype.initViews = function () {
    var self = this;
    $('[data-view]').each(function () {
        var tagid = this.id;
        var className = this.dataset.view;

        if (className) {
            if((className in window) && (typeof window[className] === 'function')) {
                self.views[tagid] = new CoreView(self, tagid, window[className]);
            }
        }
    }); // end each()
};

CoreApplication.prototype.isActiveView = function (viewObject) {
    return (this.views[this.viewId] === viewObject);
};

CoreApplication.prototype.changeView = function chView(viewname, viewData) {
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
        if (this.viewId && this.views[this.viewId]) {
            this.views[this.viewId].close();
        }
        this.viewId = viewname;
        this.views[this.viewId].open(viewData);
    }
};

CoreApplication.prototype.reopenView = function (viewData) {
    this.views[this.viewId].close();
    this.views[this.viewId].open(viewData);
};

CoreApplication.prototype.openFirstView = function() {
    if (this.viewId && this.viewId.length) {
        this.views[this.viewId].open();
    }
};
CoreApplication.prototype.initialize = function () {};
CoreApplication.prototype.bindEvents = function () {};

    // register the class to the target object
    if (!('CoreApplication' in a)) {
        a.CoreApplication = CoreApplication;
    }
})(window);
