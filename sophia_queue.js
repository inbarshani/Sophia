var amqp = require('amqp');
var neo4j = require('neo4j');
var http = require('http');
var jsontoxml = require('jsontoxml');

var mqm_log = require("./processors/mqm_log");
var site_log = require("./processors/site_log");
var request = require("./processors/request");
var jetty_error_log = require("./processors/jetty_error_log");
var ui_raw = require("./processors/ui_raw");
var ui_logical = require("./processors/ui_logical");
var screen = require("./processors/screen");
var test = require("./processors/test");
var teststep = require("./processors/test_step");

var Step = require('Step');

var sophia_config = require('./lib/sophia_config');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://' + sophia_config.NEO4J_DB_SERVER + ':' + sophia_config.NEO4J_DB_PORT);


var connection = amqp.createConnection({
    host: sophia_config.QUEUE_HOST
});

var current_test_id = null;
var current_test_node_id = null;

// tests history contains test_id, test_node_id and test timestamps start/end
var test_record = function(test_id, test_node_id, test_start_timestamp){
    this.id = test_id;
    this.node_id = test_node_id;
    this.start = test_start_timestamp;
};

test_record.prototype.id = null;
test_record.prototype.node_id = null;
test_record.prototype.start = null;

var tests_history = [];
function indexOfTestByID(test_id)
{
    for (var i = 0; i < tests_history.length; i++) {
        console.log('Find test by ID, tests_history['+i+' of '+tests_history.length+']: '+
            JSON.stringify(tests_history[i]));
        if (tests_history[i].id == test_id) {
            return i;
        }
    }
    return -1;    
}

function indexOfTestByTimestamp(timestamp)
{
    for (var i = 0; i < tests_history.length; i++) {
        console.log('Find test by timestamp, tests_history['+i+' of '+tests_history.length+']: '+
            JSON.stringify(tests_history[i]));
        if (tests_history[i].start <= timestamp && tests_history[i].end && 
            tests_history[i].end >= timestamp) {
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
    connection.queue(sophia_config.QUEUE_DATA_NAME, {
        autoDelete: false,
        durable: true
    }, function(queue) {

        console.log(' [*] Waiting for messages '+sophia_config.QUEUE_DATA_NAME+'. To exit press CTRL+C')

        queue.subscribe(processQueueMessage);
    });
});

function processQueueMessage(msg) {
    var params = [1];
    params[0] = msg;
    console.log(" [x] Received new msg at "+new Date()+" with active test: "+(current_test_id!=null));
    lock.runwithlock(_processQueueMessage, params);
}

function _processQueueMessage(msg) {
    try {
        var obj = JSON.parse(msg.data);
        var data;        
        var obj_type = obj.type.toLowerCase();
        var temp_test_id, temp_test_node_id = null;
        console.log(" [x] New msg type is: " + obj_type);
        if (obj != null) {
            if (obj_type == 'mqm_log' || obj_type == 'sa_log') {
                data = mqm_log.getData(obj);
            }
            else if (obj_type == 'site_log') {
                data = site_log.getData(obj);
            } else if (obj_type == 'request') {
                data = request.getData(obj);
            } else if (obj_type == 'jetty_error_log') {
                data = jetty_error_log.getData(obj);
            } else if (obj_type == 'ui_raw') {
                data = ui_raw.getData(obj);
            } else if (obj_type == 'ui_logical') {
                data = ui_logical.getData(obj);
            } else if (obj_type == 'screen') {
                data = screen.getData(obj);
            } else if (obj_type == 'teststep') {
                data = teststep.getData(obj);
            } else if (obj_type == 'test') {
                data = test.getData(obj);                
                if (data.action.toLowerCase() == "stop") {
                    console.log(' [x] Stop test');
                    var indexOfTestInArray = indexOfTestByID(data.testID);
                    if (indexOfTestInArray >= 0)
                    {
                        tests_history[indexOfTestInArray].end = data.timestamp;
                        connection.publish(sophia_config.QUEUE_TEST_NAME, 
                            {TestNodeID: tests_history[indexOfTestInArray].node_id});
                    }
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
            } else if (data.testID && (data.testID.length == 36 /* guid length */)
                && (current_test_id!=data.testID)) {
                // TODO: bind current_test_id by id of node of type Test, if the current is not set
                // this will recover from disruptions in processing incoming events
                // TODO: the problem - need to get node id as well, which requires a query on neo4j...
                //          conflicts with the async nature of execution.
                // Workaround: just work within the current session, i.e. if the process goes down, will not support additional events
                var indexOfTestInArray = indexOfTestByID(data.testID);
                if (indexOfTestInArray >= 0)
                {
                    temp_test_id = tests_history[indexOfTestInArray].id;
                    temp_test_node_id = tests_history[indexOfTestInArray].node_id;
                }
                else
                {
                    // can't find the test by the ID
                    lock.release();
                    console.log(" [x] New data of type "+data.type+
                        " and test id "+data.testID+
                        " and timestamp "+data.timestamp+
                        " is not associated with any test. Skipping...");
                    return;    
                }
            }
            else if (!current_test_id && !data.testID) {
                // no current_test_id, no data.testID
                // try to locate the correct test from the histoy of tests,
                //   using the new data timestamp
                // Currently: just work within the current session, i.e. if the process goes down, will not support additional events
                var indexOfTestInArray = indexOfTestByTimestamp(data.timestamp);
                if (indexOfTestInArray >= 0)
                {
                    temp_test_id = tests_history[indexOfTestInArray].id;
                    temp_test_node_id = tests_history[indexOfTestInArray].node_id;
                }
                else
                {
                    lock.release();
                    console.log(" [x] New data of type "+data.type+
                        " and test id "+data.testID+
                        " and timestamp "+data.timestamp+
                        " is not associated with any test. Skipping...");
                    return;    
                }
            }
            var query = 'CREATE (new_node:' + data.type + ' {attributes} ) RETURN id(new_node) AS NodeID';

            var params = {
                attributes: {
                    timestamp: data.timestamp,
                    test_id: (temp_test_id? temp_test_id : current_test_id)
                }
            };
            console.log(" [x] Add new node query: " + query+" with params: "+JSON.stringify(params));
            db.cypher({query: query, params: params}, function(err, results) {
                try {
                    if (err) {
                        console.error('neo4j query failed: ' + query + '\n');
                        lock.release();
                    } else if (results[0] && results[0]['NodeID']) {
                        idol_queries.addToIdol(results[0]['NodeID'], data);
                        if (data.type == 'Test') {
                            current_test_node_id = results[0]['NodeID'];
                            var test_run = new test_record(current_test_id, 
                                current_test_node_id, data.timestamp);
                            tests_history.push(test_run);
                            lock.release();
                        } else if (current_test_node_id || temp_test_node_id) {
                            linkNewData(results[0]['NodeID'], 
                                data.type, 
                                data.timestamp, 
                                (temp_test_node_id ? temp_test_node_id :current_test_node_id));
                            temp_test_id = null;
                            temp_test_node_id = null;
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
        console.log(' [***] Linking a new node ' + node_id + ' to test node ' + test_node_id);
        var isBackbone = (sophia_config.backboneTypes.indexOf(type) >= 0);
        Step(
            function findNewNodeLocation() {
                console.log(' [***] findNewNodeLocation');
                neo4j_queries.getNodeLocationByTimestamp(test_node_id, timestamp, this);
            },
            function linkNode(err, prev_backbone_node_id, next_backbone_node_id,
                prev_data_node_id, next_data_node_id) {
                console.log(' [***] linkNode. Err? ' + err);
                if (err) throw err;

                neo4j_queries.linkNode(node_id, isBackbone, prev_backbone_node_id, 
                    next_backbone_node_id, prev_data_node_id, next_data_node_id, this);
            },
            function done(err) {
                console.log(' [***] done. Err? ' + err);
                lock.release();
            }
        );
    } catch (ex) {
        console.log(' [**] Exception in linking new data: ' + ex);
        lock.release();
    }
}

