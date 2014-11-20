var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");

// define parsers for log
var parserMgr = require("csvtojson").core.parserMgr;

module.exports = {
    read: function (callback) {

        //read from file
        parserMgr.clearParsers();

        /* Cpu monitor on myd-vm06792.hpswlabs.adapps.hp.com */
        parserMgr.addParser("targetServer", /Name$/, function(params) {
            var itemData = params.item.split(' ');
            params.resultRow["SERVER"] = itemData[3];
        });

        /* Status: Good; Monitor Availability: Data Collected */
        parserMgr.addParser("status", /Status$/, function(params) {
            var itemData = params.item.split(' ');
            params.resultRow["STATUS"] = itemData[1].substring(0, itemData[1].length-1);
        });

        /* 0% avg, cpu1 0%, cpu2 1%, cpu3 0%, cpu4 0% */
        parserMgr.addParser("summary", /Summary$/, function(params) {
            var itemData = params.item.split(' ');
            //console.log('summary split: '+itemData);
            params.resultRow["AVG"] = parseInt(itemData[0]);
            params.resultRow["CPU1"] = parseInt(itemData[3]);
            params.resultRow["CPU2"] = parseInt(itemData[5]);
            params.resultRow["CPU3"] = parseInt(itemData[7]);
            params.resultRow["CPU4"] = parseInt(itemData[9]);
        });

        /* omit didn't work */
        parserMgr.addParser("m_omit", /m_omit$/, function(params) {
        });

        /* 11:20 8/10/2014 */
        parserMgr.addParser("timeConverter", /Run Time$/, function(params) {
            var itemData = params.item;
            //console.log("TIME: "+itemData+"\n");
            var date= dateTime.getDateFromFormat(itemData, "HH:mm d/MM/yyyy");
            //console.log("date: "+date+" is " + date.getTime() + " ticks\n");
            params.resultRow["TIME"] = date.toString();
            params.resultRow["TIME_TICKS"] = date.getTime();
        });

        var csvCPULog = "./recording 8-10, 11-00/Mercury tours server cpu.csv";
        var fileStream = fs.createReadStream(csvCPULog);
        //new converter instance
        var csvCPUConverter = new Converter({
            delimiter: ','
        });

        var jsonCPULog = null;

        //end_parsed will be emitted once parsing finished
        csvCPUConverter.on("end_parsed", function(jsonObj) {
            jsonCPULog = jsonObj;
            //console.log(jsonCPULog);
            var queryCPU = 'CREATE (n:ServerCPU {data})\n';

            for (var counter=0; counter<jsonCPULog.length;counter++) {
                //console.log('committing: ' + require('util').inspect(jsonCPU) + '\n');
                var params = {
                    data: jsonCPULog[counter]
                };
                db.query(queryCPU, params, function(err, results) {
                    if (err) console.error('neo4j query failed: ' + query + ' params: ' + params + '\n');
                });
            }
            
            if (callback) callback();
        });

        //read from file
        fileStream.pipe(csvCPUConverter);
    }
}
