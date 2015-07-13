var sophia_consts = require('./sophia_consts');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(sophia_consts.TESTS_DB_FILE);

var queries = {

    save: function(user, name, type, description, queriesArray, callback) {
        var created = new Date().toUTCString();

        db.run("INSERT INTO SOP_TEST (NAME, TYPE, CREATED, USER) VALUES ($name, $type, $created, $user)", {
            $name: name,
            $type: type,
            $created: created,
            $user: user
        }, function(err) {
            if (err) {
                if (callback)
                    callback(err);
            } else {
                var testId = this.lastID;
                var executed = 1;
                var error = null;
                db.serialize(function() {
                    for (var i = 0; i < queriesArray.length; i++) {
                        db.run("INSERT INTO SOP_QUERY (QUERY_TEXT, TEST_ID, POSITION, QUERY_TYPE) VALUES ($query, $test, $position, $query_type)", {
                            $query: queriesArray[i].query,
                            $test: testId,
                            $position: i,
                            $query_type: queriesArray[i].type
                        }, function(err) {
                            if (err) {
                                error = err;
                            }
                            if (executed++ == queriesArray.length) {
                                if (error) {
                                    if (callback)
                                        callback(err);
                                } else {
                                    if (callback)
                                        callback();
                                }
                            }
                        });
                    }
                });
            }
        });
    }, // save

    getTestByID: function(id, callback) {
        if (id) {
            var test = {};
            db.serialize(function() {
                db.get("SELECT ID, NAME, TYPE, CREATED, USER FROM SOP_TEST WHERE ID=?", id, function(err, row) {
                    if (err) {
                        if (callback)
                            callback(err);
                    } else {
                        test.id = row.ID;
                        test.name = row.NAME;
                        test.created = row.CREATED;
                        test.user = row.USER;
                        test.type = row.TYPE;
                        test.queries = [];
                        db.all("SELECT ID, QUERY_TEXT, QUERY_TYPE FROM SOP_QUERY WHERE TEST_ID=? ORDER BY POSITION", id, function(err, rows) {
                            if (err) {
                                if (callback)
                                    callback(err);
                            } else {
                                for (var i = 0; i < rows.length; i++) {
                                    test.queries.push({
                                        id: rows[i].ID,
                                        query: rows[i].QUERY_TEXT,
                                        type: rows[i].QUERY_TYPE
                                    });
                                }
                                if (callback)
                                    callback(null, test);
                            }
                        });
                    }
                });
            });
        }
    }, // getTestByID

    getTestsByType: function(type, callback) {
            if (type) {
                var tests = [];
                db.all("SELECT ID, NAME, CREATED, USER FROM SOP_TEST WHERE TYPE=?", type,
                    function(err, rows) {
                        if (err) {
                            if (callback)
                                callback(err);
                        } else {
                            for (var i = 0; i < rows.length; i++) {
                                tests.push({
                                    id: rows[i].ID,
                                    name: rows[i].NAME,
                                    created: rows[i].CREATED,
                                    user: rows[i].USER
                                });
                            }
                            if (callback)
                                callback(null, tests);
                        }
                    });
            }
        } // getTestsByType
}; // queries

module.exports = queries;
