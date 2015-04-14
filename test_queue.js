var messages = [{
    "timestamp": 1429010762478,
    "type": "Test",
    "action": "start",
    "description": "feature-2799-tests-steps-grid",
    "testID": 0
}, {
    "timestamp": 1429010762478,
    "type": "TestStep",
    "action": "start",
    "description": "Precondition - Create domain and project",
    "testID": 0
}, {
    "timestamp": 1429010763667,
    "type": "TestStep",
    "action": "done",
    "description": "(01) Precondition - Create domain and project",
    "testID": 0,
    "status": "unverified"
}, {
    "timestamp": 1429010763667,
    "type": "Test",
    "action": "stop",
    "description": "feature-2799-tests-steps-grid",
    "testID": 0
}, {
    "timestamp": 1429010763667,
    "type": "Test",
    "action": "start",
    "description": "Steps grid - Basics",
    "testID": 1
}, {
    "timestamp": 1429010763667,
    "type": "TestStep",
    "action": "start",
    "description": "Login to ALM",
    "testID": 1
}, {
    "timestamp": 1429010793084,
    "type": "TestStep",
    "action": "done",
    "description": "(02) Login to ALM",
    "testID": 1,
    "status": "passed"
}, {
    "timestamp": 1429010793087,
    "type": "TestStep",
    "action": "start",
    "description": "Navigate to Test module clean the tests and create two tests",
    "testID": 1
}];

var amqp = require('amqp');

var rabbitMq = amqp.createConnection({
    host: 'localhost'
});
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rabbitMq.on('ready', function() {
    console.log("RabbitMQ connected!\n");
    rl.setPrompt('Send test messages to sophia queue? (y/n)');
    rl.prompt();
    rl.on('line', function(line) {
        if (line == 'y') {
            for (var i = 0; i < messages.length; i++) {
                sendToQueue(messages[i]);
            }
        } else {
            rl.close();
        }
        rl.prompt();
    }).on('close', function() {
        process.exit(0);
    });
});


rabbitMq.on('error', function(err) {
    //do something
    console.log('An error occurred connecting to RabbitMQ:\n' + require('util').inspect(err));
});


function sendToQueue(data) {
    var data_json = JSON.stringify(data);
    if (rabbitMq) {
        rabbitMq.publish('sophia', data_json);
        console.log(" [x] RabbitMQ Sent %s\n", data_json);
    }
}