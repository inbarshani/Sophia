var neo4j = require('neo4j');
// connect to neo4j DB, on Yaron's machine and Inbar's machine
var db = new neo4j.GraphDatabase('http://localhost:7474');


var queries = {

	doesPathExit: function(startNodes, destinationNodes, callback)
	{
	    var query = "MATCH path=start-[*1..10]->destination" +
	            " WHERE id(start) IN [" + startNodes.join(',') + "]" +
	            " AND id(destination) IN [" + destinationNodes.join(',') + "]" +
	            " return id(destination) as NodeID";

	    console.log("Get connected nodes query: " + query);
	    db.query(query, null, function(err, results) {
	        if (err) {
	            console.error('neo4j query failed: ' + query + '\n');
	            throw err;
	        } else {
	            //console.log(results);
	            var available_nodes=[];
	            results.map(function(result)
	            {
	                var id = result['NodeID'];
	                available_nodes.push(''+id); // to be consistent elsewhere
	            });
	            if (callback)
	            	callback(available_nodes);
	        }	        
	    });

	}

};

module.exports = queries;