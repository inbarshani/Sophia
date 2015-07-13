var sophia_consts = require('./lib/sophia_consts');
var idol_queries = require('./lib/idol_queries');
var neo4j_queries = require('./lib/neo4j_queries');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sophia.db');


