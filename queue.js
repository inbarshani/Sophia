var amqp = require('amqp');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");

var mqm_log = require("./processors/mqm_log");
var request = require("./processors/request");
var jetty_error_log = require("./processors/jetty_error_log");

var connection = amqp.createConnection({host: 'localhost'});

connection.on('ready', function(){
    connection.queue('sophia', {autoDelete: false}, function(queue){

        console.log(' [*] Waiting for messages. To exit press CTRL+C')

        queue.subscribe(function(msg){
            console.log(" [x] Received %s", msg.data.toString('utf-8'));
            var obj = JSON.parse(msg.data);
            var data;
            if (obj != null) {
              if (obj.type == 'mqm_log' || obj.type == 'sa_log') {
                data = mqm_log.getData(obj);
              } else if (obj.type == 'request') {
                data = request.getData(obj);
              } else if (obj.type == 'jetty_error_log') {
                data = jetty_error_log.getData(obj);
              }
              var query = 'CREATE (:' + data.type + ' {data} )';
              console.log(" [xx] Query: %s", query);
              console.log(" [xxx] timestamp: %s", data.timestamp);
              var params = {
                data: data
              };
              db.query(query, params, function(err, results) {
                if (err) console.error('neo4j query failed: ' + query + '\n');
              });
            }
        });
    });
});