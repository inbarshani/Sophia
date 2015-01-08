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

B. Jetty log parser
====
1. Download Logstash (current version is 1.4.2) and extract to a folder in ALM server
2. Extract <Sophia>\agents\jetty\logging\log.conf to \logstash-1.4.2\bin
3. enable Jetty logging: edit C:\ProgramData\HP\ALM\server\conf\start.ini and enable the relevant logs.
See <Sophia>\agents\jetty\logging\start.ini for an example. Restart Jetty


Happy Coding! :p