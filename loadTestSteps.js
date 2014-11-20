var Converter = require("csvtojson").core.Converter;
var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");
var lastDateMeasured = null;

// define parsers for log
var parserMgr = require("csvtojson").core.parserMgr;

module.exports = {
    read: function(fn) {

        parserMgr.clearParsers();

        /* omit didn't work */
        parserMgr.addParser("m_omit", /m_omit$/, function(params) {});

        parserMgr.addParser("timeConverter", /ActualResult$/, function(params) {
            var itemData = params.item;
            //console.log("TIME: "+itemData+"\n");
            var date = null;
            if (itemData) {
                lastDateMeasured = dateTime.getDateFromFormat(itemData, "HH:mm:ss.ll");
                lastDateMeasured.setHours(lastDateMeasured.getHours()-1);
                lastDateMeasured.setDate(8);
                lastDateMeasured.setMonth(9);
                lastDateMeasured.setFullYear(2014);
            }
            date = lastDateMeasured;
            //console.log("date: "+date+" is " + date.getTime() + " ticks\n");
            params.resultRow["TIME"] = date.toString();
            params.resultRow["TIME_TICKS"] = date.getTime();
        });


        var jsonStepsLog = null;

        function endParseLoadToDB(testNumber, isLast) {
            return function(jsonObj) {
                jsonStepsLog = jsonObj;
                //console.log(jsonStepsLog);
                // create test node
                var query = 'CREATE (test:Test {TestNumber:' + testNumber + '})\n';
                db.query(query, {}, function(err, results) {
                    if (err) console.error('neo4j query failed: ' + query + ' params: ' + JSON.stringify(params) + '\n');
                });
                // create step node, link to a the Test node, link steps together
                var querySteps = 'CREATE (step:TestStep {data}) return step.StepNumber\n';
                for (var counter = 0; counter < jsonStepsLog.length; counter++) {
                    //console.log('committing: ' + require('util').inspect(jsonSteps) + '\n');
                    jsonStepsLog[counter].TestNumber = testNumber;
                    var params = {
                        data: jsonStepsLog[counter]
                    };
                    db.query(querySteps, params, function(err, results) {
                        if (err) console.error('neo4j query failed: ' + querySteps + ' params: ' + params + '\n');
                        var stepNumber = parseInt(results[0]['step.StepNumber']);
                        console.log('results[0]: ' + JSON.stringify(results[0]) + ' step.stepNumber: ' + stepNumber);
                        var linkparams;
                        var queryLinkSteps;
                        if (stepNumber > 0) {
                            if (stepNumber == 1) {
                                linkparams = {
                                    currentStep: '' + stepNumber
                                };
                                queryLinkSteps = 'MATCH (a:TestStep),(c:Test) ' +
                                    'WHERE a.StepNumber = {currentStep} AND a.TestNumber = ' + testNumber + ' ' +
                                    'AND c.TestNumber = ' + testNumber + ' ' +
                                    'CREATE (c)-[:INCLUDE]->(a)\n';
                            } else {
                                linkparams = {
                                    currentStep: '' + stepNumber,
                                    prevStep: '' + (stepNumber - 1)
                                };

                                queryLinkSteps = 'MATCH (a:TestStep),(b:TestStep),(c:Test) ' +
                                    'WHERE a.StepNumber = {currentStep} AND a.TestNumber = ' + testNumber + ' ' +
                                    'AND b.StepNumber = {prevStep} AND b.TestNumber = ' + testNumber + ' ' +
                                    'AND c.TestNumber = ' + testNumber + ' ' +
                                    'CREATE (b)-[:PRCEDE]->(a), (c)-[:INCLUDE]->(a)\n';
                            }
                            console.log(queryLinkSteps + ' ' + JSON.stringify(linkparams));
                            db.query(queryLinkSteps, linkparams, function(err, results) {
                                if (err) console.error('neo4j query failed: ' + queryLinkSteps + ' params: ' + JSON.stringify(linkparams) + '\n');
                            });
                        }
                    });
                }
                if (isLast == true) {
                    fn();
                }
            }
        };

        //read from file
        var csvStepsLog = "./recording 8-10, 11-00/Test 1 steps.csv";
        var fileStream = fs.createReadStream(csvStepsLog);
        //new converter instance
        var csvStepsConverter = new Converter({
            delimiter: ','
        });
        //end_parsed will be emitted once parsing finished
        csvStepsConverter.on("end_parsed", endParseLoadToDB(1, false));
        fileStream.pipe(csvStepsConverter);

        csvStepsLog = "./recording 8-10, 11-00/Test 2 steps.csv";
        csvStepsConverter = new Converter({
            delimiter: ','
        });
        //end_parsed will be emitted once parsing finished
        csvStepsConverter.on("end_parsed", endParseLoadToDB(2, true));
        fileStream = fs.createReadStream(csvStepsLog);
        fileStream.pipe(csvStepsConverter);
    }
}
