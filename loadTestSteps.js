var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");
var lastDateMeasured = null;

// define parsers for log
var parserMgr = require("csvtojson").core.parserMgr;

/* omit didn't work */
parserMgr.addParser("m_omit", /m_omit$/, function(params) {
});

parserMgr.addParser("timeConverter", /Actual Result$/, function(params) {
    var itemData = params.item;
    console.log("TIME: "+itemData+"\n");
    var date = null;
    if (itemData)
    {
        lastDateMeasured= dateTime.getDateFromFormat(itemData, "hh:mm:ss.ll");
        lastDateMeasured.setDate(8);
        lastDateMeasured.setMonth(9);
        lastDateMeasured.setFullYear(2014);
    }
    date = lastDateMeasured;
    console.log("date: "+date+" is " + date.getTime() + " ticks\n");
    params.resultRow["TIME"] = date.toString();
    params.resultRow["TIME_TICKS"] = date.getTime();
});

var csvStepsLog = "./recording 8-10, 11-00/Test 1 steps.csv";
var fileStream = fs.createReadStream(csvStepsLog);
//new converter instance
var csvStepsConverter = new Converter({
    delimiter: ','
});

var jsonStepsLog = null;

//end_parsed will be emitted once parsing finished
csvStepsConverter.on("end_parsed", function(jsonObj) {
    jsonStepsLog = jsonObj;
    console.log(jsonStepsLog);
    var querySteps = 'CREATE (request:TestSteps {data})\n';
    // TODO: link to a the Test node, link steps together
    for (var counter=0; counter>jsonStepsLog.length;counter++) {
        //console.log('committing: ' + require('util').inspect(jsonSteps) + '\n');
        var params = {
            request: counter,
            data: jsonStepsLog[counter]
        };
        db.query(querySteps, params, function(err, results) {
            if (err) console.error('neo4j query failed: ' + query + ' params: ' + params + '\n');
        });
    }
});

//read from file
fileStream.pipe(csvStepsConverter);

