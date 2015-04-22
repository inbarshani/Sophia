var express = require('express');
//var neo4j = require("neo4j");
//var bodyParser = require('body-parser');
var fs = require('fs');

var sophia_consts = require('./lib/sophia_consts');
var neo4j = require('neo4j');
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/querySuggestions', function(request, response) {
    var currentNodes = JSON.parse(request.query.currentNodes);
    //console.log("currentNodes: "+currentNodes);

    var query = "";
    if (currentNodes.length == 0)
    {
        query = "MATCH root-[:" + sophia_consts.backboneLinkType + "*0..2]->a" +
            " WHERE ANY(label in labels(root) WHERE label IN ['" + sophia_consts.backboneRoot.join('\',\'') + "'])" +
            " return a.description";
    }
    else
    {
        query = "MATCH root-[:" + sophia_consts.backboneLinkType + "*1..5]->a" +
            " WHERE id(root) IN [" + currentNodes.join(',') + "]" +
            " return a.description";        
    }
    console.log("Get suggestions query: " + query);
    db.query(query, null, function(err, results) {
        if (err) {
            console.error('neo4j query failed: ' + query + '\n');
            throw err;
        } else {
            //console.log(results);
            var suggestions=[];
            results.map(function(result)
            {
                var desc = result['a.description'];
                if (suggestions.indexOf(desc) < 0)
                    suggestions.push(desc);
            });
            response.send(JSON.stringify(suggestions));
        }
    });
});

app.listen(8080);