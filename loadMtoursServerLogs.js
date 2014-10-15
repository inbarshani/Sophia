var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

// define parsers for log
var parserMgr = require("csvtojson").core.parserMgr;

/* /^POST|GET|PUT|DELETE/ */
parserMgr.addParser("httpParser", /HTTP$/, function(params) {
    var itemData = params.item.split(' ');
    params.resultRow["HTTP_verb"] = itemData[0];
    params.resultRow["HTTP_target"] = itemData[1];
    params.resultRow["HTTP_ver"] = itemData[2];
});

var csvRequestLog = "./recording 8-10, 11-00/2014_10_08.request.log";
var fileStream = fs.createReadStream(csvRequestLog);
//new converter instance
var csvRequestConverter = new Converter({
    delimiter: ' ',
    quote: "\\\"|\\[|\\]"
});

var jsonRequestLog = null;

//end_parsed will be emitted once parsing finished
csvRequestConverter.on("end_parsed", function(jsonObj) {
    //console.log(jsonObj); //here is your result json object
    jsonRequestLog = jsonObj;
    //console.log(require('util').inspect(jsonRequestLog));
    var queryRequest = 'CREATE (request:Request {data})\n';

    for (var counter=0; counter<jsonRequestLog.length;counter++) {
        //console.log('committing: ' + require('util').inspect(jsonRequest) + '\n');
        var params = {
            request: counter,
            data: jsonRequestLog[counter]
        };
        db.query(queryRequest, params, function(err, results) {
            if (err) console.error('neo4j query failed: ' + query + ' params: ' + params + '\n');
        });
    }
});

//read from file
fileStream.pipe(csvRequestConverter);


var csvErrConverter = new Converter({
    delimiter: '&'
});

var csvErrLog = "./recording 8-10, 11-00/2014_10_08.stderrout.log";
fileStream = fs.createReadStream(csvErrLog);

var jsonErrLog = null;
//end_parsed will be emitted once parsing finished
csvErrConverter.on("end_parsed", function(jsonObj) {
    //console.log(jsonObj); //here is your result json object
    jsonErrLog = jsonObj;
});

//read from file
fileStream.pipe(csvErrConverter);
