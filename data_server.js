var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var fs = require('fs');

var app = express();

app.use(express.static(__dirname + '/static'));
app.use(bodyParser.json())

app.post('/data', function(request, response) {
    if (request._body) {
        sendToQueue(request.body, response);
    } else {
        var ms = new Date().getMilliseconds();
        var content = "";
        request.on("data", function(chunk) {
            content += chunk;
        });
        request.on("end", function() {
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

//app.listen(8080);
var rabbitMqInbar = amqp.createConnection({
    host: '192.168.50.104',
    login: 'admin',
    password: 'admin'
    //host: 'localhost'
});


rabbitMqInbar.on('ready', function() {
    console.log("RabbitMQ Inbar connected!\n");
});


rabbitMqInbar.on('error', function(err) {
    //do something
    console.log('An error occurred connecting to Inbar RabbitMQ:\n' + require('util').inspect(err));
    //rabbitMqInbar = null;
});


function sendToQueue(data, response) {
    response.writeHead(200, "OK", {
        'Content-Type': 'text/plain'
    });
    response.end();
    var data_json = JSON.stringify(data);
    if (rabbitMqYaron) {
        rabbitMqYaron.publish('sophia', data_json);
        if (data.src != undefined) {
            console.log(" [x] RabbitMQ Yaron Sent request data " + data.timestamp + "\n");
        } else {
            console.log(" [x] RabbitMQ Yaron Sent %s\n", data_json);
        }
    }
    if (rabbitMqInbar) {
        rabbitMqInbar.publish('sophia', data_json);
        if (data.src != undefined) {
            console.log(" [x] RabbitMQ Inbar Sent request data " + data.timestamp + "\n");
        } else {
            console.log(" [x] RabbitMQ Inbar Sent %s\n", data_json);
        }
    }
}