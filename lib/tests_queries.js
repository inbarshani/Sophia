var sophia_config = require('./sophia_config');
var fs = require('fs');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(sophia_config.TESTS_DB_FILE);

var queries = {

    importScheme: function() {
        fs.readFile(sophia_config.TESTS_DB_SCHEME_FILE, 'utf-8', function(err, data) {
            if (err)
                console.log('failed to read scheme file: ' + err);
            else {
                db.exec(data, function(err) {
                    if (err)
                        console.log('failed to run scheme: ' + data +
                            '\n due to error: ' + err);
                    else
                        console.log('completed scheme import: ' + data);
                });
            }
        });
    },

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
                                        callback(null, testId);
                                }
                            }
                        });
                    }
                });
            }
        });
    }, // save

    getTestByID: function(id, dateCondition, callback) {
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
                                var query = "SELECT ID, CREATED FROM SOP_RUN WHERE TEST_ID=$test";
                                var queryParams = {
                                    $test: id
                                };
                                if (dateCondition.from) {
                                    query += ' AND CREATED >= $from';
                                    queryParams['$from'] = new Date(dateCondition.from).toUTCString();
                                }
                                if (dateCondition.to) {
                                    query += ' AND CREATED <= $to';
                                    queryParams['$to'] = new Date(dateCondition.to).toUTCString();
                                }
                                query += ' ORDER BY CREATED DESC';
                                db.get(query, queryParams, function(err, row) {
                                    if (err) {
                                        if (callback) {
                                            console.log('error in selecting from SOP_RUN: ' + JSON.stringify(err));
                                            callback(err);
                                        }
                                    } else {
                                        if (row) {
                                            test.updated = row.CREATED;
                                            db.all("SELECT QUERY_ID, RESULTS_COUNT FROM SOP_RUN_QUERY WHERE RUN_ID=? ORDER BY QUERY_ID", 
                                                row.ID, function(err, rows) {
                                                if (err) {
                                                    console.log('error in selecting from SOP_RUN_QUERY: ' + JSON.stringify(err));
                                                    if (callback)
                                                        callback(err);
                                                } else {
                                                    for (var i = 0; i < rows.length; i++) {
                                                        test.queries[rows[i].QUERY_ID].result = rows[i].RESULTS_COUNT;
                                                    }
                                                    if (callback)
                                                        callback(null, test);
                                                }
                                            });
                                        } else if (callback)
                                            callback(null, test);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
    }, // getTestByID

    getTestsByType: function(type, name, callback) {
        if (type) {
            var tests = [];
            var query = "SELECT ID, NAME, CREATED, USER FROM SOP_TEST" +
                " WHERE TYPE=$type";
            var queryParams = {
                $type: type
            };
            if (name && name.length > 0) {
                query += ' AND NAME LIKE $name';
                queryParams['$name'] = '%' + name + '%';
            }
            db.all(query, queryParams,
                function(err, rows) {
                    //console.log('db returned with tests by type: '+type);
                    if (err) {
                        if (callback) {
                            console.log('error in getTestsByType: ' + query + '\nError: ' + err);
                            callback(err);
                        }
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
    }, // getTestsByType

    saveTestRun: function(testId, runType, queryRunsArray, callback) {
            var created = new Date().toUTCString();

            db.run("INSERT INTO SOP_RUN(CREATED, TEST_ID, TYPE)" +
                " VALUES ($created, $test, $type)", {
                    $created: created,
                    $test: testId,
                    $type: runType
                },
                function(err) {
                    if (error) {
                        if (callback)
                            callback(err);
                    } else {
                        var runId = this.lastID;
                        var executed = 1;
                        var error = null;
                        db.serialize(function() {
                            for (var i = 0; i < queryRunsArray.length; i++) {
                                db.run("INSERT INTO SOP_RUN_QUERY" +
                                    " (CREATED, RUN_ID, QUERY_ID, RESULTS_COUNT) VALUES" +
                                    " ($created, $run, $query, $result)", {
                                        $created: created,
                                        $run: runId,
                                        $query: i,
                                        $result: queryRunsArray[i].result
                                    },
                                    function(err) {
                                        if (err) {
                                            error = err;
                                        }
                                        if (executed++ == queryRunsArray.length) {
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
        } // saveTestRun
}; // queries

module.exports = queries;
