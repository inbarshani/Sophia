mqm unit tests use protractor and jasmine under the hood
the agent is a jasmine reporter (and possibly method wrapper)
it is installed by adding a ts (typescript) file to a known folder in mqm tests folders
and adding a reference to that ts in the main mqm config file

Sophia data server settings are coded in the agent, so may need to change on deployment

Target folder:
mqm\UI\mqm-web-ui\test\tulip\tests\config-file-plugins

Conf file:
mqm\UI\mqm-web-ui\test\tulip\tests\conf-file.ts
Add instruction:
var jasmineInstrumentation = require('./config-file-plugins/jasmine-instrument');
