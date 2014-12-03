var express = require('express');
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/query', function(request, response) {
    var queryString = request.query.q;
    var expectedQueryString = request.query.expected;
    var actionIds = request.query.actionIds;
    // create the query for the main nodes (TestStep, UserAction) based on the client side 'description'    
    var descQuery;
    var wordsArr = queryString.split(' ');
    if (wordsArr.length == 1) {
        descQuery = "n.Description =~ '(?i).*" + queryString + ".*'";
    } else {
        descQuery = "n.Description =~ '(?i).*" + wordsArr[0] + ".*'";
        for (var i = 1; i < wordsArr.length; i++) {
            descQuery = descQuery + " AND n.Description =~ '(?i).*" + wordsArr[i] + ".*'";
        }
    }
    // set the query so that only main nodes that are connected somehow to existing main nodes are returned
    var match = "",
        returnClause = "";
    if (actionIds && actionIds.length > 0) {
        match = "start a=node(" + actionIds + ") match a-[r:PRECEDE|LINK*1..100]->n";
        returnClause = "return n, ID(a), length(r), type(head(r))";
    } else {
        match = "match n";
        returnClause = "return n";
    }
    var query = match + " where (n:TestStep AND (" + descQuery + ")) or (n:UserAction AND (" + descQuery + ")) "+returnClause;
    console.log(query);
    db.query(query, null, function(err, results) {
        if (err) throw err;
        console.log("main nodes results #: "+results.length);
        var nodes = [],
            edges = [];
        var ids = [];
        results.map(function(result) {
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
            if (actionIds && actionIds.length > 0) {
                // add edges from previous main nodes to new main nodes
                var edgeType = 'FAR';
                if (result['length(r)'] == 1)
                    edgeType = result['type(head(r))'];
                var edge = {
                    "source": result['ID(a)'],
                    "target": id,
                    "value": edgeType
                };
                edges.push(edge);
            }
        });

        // get linked nodes that don't match expected results
        // query structure: <entity name> <property> <sign> <value>
        // for example: ServerCPU AVG > 4
        if (expectedQueryString.length == 0) {
            var obj = {
                "nodes": nodes,
                "links": edges
            }
            response.send(JSON.stringify(obj));
        } else {
            wordsArr = expectedQueryString.split(" ");

            // returh full path to results nodes    
            //    query = "START a = node(" + ids + ") MATCH p=(a)-[:LINK*1..500]->(n:" + wordsArr[0] + ") where (n." + wordsArr[1] + " " + wordsArr[2] + " " + wordsArr[3] + ") RETURN nodes(p)";

            query = "START a = node(" + ids + ") MATCH (a)-[r:LINK*1..500]->(n:" + wordsArr[0] + ") where (n." +
                wordsArr[1] + " " + wordsArr[2] + " " + wordsArr[3] + ") RETURN n, ID(a), length(r), type(head(r))";
            db.query(query, null, function(err, results) {
                if (err) throw err;
                //console.log('query: ' + query + '\nresults:\n' + JSON.stringify(results));
                results.map(function(result) {
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
                    var edgeType = 'FAR';
                    if (result['length(r)'] == 1)
                        edgeType = result['type(head(r))'];
                    var edge = {
                        "source": result['ID(a)'],
                        "target": id,
                        "value": edgeType
                    };
                    edges.push(edge);
                });
                query = "START a = node(" + ids + "), b = node(" + ids + ") MATCH a -[r]-> b RETURN r";
                console.log(query);
                db.query(query, null, function(err, results) {
                    results.map(function(result) {
                        var url = result.r.db.url + "/db/data/node/";
                        var edge = {
                            "source": parseInt(result.r._data.start.replace(url, "")),
                            "target": parseInt(result.r._data.end.replace(url, "")),
                            "value": result.r._data.type,
                            "id": result.r._data.metadata.id
                        };
                        edges.push(edge);
                    });

                    // TODO: get also all the edges from previous TestStep/UserActions (listed in actionIDs) nodes to new nodes (ids)

                    var obj = {
                        "nodes": nodes,
                        "links": edges
                    }
                    response.send(JSON.stringify(obj));
                });
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
        var nodes = [],
            edges = [];
        var ids = [];
        ids.push(id);
        results.map(function(result) {
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
        query = "START a = node(" + ids + "), b = node(" + ids + ") MATCH a -[r]-> b RETURN r";
        console.log(query);
        db.query(query, null, function(err, results) {
            results.map(function(result) {
                var url = result.r.db.url + "/db/data/node/";
                var edge = {
                    "source": parseInt(result.r._data.start.replace(url, "")),
                    "target": parseInt(result.r._data.end.replace(url, "")),
                    "value": result.r._data.type,
                    "id": result.r._data.metadata.id
                };
                edges.push(edge);
            });
            var obj = {
                "nodes": nodes,
                "links": edges
            }
            response.send(JSON.stringify(obj));
        });
    });
});

app.listen(8080);