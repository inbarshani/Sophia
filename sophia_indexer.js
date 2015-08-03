var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

function hashBackboneNodes(testNodeID)
{
	// get all backbone nodes of the test id
	// for each backbone node, create a hash to be used for comparison
	// hash is based on the data nodes linked to the backbone node
	// hash is stored on the backbone node IDOL document
	console.log('hashBackboneNodes of testNodeID: '+testNodeID);
	neo4j_queries.getBackboneNodes([testNodeID], function(backbone_nodes_result){		
		//console.log('getBackboneNodes results: '+require('util').inspect(backbone_nodes_result));
		var backbone_nodes = backbone_nodes_result[0].bbNodes;
		console.log('# of backbone nodes: '+backbone_nodes.length);
		backbone_nodes.forEach(function(backbone_node){
			neo4j_queries.getDataNodesStats([parseInt(backbone_node.id)], function(stats){
				var hash_string = '';
				Object.keys(stats).forEach(function(key){
					var node_ids = stats[key];
					// get the docs from IDOL
					idol_queries.searchByReference(node_ids, function(documents_hash){
						var idolResultNodes = Object.keys(documents_hash);
						idolResultNodes.forEach(function(idolResult){
							if (documents_hash[idolResult].type.toLowerCase()!='screen')
								hash_string += documents_hash[idolResult].caption+'\n';
						});
						console.log('node '+backbone_node.id+' hash:\n'+hash_string);
					});
				});
			});
		});
	});
}

hashBackboneNodes(68197);
