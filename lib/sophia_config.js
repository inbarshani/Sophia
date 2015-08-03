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
	'for example: set NODE_ENV=&&set SOPHIA_APP=&&node sophia_mqm.js'+
	' - runs the Web server with all default settings\n'+
	'for example: set NODE_ENV=development&&set SOPHIA_APP=MQM&&node sophia_mqm.js'+
	' - runs the Web server with development env settings for MQM application\n');

exports = sophia_app_config;