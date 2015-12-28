var config = require('konfig')();

var sophia_default_config = config.sophia;
var sophia_app_config = sophia_default_config;

var sophia_app_name = process.env.SOPHIA_APP;
if (sophia_app_name && config[sophia_app_name.toLowerCase()])
{
	var temp_config = config[sophia_app_name.toLowerCase()];
	Object.keys(temp_config).forEach(function(key){
		sophia_app_config[key] = temp_config[key];
	});
}


Object.keys(sophia_app_config).map(function(key) { 
	// override configuration which overlaps ENV vars
	if (process.env[key])
		sophia_app_config[key] = process.env[key];
	// konfig converts array to object. convert "array-like" objects back to array
	if (sophia_app_config[key].constructor === Object) {
		if (sophia_app_config[key][0]) {
			sophia_app_config[key] = Object.keys(sophia_app_config[key]).map(function(j) { return sophia_app_config[key][j] });
		}
	}
	// resolve DNS issues, as neo4j isn't using dns.lookup (= doesn't rely on OS for DNS resolution)
	if (sophia_app_config.dnsResolveVars.indexOf(key) >= 0)
	{
		require('dns').lookup(sophia_app_config[key], function(err, address, family){
			if (!err)				
			{
				console.log('Sophia configuration: '+key+' resolved from '+
					sophia_app_config[key]+ ' to '+ address);
				sophia_app_config[key] = address;
			}
		});
	}
});

console.log('Sophia config loaded for app '+
	(sophia_app_name? sophia_app_name : 'default')+
	' and environment '+
	(process.env.NODE_ENV? process.env.NODE_ENV : 'default')+
	': ');
for (var name in sophia_app_config) {
    console.log(name + ': ' + JSON.stringify(sophia_app_config[name]));
}
console.log('\nSophia is affected by NODE_ENV and SOPHIA_APP variables:\n'+
	'set NODE_ENV=development|testing|production\nset SOPHIA_APP={app_name}\n'+
	'for example: set NODE_ENV=&&set SOPHIA_APP=&&node sophia_app.js'+
	' - runs the Web server with all default settings\n'+
	'for example: set NODE_ENV=development&&set SOPHIA_APP=MQM&&node sophia_app.js'+
	' - runs the Web server with development env settings for MQM application\n');

module.exports = sophia_app_config;