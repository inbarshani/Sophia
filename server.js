var express = require('express');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/query', function(request, response) {
  var queryString = request.query.q;
  var expectedQueryString = request.query.expected;
  var descQuery;
  var wordsArr = queryString.split(' ');
  if (wordsArr.length == 1) {
    descQuery = "n.Description =~ '.*" + queryString + ".*'"; 
  } else {
    descQuery = "n.Description =~ '.*" + wordsArr[0] + ".*'"; 
    for (var i = 1; i < wordsArr.length; i++) {
      descQuery = descQuery + " AND n.Description =~ '.*" + wordsArr[i] + ".*'"; 
    }
  }
  var query = "match n where (n:TestStep AND (" + descQuery + ")) or (n:UserAction AND (" + descQuery + ")) return n";
  console.log(query);
  db.query(query, null, function(err, results) {
    if (err) throw err;
    var nodes = [], edges = [];
    var ids=[];
    results.map(function (result) {
      var node = {};
      var id;
      var label;
      var name;
      id = result.n._data.metadata.id;
      if (result.n._data.metadata.labels.length > 0) {
        label = result.n._data.metadata.labels[0];
      } else {
        label = "Node";
      }
      if (result.n._data.data.Name) {
        name = result.n._data.data.Name;
      } else {
        name = label;
      }
      node.name = name;
      node.label = label;
      node.id = id;
      node.properties = result.n._data.data;
      nodes.push(node);
      ids.push(id);
    });

    // get linked nodes that don't match expected results
    // query structure: <entity name> <property> <sign> <value>
    // for example: ServerCPU AVG > 4
    wordsArr = expectedQueryString.split(" ");

    // returh full path to results nodes    
//    query = "START a = node(" + ids + ") MATCH p=(a)-[:LINK*1..500]->(n:" + wordsArr[0] + ") where (n." + wordsArr[1] + " " + wordsArr[2] + " " + wordsArr[3] + ") RETURN nodes(p)";

    // return only results nodes, no path
    var queryCounter = 0;
    for (var i = 0; i < ids.length; i++) {
      query = "START a = node(" + ids[i] + ") MATCH (a)-[:LINK*1..500]->(n:" + wordsArr[0] + ") where (n." + wordsArr[1] + " " + wordsArr[2] + " " + wordsArr[3] + ") RETURN n";
      console.log(query);
      db.query(query, null, function(err, results) {
        if (err) throw err;
        queryCounter++;
        results.map(function (result) {
          var node = {};
          var id;
          var label;
          var name;
          id = result.n._data.metadata.id;
          if (result.n._data.metadata.labels.length > 0) {
            label = result.n._data.metadata.labels[0];
          } else {
            label = "Node";
          }
          if (result.n._data.data.Name) {
            name = result.n._data.data.Name;
          } else {
            name = label;
          }
          node.name = name;
          node.label = label;
          node.id = id;
          node.properties = result.n._data.data;
          nodes.push(node);
          var edge = {"source": ids[queryCounter - 1],
            "target": id,
            "value": 'FAR'
          };
          edges.push(edge);
        });
        if (queryCounter == ids.length) {
          query =  "START a = node(" + ids + "), b = node("+ ids + ") MATCH a -[r]-> b RETURN r"; 
          console.log(query);
          db.query(query, null, function(err, results) {
            results.map(function (result) {
              var url = result.r.db.url + "/db/data/node/";
              var edge = {"source": parseInt(result.r._data.start.replace(url, "")),
                "target": parseInt(result.r._data.end.replace(url, "")),
                "value": result.r._data.type,
                "id": result.r._data.metadata.id            
              };
              edges.push(edge);
            });
            var obj = {"nodes": nodes, "links": edges}
            response.send(JSON.stringify(obj));
          });
        }
      });
    }
  });
});


app.get('/expand', function(request, response) {
  var id = request.query.id;
  var query = "START a = node(" + id + ") MATCH (a)-[r]-(b) RETURN b";
  console.log(query);
  db.query(query, null, function(err, results) {
    if (err) throw err;
    var nodes = [], edges = [];
    var ids=[];
    ids.push(id);
    results.map(function (result) {
      var node = {};
      var id;
      var label;
      var name;
      id = result.b._data.metadata.id;
      if (result.b._data.metadata.labels.length > 0) {
        label = result.b._data.metadata.labels[0];
      } else {
        label = "Node";
      }
      if (result.b._data.data.Name) {
        name = result.b._data.data.Name;
      } else {
        name = label;
      }
      node.name = name;
      node.label = label;
      node.id = id;
      node.properties = result.b._data.data;
      nodes.push(node);
      ids.push(id);
    });
    query =  "START a = node(" + ids + "), b = node("+ ids + ") MATCH a -[r]-> b RETURN r"; 
    console.log(query);
    db.query(query, null, function(err, results) {
      results.map(function (result) {
        var url = result.r.db.url + "/db/data/node/";
        var edge = {"source": parseInt(result.r._data.start.replace(url, "")),
          "target": parseInt(result.r._data.end.replace(url, "")),
          "value": result.r._data.type,
          "id": result.r._data.metadata.id            
        };
        edges.push(edge);
      });
      var obj = {"nodes": nodes, "links": edges}
      response.send(JSON.stringify(obj));
    });
  });
});

app.listen(8080);