var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
var dateTime = require("./dateTime");
var parserMgr = new require("csvtojson").core.parserMgr;

// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');


module.exports = {
//read from file
read: function (fn) {
    // define parsers for log
    // parserMgr.clearParsers();

    /* Memory on myd-vm06792.hpswlabs.adapps.hp.com */
    parserMgr.addParser("targetServer", /Name$/, function(params) {
        var itemData = params.item.split(' ');
        params.resultRow["SERVER"] = itemData[3];
    });

    /* Status: Good; Monitor Availability: Data Collected */
    parserMgr.addParser("status", /Status$/, function(params) {
        var itemData = params.item.split(' ');
        console.log('raw status: '+params.item);
        params.resultRow["STATUS"] = itemData[1].substring(0, itemData[1].length-1);
    });

    /* 50% virtual memory used, 8152MB virtual memory free, 0 pages/sec */
    parserMgr.addParser("summary", /Summary$/, function(params) {
        var itemData = params.item.split(' ');
        //console.log('summary split: '+itemData);
        params.resultRow["VIRTUAL_USED_PRECENT"] = parseInt(itemData[0]);
        params.resultRow["VIRTUAL_FREE_MB"] = parseInt(itemData[4]);
        params.resultRow["PAGE_per_SEC"] = parseFloat(itemData[8]);
    });

    /* omit didn't work */
    parserMgr.addParser("m_omit", /m_omit$/, function(params) {
    });

    parserMgr.addParser("timeConverter", /Run Time$/, function(params) {
        var itemData = params.item;
        //console.log("TIME: "+itemData+"\n");
        var date= dateTime.getDateFromFormat(itemData, "hh:mm d/MM/yyyy");
        //console.log("date: "+date+" is " + date.getTime() + " ticks\n");
        params.resultRow["TIME"] = date.toString();
        params.resultRow["TIME_TICKS"] = date.getTime();
    });

    var csvMemoryLog = "./recording 8-10, 11-00/Mercury tours server memory.csv";
    var fileStream = fs.createReadStream(csvMemoryLog);
    //new converter instance
    var csvMemoryConverter = new Converter({
        delimiter: ','
    });

    var jsonMemoryLog = null;

    //end_parsed will be emitted once parsing finished
    csvMemoryConverter.on("end_parsed", function(jsonObj) {
        jsonMemoryLog = jsonObj;
        //console.log(jsonMemoryLog);
        var queryMemory = 'CREATE (n:ServerMemory {data})\n';

        for (var counter=0; counter<jsonMemoryLog.length;counter++) {
            //console.log('committing: ' + require('util').inspect(jsonMemory) + '\n');
            var params = {
                data: jsonMemoryLog[counter]
            };
            db.query(queryMemory, params, function(err, results) {
                if (err) console.error('neo4j query failed: ' + queryMemory + ' params: ' + JSON.stringify(params) + '\n');
            });
        }
        fn();
    });
    fileStream.pipe(csvMemoryConverter);
}

}