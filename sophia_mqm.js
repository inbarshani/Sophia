var express = require('express');
var fs = require('fs');

var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var app = express();

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/querySuggestions', function(request, response) {
    var currentNodes = JSON.parse(request.query.currentNodes);
    //console.log("currentNodes: "+currentNodes);
    neo4j_queries.getAllBackboneNodes(currentNodes, function(graphNodes) {
        if (graphNodes) {
            idol_queries.getSuggestedTerms(graphNodes, function(terms) {
                if (terms)
                    response.send(JSON.stringify(terms));
                else
                    response.status(404).send();
            });
        }
        else
            response.status(404).send();
    });

});

app.use('/search', function(request, response) {
    var queryText = request.query.q;
    var currentNodes = JSON.parse(request.query.currentNodes);

    idol_queries.search(queryText, function(nodes) {
        // verify that the nodes are connected after existing nodes
        var potentialNodes = [];
        nodes.map(function(node) {
            potentialNodes.push(node.graph_node);
        });
        if (currentNodes.length > 0) {
            neo4j_queries.doesPathExit(currentNodes, potentialNodes, function(final_nodes) {
                response.send(JSON.stringify(final_nodes));
            });
        } else
            response.send(JSON.stringify(potentialNodes));
    });
});

app.use('/report', function(request, response) {
    if (request.query.reportString.length > 0) {
        var reportString = new Date().toUTCString() + ' ' +
            request.connection.remoteAddress + ': ' + request.query.reportString + '\n';
        // save an audit of the actions done by a user
        fs.appendFile('audit.log', reportString, function(err) {
            if (err)
                console.log('Error saving audit data: ' + reportString);
        });
    }
    response.send();
});

app.listen(8080);