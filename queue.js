var amqp = require('amqp');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");

var connection = amqp.createConnection({host: 'localhost'});

connection.on('ready', function(){
    connection.queue('sophia', {autoDelete: false}, function(queue){

        console.log(' [*] Waiting for messages. To exit press CTRL+C')

        queue.subscribe(function(msg){
            console.log(" [x] Received %s", msg.data.toString('utf-8'));
            var obj = JSON.parse(msg.data);
            if (obj != null) {
              var type = obj.type;
              var query = 'CREATE (:' + obj.type + ' {data} )';
              console.log(" [x] Query: %s", query);
              var params = {
                data: obj
              };
              db.query(query, params, function(err, results) {
                if (err) console.error('neo4j query failed: ' + query + '\n');
              });
            }
        });
    });
});