var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var fs = require('fs');

var app = express();

app.use(express.static(__dirname + '/static'));
app.use(bodyParser.json())

app.post('/data', function(request, response) {
    //console.log("Got data event");
    if (request._body) {
        //console.log("Got event with data in _body: "+request._body+" and body: "+request.body);
        sendToQueue(request.body, response);
    } else {
        var ms = new Date().getMilliseconds();
        var content = "";
        request.on("data", function(chunk) {
            content += chunk;
        });
        request.on("end", function() {
            //if (content.indexOf('TestStep') > 0)
            //    console.log("Got event with chunked data: "+content.substring(0, 200));
            sendToQueue(JSON.parse(content), response);
        });
    }
});

app.post('/file', function(request, response) {
    var content = "";
    request.on("data", function(chunk) {
        content += chunk;
    });
    request.on("end", function() {
        var ts = new Date().getTime();
        var startIndex = content.indexOf('data:image/jpeg;base64,') + 23;
        var endIndex = content.lastIndexOf('\r\n------WebKitFormBoundary');
        var fileContent = content.substring(startIndex, endIndex);
        var buffer = new Buffer(fileContent, 'base64');
        var fileName = ts + '.jpg';
        var wstream = fs.createWriteStream('./upload/' + fileName, {
            flags: 'w',
            encoding: 'base64'
        });
        wstream.write(buffer);
        wstream.end();
        var data = {
            timestamp: ts,
            type: "SCREEN",
            file: fileName
        };
        sendToQueue(data, response);
    });
});

app.listen(8082);
var rabbitMq = amqp.createConnection({
    host: 'localhost'
});


rabbitMq.on('ready', function() {
    console.log("RabbitMQ connected!\n");
});


rabbitMq.on('error', function(err) {
    //do something
    console.log('An error occurred connecting to RabbitMQ:\n' + require('util').inspect(err));
});


function sendToQueue(data, response) {
    response.status(200).json({ value: 'OK' });
    var data_json = JSON.stringify(data);
    if (rabbitMq) {
        rabbitMq.publish('sophia', data_json);
        if (data.src != undefined) {
            console.log(" [x] RabbitMQ Sent request data with timestamp: " + data.timestamp + "\n");
        } else {
            //if (data_json.indexOf('TestStep')>0)
            console.log(" [x] RabbitMQ Sent %s\n", data_json);
        }
    }
}