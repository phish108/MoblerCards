/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

(function (a) {
    function implement(parentClass, childClass) {
        if (typeof parentClass === 'function' && typeof childClass === 'function') {
            var opProto = childClass.prototype;

            childClass.prototype = Object.create(parentClass.prototype);

            Object.getOwnPropertyNames(opProto).forEach(function (pname) {
                Object.defineProperty(childClass.prototype,
                                      pname,
                                      Object.getOwnPropertyDescriptor(opProto, pname));
            });

        }
    }

    function extend(childClass, parentClass) {
        implement(parentClass,childClass);
    }

    if (!('Class' in a)) {
        /**
         * @object Class - helper class to simplify OOP inheritance
         *
         * A typical Class implementation will look like this:
         *
         * ```
         * function MyParentClass() {
         *     // Basic initialization
         * }
         *
         * // MyParentClass prototype functions
         *
         * function MyClass() {
         *     MyParentClass.call(this); // call the super class' constructor
         * }
         *
         * Class.inherit(MyParentClass, MyClass);
         *
         * // MyClass prototype functions
         *
         * ```
         */
        a.Class = {
            /**
             * @public @method inherit(parentClass, childClass)
             *
             * This method abstracts the javascript prototype handing for OOP.
             * It will use the parentClass as a foundation for the childClass.
             */
            'inherit': implement,

            /**
             * @public @method implement(parentClass, childClass)
             *
             * Alias for imherit
             */
            'implement': implement,

            /**
             * @public @method extend(childClass, parentClass)
             *
             * Inverse of inherit using the childClass as the first parameter.
             */
            'extend': extend,

            /**
             * @public @method passTo(childClass, parentClass)
             *
             * Alias for extend
             */
            'passTo': extend
        };
    }
})(window);
