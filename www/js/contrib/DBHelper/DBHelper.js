/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true, bitwise: true */
/*global Promise */

(function (a) {
    function noop() {return;}

    /**
     * DBHelper
     * @param Object options
     *
     * The DBHelper Class abstracts the transaction logic of WebSQL and simplifies the access
     * to sql storage.
     *
     * The DBHelper constructor accepts 4 options.
     *
     * * name (required) - a string with the internal name of the database
     * * version (optional) - a version string for verifying the database version on the client
     * * title (optional) - a descriptive string of the database
     * * size (optional) - the expected size of the database in bytes
     *
     * Dafault values:
     *
     * version: 1
     * title: "{name} {version}"
     * size: 2MB
     *
     * Based on these options the constructor will open the database.
     *
     * DBHelper supports transactions for cascading actions. This is supported for
     * insert and query actions. Insert actions will always start transactions that
     * permit write operations within the transaction, while
     * query actions will always initiate read-only transactions.
     *
     * In addition to the instantiation options, the constructor accepts two
     * additional options for database maintenance.
     *
     * * init
     * * upgrade
     *
     * The init option may accept either a callback function OR an dictionary that
     * uses the table names as keys and table definitions as values (see create()
     * method for further details). For generic instantiation the dictionary option
     * is encouraged. The callback variation should be used only if the database
     * requires a complex logic during instantiation.
     *
     * The upgrade option expects and Array() with dictionary objects. Each object
     * in the array MUST have three entries: source, target, and upgrade. The source
     * and target keys expect version strings that define the upgrading path. The
     * upgrade function defines the upgrading logic for keeping the database in
     * a consistent state.
     *
     */
    function DBHelper(options) {
        if (typeof a.openDatabase !== "function") {
            throw {'code': 1, 'message': 'DBHelper: No websql support'};
        }

        if (options) {
            var dbname    = options.name,
                dbversion = options.version || '1',
                dbtitle   = options.title || dbname + ' ' + dbversion,
                dblimit   = options.size || 2 * 1024 * 1024;

            // @public @property Object options - database configuration options
            this.options = options; // keep options for reference

            this.options.version = dbversion;
            this.options.size   = dblimit;
            this.options.title  = dbtitle;

            // @public @property Object transaction - low level transaction object.
            this.transaction = null;
        }
    }

    /** **********************************************************************
     * Helper functions
     */

    /**
     * @public @method string createUUID()
     *
     * @returns string: UUID string for the location
     *
     * This helper function creates an Id for a location that is unique across
     * devices and systems.
     *
     * The random ID algorithm is used.
     */
    DBHelper.prototype.createUUID = function() {
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        return uuid.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0,
                v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    /**
     * @public @method quoteData(data)
     * @param String data
     *
     * This helper function escapes single quotes in SQL strings.
     *
     * Note that this is the only character we need to consider for websql/sqlite
     */
    DBHelper.prototype.quoteData = function (str) {
        if (isNaN(str)) {
            // quote ' -> ''
            return "'" + (str.replace(/\'/g, "''")) + "'";
        }
        return str;
    };

    /** **********************************************************************
     * JSON Query Notation functions
     */

    /**
     * @public @method genSQL(jsonquery)
     *
     * @param JSON-Object jsonquery - the query object
     *
     * helper function for testing query string generation
     */
    DBHelper.prototype.genSQL = function(jsonquery) {
        var qq = [];
        this.queryHelper(jsonquery, qq);
        return qq.join(' ');
    };

    /**
     * @public @method parseJSONQuery(json, selectflag)
     * @param JSON object json - the JSON containing the query specification
     * @param Boolean selectflag - flag to force select queries if no explicit result set is provided.
     *
     * parseJSONQuery processes the query statement given in the JSON object.
     *
     * it accepts the following core keys
     * - result (used for select statements)
     * - target (used for update statements)
     * - from or source to refer to the relations to query
     * - group for group by in select statements
     * - order for order by in select statements
     * - where (optional) for where clauses
     *
     * The where key can be ommitted as the JSON Query is basically designed as a
     * where clause definition.
     */
    DBHelper.prototype.parseJSONQuery = function (objQuery, selectFlag) {
        var retval = {};
        var aTmp = [];

        if (objQuery && typeof objQuery === 'object') {
            if (objQuery.hasOwnProperty('select')) {
                objQuery.result = objQuery.select;
                delete objQuery.select;
            }

            if (!selectFlag && objQuery.hasOwnProperty('set')) {
                objQuery.target = objQuery.set;
                delete objQuery.set;
            }

            if (selectFlag && !objQuery.hasOwnProperty('result')) {
                objQuery.result = [];
            }

            if (objQuery.hasOwnProperty('result')) {
                selectFlag = true;
            }

            retval.from = this.tableHelper(objQuery.source || objQuery.from || objQuery.table || objQuery.tables, selectFlag);
            delete objQuery.source;
            delete objQuery.from;
            delete objQuery.table;
            delete objQuery.tables;

            if (objQuery.hasOwnProperty('result')) {
                if (typeof objQuery.result === 'string') {
                    retval.result = objQuery.result;
                }
                else if (Array.isArray(objQuery.result)) {
                    aTmp = [];
                    objQuery.result.forEach(function (te) {
                        if (typeof te === 'string') {
                            aTmp.push(te);
                        }
                        else if (Array.isArray(te)) { // we have an aggregate
                            if (te.length > 1) {
                                aTmp.push(te[0] + " as " + te[1]);
                            }
                            else {
                                aTmp.push(te[0]);
                            }
                        }
                        else { // we got an object reference
                            Object.getOwnPropertyNames(te).forEach(function (tableKey) {
                                aTmp.push(tableKey + '.' + te[tableKey]);
                            });
                        }
                    });

                    if (aTmp.length) {
                        retval.result = aTmp.join(', ');
                    }
                    else {
                        retval.result = '*';
                    }
                }
                else {
                    Object.getOwnPropertyNames(objQuery.result).forEach(function (tableKey){
                        if (typeof objQuery.result[tableKey] === 'string') {
                            aTmp.push(tableKey + '.' + objQuery.result[tableKey]);
                        }
                        else if (Array.isArray(objQuery.result[tableKey])) {
                            aTmp = [];
                            objQuery.result[tableKey].forEach(function (c) {
                                aTmp.push(tableKey + '.' + c);
                            });
                        }
                        retval.result = aTmp.join(', ');
                    });
                }
            }
            delete objQuery.result;

            // the targets are used for update operations
            // the target member points to an array of column/value relations

            if (!selectFlag && objQuery.hasOwnProperty("target")) {
                aTmp = [];
                retval.targetValues = [];

                if(Array.isArray(objQuery.target)) {
                    objQuery.target.forEach(function (te) {
                        Object.getOwnPropertyNames(te).forEach(function (k) {
                            aTmp.push(k + ' = ?');
                            retval.targetValues.push(te[k]);
                        });
                    });
                }
                else if (typeof objQuery.target === 'object') {
                    Object.getOwnPropertyNames(objQuery.target).forEach(function (k) {
                        aTmp.push(k + ' = ?');
                        retval.targetValues.push(objQuery.target[k]);
                    });
                }
                retval.target = aTmp.join(', ');
            }
            delete objQuery.target;

            if (objQuery.hasOwnProperty("group")) {
                if (typeof objQuery.group === 'string') {
                    retval.group = objQuery.group;
                }
                else if (Array.isArray(objQuery.group)) {
                    retval.group = objQuery.group.join(', ');
                }
            }
            delete objQuery.group;

            if (objQuery.hasOwnProperty('order')) {
                if (typeof objQuery.order === 'string') {
                    retval.order = objQuery.order;
                }
                else if (Array.isArray(objQuery.order)){
                    retval.order = objQuery.order.join(', ');
                }
                else if (typeof objQuery.order === 'object') {
                    var tOrder = [];

                    Object.getOwnPropertyNames(objQuery.order).forEach(function (k) {
                        var tval = k;
                        if (objQuery.order[k] !== undefined) {
                            switch(objQuery.order[k].toLowerCase()) {
                                case 'desc':
                                case 'd':
                                case 'descending':
                                case '-':
                                    tval += ' DESC';
                                    break;
                                case 'asc':
                                case 'a':
                                case 'ascending':
                                case '+':
                                    tval += ' ASC';
                                    break;
                                default:
                                    break;
                            }
                        }
                        tOrder.push(tval);
                    });

                    if (tOrder.length) {
                        retval.order = tOrder.join(', ');
                    }
                }

                if (objQuery.hasOwnProperty("sort") && typeof objQuery.sort === 'string') {
                    switch(objQuery.sort.toLowerCase()) {
                        case 'desc':
                        case 'd':
                        case 'descending':
                            retval.order = retval.order + ' DESC';
                            break;
                        default:
                            retval.order = retval.order + ' ASC';
                            break;
                    }
                }
            }
            delete objQuery.sort;
            delete objQuery.order;

            if (objQuery.hasOwnProperty("distinct")) {
                retval.distinct = objQuery.distinct;
            }
            delete objQuery.distinct;

            if (objQuery.hasOwnProperty("where")) {
                retval.where = this.parseWhere(objQuery.where);
            }
            else {
                retval.where = this.parseWhere(objQuery);
            }
        }
        return retval;
    };

    /**
     * @public @method queryHelper(jsonobject, queryArray)
     * @param Object jsonobject - JSON Query Object
     * @param Array queryArray - query string object (required
     *
     * This helper function generates the sequence of a SQL query string
     * from the jsonquery object. This helper function allows to generate
     * SELECT, DELETE, and UPDATE queryies
     *
     * The queryArray should include a hint which kind of query should be
     * executed.
     *
     * In order to create an executable query string, one needs to join the
     * queryArray.
     *
     * For update queries, one needs to accept the return value. In this case
     * the return value will be an array of the data elements for the SET clause.
     */
    DBHelper.prototype.queryHelper = function (jsonobject, query, selectflag) {
        var qobj = this.parseJSONQuery(jsonobject, selectflag);

        if (qobj.hasOwnProperty("result")) {
            query.push('SELECT');
            if (qobj.distinct) {
                query.push('DISTINCT');
            }
            query.push(qobj.result);
        }
        else if (qobj.hasOwnProperty("target")) {
            query.push('UPDATE');
            query.push(qobj.from);
            query.push('SET');
            query.push(qobj.target);
        }
        else {
            query.push('DELETE');
        }


        if (!qobj.hasOwnProperty('target')) {
            query.push('FROM');
            query.push(qobj.from);
        }


        if (qobj.hasOwnProperty('where') && qobj.where.length) {
            query.push('WHERE');
            query.push(qobj.where);
        }

        if (qobj.hasOwnProperty('result')) {
            if (qobj.hasOwnProperty('group') && qobj.group.length) {
                query.push('GROUP BY');
                query.push(qobj.group);
            }
            if (qobj.hasOwnProperty('order') && qobj.order.length) {
                query.push('ORDER BY');
                query.push(qobj.order);
            }
        }

        return qobj.targetValues;
    };

    /**
     * @public @method tableHelper(tables, selectflag)
     * @param Mixed tables - the from/source clause from JSON Query
     * @param Boolean selectflag - force into select mode, if no explicit result set has been provided
     *
     * Generates the table string used for callbacks and query string generation.
     */
    DBHelper.prototype.tableHelper = function (tabs, selectflag) {
        if (typeof tabs === 'string') {
            return tabs;
        }

        var qq, aTmp = [];

        if (Array.isArray(tabs)) {
            if (selectflag) {
                tabs.forEach(function (te) {
                    if (typeof te === 'string') {
                        aTmp.push(te);
                    }
                    else {
                        Object.getOwnPropertyNames(te).forEach(function (tableKey) {
                            aTmp.push(te[tableKey] + ' ' +  tableKey);
                        });
                    }
                });
            }
            else {
                var thelper = tabs[0];
                if (typeof thelper === 'string') {
                    aTmp.push(thelper);
                }
                else {
                    Object.getOwnPropertyNames(thelper).forEach(function (tableKey) {
                        aTmp.push(thelper[tableKey]);
                    });
                }
            }
        }
        else {
            // use only one table for delete and update queries
            var sOn = "", sJoin = "";

            Object.getOwnPropertyNames(tabs).forEach(function (tableKey){
                sOn = "";
                sJoin = "";
                switch (tableKey) {
                    case "inner join":
                        if (Array.isArray(tabs["inner join"])) {
                            sJoin = tabs["inner join"][0];
                            if (!tabs.hasOwnProperty("on")) {
                                sJoin += " natural ";
                            }
                            sJoin += " inner join "+ tabs["inner join"][1];
                        }
                        else {
                            Object.getOwnPropertyNames(tabs["inner join"]).forEach(function (v, j) {
                                if (j) {
                                    if (!tabs.hasOwnProperty("on")) {
                                        sJoin += " natural ";
                                    }
                                    sJoin += " inner join ";
                                }
                                sJoin += tabs["inner join"][v];
                            });
                        }
                        break;
                    case "on":
                        sOn = this.parseWhere(tabs.on);
                        break;
                    default:
                        if (selectflag) {
                            if (typeof tabs[tableKey] === 'object') {
                                qq = [];
                                this.queryHelper(tabs[tableKey], qq, true);
                                aTmp.push('(' + qq.join(' ') + ') ' + tableKey);
                            }
                            else {
                                aTmp.push(tabs[tableKey] + ' ' + tableKey);
                            }
                        }
                        else {
                            if (typeof tabs[tableKey] !== 'object') {
                                aTmp.push(tabs[tableKey]);
                            }
                        }
                        break;
                }
                if (selectflag && sJoin.length) {
                    if (sOn.length) {
                        sJoin += " ON " + sOn;
                    }
                    aTmp.push(sJoin);
                }
            });
        }
        return aTmp.join(', ');
    };

    /**
     * @public @method String parseWhere(whereObject, valuelist)
     * @param Object whereObject - object structre representing the where clause
     *
     * This function is a helper function for parsing the where clause in object
     * notation. This allows to create where strings based on datavalues without
     * concerning the SQL structure.
     *
     * The object notation allows ONE operator as a key in an dictionary object
     * and expects an Array or a dictionary object as a value.
     *
     * Examples:
     *
     * {'=' : ['id', 1]} translates to "id = 1"
     *
     * {'and': [{'>': [id]}, {'=': ['foo', 'bar']}]} translates to "id > ? and foo = bar"
     *
     * {'and': [{'>': 'foo'}, {'in', {'foo': [1,2,3,4,5,6]}}]} translates into "foo > ? and foo IN (1,2,3,4,5,6)"
     *
     */
    DBHelper.prototype.parseWhere = function (wo, values) {
        var self = this;
        var i, b, qqstr, instring, retstr = "";

        // helper function for quote callbacks for IN Clauses
        function pushQuotes(str) {
            qqstr.push(self.quoteData(str));
        }

        if(wo) {
            if (typeof wo === 'string') {
                retstr = wo;
            }
            if (typeof wo === 'object') {
                Object.getOwnPropertyNames(wo).forEach(function (k){
                    switch (k) {
                       case 'or':
                       case 'and':
                           b = [];
                           for (i = 0; i < wo[k].length; i++) {
                               b.push(this.parseWhere(wo[k][i], values));
                           }
                           retstr = b.join(' ' + k.toUpperCase() + ' ');
                           break;
                       case 'in':
                            Object.getOwnPropertyNames(wo.in).forEach(function (l) {
                                qqstr = [];
                                if (Array.isArray(wo.in[l])) {
                                    wo.in[l].forEach(pushQuotes);
                                    instring = qqstr.join(', ');
                                }
                                else if (typeof wo.in[l] === 'object') {
                                    // nested query
                                    qqstr = [];
                                    this.queryHelper(wo.in[l], qqstr, true);
                                    instring = qqstr.join(' ');
                                }
                                if (instring && instring.length) {
                                    retstr = l + ' IN (' + instring + ')';
                                }
                            });
                            break;
                        default:
                            if (typeof wo[k] === 'object') {
                                // use array notation to compare columns
                                if (Array.isArray(wo[k]) && wo[k].length) {
                                    retstr = wo[k].shift() + ' ' + k.toUpperCase() + ' ';
                                    if (wo[k].length) {
                                        retstr = retstr + wo[k].shift();
                                    }
                                    else {
                                        retstr = retstr + '?';
                                    }
                                }
                                else {
                                    // use key value pairs to compate actual values
                                    Object.getOwnPropertyNames(wo[k]).some(function (tk) {
                                        retstr = tk + " " + k.toUpperCase() + " ";
                                        if (wo[k][tk] || wo[k][tk] === 0) {
                                            if (typeof wo[k][tk] === "string") {
                                                retstr = retstr + self.quoteData(wo[k][tk]);
                                            }
                                            else {
                                                retstr = retstr + wo[k][tk];
                                            }
                                        }
                                        else {
                                            retstr = retstr + '?';
                                        }
                                        return true;
                                    });
                                }
                            }
                            else if (typeof wo[k] === 'string' && wo[k].length) {
                                retstr = wo[k] + ' ' + k.toUpperCase() + ' ?' ;
                            }
                            break;
                    }
                });
            }
        }
        return retstr;
    };

    /** **********************************************************************
     * Database query functions
     */

    /**
     * @public @method init(defTables)
     * @param Object defTables - table definition
     *
     * The init() method accepts table definition and creates a set of tables.
     * The method processes the table definition and calls the create() method.
     *
     * This function is typically called from within the constructor.
     */
    DBHelper.prototype.init = function(defTables) {
        var self = this;

        if (defTables) {
            self.options.init = defTables;
        }

        if (self.options.init) {
            // @public @property Object db - WebSQL database handle
            // console.log('open DB ' + dbname);
            var dbname    = self.options.name,
                dbversion = self.options.version,
                dbtitle   = self.options.title,
                dblimit   = self.options.size;

            if (!self.db) {
                self.db = a.openDatabase(dbname,
                                         '',
                                         dbtitle,
                                         dblimit);

                // check if we need to upgrade
                var db = self.db;
                if (db.version && db.version.length && db.version !== dbversion) {
                    return this.upgradeVersion();
                }
                return this.createTables(self.options.init).then(function () { return self.bumpDBVersion(); });
            }
            return this.createTables(self.options.init);
        }

        return Promise.reject({'type': 'init', 'error': {'message': "No table definition found"}});
    };

    DBHelper.prototype.upgradeVersion = function() {
        var self = this;
        var db = this.db;
        if (self.options.upgrade &&
            Array.isArray(self.options.upgrade) &&
            self.options.upgrade.length) {

            // order by source version numbers
            self.options.upgrade.sort(function (a,b) { return (a.source > b.source) ? 1 : ((b.source > a.source) ? -1 : 0);});
            // skip all upgrade functions for prior versions
            while (self.options.upgrade.length && self.options.upgrade[0].source < db.version) {
                // console.log('skip ' + self.options.upgrade[0].source);
                self.options.upgrade.shift();
            }

            // if we still need to upgrade
            if (self.options.upgrade.length) {
                // console.log(' start the upgrade loop');
                return self.nextUpgrade();
            }
        }

        return self.bumpDBVersion();
    };

    DBHelper.prototype.bumpDBVersion = function (v) {
        var self = this;
        var db = self.db;
        if (!db) {
            return Promise.reject({'type': 'upgrade', 'error': {'message': 'no database for upgrading'}});
        }

        if (!(v && v < self.options.version)) {
            v = self.options.version;
        }
        if (db.version < v) {
            return new Promise(function (resolve, reject) {
                db.changeVersion(db.version,
                                 v,
                                 noop,
                                 reject,
                                 resolve);
            });
        }
        if (db.version > v) {
            return Promise.reject({'type': 'upgrade',
                                   'error': {'message': 'cannot upgrade from ' + db.version + ' to ' + v}});
        }

        return Promise.resolve({'type': 'upgrade', 'version': db.version});
    };

    DBHelper.prototype.nextUpgrade = function () {
        var self = this;
        var db = self.db;
        var uo = self.options.upgrade.shift();
        if (uo) {
            var up = uo.upgrade;
            var us = uo.source;
            var ut = uo.target;
            if (String(us) === db.version &&
                typeof up === 'function' &&
                ut <= self.options.version) {
                return new Promise(function (resolve, reject) {
                    // upgrade as long the db is within version bounds
                    db.changeVersion(us,
                                     ut,
                                     function (t) {
                                         self.transaction = t;
                                         up.call(self).then(resolve, reject);
                                         self.transaction = null;
                                     },
                                     noop,
                                     noop);
                }).then(function() { return self.nextUpgrade(); });
            }
            if (us > db.version && us < self.options.version) {
                self.options.upgrade.unshift(uo);
                return self.bumpDBVersion(us).then(function() { return self.nextUpgrade(); });
            }
        }

        if (db.version < self.options.version) {
            return self.bumpDBVersion();
        }

        return Promise.resolve();
    };

    /**
     * @public @method create(tablename, dataDefinition)
     * @param String tablename - the name of the relation to create
     * @param Object dataDefinition - column definition
     *
     * Creates a relation in the database with the provided name.
     *
     * The dataDefinition object is defined by a column as a key and
     * a column definition as the value.
     *
     * The create function will not create a relation when a relation with the
     * same name already exists.
     *
     * Example:
     *    dbh.create('dummy', {'id': 'INTEGER PRIMARY KEY', 'sometext': 'CHAR(20)'});
     */
    DBHelper.prototype.create = function (table, dataDef) {
        var self = this, fields = [], tab = table;

        Object.getOwnPropertyNames(dataDef).forEach(function (key) {
            fields.push(key + ' ' + dataDef[key]);
        });

        var query = 'CREATE TABLE IF NOT EXISTS ' + table + ' (' + fields.join(', ') + ')';

        return new Promise(function(resolve, reject) {
            function cbError(tx,e) {
                // handle the error
                self.transaction = tx;
                reject({'type': 'create', 'error': e, 'table': tab, 'query': query});
                self.transaction = null;
            }

            function cbResult(tx) {
                self.transaction = tx;
                resolve({'type': 'create', 'table': tab, 'data': dataDef});
                self.transaction = null; // this may or may not work ...
            }

            if (self.transaction) {
                // console.log('execute creation');
                self.transaction.executeSql(query, null, cbResult, cbError);
            }
            else {
                var db = self.initdb || self.db;
                db.transaction(function(transaction) {
                    transaction.executeSql(query, null, cbResult, cbError);
                });
            }
        });
    };

    DBHelper.prototype.alter = function (table, dataDef) {
        var self = this, fields = [], tab = table;
        Object.getOwnPropertyNames(dataDef).forEach(function (key){
            fields.push(key + ' ' + dataDef[key]);
        });

        var query = 'ALTER TABLE ' + table + ' add ' + fields.join(', ');

        return new Promise(function (resolve, reject) {
            function cbError(tx,e) {
                // handle the error
                self.transaction = tx;
                reject({'type': 'alter', 'error': e, 'table': tab, 'query': query});
                self.transaction = null;
            }

            function cbResult(tx) {
                self.transaction = tx;
                resolve({'type': 'alter', 'table': tab, 'data': dataDef});
                self.transaction = null; // this may or may not work ...
            }

            if (self.transaction) {
                // console.log('execute creation');
                self.transaction.executeSql(query, null, cbResult, cbError);
            }
            else {
                var db = self.initdb || self.db;
                db.transaction(function(transaction) {
                    transaction.executeSql(query, null, cbResult, cbError);
                });
            }
        });
    };

    /**
     * @public @method drop(tablename)
     * @param String tablename - the name of the relation to drop
     *
     * The drop method removes the relation named as the provided tablename from the database.
     * The table and all its data will be removed.
     */
    DBHelper.prototype.drop = function (table) {
        var self = this;
        var query;
        return new Promise(function (resolve, reject) {
            function cbError(tx,e) {
                    // handle the error
                self.transaction = tx;
                reject({'type': 'drop', 'error': e, 'table': table, 'query': query});
                self.transaction = null;
            }

            function cbResult(tx) {
                self.transaction = tx;
                resolve({'type': 'drop', 'table': table});
                self.transaction = null;
            }

            if(table && typeof table === 'string' && table.length) {
                query = 'DROP TABLE ' + table;

                if (self.transaction) {
                    self.transaction.executeSql(query, null, cbResult, cbError);
                }
                else {
                    self.db.transaction(function(transaction) {
                        transaction.executeSql(query, null, cbResult, cbError);
                    });
                }
            }
        });
    };

    /**
     * @public @method insert(tablename, dataObject, cbSuccess)
     * @param String tablename - the name of the relation
     * @param Object dataObject - the data to insert
     * @param Function cbSuccess (optional) - callback to respond on the insertID
     *
     * The insert methods inserts the provided dataoObject into the named relation.
     * The dataObject has the column name as a key and the provided value for the key will be inserted.
     *
     * If no data is provided in the data object this function will do nothing.
     *
     * Sometimes it is necessary to wait for the primary key of the newly created entry.
     * For these cases one can optionally provide a on success callback that will receive the
     * primary key and the original dataObject as parameters.
     *
     * Example
     *     db.insert('foo', {'name':'bar'}, function(id, data){ if (data.name === 'bar') console.log('OK'); });
     */
    DBHelper.prototype.insert = function(table, dataObj) {
        var self      = this,
            fields    = [],
            values    = [],
            valuestr  = [];

        var query,
            keys;

        keys = Object.getOwnPropertyNames(dataObj);
        keys.forEach(function (key) {
            fields.push(key);
            valuestr.push('?');
            values.push(dataObj[key]);
        });

        if (table &&
            typeof table === 'string' &&
            table.length &&
            fields.length) {
            return new Promise(function (resolve, reject) {

                // @param @object transaction - the database transaction object
                // @param @object error - the javascript error object
                function cbError(tx,e) {
                    // handle the error
                    self.transaction = tx;
                    reject({'type': 'insert', 'error': e, 'table': table, 'query': query});
                    self.transaction = null;
                }

                function cbResult(tx, r) {
                    self.transaction = tx;
                    resolve({'type': 'insert', 'insertId': r.insertId, 'table': table, 'data': dataObj});
                    self.transaction = null;
                }

                query = 'INSERT INTO ' + table + ' (' + fields.join(',') + ') VALUES (' + valuestr.join(',') + ')';

                if (self.transaction) {
                    self.transaction.executeSql(query,
                                                values,
                                                cbResult,
                                                cbError);
                }
                else {
                    self.db.transaction(function(transaction) {
                        transaction.executeSql(query,
                                               values,
                                               cbResult,
                                               cbError);
                    });
                }


            });
        }
        return Promise.reject({'type': 'insert', 'error': {'message': 'Cannot insert: no table or data provided'}});
    };

    /**
     * @public @method select(jsonquery, valueArray, cbSuccess)
     * @param Mixed jsonquery
     * @param Array valueArray (optional) - optional data for the where clause.
     * @param Function cbSuccess - callback function to process the rows in the resultset.
     *
     * This method provides a simple query function for selecting data from relations.
     *
     * The actual query is defined as a JSON statement.
     *
     * The valueArray contains all variable parts for the query
     */
    DBHelper.prototype.select = function (jsonquery, values) {
        var self = this;

        var query = [],
            table,
            valList = [];

        table = this.tableHelper(jsonquery.source || jsonquery.from || jsonquery.table || jsonquery.tables, true);

        this.queryHelper(jsonquery, query, true);

        var qstring;
        if (table && table.length) {
            qstring = query.join(' ');
        }
        else {
            return Promise.reject({'type': 'select', 'error': {'message': 'no table for select provided'}});
        }

        if (values) {
            valList = values;
        }

        if (qstring && qstring.length) {
            return new Promise(function (resolve, reject) {
                function cbError(tx,e) {
                    // handle the error
                    self.transaction = tx;
                    reject({'type': 'select', 'error': e, 'table': table, 'query': query});
                    self.transaction = null;
                }

                function cbResult(tx, res) {
                    self.transaction = tx;
                    resolve({'type': 'select', 'rows': res.rows, 'table': table});
                    self.transaction = null;
                }

                if (self.transaction) {
                    self.transaction.executeSql(qstring,
                                                valList,
                                                cbResult,
                                                cbError);
                }
                else {
                    self.db.transaction(function(transaction) {
                        transaction.executeSql(qstring,
                                               valList,
                                               cbResult,
                                               cbError);
                    });
                }
            });
        }

        return Promise.reject({'type': 'select', 'error': {'message': 'Invalid query condition'}});
    };

    /**
     * @public @method delete(tablename, whereString, datalist)
     * @param String tablename - relation name from where entries should be deleted
     * @param String whereString - constraints for deleting entries
     * @param Array datalist - variable elements for whereString placeholders
     *
     * This method deletes entries from a relation according to the provided where clause.
     */
    DBHelper.prototype.delete = function (jsonquery, dataList) {
        var self  = this;
        var query = [];

        var table = this.tableHelper(jsonquery.from || jsonquery.source || jsonquery.table || jsonquery.tables);

        this.queryHelper(jsonquery, query);
        // var qobj = this.parseJSONQuery(jsonquery);

        if (!dataList) {
            dataList = [];
        }

        var qstring;
        if (table) {
            qstring = query.join(' ');
        }
        else {
            return Promise.reject({'type': 'delete', 'error': {'message': 'no table for delete provided'}});
        }

        return new Promise( function (resolve, reject) {
            // @param @object transaction - the database transaction object
            // @param @object error - the javascript error object
            function cbError(tx,e) {
                // handle the error
                self.transaction = tx;
                reject({'type': 'delete', 'error': e, 'table': table, 'query': query});
                self.transaction = null;
            }

            function cbResult(tx) {
                self.transaction = tx;
                resolve({'type': 'delete', 'table': table, 'data': dataList});
                self.transaction = null;
            }
            if (self.transaction) {
                self.transaction.executeSql(qstring,
                                            dataList,
                                            cbResult,
                                            cbError);
            }
            else {
                self.db.transaction(function(transaction) {
                    transaction.executeSql(qstring,
                                           dataList,
                                           cbResult,
                                           cbError);
                });
            }
        });
    };

    /**
     * @public @method update(tablename, dataFields, whereString, dataList)
     * @param String tablename - relation name from where entries should be deleted
     * @param Object dataField - columns and values that will be updated
     * @param String whereString - constraints for deleting entries
     * @param Array datalist - variable elements for whereString placeholders
     *
     * Updates the entries in tablename that match the where clause in whereString.
     * The update() method will insert the values in dataFields into the associated columns.
     *
     * Example:
     *
     *    db.update('foo', {'name': 'baz'}, 'name = ?', ['bar']); // renames all entries with name = 'bar' to 'baz'
     */
    DBHelper.prototype.update = function (jsonquery, dataList) {
        var self   = this,
            values = [];

        var query = [];
        var table = this.tableHelper(jsonquery.from || jsonquery.source || jsonquery.table || jsonquery.tables);

        values = this.queryHelper(jsonquery, query);

        if (!(table && table.length)) {
            return Promise.reject({'type': 'update', 'error': {'message': 'no table to update provided'}});
        }

        if (dataList && dataList.length) {
            values.push(dataList);
        }

        return new Promise( function (resolve, reject) {
            // @param @object transaction - the database transaction object
            // @param @object error - the javascript error object
            function cbError(tx,e) {
                // handle the error
                self.transaction = tx;
                reject({'type': 'update', 'error': e, 'table': table, 'query': query.join(' '), 'data': values });
                self.transaction = null;
            }

            function cbResult(tx) {
                self.transaction = tx;
                resolve({'type': 'update', 'table': table, 'data': values});
                self.transaction = null;
            }

            if (self.transaction) {
                self.transaction.executeSql(query.join(' '),
                                            values,
                                            cbResult,
                                            cbError);
            }
            else {
                self.db.transaction(function(transaction) {
                    transaction.executeSql(query.join(' '),
                                           values,
                                           cbResult,
                                           cbError);
                });
            }
        });
    };

    /**
     * @public @method clearAllTables()
     *
     * remove all data from the tables in the init set.
     */
    DBHelper.prototype.clearAllTables = function () {
        var p = [];

        if (this.options && this.options.init && typeof this.options.init === 'object')  {
            Object.getOwnPropertyNames(this.options.init).forEach(function(k){
                p.push(this.delete(k));
            }, this);

            return Promise.all(p);
        }

        return Promise.reject({'type': 'clearall', 'error': {'message': 'No table definition available'}});
    };

    /**
     * @public @method dropAllTables()
     *
     * Remove all tables in the init set from the database.
     * This will also remove all data in the database.
     */
    DBHelper.prototype.dropAllTables = function () {
        var p = [];
        if (this.options && this.options.init && typeof this.options.init === 'object')  {
            Object.getOwnPropertyNames(this.options.init).forEach(function(k){
                p.push(this.drop(k));
            }, this);
            return Promise.all(p);
        }
        return Promise.reject({'type': 'dopall', 'error': {'message': 'No table definition available'}});
    };

    /**
     * @public @method installAllTables()
     *
     * Runs the init() function using the existing init set.
     * This function is very useful if the database needs to be reset completely
     * during runtime. In this case a developer might want to call:
     *
     *  db.dropAllTables();
     *  db.installAllTables();
     */
    DBHelper.prototype.installAllTables = function () {
        if (this.options && this.options.init) {
            return this.createTables(this.options.init);
        }
        return Promise.reject({'type': 'installall', 'error': {'message': 'No table definition available'}});
    };

    // low level function for init() and installAllTables
    DBHelper.prototype.createTables = function (dT) {
        var p = [];
        if (dT) {
            Object.getOwnPropertyNames(dT).forEach(function(k) {
                p.push(this.create(k, dT[k]));
            }, this);
            return Promise.all(p);
        }
        return Promise.reject({'type': 'createall', 'error': {'message': 'No table definition available'}});
    };

    if (!a.DBHelper) {
        a.DBHelper = DBHelper;
    }
}(window));
