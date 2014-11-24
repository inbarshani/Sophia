var express = require('express');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));

app.post('/query', function(request, response) {

/*    
    examples for request parameters (JSON objects):
    console.log(request.body.user.name);
    console.log(request.body.user.email);
    */
    db.query('MATCH (node) OPTIONAL MATCH (node)-[rel]-() RETURN node, rel', null, function(err, results) {
      if (err) throw err;
      var nodes = [], edges = [];
      var objs = results.map(function (result) {
        var id;
        if (result.node) {
          id = result.node._data.metadata.id;
          result.node._data.data.id = id;
          nodes.push(result.node._data.data);
//          return {result.node._data.data};
        } else if (result.rel) {
          // TODO: check why this is never called
          console.log("rel");
          var edge = {"start": result.rel._data.start,
          "end": result.rel._data.end,
          "type": result.rel._data.type};
          edges.push(edge);
        }
//        return edge;
      });      
      var obj = {"nodes": nodes, "edges": edges}
      response.send(JSON.stringify(obj));
    });


});
app.listen(8080);