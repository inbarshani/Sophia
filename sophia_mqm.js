var express = require('express');
var fs = require('fs');

var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var app = express();

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());

app.use('/querySuggestions', function(request, response) {
    var currentPaths = JSON.parse(request.query.currentPaths);
    //console.log("currentPaths: "+currentPaths);
    neo4j_queries.getAllBackboneNodes(currentPaths, function(graphNodes) {
        if (graphNodes) {
            idol_queries.getSuggestedTerms(graphNodes, function(terms) {
                if (terms)
                    response.send(JSON.stringify(terms));
                else
                    response.send();
            });
        } else
            response.send();
    });

});

app.use('/search', function(request, response) {
    var queryText = request.query.q;
    var currentNodes = JSON.parse(request.query.currentNodes);

    idol_queries.search(queryText, function(documents_hash) {
        // verify that the nodes of the documents are connected after existing nodes
        //console.log('documents_hash keys: '+require('util').inspect(Object.keys(documents_hash), {depth: 2}));
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.doesPathExit(currentNodes, idolResultNodes, function(paths_to_nodes) {
                var last_backbone_nodes = [];
                var last_data_nodes = [];
                // join paths_to_nodes with data from docuemtns
                //console.log('documents_hash: '+require('util').inspect(documents_hash, {depth: 2}));
                paths_to_nodes.map(function(path) {
                    //console.log('mapping path of length: '+path.nodes.length);
                    if (path.last_backbone && last_backbone_nodes.indexOf(path.last_backbone) < 0)
                        last_backbone_nodes.push(path.last_backbone);
                    if (path.last_data && last_data_nodes.indexOf(path.last_data) < 0)
                        last_data_nodes.push(path.last_data);
                    for (var i = 0; i < path.nodes.length; i++) {
                        var node_id = path.nodes[i].id;
                        var node_doc = documents_hash['' + node_id];
                        //console.log('document for '+node_id+' is '+node_doc);
                        path.nodes[i].data = node_doc;
                    }
                });
                var response_body = {
                    paths_to_nodes: paths_to_nodes,
                    last_backbone_nodes: last_backbone_nodes,
                    last_data_nodes: last_data_nodes
                };
                //console.log('paths_to_nodes: '+JSON.stringify(response_body));
                response.send(JSON.stringify(response_body));
            });
        } else // no results from IDOL
        {
            var response_body = {
                paths_to_nodes: [],
                last_backbone_nodes: [],
                last_data_nodes: []
            };
            //console.log('paths_to_nodes: '+JSON.stringify(response_body));
            response.send(JSON.stringify(response_body));
        }
    });
});

app.use('/getScreens', function(request, response) {
    if (request.query.selectedNode) {
        neo4j_queries.getNearestScreens(request.query.selectedNode,
            function(prevScreenTimestamp, nextScreenTimestamp) {
                var results = {
                    prevScreenTimestamp: prevScreenTimestamp,
                    nextScreenTimestamp: nextScreenTimestamp
                };
                console.log('getScreens returned: ' + JSON.stringify(results));
                response.send(JSON.stringify(results));
            });
    }
});

app.use('/screen/:timestamp', function(request, response) {
    var timestamp = request.params.timestamp;
    console.log('Get screen with timestamp: ' + timestamp);
    if (timestamp) {
        try {
            var img = fs.readFileSync('./upload/' + timestamp + '.jpg');
            response.writeHead(200, {
                'Content-Type': 'image/JPEG'
            });
            response.end(img, 'binary');
        } catch (ex) {
            console.log('Failed to load screen with timestamp: ' + timestamp);
            response.send('Failed to load screen with timestamp: ' + timestamp);
        }
    }
});



app.use('/report', function(request, response) {
    if (request.query.reportString.length > 0) {
        var reportString = new Date().toUTCString() + ' ' +
            'Client IP: ' + request.connection.remoteAddress + ' ' + request.query.reportString + '\n';
        // save an audit of the actions done by a user
        fs.appendFile('audit.log', reportString, function(err) {
            if (err)
                console.log('Error saving audit data: ' + reportString);
        });
    }
    response.send();
});

app.listen(8085);