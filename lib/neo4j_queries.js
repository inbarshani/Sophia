var sophia_config = require('./sophia_config');

var neo4j = require('neo4j');
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://' + sophia_config.NEO4J_DB_SERVER + ':' + sophia_config.NEO4J_DB_PORT);

var no_err = null;

var queries = {

    doesPathExists: function(currentStartNodes, destinationNodes, isFirstQuery, callback) {
        // must limit the query size, so cut down on nodes arrays aribtarily		

        if (currentStartNodes && currentStartNodes.length > sophia_config.maxResults)
            currentStartNodes.length = sophia_config.maxResults;
        if (destinationNodes && destinationNodes.length > sophia_config.maxResults)
            destinationNodes.length = sophia_config.maxResults;

        var startNodesWhere = "";
        var startNode = "start";
        var params = {};
        if (isFirstQuery) {
            startNode = "(start:" + sophia_config.backboneRoot + ")";
        } else {
            startNodesWhere = ' AND id(start) IN {currentStartNodes}';
            params.currentStartNodes = currentStartNodes.map(Number);
        }

        params.destinationNodes = destinationNodes.map(Number);

        var query = "MATCH path=shortestPath(" + startNode + "-[*.." + sophia_config.MAX_PATH_LENGTH + "]->destination)" +
            " WHERE " +
            " start.test_id=destination.test_id" +
            startNodesWhere +
            " AND id(destination) IN {destinationNodes}" +
            " AND SINGLE(node IN TAIL(NODES(path)) WHERE id(node) IN {destinationNodes})" +
            " return extract(n in nodes(path)| [id(n), labels(n)]) as path_nodes";

        console.log("Get connected nodes query: " + query + " with params: " + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                console.log('Get connected nodes # of results: ' + results.length);
                //console.log(require('util').inspect(results, { showHidden: true, depth: 6 }));
                var paths = [];
                results.map(function(result) {
                    var path = {
                        nodes: [],
                        last_backbone: null,
                        last_data: null,
                        hash: ''
                    };
                    var path_nodes = result.path_nodes;
                    //console.log('path: '+path);
                    //console.log('path_nodes inspect: '+require('util').inspect(path_nodes, { showHidden: true, customInspect: true }));
                    // find last backbone on path
                    var backbone_id = -1,
                        destination_id = path_nodes[path_nodes.length - 1][0];
                    for (var i = 0; i < path_nodes.length; i++) {
                        var node_type = path_nodes[i][1][0];
                        var node_id = path_nodes[i][0];
                        //console.log('node_id: '+path_nodes[i][0]);
                        //console.log('node_type: '+node_type);
                        path.nodes.push({
                            type: node_type,
                            id: node_id
                        });
                        if (sophia_config.backboneTypes.indexOf(node_type) >= 0)
                            path.last_backbone = node_id;
                        else
                            path.last_data = node_id;
                    }
                    paths.push(path);
                });
                //console.log('Get connected nodes # of unique paths: '+paths.length);
                if (callback)
                    callback(null, paths);
                else
                    throw new Error('no callback');

            }
        });

    },

    countPaths: function(nodesGroupA, nodesGroupB, callback) {
        // must limit the query size, so cut down on nodes arrays aribtarily		

        if (nodesGroupA && nodesGroupA.length > sophia_config.maxResults)
            nodesGroupA.length = sophia_config.maxResults;
        if (nodesGroupB && nodesGroupB.length > sophia_config.maxResults)
            nodesGroupB.length = sophia_config.maxResults;

        var query = "MATCH path=shortestPath(start-[*]-destination)" +
            " WHERE start.test_id=destination.test_id" +
            " AND id(start) IN {startNodes}" +
            " AND id(destination) IN {destinationNodes}" +
            " AND SINGLE(node IN TAIL(NODES(path)) WHERE id(node) IN {allNodes})" +
            " return COUNT(path) as numOfPaths";

        var nodesGroupANumbers = nodesGroupA.map(Number);
        var nodesGroupBNumbers = nodesGroupB.filter(function(item) {
            return (nodesGroupA.indexOf(item) < 0)
        }).map(Number);
        var params = {
            startNodes: nodesGroupANumbers,
            destinationNodes: nodesGroupBNumbers,
            allNodes: nodesGroupANumbers.concat(nodesGroupBNumbers)
        };
        console.log("Get number of paths query:\n" + query +
            "\nwith params: " + JSON.stringify(params));
        db.cypher({
                query: query,
                params: params
            },
            function(err, results) {
                if (err) {
                    console.error('neo4j query failed: ' + query + '\nError: ' + err);
                    if (callback)
                        callback(err);
                    else
                        throw new Error('no callback');
                } else {
                    console.log('Get number of paths results length: ' + results.length);
                    //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                    console.log('Get number of paths, result: ' + results[0].numOfPaths);
                    if (callback)
                        callback(results[0].numOfPaths);
                    else
                        throw new Error('no callback');

                }
            });

    },

    getBackboneNodes: function(currentNodes, callback) {
        // must limit the query size, so cut down on nodes arrays aribtarily		
        if (currentNodes && currentNodes.length > sophia_config.maxResults)
            currentNodes.length = sophia_config.maxResults;

        // TBD:do we need the label checks?
        var query = "MATCH start-[:" + sophia_config.backboneLinkType +
            "*.." + sophia_config.MAX_PATH_LENGTH + "]->backbone" +
            " WHERE start.test_id=backbone.test_id" +
            " AND id(start) IN {currentNodes}" +
            " return start, collect(backbone) as b";
        var params = {
            currentNodes: currentNodes.map(Number)
        };

        console.log("Get backbone nodes: " + query +
            "\nwith params: " + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                var backbone_nodes = [];
                if (results) {
                    results.map(function(result) {
                        var bbNodes = [];
                        result.b.map(function(b) {
                            bbNodes.push({
                                id: '' + b._id,
                                type: b.labels[0]
                            });
                        });
                        backbone_nodes.push({
                            test: {
                                id: result.start._id,
                                timestamp: result.start.properties.timestamp
                            },
                            bbNodes: bbNodes
                        });
                    });
                    if (callback)
                        callback(backbone_nodes);
                    else
                        throw new Error('no callback');
                } else if (callback)
                    callback(new Error('No results for query: ' + query));
                else
                    throw new Error('no callback');
            }
        });
    },

    getBackboneNodesForDataNodes: function(currentNodes, callback) {
        // must limit the query size, so cut down on nodes arrays aribtarily		
        if (currentNodes && currentNodes.length > sophia_config.maxResults)
            currentNodes.length = sophia_config.maxResults;

        // TBD:do we need the label checks?
        var query = "MATCH backbone-[:" + sophia_config.dataLinkType +
            "*..1]->start" +
            " WHERE start.test_id=backbone.test_id" +
            " AND id(start) IN {currentNodes}" +
            " return start, collect(backbone) as b";
        var params = {
            currentNodes: currentNodes.map(Number)
        };

        console.log("Get backbone nodes: " + query +
            "\nwith params: " + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                var backbone_nodes = [];
                if (results) {
                    results.map(function(result) {
                        var bbNodes = [];
                        result.b.map(function(b) {
                            bbNodes.push({
                                id: '' + b._id,
                                type: b.labels[0]
                            });
                        });
                        backbone_nodes.push({
                            test: {
                                id: result.start._id,
                                timestamp: result.start.properties.timestamp
                            },
                            bbNodes: bbNodes
                        });
                    });
                    if (callback)
                        callback(backbone_nodes);
                    else
                        throw new Error('no callback');
                } else if (callback)
                    callback(new Error('No results for query: ' + query));
                else
                    throw new Error('no callback');
            }
        });
    },

    getDataNodesStats: function(currentNodes, callback) {
        // must limit the query size, so cut down on nodes arrays aribtarily		
        if (currentNodes && currentNodes.length > sophia_config.maxResults)
            currentNodes.length = sophia_config.maxResults;

        // path length can be just one, as the backbone node is directly
        //  linked to all data nodes
        var query = "MATCH start-[:" + sophia_config.dataLinkType + "]->next" +
            " WHERE start.test_id=next.test_id" +
            " AND id(start) IN {currentNodes}" +
            " RETURN start, collect(next) as n";
        var params = {
            currentNodes: currentNodes.map(Number)
        };

        console.log("Get nodes stats query:\n" + query +
            "\nwith params: " + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                console.log("Get nodes stats # results: " + results.length);
                //console.log(require('util').inspect(results, { showHidden: true, depth: 6 }));
                var stats = {};
                var ids = [];
                var type;
                if (results) {
                    results.map(function(result) {
                        result.n.map(function(n) {
                            if (ids.indexOf(n._id) < 0) {
                                type = n.labels[0];
                                if (sophia_config.backboneTypes.indexOf(type) < 0) {
                                    if (!stats[type]) {
                                        stats[type] = [n._id];
                                    } else {
                                        stats[type].push(n._id);
                                    }
                                    ids.push(n._id);
                                }
                            }
                        });
                    });
                    if (callback)
                        callback(stats);
                    else
                        throw new Error('no callback');
                } else if (callback)
                    callback(new Error('No results for query: ' + query));
                else
                    throw new Error('no callback');
            }
        });
    },


    getNodeLocationByTimestamp: function(test_id, timestamp, callback) {
        var query = "MATCH pathToLaterBackbone = start_node-[:" + sophia_config.backboneLinkType + "*0..]->prev_b" +
            " WHERE id(start_node)={test_id} " +
            " AND prev_b.timestamp <= {timestamp} " +
            " WITH pathToLaterBackbone ORDER BY LENGTH(pathToLaterBackbone) DESC LIMIT 1" +
            " WITH LAST(NODES(pathToLaterBackbone)) AS prev_backbone" +
            " MATCH prev_backbone-[:" + sophia_config.backboneLinkType + "*0..1]->next_backbone" +
            " WITH prev_backbone, next_backbone ORDER BY next_backbone.timestamp DESC LIMIT 1" +
            " MATCH prev_backbone-[:" + sophia_config.dataLinkType + "*0..1]->prev_data" +
            " WHERE prev_data.timestamp <= {timestamp} " +
            " WITH prev_backbone, next_backbone, prev_data ORDER BY prev_data.timestamp DESC LIMIT 1" +
            " MATCH nextDataPath=prev_data-[:" + sophia_config.dataLinkType + "*0..1]->next_data" +
            " RETURN id(prev_backbone) AS PrevBackboneID, id(next_backbone) AS NextBackboneID," +
            " id(prev_data) AS PrevDataID, id(next_data) AS NextDataID" +
            " ORDER BY LENGTH(nextDataPath) DESC,next_data.timestamp DESC LIMIT 1";

        var params = {
            test_id: test_id,
            timestamp: timestamp
        };

        console.log(' [****] Get node location by timestamp query:\n' + query +
            '\nwith params: ' + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                if (callback && results && results.length > 0 && results[0])
                    callback(no_err, results[0].PrevBackboneID, results[0].NextBackboneID,
                        results[0].PrevDataID, results[0].NextDataID);
                else if (callback)
                    callback(new Error('failed to get a new node\'s location'));
                else
                    throw new Error('no callback');
            }
        });
    },

    linkNode: function(node_id, isBackbone, prev_backbone_id, next_backbone_id,
        prev_data_id, next_data_id, callback) {
        //console.log(' [****] Linking a new node to prev node ' + prev_node_id + ' and next node ' + next_node_id);
        var link_query = '';
        var params = {};

        if (isBackbone) {
            if (next_backbone_id != prev_backbone_id) {
                link_query = 'MATCH prev_node, new_node, next_node' +
                    ' WHERE id(prev_node) = {prev_backbone_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' AND id(next_node) = {next_backbone_id}' +
                    ' WITH prev_node, next_node, new_node' +
                    ' CREATE prev_node-[:' + sophia_config.backboneLinkType + ']' +
                    '->new_node-[:' + sophia_config.backboneLinkType + ']->next_node' +
                    ' WITH prev_node, next_node, new_node' + // keep the new_node, as there may be 
                    // additional data later
                    ' MATCH prev_node-[old_link]->next_node DELETE old_link';
                params.prev_backbone_id = prev_backbone_id;
                params.node_id = node_id;
                params.next_backbone_id = next_backbone_id;
            } else {
                link_query = 'MATCH prev_node, new_node' +
                    ' WHERE id(prev_node) = {prev_backbone_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' CREATE prev_node-[:' + sophia_config.backboneLinkType + ']' +
                    '->new_node';
                params.prev_backbone_id = prev_backbone_id;
                params.node_id = node_id;
            }
            if (next_data_id != prev_backbone_id) {
                // should also move the previous data to this new backbone node
                if (next_data_id != prev_data_id) {
                    // split previous data and move the next nodes
                    link_query = link_query +
                        ' WITH new_node MATCH next_data' +
                        ' WHERE id(next_data)={next_data_id}' +
                        ' CREATE new_node-[:' + sophia_config.dataLinkType + ']->next_data' +
                        ' WITH next_data' +
                        ' MATCH prev_data-[old_data_link]->next_data' +
                        ' WHERE id(prev_data)={prev_data_id}' +
                        ' DELETE old_data_link';
                    params.next_data_id = next_data_id;
                    params.prev_data_id = prev_data_id;
                } else {
                    // next_data_id == prev_data_id != prev_backbone_id
                    // no need to move the data as there wasn't a data node with timestamp greater than
                    // new backbone node
                }
            }
        } else // data node
        {
            // Link the data node to the previous and next data nodes
            //	as well as the previous backbone node			
            if (next_data_id != prev_data_id && prev_data_id != prev_backbone_id) {
                link_query = 'MATCH prev_node, new_node, next_node, prev_backbone' +
                    ' WHERE id(prev_node) = {prev_data_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' AND id(next_node) = {next_data_id}' +
                    ' AND id(prev_backbone) = {prev_backbone_id}' +
                    ' CREATE prev_node-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node-[:' + sophia_config.dataLinkType + ']->next_node' +
                    ' CREATE prev_backbone-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node' +
                    ' WITH prev_node, next_node' +
                    ' MATCH prev_node-[old_link]->next_node DELETE old_link';
                params.next_data_id = next_data_id;
                params.node_id = node_id;
                params.prev_data_id = prev_data_id;
                params.prev_backbone_id = prev_backbone_id;
            } else if (next_data_id != prev_data_id) {
                link_query = 'MATCH prev_node, new_node, next_node' +
                    ' WHERE id(prev_node) = {prev_data_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' AND id(next_node) = {next_data_id}' +
                    ' CREATE prev_node-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node-[:' + sophia_config.dataLinkType + ']->next_node' +
                    ' WITH prev_node, next_node' +
                    ' MATCH prev_node-[old_link]->next_node DELETE old_link';
                params.next_data_id = next_data_id;
                params.node_id = node_id;
                params.prev_data_id = prev_data_id;
            } else if (prev_data_id != prev_backbone_id) {
                link_query = 'MATCH prev_node, new_node, prev_backbone' +
                    ' WHERE id(prev_node) = {prev_data_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' AND id(prev_backbone) = {prev_backbone_id}' +
                    ' CREATE prev_node-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node' +
                    ' CREATE prev_backbone-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node';
                params.node_id = node_id;
                params.prev_data_id = prev_data_id;
                params.prev_backbone_id = prev_backbone_id;
            } else {
                link_query = 'MATCH prev_node, new_node' +
                    ' WHERE id(prev_node) = {prev_data_id}' +
                    ' AND id(new_node) = {node_id}' +
                    ' CREATE prev_node-[:' + sophia_config.dataLinkType + ']' +
                    '->new_node';
                params.node_id = node_id;
                params.prev_data_id = prev_data_id;
            }
        }

        console.log(' [****] Linking nodes query:\n' + link_query +
            "\nwith params: " + JSON.stringify(params));
        if (link_query) {
            db.cypher({
                query: link_query,
                params: params
            }, function(err, results) {
                if (err) {
                    console.error('neo4j query failed: ' + link_query + '\nerr: ' + err + '\n');
                    if (callback)
                        callback(err);
                    else
                        throw new Error('no callback');
                }
                if (callback)
                    callback(no_err);
                else
                    throw new Error('no callback');
            });
        }
    },

    getNearestScreens: function(node_ids, callback) {
        var query = "MATCH node where id(node) IN {node_ids}" +
            " OPTIONAL MATCH pathToPrevScreen=(prev:SCREEN)-[:" + sophia_config.dataLinkType +
            "*0.." + sophia_config.MAX_PATH_TO_SCREEN_LENGTH + "]->node" +
            " OPTIONAL MATCH pathToNextScreen=node-[:" + sophia_config.dataLinkType +
            "*0.." + sophia_config.MAX_PATH_TO_SCREEN_LENGTH + "]->(next:SCREEN)" +
            " WHERE node.test_id=next.test_id" +
            " AND node.test_id=prev.test_id" +
            " RETURN COLLECT(DISTINCT prev.timestamp) AS PrevScreenTimestamps," +
            " COLLECT(DISTINCT next.timestamp) AS NextScreenTimestamps," +
            " COLLECT(DISTINCT id(prev)) AS PrevScreenIDs," +
            " COLLECT(DISTINCT id(next)) AS NextScreenIDs";
        var params = {
            node_ids: node_ids.map(Number)
        };

        console.log(' [****] Get nearest screens by node_id query:\n' + query +
            '\nwith params: ' + JSON.stringify(params));
        db.cypher({
            query: query,
            params: params
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                if (callback && results && results.length > 0 && results[0]) {
                    console.log(' [****] Get nearest screens by node_id query: ' + query + '\n' +
                        'returned ' + results.length + ' results');
                    callback(results[0].PrevScreenTimestamps, 
                    	results[0].NextScreenTimestamps, 
                    	results[0].PrevScreenIDs, 
                    	results[0].NextScreenIDs);
                } else if (callback)
                    callback(new Error('failed to get a new node\'s location'));
                else
                    throw new Error('no callback');
            }
        });
    },

    getAllTestNodes: function(callback) {
        var query = "MATCH (n:"+sophia_config.backboneRoot + 
            ") return id(n) as TestNodeID";

        console.log(' [****] getAllTestNodes query:\n' + query);
        db.cypher({
            query: query
        }, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + query + '\n');
                if (callback)
                    callback(err);
                else
                    throw new Error('no callback');
            } else {
                //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
                if (callback && results && results.length > 0 && results[0]) {
                    console.log(' [****] getAllTestNodes query: ' + query + '\n' +
                        'returned ' + results.length + ' results');
                    var testNodeIDs = [];
                    results.forEach(function(result){
                        testNodeIDs.push(result.TestNodeID);
                    });

                    callback(testNodeIDs);
                } else if (callback)
                    callback(new Error('failed to get all tests'));
                else
                    throw new Error('no callback');
            }
        });
    }

};

module.exports = queries;
