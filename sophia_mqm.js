var express = require('express');

var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var app = express();

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/querySuggestions', function(request, response) {
    var currentNodes = JSON.parse(request.query.currentNodes);
    //console.log("currentNodes: "+currentNodes);
    /*
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
    });*/
    response.send('');
});

app.use('/search', function(request, response) {
    var queryText = request.query.q;
    var currentNodes = JSON.parse(request.query.currentNodes);

    idol_queries.search(queryText, function(nodes) {
        // verify that the nodes are connected after existing nodes
        var potentialNodes=[];
        nodes.map(function(node){
            potentialNodes.push(node.graph_node);
        });
        if (currentNodes.length > 0)
        {
            neo4j_queries.doesPathExit(currentNodes, potentialNodes, function(final_nodes){
                response.send(JSON.stringify(final_nodes));
            });
        }
        else
            response.send(JSON.stringify(potentialNodes));
    });
});

app.listen(8080);