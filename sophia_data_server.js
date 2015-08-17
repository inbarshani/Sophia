var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var sophia_config = require('./lib/sophia_config');

var app = express();

app.use(bodyParser.json())

app.post('/data', function(request, response) {
    //console.log("Got data event");
    if (request._body) {
        //console.log("Got event with data in _body: "+request._body+" and body: "+request.body);
        response.status(200).json({ value: 'OK' });
        sendToQueue(request.body, response);
    } else {
        var content = "";
        request.on("data", function(chunk) {
            content += chunk;
        });
        request.on("end", function() {
            //if (content.indexOf('TestStep') > 0)
            //    console.log("Got event with chunked data: "+content.substring(0, 200));
            response.status(200).json({ value: 'OK' });
            sendToQueue(JSON.parse(content), response);
        });
    }
});

app.listen(sophia_config.DATA_SERVER_PORT);

var rabbitMq = amqp.createConnection({
    host: sophia_config.QUEUE_HOST
});


rabbitMq.on('ready', function() {
    console.log("RabbitMQ connected!\n");
});


rabbitMq.on('error', function(err) {
    //do something
    console.log('An error occurred connecting to RabbitMQ:\n' + require('util').inspect(err));
});


function sendToQueue(data, response) {
    var data_json = JSON.stringify(data);
    if (rabbitMq) {
        rabbitMq.publish(sophia_config.QUEUE_DATA_NAME, data_json);
        if (data.src != undefined) {
            console.log(" [x] RabbitMQ Sent request data with timestamp: " + data.timestamp + "\n");
        } else {
            //if (data_json.indexOf('TestStep')>0)
            console.log(" [x] RabbitMQ Sent %s\n", data_json);
        }
    }
}

process.on('uncaughtException', function (err) {
  console.log('process uncaughtException: '+require('util').inspect(err));
});