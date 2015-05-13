var neo4j = require('neo4j');
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');

var sophia_consts = require('./sophia_consts');

var no_err = null;

var queries = {
	
	doesPathExit: function(currentStartNodes, destinationNodes, callback)
	{
		// must limit the query size, so cut down on nodes arrays aribtarily		
		
		if (currentStartNodes && currentStartNodes.length>50)
			currentStartNodes.length = 50;
		if (destinationNodes && destinationNodes.length>50)
			destinationNodes.length = 50;
			
		var startNodesWhere = "";
		if (currentStartNodes.length > 0)
			startNodesWhere = 'id(start) IN ['+ currentStartNodes.join(',')+']';
		else
			startNodesWhere = "ANY(label in labels(start) WHERE label='"+sophia_consts.backboneRoot+"')";
			
	    var query = "MATCH path=start-[*]->destination" +
	            " WHERE " +
				startNodesWhere +
	            " AND id(destination) IN [" + destinationNodes.join(',') + "]" +
	            " return extract(n in nodes(path)| [id(n), labels(n)]) as path_nodes"+
	            " ORDER BY LENGTH(path_nodes) DESC";

	    console.log("Get connected nodes query: " + query);
	    db.query(query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + query + '\n');
               	if (callback)
					callback(err);
				else
					throw new Error('no callback');
	        } else {
	        	console.log('Get connected nodes # of results: '+results.length);
	            //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
	            var paths=[];
	            results.map(function(result)
	            {
	            	var path = {nodes:[], last_backbone: null, last_data: null, hash: ''};
	            	var path_nodes = result.path_nodes;
	            	//console.log('path: '+path);
	            	//console.log('path_nodes inspect: '+require('util').inspect(path_nodes, { showHidden: true, customInspect: true }));
	            	// find last backbone on path
	            	var backbone_id = -1, 
	            		destination_id = path_nodes[path_nodes.length-1][0];
	            	for (var i=0;i<path_nodes.length;i++)
	            	{
	            		var node_type = path_nodes[i][1][0];
	            		var node_id = path_nodes[i][0];
	            		//console.log('node_id: '+path_nodes[i][0]);
	            		//console.log('node_type: '+node_type);
	            		path.nodes.push({type: node_type, id: node_id});
	            		path.hash = path.hash +',' + node_id;
	            		if (sophia_consts.backboneTypes.indexOf(node_type) >= 0)
	            			path.last_backbone = node_id;
	            		else
	            			path.last_data = node_id;
	            	}
	            	// before adding this path, check that it is not part of another path
	            	//console.log('new path hash: '+path.hash);
	            	var j=0;
	            	for(;j<paths.length;j++)
	            	{
	            		//console.log('check new path is not part of other path: ');
	            		//console.log('compare with path hash: '+paths[j].hash);
	            		if (paths[j].hash.indexOf(path.hash) == 0) 
	            			break;
	            	}
	            	if (j >= paths.length) // ok, this is a new path
	                	paths.push(path); 
	            });
	        	console.log('Get connected nodes # of unique paths: '+paths.length);
	            if (callback)
	            	callback(paths);
				else
					throw new Error('no callback');

	        }	        
	    });

	},
	getAllBackboneNodes: function(currentNodes, callback)
	{
		// must limit the query size, so cut down on nodes arrays aribtarily		
		if (currentNodes && currentNodes.length > 50)
			currentNodes.length = 50;

	// TBD:do we need the label checks?
	    var query = "MATCH start-[:"+sophia_consts.backboneLinkType+"*]->backbone" +
	            " WHERE ANY(label in labels(backbone) WHERE label in ['" + 
	            	sophia_consts.backboneTypes.join('\',\'') + "'])";
	    if (currentNodes && currentNodes.length > 0)
	    	query = query + " AND id(start) IN ["+currentNodes.join(',')+"]";
	    query = query + " return id(backbone) as BackboneID";

	    console.log("Get backbone nodes: " + query);
	    db.query(query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + query + '\n');
               	if (callback)
					callback(err);
				else
					throw new Error('no callback');
	        } else {
	            //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
	            var backbone_nodes=[];
				if (results)
				{
		            results.map(function(result)
		            {
		            	var backbone_id = result.BackboneID;
		            	//console.log('backbone_id: '+backbone_id);
		                backbone_nodes.push(''+backbone_id); // string in order to be consistent elsewhere
		            });
		            if (callback)
		            	callback(backbone_nodes);
					else
						throw new Error('no callback');
				}
               	else if (callback)
					callback(new Error('No results for query: '+query));
				else
					throw new Error('no callback');
	        }	        
	    });
	},
	
	findLatestNode: function(isBackbone, start_node_id, timestamp, callback) {
	    //console.log(' [****] Find latest node');
	    var relation_type_qualifier = '';
	
	    if (isBackbone)
	        relation_type_qualifier = '[:' + sophia_consts.backboneLinkType + '*]';
	    else
	        relation_type_qualifier = '[:' + sophia_consts.dataLinkType + '*]';
	
	
	    // now 
	
	    var latest_nodes_query =
	        'MATCH pathToLaterNode = start_node-' + relation_type_qualifier + '->later_nodes ' +
	        ' WHERE id(start_node)=' + start_node_id +
	        ' AND later_nodes.timestamp <= ' + timestamp +
	        ' WITH pathToLaterNode ORDER BY LENGTH(pathToLaterNode) DESC LIMIT 1 ' +
	        ' RETURN id(LAST(NODES(pathToLaterNode))) AS LatestID';
	
	    //console.log(' [****] Latest node query: ' + latest_nodes_query);
	
	    db.query(latest_nodes_query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + latest_nodes_query + '\nerr: ' + err + '\n');
               	if (callback)
					callback(err);
				else
					throw new Error('no callback');
	        } else {
	            //console.log(' [*****] Latest node results: ' + require('util').inspect(results));
	            var latest_node_id = null;
	            if (results[0]) {
	                latest_node_id = results[0]['LatestID'];
	                if (!latest_node_id)
	                    latest_node_id = null;
	            }
				if (callback)
	            	callback(no_err, latest_node_id);
				else
					throw new Error('no callback');
	        }
	    });
	},

	findNextNode: function(isBackbone, start_node_id, callback) {
	    //console.log(' [****] Find next node');
	    var relation_type_qualifier = '';
	
	    if (isBackbone)
	        relation_type_qualifier = '[:' + sophia_consts.backboneLinkType + ']';
	    else
	        relation_type_qualifier = '[:' + sophia_consts.dataLinkType + ']';
	
	    // now 
	
	    var next_node_query =
	        'MATCH start_node-' + relation_type_qualifier + '->next_node' +
	        ' WHERE id(start_node)=' + start_node_id +
	        ' RETURN id(next_node) AS NextID';
	
	    //console.log(' [****] Next node query: ' + next_node_query);
	
	    db.query(next_node_query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + next_node_query + '\nerr: ' + err + '\n');
               	if (callback)
					callback(err);
				else
					throw new Error('no callback');
	        } else {
	            //console.log(' [*****] next node results: ' + require('util').inspect(results));
	            var next_node_id = null;
	            if (results[0])
	                next_node_id = results[0]['NextID'];
				if (callback)
	            	callback(no_err, next_node_id);
				else
					throw new Error('no callback');
	        }
	    });
	},

	/* next_node_id may be null to indicate no next node*/
	/* deprecated */
	_linkNode: function(isBackbone, node_id, prev_node_id, next_node_id, shouldLinkToPrev, callback) {
	    //console.log(' [****] Linking a new node to prev node ' + prev_node_id + ' and next node ' + next_node_id);
	    var link_query = '';
	    var relation_type_qualifier = '';
	
	    if (isBackbone)
	        relation_type_qualifier = '[:' + sophia_consts.backboneLinkType + ']';
	    else
	        relation_type_qualifier = '[:' + sophia_consts.dataLinkType + ']';
	
	    var relation_create_clause = '';
	    if (next_node_id && shouldLinkToPrev) {
	        relation_create_clause = ' CREATE prev_node-' + relation_type_qualifier +
	            '->new_node-' + relation_type_qualifier + '->next_node';
	    } else if (next_node_id) {
	        relation_create_clause = ' CREATE new_node-' + relation_type_qualifier + '->next_node';
	    } else if (shouldLinkToPrev) {
	        relation_create_clause = ' CREATE prev_node-' + relation_type_qualifier + '->new_node';
	    } else
	        throw new Error('linkNode: No link required');
	
	    if (next_node_id) {
	        link_query =
	            'MATCH prev_node, new_node, next_node' +
	            ' WHERE id(prev_node) = ' + prev_node_id +
	            ' AND id(new_node) = ' + node_id +
	            ' AND id(next_node) = ' + next_node_id +
	            relation_create_clause +
	            ' WITH prev_node, next_node' +
	            ' MATCH prev_node-[old_link]->next_node DELETE old_link';
	    } else {
	        link_query =
	            'MATCH prev_node, new_node' +
	            ' WHERE id(prev_node) = ' + prev_node_id +
	            ' AND id(new_node) = ' + node_id +
	            relation_create_clause;
	    }
	
	    // console.log(' [****] Linking nodes query: ' + link_query);
	    if (link_query) {
	        db.query(link_query, null, function(err, results) {
	            if (err) {
	                console.error('neo4j query failed: ' + link_query + '\nerr: ' + err + '\n');
	               	if (callback)
						callback(err);
					else
						throw new Error('no callback');

	            }
				if (callback)
	            	callback(no_err);
	        });
	    }
	},
	
	getNodeLocationByTimestamp: function(test_id, timestamp, callback)
	{
	    var query = "MATCH pathToLaterBackbone = start_node-[:"+sophia_consts.backboneLinkType+"*0..]->prev_b" + 
			" WHERE id(start_node)=" + test_id + 
			" AND prev_b.timestamp <= " + timestamp + 
			" WITH pathToLaterBackbone ORDER BY LENGTH(pathToLaterBackbone) DESC LIMIT 1"+ 
			" WITH LAST(NODES(pathToLaterBackbone)) AS prev_backbone"+ 
			" MATCH prev_backbone-[:"+sophia_consts.backboneLinkType+"*0..1]->next_backbone"+ 
			" WITH prev_backbone, next_backbone ORDER BY next_backbone.timestamp DESC LIMIT 1"+ 
			" MATCH pathToLaterData = prev_backbone-[:"+sophia_consts.dataLinkType+"*0..]->prev_data"+ 
			" WHERE prev_data.timestamp <= " + timestamp + 
			" WITH prev_backbone, next_backbone, pathToLaterData ORDER BY LENGTH(pathToLaterData) DESC LIMIT 1"+ 
			" WITH prev_backbone, next_backbone, LAST(NODES(pathToLaterData)) as prev_data"+ 
			" MATCH prev_data-[:"+sophia_consts.dataLinkType+"*0..1]->next_data"+ 
			" RETURN id(prev_backbone) AS PrevBackboneID, id(next_backbone) AS NextBackboneID,"+
			" id(prev_data) AS PrevDataID, id(next_data) AS NextDataID"+ 
			" ORDER BY next_data.timestamp DESC LIMIT 1";

	    console.log(' [****] Get node location by timestamp query: ' + query);
	    db.query(query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + query + '\n');
	            if (callback)
					callback(err);
				else
					throw new Error('no callback');
	        } else {
	            //console.log(require('util').inspect(results, { showHidden: true, depth: 4 }));
	            if (callback && results && results.length>0 && results[0])
	            	callback(no_err, results[0].PrevBackboneID, results[0].NextBackboneID, 
						results[0].PrevDataID, results[0].NextDataID);
				else if (callback)
					callback(new Error('failed to get a new node\'s location'));
				else
					throw new Error('no callback');
	        }	        
	    });		
	},
	
	linkNode: function(node_id, isBackbone, prev_backbone_id, next_backbone_id, 
		prev_data_id, next_data_id, callback)
	{
	    //console.log(' [****] Linking a new node to prev node ' + prev_node_id + ' and next node ' + next_node_id);
	    var link_query = '';
	
	    if (isBackbone)
		{
		    if (next_backbone_id != prev_backbone_id) {
		        link_query = 'MATCH prev_node, new_node, next_node' +
		            ' WHERE id(prev_node) = ' + prev_backbone_id +
	            	' AND id(new_node) = ' + node_id +
	            	' AND id(next_node) = ' + next_backbone_id +
					' WITH prev_node, next_node, new_node' +
					' CREATE prev_node-[:' + sophia_consts.backboneLinkType + ']' +
					'->new_node-[:' + sophia_consts.backboneLinkType + ']->next_node' +
					' WITH prev_node, next_node, new_node'+ // keep the new_node, as there may be 
					// additional data later
					' MATCH prev_node-[old_link]->next_node DELETE old_link';
		    } else { 
		        link_query = 'MATCH prev_node, new_node' +
		            ' WHERE id(prev_node) = ' + prev_backbone_id +
	            	' AND id(new_node) = ' + node_id +
					' CREATE prev_node-[:' + sophia_consts.backboneLinkType + ']' +
		            '->new_node';
			}
			if (next_data_id != prev_backbone_id)
			{
				// should also move the previous data to this new backbone node
				if (next_data_id != prev_data_id)
				{
					// split previous data and move the next nodes
					link_query = link_query + 
						' WITH new_node MATCH next_data'+
			            ' WHERE id(next_data)=' + next_data_id +
						' CREATE new_node-[:'+sophia_consts.dataLinkType+']->next_data'+
						' WITH next_data'+
						' MATCH prev_data-[old_data_link]->next_data'+
			            ' WHERE id(prev_data)=' + prev_data_id +
						' DELETE old_data_link';
				}
				else
				{
					// next_data_id == prev_data_id != prev_backbone_id
					// no need to move the data as there wasn't a data node with timestamp greater than
					// new backbone node
				}
			}
		}
	    else // data node
		{
		    if (next_data_id != prev_data_id) {
		        link_query = 'MATCH prev_node, new_node, next_node' +
		            ' WHERE id(prev_node) = ' + prev_data_id +
	            	' AND id(new_node) = ' + node_id +
	            	' AND id(next_node) = ' + next_data_id +
					' WITH prev_node, next_node, new_node' +
					' CREATE prev_node-[:' + sophia_consts.dataLinkType + ']' +
					'->new_node-[:' + sophia_consts.dataLinkType + ']->next_node' +
					' WITH prev_node, next_node'+
					' MATCH prev_node-[old_link]->next_node DELETE old_link';
		    } else { 
		        link_query = 'MATCH prev_node, new_node' +
		            ' WHERE id(prev_node) = ' + prev_data_id +
	            	' AND id(new_node) = ' + node_id +
					' CREATE prev_node-[:' + sophia_consts.dataLinkType + ']' +
		            '->new_node';
			}
		}
	
		console.log(' [****] Linking nodes query: ' + link_query);
	    if (link_query) {
	        db.query(link_query, null, function(err, results) {
	            if (err) {
	                console.error('neo4j query failed: ' + link_query + '\nerr: ' + err + '\n');
					if (callback)
		            	callback(err);
					else
						throw new Error('no callback');					
	            }
				if (callback)
	            	callback(no_err);
				else
					throw new Error('no callback');					
	        });
	    }		
	}	

};

module.exports = queries;