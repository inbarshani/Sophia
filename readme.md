Sophia
====

Central repository for Sophia code

A. Sophia Server Setup
====
1. Install NEO4J DB:
http://neo4j.com/download-thanks/?edition=community&flavour=windows&_ga=1.98862107.484321419.1415021153
Multiple Server instances on one machine:
http://fooo.fr/~vjeux/github/github-recommandation/db/doc/manual/html/server-installation.html#_multiple_server_instances_on_one_machine
2. Install Node.js
http://nodejs.org/
3. install Erlang OTP (current version is 17):
http://www.erlang.org/download.html
4. install RabbitMQ server:
http://www.rabbitmq.com/download.html
Make sure the service is working
5. Checkout code
6. install Node modules:
In Sophia folder, where package.json exists, run: npm install
7. Save tests DB: install SQLite DB on Sophia server: https://www.sqlite.org/download.html
(to browse DB on windows you can install "DB Browser for SQLite": https://github.com/sqlitebrowser/sqlitebrowser/releases)
8. SQLite DB is <Sophia root floder>/Sophia.db
9. to create the DB tables, run:
CREATE TABLE `SOP_TEST` (
	`ID`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	`NAME`	TEXT NOT NULL UNIQUE,
	`TYPE`	TEXT,
	`CREATED`	TEXT,
	`USER`	TEXT
);

CREATE TABLE `SOP_QUERY` (
	`ID`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	`QUERY_TEXT`	TEXT,
	`TEST_ID`	INTEGER,
	`POSITION`	INTEGER,
	`QUERY_TYPE`	INTEGER
);
10. to support image hashing, need to install ImageMagick and add it to PATH env var
	http://www.imagemagick.org/script/binary-releases.php
	add the root of the installation to PATH

B. Jetty and MQM log parser - REPEAT STEPS 3-4 AFTER MQM DEPLOYMENT!!!!
====
1. Download Logstash (current version is 1.4.2) and extract to a folder in ALM server
2. Extract <Sophia>\agents\jetty\logging\log.conf to \logstash-1.4.2\bin
3. enable Jetty logging: edit /DATA/ads_slave/deployments/8082/hp/mqm/server/conf/start.ini and enable the relevant logs:
	jetty.xml
	jetty-requestlog.xml
	jetty-deploy.xml
	jetty-rewrite.xml
	jetty-stats.xml
	jetty-logging.xml
	See <Sophia>\agents\jetty\server\conf\start.ini for an example. 
4. edit /DATA/ads_slave/deployments/8082/hp/mqm/server/conf/jetty-requestlog.xml
	after the line <Set name="LogTimeZone"><Property name="requestlog.timezone" default="GMT"/></Set>
	add the next line:
    <Set name="logDateFormat">dd/MMM/yyyy:HH:mm:ss.SSS</Set>
    See <Sophia>\agents\jetty\server\conf\jetty-requestlog.xml for an example.
5. create folder /DATA/ads_slave/deployments/8082/hp/mqm/server/logs
6. copy <Sophia>\agents\jetty\logging\sophia to /var/opt/logstash-1.4.2/patterns
7. Restart Jetty
	7.1 go to MQM install /DATA/ads_slave/deployments/8082/hp/mqm/wrapper
	7.2 do ./HPALM restart (or stop and then start)
8. running logstash in the background:
	cd /var/opt/logstash-1.4.2/bin
	./logstash -f log.conf &
	to bring to foreground: fg
	to send to background: bg
	to check bg jobs: jobs -l
	to check if logstash is running: ps aux | grep logstash
9. in MQM site admin configure to log everything

C. AppPulse POC
====
1. Download Logstash (current version is 1.4.2) and extract to a folder in AppPulse server
2. Extract <Sophia>\agents\app_pulse\log.conf to \logstash-1.4.2\bin
3. copy <Sophia>\agents\jetty\logging\sophia to \logstash-1.4.2\patterns
4. make sure the next log files exist: /opt/HP/diagApps/logs/ApmAppsAll.log, RUM-dal.log
5. run logstash as described in B.7


Happy Coding! :p