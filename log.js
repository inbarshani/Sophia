var neo4j_q=require('./lib/neo4j_queries');

neo4j_q.getNodeLocationByTimestamp(66218, 1431258273128, lognodes);
neo4j_q.getNodeLocationByTimestamp(66218, 1531258273128, lognodes);
neo4j_q.getNodeLocationByTimestamp(66218, 1431258269461, lognodes);

function lognodes(prevbackbone, nextbackbone, prevdata, nextdata)
{
	console.log('Prev b: '+prevbackbone);
	console.log('Next b: '+nextbackbone);
	console.log('Prev d: '+prevdata);
	console.log('Next d: '+nextdata);
}