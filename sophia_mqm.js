var express = require('express');
//var neo4j = require("neo4j");
//var bodyParser = require('body-parser');
var fs = require('fs');

// connect to neo4j DB
//var db = new neo4j.GraphDatabase('http://localhost:7474');

var app = express();

app.use(express.static(__dirname + '/static'));
//app.use(bodyParser.json());


app.listen(8080);