var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var fs = require('fs');
var idol_queries = require('./lib/idol_queries');
var sophia_config = require('./lib/sophia_config');
var Busboy = require('busboy');

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

app.post('/file', function(request, response) {
    var timestamp = null;
    var busboy = new Busboy({ headers: request.headers });  
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
      //console.log('Field [' + fieldname + ']: value: ' + JSON.stringify(val));
      if (fieldname == 'data')
      {
        timestamp = JSON.parse(val).timestamp;
        console.log('Loaded file timestamp: '+timestamp);
      }
      else if (fieldname == 'file')
      {
        val = val.substring('data:image/jpeg;base64,'.length);
        //console.log('file content for save: '+val);
        var buffer = new Buffer(val, 'base64');
        if (!timestamp)
        {
            console.log('no timestamp (yet), file is ready for save');
            timestamp = new Date().getTime();
        }
        var fileName = timestamp + '.jpg';
        var wstream = fs.createWriteStream('./upload/' + fileName, {
            flags: 'w',
            encoding: 'base64'
        });
//        wstream.write(buffer);
        wstream.end(buffer, "UTF-8", function() {
            var data = {
                timestamp: timestamp,
                type: "SCREEN",
                file: fileName
            };
            var absPath = fs.realpathSync('./upload/');
            try
            {
                idol_queries.analyzeImage(absPath + '/' + fileName, function(text) {
                    data.text = text;
                    sendToQueue(data, response);
                });
            }
            catch(ex)
            {
                console.log('Failed to analyze image: '+
                    absPath + '/' + fileName + ' due to exception:\n'+ex);
            }
        });        
      }
    });
    busboy.on('finish', function() {
      console.log('Done parsing Sophia file upload!');
    });
    request.pipe(busboy);
    response.status(202).json({ value: 'OK' }); // 202 - accepted, not completed
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