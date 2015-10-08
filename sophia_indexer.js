var sophia_config = require('./lib/sophia_config');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var amqp = require('amqp');

if (process.argv.length == 2)
{
	var connection = amqp.createConnection({
	    host: sophia_config.QUEUE_HOST
	});

	connection.on('ready', function() {
	    console.log('connected to RabbitMQ');
	    connection.queue(sophia_config.QUEUE_TESTS_NAME, {
	        autoDelete: false,
	        durable: true
	    }, function(queue) {

	        console.log(' [*] Waiting for messages on '+sophia_config.QUEUE_TESTS_NAME+
	        	'. To exit press CTRL+C')

	        queue.subscribe(_hashBackboneNodes);
	    });
	});
}
else
{
	if (process.argv.length == 3 && process.argv[2] == 'all')
		indexAll();
	else
		console.log('Usage: node sophia_indexer.js {all}');
}

function _hashBackboneNodes(msg)
{
	console.log('_hashBackboneNodes with msg: '+require('util').inspect(msg));
	// need to wait for awhile, to allow IDOL and neo4j to complete indexing
	setTimeout(hashBackboneNodes, (2 * 60 * 1000), msg);
}

function hashBackboneNodes(msg)
{
	console.log('hashBackboneNodes with msg: '+require('util').inspect(msg));
	var testNodeID = msg.TestNodeID;
	console.log('hashBackboneNodes of testNodeID: '+testNodeID);
	indexTestByIDs([testNodeID]);
}

function indexTestByIDs(testNodeIDsArray)
{
	neo4j_queries.getBackboneNodes(testNodeIDsArray, function(backbone_nodes_results){		
		//console.log('indexTestByID results: '+require('util').inspect(backbone_nodes_result));
		backbone_nodes_results.forEach(function(backbone_nodes_result){
			var backbone_nodes = backbone_nodes_result.bbNodes;
			console.log('# of backbone nodes: '+backbone_nodes.length);
			backbone_nodes.forEach(function(backbone_node){
				neo4j_queries.getDataNodesStats([parseInt(backbone_node.id)], 
					function(stats){
					var hash_items = [];
					var node_ids = [];
					Object.keys(stats).forEach(function(key){
						node_ids = node_ids.concat(stats[key]);
					});
					if (node_ids.length > 0)
					{
						idol_queries.searchByReference(node_ids, false, false, function(documents_hash){
							var idolResultNodes = Object.keys(documents_hash);
							//console.log('indexTestByID '+backbone_node.test_id+
							//	' stats IDOL results: '+idolResultNodes.length);
							idolResultNodes.forEach(function(idolResult){
								var result_caption = documents_hash[idolResult].caption;						
								if (result_caption!='screen capture')
								{
									// check if we repeat existing additions
									if (hash_items.indexOf(result_caption) < 0)
									{
										//console.log('indexTestByID '+backbone_node.test_id+
										//	' adding to hash: '+result_caption);
										hash_items.push(result_caption);
									}
								}
							});
							idol_queries.updateIdolDocument(null, backbone_node.id, 
								{"hash": hash_items.join('\n')});
							//console.log('node '+backbone_node.test_id+' hash:\n'+hash_string);
						});
					}
				});
			});
		});
	});
}

function indexAll()
{
	// get all test nodes, then index them
	neo4j_queries.getAllTestNodes(function(testIDs){
		//console.log('indexAll getAllTestNodes results: '+require('util').inspect(testIDs));
		var testNodeIDs = [];
		testIDs.map(function(testIDObj){
			testNodeIDs.push(testIDObj.TestNodeID);
		});
		//console.log('indexAll testNodeIDs: '+require('util').inspect(testNodeIDs));
		indexTestByIDs(testNodeIDs);
	});
}

process.on('uncaughtException', function (err) {
  console.log('process uncaughtException: '+require('util').inspect(err));
});