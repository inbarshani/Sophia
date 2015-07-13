var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');
var tests_queries = require('./lib/tests_queries');

var running = 0;

function runTests() {
    //console.log('get tests by type: ' + sophia_consts.searchTypes.FLOWS);
    tests_queries.getTestsByType('' + sophia_consts.searchTypes.FLOWS, function(err, tests) {
        console.log('got tests to run: ' + require('util').inspect(tests, {
            depth: 3
        }));
        if (err) {
            console.log('get tests by type err: ' + err);
            return;
        }
     	running = tests.length;        
        tests.forEach(function(test) {
            console.log('start test run testID ' + test.id);
            tests_queries.getTestByID(test.id, function(err, testDetails) {
                runNextQueryFlow(test.id, testDetails.queries, [], []);
            });
        });
    });
}

function runNextQueryFlow(testId, queries, currentNodes, results) {
    if (!queries || queries.length == 0)
    {
        saveFlowResults(testId, results);
        return;
    }
    if (!results)
        results = [];

	/*
    console.log('\n\nrunNextQueryFlow testID ' + testId +
        '\n\tqueries: ' + require('util').inspect(queries, {
            depth: 3
        }) +
        '\n\tcurrentNodes: ' + require('util').inspect(currentNodes, {
            depth: 3
        }) +
        '\n\tresults: ' + require('util').inspect(results, {
            depth: 3
        }));
	*/
    var dateCondition = null;
    var currentQuery = queries.shift(); // removes the item and returns it
    var isFirstQuery = (results.length == 0);
    idol_queries.search(currentQuery.query, dateCondition, function(documents_hash) {
        // verify that the nodes of the documents are connected after existing nodes
        //console.log('documents_hash keys: '+require('util').inspect(Object.keys(documents_hash), {depth: 2}));
        var idolResultNodes = Object.keys(documents_hash);
        if (idolResultNodes.length > 0) {
            neo4j_queries.doesPathExists(currentNodes, idolResultNodes, isFirstQuery,
                function(err, paths_to_nodes) {
                    var last_backbone_nodes = [];
                    var last_data_nodes = [];
                    // join paths_to_nodes with data from docuemtns
                    //console.log('documents_hash: '+require('util').inspect(documents_hash, {depth: 2}));
                    if (!err && paths_to_nodes)
                    {
	                    paths_to_nodes.forEach(function(path) {
	                        //console.log('mapping path of length: '+path.nodes.length);
	                        if (path.last_backbone && last_backbone_nodes.indexOf(path.last_backbone) < 0)
	                            last_backbone_nodes.push(path.last_backbone);
	                        if (path.last_data && last_data_nodes.indexOf(path.last_data) < 0)
	                            last_data_nodes.push(path.last_data);
	                    });
                	}
                	else
                		paths_to_nodes = [];
                	if (currentQuery.type == sophia_consts.queryTypes.QUERY)
                    	currentNodes = last_backbone_nodes.concat(last_backbone_nodes);
                    //console.log('paths_to_nodes: '+JSON.stringify(response_body));
                    results.push({
                        query: currentQuery,
                        result: paths_to_nodes.length
                    });
                    runNextQueryFlow(testId, queries, currentNodes, results);
                });
        } else // no results from IDOL
        {
            //console.log('paths_to_nodes: '+JSON.stringify(response_body));            
            results.push({
                query: currentQuery,
                result: 0
            });
            runNextQueryFlow(testId, queries, [], results);
        }
    });
}

function saveFlowResults(testId, results) {
    console.log('save testID ' + testId + ' results: ' + require('util').inspect(results, {
        depth: 3
    }));
    running--;
    tests_queries.saveTestRun(testId, sophia_consts.testRunTypes.SCHEDULER, results);
}

if (!running)
{
    runTests();
    setInterval(function(){
    	if (!running)
    		runTests();
    }, 30000);
}

