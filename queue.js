var amqp = require('amqp');
var neo4j = require("neo4j");
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');

var dateTime = require("./dateTime");

var mqm_log = require("./processors/mqm_log");
var request = require("./processors/request");
var jetty_error_log = require("./processors/jetty_error_log");
var ui = require("./processors/ui");
var screen = require("./processors/screen");
var test = require("./processors/test");

var connection = amqp.createConnection({
    host: 'localhost'
});

var current_test_id = null;
var current_test_node_id = null;

connection.on('ready', function() {
    connection.queue('sophia', {
        autoDelete: false
    }, function(queue) {

        console.log(' [*] Waiting for messages. To exit press CTRL+C')

        queue.subscribe(function(msg) {
            var obj = JSON.parse(msg.data);
            var data;
            console.log(" [x] Received %s", obj.type);
            if (obj != null) {
                if (obj.type == 'mqm_log' || obj.type == 'sa_log') {
                    data = mqm_log.getData(obj);
                } else if (obj.type == 'request') {
                    data = request.getData(obj);
                } else if (obj.type == 'jetty_error_log') {
                    data = jetty_error_log.getData(obj);
                } else if (obj.type == 'UI') {
                    data = ui.getData(obj);
                } else if (obj.type == 'SCREEN') {
                    data = screen.getData(obj);
                } else if (obj.type == 'Test') {
                    data = test.getData(obj);
                    if (data.action.toLowerCase() == "stop") {
                        // this is the 2nd event of a test, so it is the test END event
                        current_test_id = null;
                        current_test_node_id = null;
                        return;
                    } else if (!current_test_id)
                        current_test_id = data.guid;
                }
                // for events that don't have built-in test ID, assume we're in context of the current test
                // this is a workaround which doesn't support multiple tests as the same time, will need to fix
                if (current_test_id && data.testID == undefined) {
                    data.testID = current_test_id;
                }
                var query = 'CREATE (new_node:' + data.type + ' {data} ) RETURN id(new_node) AS NodeID';

                var params = {
                    data: data
                };
                console.log(" [x] Add new node query: " + query);
                db.query(query, params, function(err, results) {
                    if (err) {
                        console.error('neo4j query failed: ' + query + '\n');
                    } else if (results[0] && results[0]['NodeID'])
                        if (data.type == 'Test')
                            current_test_node_id = results[0]['NodeID'];
                        else if (current_test_node_id)
                        linkNewData(results[0]['NodeID'], data.type, data.timestamp, current_test_node_id);
                });
            }
        });
    });
});

var backboneTypes = [];

function linkNewData(node_id, type, timestamp, test_node_id) {
    console.log(' [**] Linking a new node to test node ' + test_node_id);
    // link a new node
    // check the type - if backbone, we need connect only to backbone node
    //    if not backbone, we need to find the backbone and connect within its chain
    // check the timestamp and look for immediate previous and immediate next
    //    Handle same timestamp chains:
    //      - Query by timestamp and links?
    // also, remove existing relation if there is one between immediates
    findPrevNode(node_id, type, timestamp, test_node_id);
}

function findPrevNode(node_id, type, timestamp, test_node_id) {
    console.log(' [**] Find prev node');
    var prev_nodes_qualifier = '';

    if (backboneTypes.indexOf(type) >= 0) {
        prev_nodes_qualifier = ' AND prev_nodes.type IN [\'' + backboneTypes.join('\',\'') + '\']';
    }

    // now 

    var prev_nodes_query =
        'MATCH pathToPrevNode = test_node-[*]->prev_nodes ' +
        ' WHERE id(test_node)=' + test_node_id +
        ' AND prev_nodes.timestamp <= ' + timestamp +
        prev_nodes_qualifier +
        ' WITH COLLECT(pathToPrevNode) AS paths, MAX(length(pathToPrevNode)) AS maxLength ' +
        ' WITH FILTER(path IN paths WHERE length(path) = maxLength) AS longestPaths ' +
        ' WITH LAST(nodes(LAST(longestPaths))) AS prev_node ' +
        ' RETURN id(prev_node) AS PrevID';

    console.log(' [**] Previous node query: ' + prev_nodes_query);

    db.query(prev_nodes_query, null, function(err, results) {
        if (err) {
            console.error('neo4j query failed: ' + prev_nodes_query + '\nerr: ' + err + '\n');
        } else {
            console.log(' [***] Prev node results: '+require('util').inspect(results));
            var prev_node_id = test_node_id;
            if (results[0]) {
                prev_node_id = results[0]['PrevID'];
                if (!prev_node_id)
                    prev_node_id = test_node_id;
            }
            findNextNode(node_id, type, timestamp, test_node_id, prev_node_id);
        }
    });
}

function findNextNode(node_id, type, timestamp, test_node_id, prev_node_id) {
    console.log(' [**] Find next node');
    var next_nodes_qualifier = '';

    if (backboneTypes.indexOf(type) >= 0) {
        next_nodes_qualifier = ' AND next_nodes.type IN [\'' + backboneTypes.join('\',\'') + '\']';
    }

    // now 

    var next_nodes_query =
        'MATCH pathToNextNode = shortestPath(test_node-[*]->next_nodes) ' +
        ' WHERE id(test_node)=' + test_node_id +
        ' AND next_nodes.timestamp > ' + timestamp +
        next_nodes_qualifier +
        ' WITH LAST(nodes(pathToNextNode)) AS next_node' +
        ' RETURN id(next_node) AS NextID';

    console.log(' [**] Next node query: ' + next_nodes_query);

    db.query(next_nodes_query, null, function(err, results) {
        if (err) {
            console.error('neo4j query failed: ' + next_nodes_query + '\nerr: ' + err + '\n');
        } else {
            console.log(' [***] next node results: '+require('util').inspect(results));
            var next_node_id = -1;
            if (results[0])
                next_node_id = results[0]['NextID'];
            linkNode(node_id, prev_node_id, next_node_id);
        }
    });
}

/* next_node_id may be -1 to indicate no next node*/
function linkNode(node_id, prev_node_id, next_node_id ) {
    console.log(' [**] Linking a new node to prev node ' + prev_node_id + ' and next node '+next_node_id);
    var link_query='';
    if (next_node_id >= 0) {
        link_query =
            'MATCH prev_node, new_node, next_node' +
            ' WHERE id(prev_node) = ' + prev_node_id +
            ' AND id(new_node) = ' + node_id +
            ' AND id(next_node) = ' + next_node_id +
            ' CREATE prev_node-[:LINK]->new_node-[:LINK]->next_node' +
            ' WITH prev_node, next_node' +
            ' MATCH prev_node-[old_link:LINK]->next_node DELETE old_link';
    } else {
        link_query =
            'MATCH prev_node, new_node' +
            ' WHERE id(prev_node) = ' + prev_node_id +
            ' AND id(new_node) = ' + node_id +
            ' CREATE prev_node-[:LINK]->new_node';
    } 

    console.log(' [**] Linking nodes query: ' + link_query);
    if (link_query)
    {
        db.query(link_query, null, function(err, results) {
            if (err) {
                console.error('neo4j query failed: ' + link_query + '\nerr: '+err+'\n');
            }
        });
    }
}

