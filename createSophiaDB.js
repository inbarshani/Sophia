var sophia_config = require('./lib/sophia_config');
var mkpath = require('mkpath');
var path = require('path');

// if a new folder is supplied via CLI, change sophia settings
if (process.argv && process.argv.length >= 3)
	sophia_config.TESTS_DB_FILE = process.argv[2] + path.sep + path.basename(sophia_config.TESTS_DB_FILE);

console.log('create Sophia DB at '+sophia_config.TESTS_DB_FILE);
// make sure the DB folder exists
mkpath(path.dirname(sophia_config.TESTS_DB_FILE), 
	function(err){
		if (!err)
		{
			var tests_queries = require('./lib/tests_queries');
			tests_queries.importScheme();
		}
        else
            console.log('ERROR: failed to create TESTS DB at '+
                sophia_config.TESTS_DB_FILE+':\n'+
                err);
	});