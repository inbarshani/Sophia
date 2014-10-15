var Converter=require("csvtojson").core.Converter;
var fs=require("fs");
var neo4j=require("neo4j");

var csvRequestLog="./recording 8-10, 11-00/2014_10_08.request.log";
var fileStream=fs.createReadStream(csvRequestLog);
//new converter instance
var csvConverter=new Converter({constructResult:true});

var jsonRequestLog = null;

//end_parsed will be emitted once parsing finished
csvConverter.on("end_parsed",function(jsonObj){
   console.log(require('util').inspect(jsonObj)); //here is your result json object
   jsonRequestLog = jsonObj;
});

//read from file
fileStream.pipe(csvConverter);

// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');

/*
var query = [
        'CREATE (request:Request {data})',
        'RETURN user',
    ].join('\n');

    var params = {
        data: data
    };

    db.query(query, params, function (err, results) {
        if (err) return callback(err);
        var user = new User(results[0]['user']);
        callback(null, user);
    });
*/