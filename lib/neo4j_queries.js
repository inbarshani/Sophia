var neo4j = require('neo4j');
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');

var sophia_consts = require('./sophia_consts');

var queries = {

	doesPathExit: function(startNodes, destinationNodes, callback)
	{
	    var query = "MATCH path=start-[*]->destination" +
	            " WHERE id(start) IN [" + startNodes.join(',') + "]" +
	            " AND id(destination) IN [" + destinationNodes.join(',') + "]" +
	            " return extract(n in nodes(path)| [id(n), labels(n)]) as path_nodes";

	    console.log("Get connected nodes query: " + query);
	    db.query(query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + query + '\n');
	            throw err;
	        } else {
	            //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
	            var available_nodes=[];
	            results.map(function(result)
	            {
	            	var path_nodes = result.path_nodes;
	            	//console.log('path: '+path);
	            	//console.log('path_nodes inspect: '+require('util').inspect(path_nodes, { showHidden: true, customInspect: true }));
	            	// find last backbone on path
	            	var backbone_id = -1, 
	            		destination_id = path_nodes[path_nodes.length-1][0];
	            	for (var i=0;i<path_nodes.length;i++)
	            	{
	            		var node_type = path_nodes[i][1][0];
	            		//console.log('node_id: '+node_id)
	            		//console.log('node_type: '+node_type)
	            		if (sophia_consts.backboneTypes.indexOf(node_type) >= 0)
	            			backbone_id = path_nodes[i][0];
	            		else
	            			break; // we found the last backbone node
	            	}
	            	//console.log('backbone_id: '+backbone_id);
	            	//console.log('destination_id: '+destination_id);
	            	if (backbone_id >= 0 && backbone_id != destination_id)
	                	available_nodes.push(''+backbone_id); // string in order to be consistent elsewhere
	                available_nodes.push(''+destination_id); // string in order to be consistent elsewhere
	            });
	            if (callback)
	            	callback(available_nodes);
	        }	        
	    });

	}

};

module.exports = queries;