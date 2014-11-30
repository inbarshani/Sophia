var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");

// define parsers for log
var parserMgr = require("csvtojson").core.parserMgr;

module.exports = {

    loadParsedResults: function(jsonObj, callback) {
        jsonActionLog = jsonObj;
        //console.log(jsonActionLog);
        var queryAction = 'CREATE (n:UserAction {data})\n';

        for (var counter = 0; counter < jsonActionLog.length; counter++) {
            //console.log('committing: ' + require('util').inspect(jsonAction) + '\n');
            var params = {
                data: jsonActionLog[counter]
            };
            db.query(queryAction, params, function(err, results) {
                if (err) console.error('neo4j query failed: ' + query + ' params: ' + params + '\n');
                if (callback) callback();
            });
        }
    },

    read: function (callback) {

        //read from file
        parserMgr.clearParsers();

        /* 10/08/2014 11:35:15 */
        parserMgr.addParser("timeConverter", /Time$/, function(params) {
            var itemData = params.item;
            //console.log("TIME: "+itemData+"\n");
            var date= dateTime.getDateFromFormat(itemData, "MM/dd/yyyy HH:mm:ss");
            // user actions seems to be offest by one hour, fix
            date.setHours(date.getHours()-1);
            //console.log("date: "+date+"\n");
            //console.log("date: "+date+" is " + date.getTime() + " ticks\n");
            params.resultRow["TIME"] = date.toString();
            params.resultRow["TIME_TICKS"] = date.getTime();
        });

        //new converter instance
        var csvActionConverter = new Converter({
            delimiter: ','
        });

        var that = this;

        var jsonActionLog = null;
        //end_parsed will be emitted once parsing finished
        csvActionConverter.on("end_parsed", function(jsonObj){
            that.loadParsedResults(jsonObj, null);
        });


        var csvActionLog = "./recording 8-10, 11-00/Test 1 user actions.csv";
        var fileStream = fs.createReadStream(csvActionLog);
        //read from file
        fileStream.pipe(csvActionConverter);

        //new converter instance
        csvActionConverter = new Converter({
            delimiter: ','
        });

        // set the callback, so when this is done there is a callback to the next step
        var jsonActionLog = null;
        //end_parsed will be emitted once parsing finished
        csvActionConverter.on("end_parsed", function(jsonObj){
            that.loadParsedResults(jsonObj, callback);
        });

        csvActionLog = "./recording 8-10, 11-00/Test 2 user actions.csv";
        fileStream = fs.createReadStream(csvActionLog);
        //read from file
        fileStream.pipe(csvActionConverter);

    }
}
