var express = require('express');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/query', function(request, response) {

/*    
    examples for request parameters (JSON objects):
    console.log(request.body.user.name);
    console.log(request.body.user.email);
    */
    db.query('MATCH node RETURN node', null, function(err, results) {
      if (err) throw err;
      var nodes = [], edges = [];
      results.map(function (result) {
        var node = {};
        var id;
        var label;
        var name;
        id = result.node._data.metadata.id;
        if (result.node._data.metadata.labels.length > 0) {
          label = result.node._data.metadata.labels[0];
        } else {
          label = "Node";
        }
        if (result.node._data.data.Name) {
          name = result.node._data.data.Name;
        } else {
          name = label;
        }
        node.name = name;
        node.label = label;
        node.id = id;
        node.properties = result.node._data.data;
        nodes.push(node);
      });     
      db.query('MATCH (node)-[rel]-() RETURN rel', null, function(err, results) {
        results.map(function (result) {
          var url = result.rel.db.url + "/db/data/node/";
          var edge = {"source": parseInt(result.rel._data.start.replace(url, "")),
            "target": parseInt(result.rel._data.end.replace(url, "")),
            "value": result.rel._data.type,
            "id": result.rel._data.metadata.id            
          };
          edges.push(edge);
      });
      var obj = {"nodes": nodes, "links": edges}
      response.send(JSON.stringify(obj));
    });
  });
});
app.listen(8080);