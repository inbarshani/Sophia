var amqp = require('amqp');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");

var mqm_log = require("./processors/mqm_log");
var request = require("./processors/request");
var jetty_error_log = require("./processors/jetty_error_log");
var ui = require("./processors/ui");
var screen = require("./processors/screen");

var connection = amqp.createConnection({
    host: 'localhost'
});

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
                }
                var query = 'CREATE (new_node:' + data.type + ' {data} ) RETURN id(new_node) AS NodeID';
                ////              console.log(" [xx] Query: %s", query);
                ////              console.log(" [xxx] timestamp: %s", data.timestamp);
                var params = {
                    data: data
                };
                db.query(query, params, function(err, results) {
                    if (err) {
                        console.error('neo4j query failed: ' + query + '\n');
                    } else if (results[0] && results[0]['NodeID'])
                        linkNewData(results[0]['NodeID'], data.type, data.timestamp);
                });
            }
        });
    });
});

var backboneTypes = [];

function linkNewData(node_id, type, timestamp) {
    console.log(' [**] Linking a new node');
    // link a new node
    // check the type - if backbone, we need connect only to backbone node
    //    if not backbone, we need to find the backbone and connect within its chain
    // check the timestamp and look for immediate previous and immediate next
    // also, remove existing relation if there is one between immediates
    // TBD: once we have Test ID associated with all incoming data, it makes sense
    //    to optimize the searches only on the specific test chain
    var prev_nodes_qualifier = '',
        next_nodes_qualifier = '';
    if (backboneTypes.indexOf(type) >= 0) {
        prev_nodes_qualifier = ' AND prev_node.type IN [\'' + backboneTypes.join('\',\'') + '\']';
        next_nodes_qualifier = ' AND next_node.type IN [\'' + backboneTypes.join('\',\'') + '\']';
    }
    var nodes_query =
        'MATCH prev_node' +
        ' WHERE prev_node.timestamp <= ' + timestamp + ' AND id(prev_node)<>id(new_node)' +
        prev_nodes_qualifier +
        ' WITH prev_node' +
        ' ORDER BY prev_node.timestamp DESC LIMIT 1' +
        ' MATCH next_node' +
        ' WHERE next_node.timestamp > ' + timestamp +
        next_nodes_qualifier +
        ' WITH prev_node, next_node' +
        ' ORDER BY next_node.timestamp LIMIT 1' +
        ' RETURN id(prev_node) as PrevID, id(next_node) as NextID';

    console.log(' [**] Next and previous nodes query: ' + query);

    db.query(query, null, function(err, results) {
        if (err) {
            console.error('neo4j query failed: ' + query + '\n');
        } else if (results[0]) {
            console.log(' [**] Linking nodes query: ' + query);

            var prev_id = results[0]['PrevID'];
            var next_id = results[0]['NextID'];
            var link_query = '';
            if (prev_id && next_id) {
                link_query =
                    'MATCH prev_node, new_node, next_node' +
                    ' WHERE id(prev_node) = ' + prev_id +
                    ' AND id(new_node) = ' + node_id +
                    ' AND id(next_node) = ' + next_id +
                    ' CREATE prev_node-[:LINK]->new_node-[:LINK]->next_node' +
                    ' MATCH prev_node-[old_link:LINK]->next_node DELETE old_link';
            } else if (prev_id) {
                link_query =
                    'MATCH prev_node, new_node' +
                    ' WHERE id(prev_node) = ' + prev_id +
                    ' AND id(new_node) = ' + node_id +
                    ' CREATE prev_node-[:LINK]->new_node';
            } else if (next_id) {
                link_query =
                    'MATCH new_node, next_node' +
                    ' WHERE id(new_node) = ' + node_id +
                    ' AND id(next_node) = ' + next_id +
                    ' CREATE new_node-[:LINK]->next_node';
            }

            if (query)
                db.query(query, null, function(err, results) {
                    if (err) {
                        console.error('neo4j query failed: ' + query + '\n');
                    }
                })

        }
    });
}