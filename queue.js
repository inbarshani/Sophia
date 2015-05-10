var amqp = require('amqp');
var neo4j = require('neo4j');
var http = require('http');
var jsontoxml = require('jsontoxml');

// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');

var dateTime = require("./dateTime");

var mqm_log = require("./processors/mqm_log");
var request = require("./processors/request");
var jetty_error_log = require("./processors/jetty_error_log");
var ui = require("./processors/ui");
var screen = require("./processors/screen");
var test = require("./processors/test");
var teststep = require("./processors/test_step");

var Step = require('Step');

var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var connection = amqp.createConnection({
    host: 'localhost'
});

var current_test_id = null;
var current_test_node_id = null;

var active_tests = [];
function indexOfTestByID(test_id)
{
    for (var i = 0; i < active_tests.length; i++) {
        console.log('active_tests['+i+' of '+active_tests.length+']: '+JSON.stringify(active_tests[i]));
        if (active_tests[i].test_id == test_id) {
            return i;
        }
    }
    return -1;    
}

// mutex locking to guarntee that neo4j calls of different incoming queue messages
//  will not conflict (creating an unexpected graph structure)
var Padlock = require("padlock").Padlock;
var lock = new Padlock();

connection.on('ready', function() {
    console.log('connected to RabbitMQ');
    connection.queue('sophia', {
        autoDelete: false,
        durable: true
    }, function(queue) {

        console.log(' [*] Waiting for messages. To exit press CTRL+C')

        queue.subscribe(processQueueMessage);
    });
});

function processQueueMessage(msg) {
    var params = [1];
    params[0] = msg;
    console.log(" [x] Received new msg at "+new Date());
    lock.runwithlock(_processQueueMessage, params);
}

function _processQueueMessage(msg) {
    try {
        var obj = JSON.parse(msg.data);
        var data;        
        var obj_type = obj.type.toLowerCase();
        if (obj != null) {
            if (obj_type == 'mqm_log' || obj_type == 'sa_log') {
                data = mqm_log.getData(obj);
            } else if (obj_type == 'request') {
                data = request.getData(obj);
            } else if (obj_type == 'jetty_error_log') {
                data = jetty_error_log.getData(obj);
            } else if (obj_type == 'ui') {
                data = ui.getData(obj);
            } else if (obj_type == 'screen') {
                data = screen.getData(obj);
            } else if (obj_type == 'teststep') {
                data = teststep.getData(obj);
            } else if (obj_type == 'test') {
                data = test.getData(obj);                
                if (data.action.toLowerCase() == "stop") {
                    // this is the 2nd event of a test, so it is the test END event
                    console.log(' [x] Stop test');
                    var indexOfTestInArray = indexOfTestByID(data.testID);
                    if (indexOfTestInArray >= 0)
                        active_tests.splice(indexOfTestInArray, 1);
                    if (current_test_id == data.testID)
                    {
                        current_test_id = null;
                        current_test_node_id = null;
                    }
                    lock.release();
                    return;
                } else { 
                    // got an event to start a test, may or may not stopped the active test (on the other hand, may not have an active test)
                    if (!current_test_id) {
                        console.log(' [x] Start test with ID: ' + data.testID);
                    }
                    else
                        console.log(' [x] Switch to test with ID: ' + data.testID);                    
                    current_test_id = data.testID;
                    current_test_node_id = null;
                }
            }
            // for events that don't have built-in test ID, assume we're in context of the current test
            // this is a workaround which doesn't support multiple tests at the same time, will need to fix
            if (current_test_id != null && data.testID == undefined) {
                data.testID = current_test_id;
            } else if (current_test_id == null && data.testID) {
                // TODO: bind current_test_id by id of node of type Test, if the current is not set
                // this will recover from disruptions in processing incoming events
                // TODO: the problem - need to get node id as well, which requires a query on neo4j...
                //          conflicts with the async nature of execution.
                // Workaround: just work within the current session, i.e. if the process goes down, will not support additional events
                var indexOfTestInArray = indexOfTestByID(data.testID);
                if (indexOfTestInArray >= 0)
                {
                    current_test_id = active_tests[indexOfTestInArray].test_id;
                    current_test_node_id = active_tests[indexOfTestInArray].test_node_id;
                }
            }
            else if (!current_test_id && !data.testID) {
                // no current_test_id, no data.testID - don't create the node
                lock.release();
                return;    
            }
            var query = 'CREATE (new_node:' + data.type + ' {attributes} ) RETURN id(new_node) AS NodeID';

            var params = {
                attributes: {
                    timestamp: data.timestamp
                }
            };
            //console.log(" [x] Add new node query: " + query);
            db.query(query, params, function(err, results) {
                try {
                    if (err) {
                        console.error('neo4j query failed: ' + query + '\n');
                        lock.release();
                    } else if (results[0] && results[0]['NodeID']) {
                        idol_queries.addToIdol(results[0]['NodeID'], data);
                        if (data.type == 'Test') {
                            current_test_node_id = results[0]['NodeID'];
                            active_tests.push({test_id: current_test_id, test_node_id: current_test_node_id});
                            lock.release();
                        } else if (current_test_node_id) {
                            linkNewData(results[0]['NodeID'], data.type, data.timestamp, current_test_node_id);
                        }
                        else
                            lock.release();
                        
                    }
                }
                catch(ex)
                {
                    console.log('exception after adding a new node: '+ex);
                    lock.release();
                }
            });
        }
    } catch (ex) {
        console.log(' [**] Exception in adding new data: ' + ex);
        lock.release();
    }

};

function linkNewData(node_id, type, timestamp, test_node_id) {
    // link a new node
    // check the type - if backbone, we need connect only to backbone node
    //    if not backbone, we need to find the backbone and connect within its chain
    // check the timestamp and look for immediate previous and immediate next
    //    Handle same timestamp chains:
    //      - Query by timestamp and links?
    // also, remove existing relation if there is one between immediates
    try {
        if (sophia_consts.backboneTypes.indexOf(type) >= 0) {
            console.log(' [***] Linking a new backbone node ' + node_id + ' to test node ' + test_node_id);
            var prev_backbone_node_id = null,
                end_prev_chain_node = null;
            var isBackbone = true,
                shouldLinkToPrev = true;
            Step(
                function findLatestBackboneNode() {
                    console.log(' [***] findLatestBackboneNode');
                    neo4j_queries.findLatestNode(isBackbone, test_node_id, timestamp, this);
                },
                function findNextBackboneNode(err, _prev_backbone_node_id) {
                    console.log(' [***] findNextBackboneNode. Err? ' + err);
                    if (err) throw err;

                    if (_prev_backbone_node_id != null)
                        prev_backbone_node_id = _prev_backbone_node_id;
                    else
                        prev_backbone_node_id = test_node_id;
                    neo4j_queries.findNextNode(isBackbone, prev_backbone_node_id, this);
                },
                function linkInBackbone(err, next_backbone_node_id) {
                    console.log(' [***] linkInBackbone. Err? ' + err);
                    if (err) throw err;

                    neo4j_queries.linkNode(isBackbone, node_id, prev_backbone_node_id, next_backbone_node_id, shouldLinkToPrev, this);
                },
                function findEndOfChainOfPrevBackbone(err) {
                    console.log(' [***] findEndOfChainOfPrevBackbone. Err? ' + err);
                    if (err) throw err;

                    neo4j_queries.findLatestNode(!isBackbone, prev_backbone_node_id, timestamp, this);
                },
                function findStartOfNewBackboneChain(err, _end_prev_chain_node) {
                    console.log(' [***] findStartOfNewBackboneChain. Err? ' + err + ' _end_prev_chain_node: ' + _end_prev_chain_node);
                    if (err) throw err;

                    end_prev_chain_node = _end_prev_chain_node;
                    if (end_prev_chain_node != null)
                        neo4j_queries.findNextNode(!isBackbone, end_prev_chain_node, this);
                    else
                        return null;
                },
                function relinkChain(err, start_new_chain_node) {
                    console.log(' [***] relinkChain. Err? ' + err + ' start_new_chain_node: ' + start_new_chain_node);
                    if (err) throw err;

                    if (end_prev_chain_node != null)
                        neo4j_queries.linkNode(!isBackbone, node_id, end_prev_chain_node, start_new_chain_node, !shouldLinkToPrev, this);
                    else
                        return null;
                },
                function done(err) {
                    console.log(' [***] done. Err? ' + err);

                    lock.release();
                }
            );
        } else {
            console.log(' [***] Linking a new data node ' + node_id + ' to test node ' + test_node_id);
            var latest_data_node = null,
                backbone_node_id = null;
            var isBackbone = true,
                shouldLinkToPrev = true;
            Step(
                function findLatestBackboneNode() {
                    console.log(' [***] findLatestBackboneNode');
                    neo4j_queries.findLatestNode(isBackbone, test_node_id, timestamp, this);
                },
                function findLatestDataNode(err, _backbone_node_id) {
                    console.log(' [***] findLatestDataNode. Err? ' + err);
                    if (err) throw err;

                    if (_backbone_node_id != null)
                        backbone_node_id = _backbone_node_id;
                    else
                        backbone_node_id = test_node_id;
                    neo4j_queries.findLatestNode(!isBackbone, backbone_node_id, timestamp, this);
                },
                function findNextDataNode(err, _latest_data_node) {
                    console.log(' [***] findNextDataNode. Err? ' + err);
                    if (err) throw err;

                    if (_latest_data_node != null)
                        latest_data_node = _latest_data_node;
                    else
                        latest_data_node = backbone_node_id;
                    neo4j_queries.findNextNode(!isBackbone, latest_data_node, this);
                },
                function relinkChain(err, next_data_node) {
                    console.log(' [***] relinkChain. Err? ' + err);
                    if (err) throw err;

                    neo4j_queries.linkNode(!isBackbone, node_id, latest_data_node, next_data_node, shouldLinkToPrev, this);
                },
                function done(err) {
                    console.log(' [***] done. Err? ' + err);
                    lock.release();
                }
            );
        }
    } catch (ex) {
        console.log(' [**] Exception in linking new data: ' + ex);
        lock.release();
    }
}

