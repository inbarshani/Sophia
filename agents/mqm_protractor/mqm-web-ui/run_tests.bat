IF "%1"=="" (
	node node_modules\grunt-cli\bin\grunt run-E2E-tests-home --server-url=http://myd-vm06983.hpswlabs.adapps.hp.com:8082/ --skip-update-npm=y --suite=All --force
) else (
	for /l %%x in (1, 1, %1) do (
	   echo %%x
	   node node_modules\grunt-cli\bin\grunt run-E2E-tests-home --server-url=http://myd-vm06983.hpswlabs.adapps.hp.com:8082/ --skip-update-npm=y --specs=./inbar/*.js --force
	   timeout /t 30
	)
)