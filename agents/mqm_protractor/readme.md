mqm unit tests use protractor and jasmine under the hood
the Sophia agent is a jasmine reporter (for Jasmine 1.3)

to install, copy the folder structure under this folder
to %MQM_ROOT%\UI\mqm-web-ui
For all files that have an existing destination, DO NOT
COPY OVER, instead merge the files

Copy sop.html to the root of the c: folder

Sophia data server settings are coded in jasmine-instrument.ts

Make sure the chrome extension is also up-to-date (Chrome.crx, 
created by the Chrome Extensions page 'pack extension' feature)

To run tests, you can use run-test.bat at the root of mqm-web-ui