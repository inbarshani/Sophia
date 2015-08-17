var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var fs = require('fs');
var idol_queries = require('./lib/idol_queries');
var sophia_config = require('./lib/sophia_config');
var Busboy = require('busboy');

var app = express();

app.use(bodyParser.json())

app.post('/file', function(request, response) {
    var data = null;
    var busboy = new Busboy({ headers: request.headers });  
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
      //console.log('Field [' + fieldname + ']: value: ' + JSON.stringify(val));
      if (fieldname == 'data')
      {
        data = JSON.parse(val);
        console.log('Loaded file data: '+JSON.stringify(data));
      }
      else if (fieldname == 'file')
      {
        val = val.substring('data:image/jpeg;base64,'.length);
        //console.log('file content for save: '+val);
        if (!data)
        {
            console.log('no data for queue (yet), file is ready for save');
            data = {
                timestamp: new Date().getTime(),
                type: "SCREEN",
                file: fileName
            };
        }
        var fileName = data.timestamp + '.jpg';
        fs.writeFile('./upload/' + fileName, val, {encoding: 'base64'}, function() {
            // wait time, to make sure the file is accessible for IDOL
            setTimeout(30 * 1000, function(){
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
        });        
      }
    });
    busboy.on('finish', function() {
      console.log('Done parsing Sophia file upload!');
    });
    request.pipe(busboy);
    response.status(202).json({ value: 'OK' }); // 202 - accepted, not completed
});

app.listen(sophia_config.FILE_SERVER_PORT);

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