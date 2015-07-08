Sophia
====

Central repository for Sophia code

A. Sophia Server Setup
====
1. Install NEO4J DB:
http://neo4j.com/download-thanks/?edition=community&flavour=windows&_ga=1.98862107.484321419.1415021153
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
	See <Sophia>\agents\jetty\logging\start.ini for an example. 
4. create folder /DATA/ads_slave/deployments/8082/hp/mqm/server/logs
5. copy <Sophia>\agents\jetty\logging\sophia to \logstash-1.4.2\patterns
6. Restart Jetty
7. running logstash in the background:
	cd /var/opt/logstash-1.4.2/bin
	./logstash -f log.conf &
	to bring to foreground: fg
	to send to background: bg
	to check bg jobs: jobs -l
	to check if logstash is running: ps aux | grep logstash
8. in MQM site admin configure to log everything


Happy Coding! :p