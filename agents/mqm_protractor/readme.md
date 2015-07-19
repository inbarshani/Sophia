mqm unit tests use protractor and jasmine under the hood
the Sophia agent is a jasmine reporter (for Jasmine 1.3)

to install, copy the folder structure under this folder
to %MQM_ROOT%\UI\mqm-web-ui
For all files that have an existing destination, DO NOT
COPY OVER, instead merge the files
* protractor.js should be merged (adding the extension and invoking script on browser startup)
* conf-file.ts should be merged (adding onprepare action to load jasmine-instrument.ts)
* e2etests.js should be merged (adding the extension)

Sophia data server settings are coded in jasmine-instrument.ts

Make sure the chrome extension is also up-to-date (Chrome.crx, 
created by the Chrome Extensions page 'pack extension' feature)

To run tests, you can use run-test.bat at the root of mqm-web-ui

obsolete:
* sop.html is no longer needed (replaced with protractor.js inovking broswer script)
* install.bat should not be used, it is not up-to-date on which files and how to use