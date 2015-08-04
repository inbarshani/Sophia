var sophia_config = require('./lib/sophia_config');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var amqp = require('amqp');
var connection = amqp.createConnection({
    host: sophia_config.QUEUE_HOST
});

connection.on('ready', function() {
    console.log('connected to RabbitMQ');
    connection.queue(sophia_config.QUEUE_TEST_NAME, {
        autoDelete: false,
        durable: true
    }, function(queue) {

        console.log(' [*] Waiting for messages on '+sophia_config.QUEUE_TEST_NAME+
        	'. To exit press CTRL+C')

        queue.subscribe(_hashBackboneNodes);
    });
});

function _hashBackboneNodes(msg)
{
	console.log('_hashBackboneNodes with msg: '+require('util').inspect(msg));
	// need to wait for awhile, to allow IDOL and neo4j to complete indexing
	setTimeout(hashBackboneNodes, 60000, msg);
}

function hashBackboneNodes(msg)
{
	console.log('hashBackboneNodes with msg: '+require('util').inspect(msg));
	var testNodeID = msg.TestNodeID;
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
						console.log('hashBackboneNodes '+backbone_node.test_id+
							' stats IDOL results: '+idolResultNodes.length+' for type '+key);
						idolResultNodes.forEach(function(idolResult){
							if (documents_hash[idolResult].type.toLowerCase()!='screen')
							{
								console.log('hashBackboneNodes '+backbone_node.test_id+
									' adding to hash: '+documents_hash[idolResult].caption);
								hash_string += documents_hash[idolResult].caption+'\n';
							}
						});
						idol_queries.updateIdolDocument(null, backbone_node.id, 
							{"hash": hash_string});
						//console.log('node '+backbone_node.test_id+' hash:\n'+hash_string);
					});
				});
			});
		});
	});
}
