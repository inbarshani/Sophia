var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');
var tests_queries = require('./lib/tests_queries');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sophia.db');

var app = express();
app.use(bodyParser.json());

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/getTopics', function(request, response) {
    var query = request.query.q;
    var dateCondition = JSON.parse(request.query.dateCondition);
    console.log("getTopics query: "+query);
    idol_queries.getTopics(query, null, dateCondition, function(topics) {
        if (topics)
            response.send(JSON.stringify(topics));
        else
            response.send();
    });
});

app.use('/getTopicsLinks', function(request, response) {
    var topicNodesA = JSON.parse(request.query.topicNodesA);
    var topicNodesB = JSON.parse(request.query.topicNodesB);
    console.log("getTopicsLinks query");

    neo4j_queries.countPaths(topicNodesA, topicNodesB, function(numOfPaths) {
        response.send(JSON.stringify(numOfPaths));
    });
});

app.use('/searchFlows', function(request, response) {
    var queryText = request.query.q;
    var dateCondition = JSON.parse(request.query.dateCondition);
    var isFirstQuery = request.query.isFirstQuery;
    var currentNodes = JSON.parse(request.query.currentNodes);

    idol_queries.search(queryText, dateCondition, function(documents_hash) {
        // verify that the nodes of the documents are connected after existing nodes
        //console.log('documents_hash keys: '+require('util').inspect(Object.keys(documents_hash), {depth: 2}));
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.doesPathExists(currentNodes, idolResultNodes, isFirstQuery, function(paths_to_nodes) {
                var last_backbone_nodes = [];
                var last_data_nodes = [];
                // join paths_to_nodes with data from docuemtns
                //console.log('documents_hash: '+require('util').inspect(documents_hash, {depth: 2}));
                paths_to_nodes.map(function(path) {
                    //console.log('mapping path of length: '+path.nodes.length);
                    if (path.last_backbone && last_backbone_nodes.indexOf(path.last_backbone) < 0)
                        last_backbone_nodes.push(path.last_backbone);
                    if (path.last_data && last_data_nodes.indexOf(path.last_data) < 0)
                        last_data_nodes.push(path.last_data);
                    for (var i = 0; i < path.nodes.length; i++) {
                        var node_id = path.nodes[i].id;
                        var node_doc = documents_hash['' + node_id];
                        //console.log('document for '+node_id+' is '+node_doc);
                        path.nodes[i].data = node_doc;
                    }
                });
                var response_body = {
                    paths_to_nodes: paths_to_nodes,
                    last_backbone_nodes: last_backbone_nodes,
                    last_data_nodes: last_data_nodes
                };
                //console.log('paths_to_nodes: '+JSON.stringify(response_body));
                response.send(JSON.stringify(response_body));
            });
        } else // no results from IDOL
        {
            var response_body = {
                paths_to_nodes: [],
                last_backbone_nodes: [],
                last_data_nodes: []
            };
            //console.log('paths_to_nodes: '+JSON.stringify(response_body));
            response.send(JSON.stringify(response_body));
        }
    });
});

app.use('/searchScreens', function(request, response) {
    var queryText = request.query.q;
    var dateCondition = JSON.parse(request.query.dateCondition);
    idol_queries.search(queryText, dateCondition, function(documents_hash) {
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.getNearestScreens(idolResultNodes,
                function(prevScreenTimestamps, nextScreenTimestamps) {
                    var allTimestamps = prevScreenTimestamps.concat(nextScreenTimestamps);
                    response.send(JSON.stringify(allTimestamps));
                });
        }
        else
        {
            response.send(JSON.stringify([]));            
        }
    });
});

app.use('/getScreens', function(request, response) {
    if (request.query.selectedNode) {
        var selectedNodeArray = [];
        selectedNodeArray.push(request.query.selectedNode);
        neo4j_queries.getNearestScreens(selectedNodeArray,
            function(prevScreenTimestamps, nextScreenTimestamps) {
                var prevScreenTimestamp = null, nextScreenTimestamp = null;
                if (prevScreenTimestamps.length > 0)
                    prevScreenTimestamp = prevScreenTimestamps[0];
                if (nextScreenTimestamps.length > 0)
                    nextScreenTimestamp = nextScreenTimestamps[0];
                var results = {
                    prevScreenTimestamp: prevScreenTimestamp,
                    nextScreenTimestamp: nextScreenTimestamp
                };
                console.log('getScreens returned: ' + JSON.stringify(results));
                response.send(JSON.stringify(results));
            });
    }
});

app.use('/screen/:timestamp', function(request, response) {
    var timestamp = request.params.timestamp;
    //console.log('Get screen with timestamp: ' + timestamp);
    if (timestamp) {
        try {
            var img = fs.readFileSync('./upload/' + timestamp + '.jpg');
            response.writeHead(200, {
                'Content-Type': 'image/JPEG'
            });
            response.end(img, 'binary');
        } catch (ex) {
            //console.log('Failed to load screen with timestamp: ' + timestamp);
            response.send('Failed to load screen with timestamp: ' + timestamp);
        }
    }
});

app.use('/report', function(request, response) {
    if (request.query.reportString.length > 0) {
        var reportString = new Date().toUTCString() + ' ' +
            'Client IP: ' + request.connection.remoteAddress + '\n' + 
            request.query.reportString + '\n';
        var username = request.query.user;
        // create audit folder
        try {
            fs.mkdirSync('audit');
        } catch (e) {
            if (e.code != 'EEXIST') throw e;
        }

        // save an audit of the actions done by a user
        fs.appendFile('./audit/'+username+'.log', reportString, function(err) {
            if (err)
                console.log('Error saving audit data: ' + reportString);
        });
    }
    response.send();
});

app.post('/saveTest', function(request, response) {
    if (request._body) {
        var error = null;
        
        var user = request.body.user;
        var name = request.body.name;
        var type = request.body.type;

        tests_queries.save(user, name, type, '', request.body.queries, function(err){
            if (err)
                response.send(err);
            else
                response.sendStatus(200);
        });        
    }
});

app.use('/tests/id/:id', function(request, response) {
    var id = request.params.id;
    tests_queries.getTestByID(id, function(err, test){
        if (err)
            response.send(err);
        else
            response.send(test);
    });
});

app.use('/tests/type/:type', function(request, response) {
    var type = request.params.type;
    tests_queries.getTestsByType(type, function(err, tests){
        if (err)
            response.send(err);
        else
            response.send(tests);        
    });
});

app.use('/searchTrends', function(request, response) {
    var queryText = request.query.q;
    var dateCondition = (request.query.dateCondition) ? JSON.parse(request.query.dateCondition) : {};
    var resultNodes = [];
    var testsCount = 0;
    idol_queries.searchTrends(queryText, dateCondition, function(documents_hash) {
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.getBackboneNodes(idolResultNodes, function(bbNodes) {
                response.send(JSON.stringify(bbNodes));
            });
        } else {// no results from IDOL
            response.send(JSON.stringify([]));
        }
    });
});

function queryTestBackBoneNodes(index, numTests, response) {
    return function() {
        neo4j_queries.getBackboneNodes(idolResultNodes, function(bbNodes) {
            resultNodes[index].b = bbNodes;
            if (index == testsCount - 1) {
                response.send(JSON.stringify(resultNodes));
            }
        });
    }
};


app.listen(8085);