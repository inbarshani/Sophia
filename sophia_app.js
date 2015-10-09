var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var sophia_config = require('./lib/sophia_config');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');
var tests_queries = require('./lib/tests_queries');
var phash = require('phash-imagemagick');

var app = express();
app.use(bodyParser.json());

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/getTopics', function(request, response) {
    var query = request.query.q;
    var dateCondition = JSON.parse(request.query.dateCondition);
    console.log("getTopics query: " + query);
    idol_queries.getTopics(query, dateCondition, function(topics) {
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
            neo4j_queries.doesPathExists(currentNodes, idolResultNodes, isFirstQuery,
                function(err, paths_to_nodes) {
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
    idol_queries.search(queryText, dateCondition, true, function(documents_hash) {
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.getNearestScreens(idolResultNodes,
                function(prevScreenTimestamps, nextScreenTimestamps,
                    prevScreenIDs, nextScreenIDs) {
                    var referenceIds = prevScreenIDs.concat(nextScreenIDs);
                    idol_queries.searchByReference(referenceIds, true, true, function(idolDocs) {
                        var group_pivots = [];
                        var groups = {
                            "none": []
                        };
                        referenceIds.forEach(function(refID) {
                            if (!idolDocs[refID])
                                break;
                            if (!idolDocs[refID].phash) {
                                groups.none.push(idolDocs[refID].timestamp);
                            } else {
                                for (var i = 0; i < group_pivots.length; i++) {
                                    if (phash.compare(idolDocs[refID].phash, group_pivots[i]) <
                                        sophia_config.hashSimiliarityThreshold) {
                                        // this result is similar to one of the previous ones
                                        groups["" + i].push(idolDocs[refID].timestamp);
                                        break;
                                    }
                                }
                                if (i == group_pivots.length) {
                                    // new result
                                    groups["" + i] = [idolDocs[refID].timestamp];
                                    group_pivots.push(idolDocs[refID].phash);
                                }
                            }
                        });
                        console.log('grouped images: ' + JSON.stringify(groups));
                        response.send(JSON.stringify(groups));
                    });
                });
        } else {
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
                var prevScreenTimestamp = null,
                    nextScreenTimestamp = null;
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
        fs.appendFile('./audit/' + username + '.log', reportString, function(err) {
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

        tests_queries.save(user, name, type, '', request.body.queries, function(err, testId) {
            if (err)
                response.send(err);
            else {
                // save test run, then send response
                tests_queries.saveTestRun(testId, sophia_config.testRunTypes.USER, request.body.queries);
                response.sendStatus(200);
            }
        });
    }
});

app.post('/tests/:id/runs', function(request, response) {
    //console.log('post test run: '+JSON.stringify(request.params)+' '+JSON.stringify(request.body));
    var id = request.params.id;
    var queries = request.body.queries;
    tests_queries.saveTestRun(id, sophia_config.testRunTypes.USER, queries,
        function(err) {
            if (err)
                response.status(500).send(err);
            else
                response.sendStatus(200);
        });
});

app.get('/tests/:id', function(request, response) {
    //console.log('get test: '+JSON.stringify(request.params)+' '+JSON.stringify(request.query));
    var id = request.params.id;
    var dateCondition = (request.query.dateCondition) ? JSON.parse(request.query.dateCondition) : {};
    tests_queries.getTestByID(id, dateCondition, function(err, test) {
        if (err)
            response.status(500).send(err);
        else
            response.send(test);
    });
});

app.get('/tests', function(request, response) {
    console.log('get tests: ' + JSON.stringify(request.query));
    var type = request.query.type;
    var name = request.query.name;
    tests_queries.getTestsByType(type, name, function(err, tests) {
        if (err)
            response.status(500).send(err);
        else
            response.send(tests);
    });
});


app.use('/searchReview', function(request, response) {
    var queryText = request.query.q;
    var testStepID = '';
    if (queryText.match(/StepID=[0-9]{1,6}/)) {
        testStepID = queryText.split('=')[1];
    }
    var dateCondition = (request.query.dateCondition) ? JSON.parse(request.query.dateCondition) : {};
    if (testStepID.length == 0)
        searchTestsByName(queryText, dateCondition, response);
    else
        searchSimilarTestSteps(testStepID, dateCondition, response);

});


app.use('/searchError', function(request, response) {
    var queryText = request.query.q;
    var dateCondition = (request.query.dateCondition) ? JSON.parse(request.query.dateCondition) : {};
    var results = {
        dataNodes: {},
        backboneNodes: []
    };
    var isExpendedData = true;
    if (request.query.isExpendedData !== null) {
        isExpendedData = request.query.isExpendedData;
    }
    idol_queries.search(queryText, dateCondition, isExpendedData, function(documents_hash) {
        var idolResultNodes = Object.keys(documents_hash);
        var dataDocs = {};
        var dataResultsNodes = [];
        if (idolResultNodes.length > 0) {
            for (var i = 0; i < idolResultNodes.length; i++) {
                var doc = documents_hash[idolResultNodes[i]];
                if (sophia_config.backboneTypes.indexOf(doc.type) < 0) {
                    // this is a data node
                    results.dataNodes[idolResultNodes[i]] = doc;
                    dataResultsNodes.push(idolResultNodes[i]);
                }
            }
            neo4j_queries.getBackboneNodesForDataNodes(dataResultsNodes, function(nodes) {
                var referenceIds = [];
                nodes.map(function(test) {
                    test.bbNodes.map(function(node) {
                        referenceIds.push(node.id);
                    });
                });
                idol_queries.searchByReference(referenceIds, false, false, function(idolDocs) {
                    var idolResultNodes = Object.keys(idolDocs);
                    nodes.map(function(test) {
                        //console.log('searchTestsByName bbNodes test: '+
                        //    require('util').inspect(test, {depth:4}));
                        test.name = documents_hash['' + test.test.id].name;
                        test.bbNodes.map(function(node) {
                            var doc = idolDocs[node.id];
                            if (doc) {
                                node.caption = doc.caption;
                            }
                        });
                    });
                    results.backboneNodes = nodes;
                    response.send(JSON.stringify(results));
                });
            });
        }
    });
});

app.use('/searchBackBoneData', function(request, response) {
    var compareObjData = JSON.parse(request.query.o);
    var results = [];

    function getIdolNodesData(i) {
        if (i >= compareObjData.length) {
            response.send(JSON.stringify(results));
        } else {
            idol_queries.searchByReference(compareObjData[i].dataNodes, false, false, function(idolDocs) {
                results.push({
                    testId: compareObjData[i].testId,
                    testName: compareObjData[i].testName,
                    dataNodes: idolDocs
                });
                getIdolNodesData(i + 1);
            });
        }
    }
    getIdolNodesData(0);
});

app.use('/testNodesData', function(request, response) {
    var nodes = JSON.parse(request.query.nodes);
    neo4j_queries.getDataNodesStats(nodes, function(stats) {
        response.send(JSON.stringify(stats));
    });
});

function searchTestsByName(queryText, dateCondition, response) {
    idol_queries.searchReview(queryText, dateCondition, function(documents_hash) {
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.getBackboneNodes(idolResultNodes, function(bbNodes) {
                var referenceIds = [];
                bbNodes.map(function(test) {
                    test.bbNodes.map(function(node) {
                        referenceIds.push(node.id);
                    });
                });
                idol_queries.searchByReference(referenceIds, false, false, function(idolDocs) {
                    var idolResultNodes = Object.keys(idolDocs);
                    bbNodes.map(function(test) {
                        //console.log('searchTestsByName bbNodes test: '+
                        //    require('util').inspect(test, {depth:4}));
                        test.name = documents_hash['' + test.test.id].name;
                        test.bbNodes.map(function(node) {
                            var doc = idolDocs[node.id];
                            if (doc) {
                                node.caption = doc.caption;
                            }
                        });
                    });
                    response.send(JSON.stringify(bbNodes));
                });
            });
        } else { // no results from IDOL
            response.send(JSON.stringify([]));
        }
    });
}

function searchSimilarTestSteps(testStepID, dateCondition, response) {
    idol_queries.searchSimilar(testStepID, dateCondition, function(documents_hash) {
        var testIDs = Object.keys(documents_hash);
        if (testIDs.length > 0) {
            idol_queries.searchTestsByID(testIDs, function(test_documents_hash) {
                var idolResultNodes = Object.keys(test_documents_hash);
                // we need to user IDOL doc id instead of testIDs
                idolResultNodes.forEach(function(idolResult) {
                    var similarTestID = test_documents_hash[idolResult].testID;
                    documents_hash[idolResult] = documents_hash[similarTestID];
                    documents_hash[similarTestID] = null;
                });
                //console.log('searchSimilarTestSteps documents_hash: '+
                //    require('util').inspect(documents_hash, {depth:4}));
                neo4j_queries.getBackboneNodes(idolResultNodes, function(bbNodes) {
                    var referenceIds = [];
                    bbNodes.map(function(test) {
                        test.bbNodes.map(function(node) {
                            referenceIds.push(node.id);
                        });
                    });
                    idol_queries.searchByReference(referenceIds, false, false, function(idolDocs) {
                        var idolResultNodes = Object.keys(idolDocs);
                        // use the previous 'similar' search to mark
                        //  the backbone nodes that are similar, 
                        //  so UI can highlight them
                        bbNodes.map(function(test) {
                            test.name = test_documents_hash['' + test.test.id].name;
                            //console.log('searchSimilarTestSteps bbNodes test: '+
                            //    require('util').inspect(test, {depth:4}));
                            var similarNodes = documents_hash['' + test.test.id];
                            var similarNodesIDs = [];
                            similarNodes.forEach(function(node) {
                                similarNodesIDs.push(node.graph_node);
                            });
                            //console.log('searchSimilarTestSteps similarNodes for '+test.test.id+': '+
                            //    require('util').inspect(similarNodes, {depth:4}));
                            test.bbNodes.map(function(node) {
                                var doc = idolDocs[node.id];
                                if (doc) {
                                    node.caption = doc.caption;
                                }
                                if (similarNodesIDs.indexOf(node.id) >= 0) {
                                    console.log('similar node ' + node.id + ' for test ' + test.test.id);
                                    if (node.id == testStepID)
                                        node.same = true;
                                    else
                                        node.similar = true;
                                }
                            });
                        });
                        response.send(JSON.stringify(bbNodes));
                    });
                });
            });
        } else { // no results from IDOL
            response.send(JSON.stringify([]));
        }
    });
}


app.listen(sophia_config.WEB_APP_PORT);
