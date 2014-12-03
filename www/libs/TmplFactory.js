/* jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true */

/**
 * @class TmplFactory()
 *
 * Factory Class for creating HTML template objects that can be reused in views.
 *
 * Requires jquery.
 *
 * The idea of the TmplFactory is that you want to have as little HTML code generation
 * in your business logic as possible.
 *
 * After the factory objects are generated the templates will be removed from the DOM.
 * 
 * The TmplFactory looks for template and component tags in your HTML. 
 * 
 * A template is a dynamic element that can be used multiple times.
 * A component is a static element that can be used once. 
 * 
 * Both elements enable you to abstract the HTML elements/DOM structure within 
 * your business logic. 
 * 
 * Both elements will be removed from the flow of your document, so they won't 
 * affect the style of your UI.
 * 
 * The component is only present for abstracting the UI static elements using the same API
 * as for templates.
 */
function TmplFactory() {
    this.templates = {};

    var nodes = document.querySelectorAll('template, component');
    for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].getAttribute('id');
        id = id.replace(/[\s_\-]+/g, ''); // remove bad characters from the string
        if(id && id.length) {
            this.templates[id] = new ComponentBlock(nodes[i]);
        }
    }

    function ComponentBlock(tag) {
        var tagid = tag.id.replace(/[\s\-]+/g, ''); // remove forbidden characters for dot-notation

        this.prefixid = tag.getAttribute('prefix') || tagid;
        this.bTemplate = false;
        this.currentElementId = '';

        this._targetElement = null;

        this.targetid = tag.parentNode.id || '';
       
        var cFrag = tag;
        if(tag.content) { // HTML5 Template capable
            cFrag = tag.content;
        }
        else {            // Polyfill for components and non template capable browsers
            cFrag = document.createDocumentFragment();
            for (var i = 0; i < tag.childNodes.length; i) {
                cFrag.appendChild(tag.childNodes[i]);
            }
        }
        
        // create component variables
        this.variables = [];
        var thevars = cFrag.querySelectorAll('[id]');
        
        for (var i = 0; i < thevars.length; i++) {
            var varid = thevars[i].id;
            this.variables.push(varid);
            this[varid] = new ComponentVar(thevars[i], this);
        }
        
        if (tag.nodeName.toLowerCase() === 'template') {
            this.bTemplate = true;
            
            if(!tag.content) {
                tag.parentNode.removeChild(tag);
            }
            this.templateCode = cFrag;
        }
        else {
            // remove the component element from the DOM flow 
            // this makes components truely invisible from the layout
            tag.parentNode.replaceChild(cFrag, tag);   
        }
    }

     Object.defineProperties(ComponentBlock.prototype, {
         'id' : {
             'get' : function () { return this.currentElementId; },
             'set' : function (value) {
                 // unset the active element if undefined, null, or empty strings are passed
                 if (typeof value !== 'undefined' && value !== null && value.length) {
                     if (!this.find(value)) {
                        this.attach(value);
                     }
                 }
                 else {
                     this.currentElementId = '';
                 }
             }
         },
         'name': {
             'get' : function () { return this.prefixid; }
         },
         'target': {
             'get' :  function () {
                 return this._targetElement;
             },
             'set' : function (node) {
                 this.appendTo(node);
             }
         },
         'root': {
             'get' : function () {
                 var rv = [];
                 if (this.currentElementId) {
                     var t = this.target;
                     var p = this.prefix();
                     var le = t.querySelectorAll('#' + this.targetid + ' > [id$=' + p + ']');
                     // now we have all elements
                     for (var i = 0; i < le.length; i++) {
                        rv.push(le[i]);
                     }    
                 }
                 return rv;
             }
         }
    });

    ComponentBlock.prototype.prefix = function () {
        if (this.bTemplate) {
            return  '_' + this.prefixid + '_' + this.currentElementId;
        }
        return '';
    };

    ComponentBlock.prototype.attach = function (objectid) {
        if (this.bTemplate && !this.find(objectid)) {
            this.appendTo(document.getElementById(this.targetid), objectid);
        }
    };

    ComponentBlock.prototype.appendTo = function (node, objectid) {
        if (this.bTemplate && node && node.nodeType === Node.ELEMENT_NODE) {
            var df = this.templateCode.cloneNode(true);
            
            this.currentElementId = objectid || '';
            this.calculateObjectID();
         
            this.initRootElements(df);
            this.initVariables(df);

            node.appendChild(df);
            this._targetElement = node;
        }
    };
    
    ComponentBlock.prototype.calculateObjectID = function () {
        var cI = this.currentElementId || '';
        if (!cI.length || this.find(cI)) {
            var i = 0;
            for (i; this.find(cI + i); i++);
            this.currentElementId = cI + i;
        }
    };
    
    ComponentBlock.prototype.initRootElements = function (frag) {
        var j = 0;
        for (var i = 0; i < frag.childNodes.length; i++) {
            var e = frag.childNodes[i];
            if (e.nodeType === Node.ELEMENT_NODE &&
                !(e.id && e.id.length)) {
                e.id = j + this.prefix();
                j++;
            }
        }
    };
    
    ComponentBlock.prototype.initVariables = function (frag) {
        this.variables.forEach(function (e) {
            // var el = frag.getElementById(e); // fails on older webkit engines
            frag.querySelector('#' + e).id = e + this.prefix();
        }, this);
    };
    
    ComponentBlock.prototype.find = function (objectid) {
        var tE;
        if (objectid && this.variables.length) {
            var oldId = this.currentElementId; 
            this.currentElementId = objectid || '';
            
            tE = document.getElementById(this.variables[0] + this.prefix());    
            if (!tE) {
                this.currentElementId = oldId;
            }
        }

        return (tE && tE.nodeType === Node.ELEMENT_NODE);
    };

    function ComponentVar(tag, cBlock) {
        this.block = cBlock;
        this.id = tag.id;
        
        // check for boolean selectors
        var tcls = tag.getAttribute('trueclass');
        var fcls = tag.getAttribute('falseclass');
        
        if ((tcls && tcls.length) || (fcls && fcls.length)) {
            this.boolClass = {
                'true': tcls,
                'false': fcls
            };
        }
    }

    Object.defineProperties(ComponentVar.prototype, {
        'text': {
            'get': function () { return this.get(); },
            'set': function (value) { this.set(value); }
        },
        'value': {
            'get': function () { return this.get(); },
            'set': function (value) { this.set(value); }
        },
        'html': {
            'get': function () { return this.getHTML(); },
            'set': function (value) { this.setHTML(value); }
        },
        'is': {
            'get': function () { return this.which(); },
            'set': function (value) { this.choose(value); }
        },
        'target': {
            'get': function () {
                // here is some potential for optimizing DOM processing
                return document.getElementById(this.id + this.block.prefix());
            }
        }
    });

    ComponentVar.prototype.set = function (data) {
        this.target.textContent = data;
        //console.log(typeof this.target.value);
        //FIXME - test if value key exists 
        //if (this.target.value) {
            this.target.value = data;
        //}
    };

    ComponentVar.prototype.setHTML = function (data) {
        this.target.innerHTML = data;
    };

    ComponentVar.prototype.clear = function () {
        this.target.textContent = '';
        if (this.target.value) {
            this.target.value = '';
        }
    };

    ComponentVar.prototype.get = function () {
        return this.target.value ? this.target.value : this.target.textContent;
    };

    ComponentVar.prototype.getHTML = function () {
        return this.target.innerHTML;
    };

    ComponentVar.prototype.setClass = function (classname) {
        this.target.classList.add(classname);
    };

    ComponentVar.prototype.addClass = ComponentVar.prototype.setClass;

    ComponentVar.prototype.removeClass = function (classname) {
        this.target.classList.remove(classname);
    };
    
    ComponentVar.prototype.clearClass = function () {
        // brute force removal of all classes
        this.target.className = '';  
    };

    ComponentVar.prototype.hasClass = function (classname) {
        return this.target.classList.contains(classname);
    };

    ComponentVar.prototype.toggleClass = function (classname) {
        this.target.classList.toggle(classname);
    };

    ComponentVar.prototype.setAttribute = function (attrname, attrvalue) {
        this.target.setAttribute(attrname, attrvalue);
    };

    ComponentVar.prototype.clearAttribute = function (attrname) {
        this.target.removeAttribute(attrname);
    };

    ComponentVar.prototype.removeAttribute = ComponentVar.prototype.clearAttribute;

    ComponentVar.prototype.getAttribute = function (attrname) {
        return this.target.getAttribute(attrname);
    };

    ComponentVar.prototype.choose = function (bValue) {
        if (this.boolClass) {
            var add = bValue ? 'true' : 'false';
            var rem = bValue ? 'false' : 'true';

            if (this.boolClass[rem] && this.boolClass[rem].length) {
                // we can always remove
                this.removeClass(this.boolClass[rem]);
            }
            if (this.boolClass[add] && this.boolClass[add].length) {
                // we should only add if the class is not yet added
                this.addClass(this.boolClass[add]);
            }
        }
    };

    ComponentVar.prototype.which = function () {
        return (this.boolClass && (this.hasClass(this.boolClass.true) || !this.hasClass(this.boolClass.false)));
    };
}

/**
 * @public @method getTemplate(name)
 *
 * @param @String name: name of the template as given in its id.
 *
 * returns a template class or undefined
 */
TmplFactory.prototype.getTemplate = function (name) {
    return this.templates[name];
};

/**
 * @public @method getTargetTemplate(targetid)
 * @param @string targetid
 *
 * returns all templates that are associated with a targetid.
 */
TmplFactory.prototype.getTargetTemplate = function (targetid) {
    var result = {};
    var k;
    for (k in this.templates) {
        if (this.templates[k].targetid === targetid) {
            result[k] = this.templates[k];
        }
    }

    k = Object.keys(result);
    return k.length > 1 ? result :  k.length > 0 ? result[k[0]] : undefined;
};
