@ECHO OFF
IF NOT EXIST %~1\UI\mqm-web-ui\test\tulip\tests\config-file-plugins GOTO EchoUsage

:Install
xcopy /fy jasmine-instrument.ts %~1\UI\mqm-web-ui\test\tulip\tests\config-file-plugins
echo. >> %~1\UI\mqm-web-ui\test\tulip\tests\conf-file.ts
echo var jasmineInstrumentation = require('./config-file-plugins/jasmine-instrument'); >> %~1\UI\mqm-web-ui\test\tulip\tests\conf-file.ts
GOTO End

:EchoUsage
ECHO Use: install mqm_root_folder

:End
