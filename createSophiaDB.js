var sophia_config = require('./lib/sophia_config');
var mkpath = require('mkpath');

// make sure the DB folder exists
mkpath(require('path').dirname(sophia_config.TESTS_DB_FILE), 
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