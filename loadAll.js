var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
// clean DB
db.query('MATCH (n) OPTIONAL MATCH (n)-[m]-() DELETE n, m', null, function(err, results) {
    console.log('DB clean');
    if (err) console.error('neo4j query to delete all failed: ' + err + '\n');
    else {
        var loadTestSteps = require('./loadTestSteps');
        var loadMtoursServerLogs = require('./loadMtoursServerLogs');
        var loadMtoursServerCPU = require('./loadMtoursServerCPU');
        var loadMtoursServerMemory = require('./loadMtoursServerMemory');
        var loadTestUserActions = require('./loadTestUserActions');

        console.log('call test steps');
        loadTestSteps.read(function() {
            console.log('call cpu');
            loadMtoursServerCPU.read(function() {
                console.log('call logs');
                loadMtoursServerLogs.read(function() {
                    console.log('call memory');
                    loadMtoursServerMemory.read(function() {
                        console.log('call user actions');
                        loadTestUserActions.read(function() {
                            var linkAll = require("./linkAllToTestSteps");
                            console.log('link all');
                            linkAll.link(function() {
                                console.log('end');
                            });
                        });
                    });
                });
            });
        });
    }
});