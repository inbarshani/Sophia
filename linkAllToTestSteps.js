var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
// query for all non-Test/TestSteps objects orderd by time ticks
// query for all nodes orderd by time ticks
module.exports = {
    link: function(callback) {
        db.query('MATCH (n) return ID(n), n.TIME_TICKS, n.TIME, labels(n) order by n.TIME_TICKS', null, function(err, results) {
            if (err) console.error('neo4j query to order all nodes by TIME_TICKS failed: ' + err + '\n');
            else {
                //console.log('match all nodes which are not test/steps');
                console.log('Linking '+results.length+' nodes');
                var prevObj = null;
                // TODO: handle data with time before first step
                for (var i = 0; i < results.length; i++) {
                    //console.log('result: '+JSON.stringify(results[i]));
                    var id = results[i]['ID(n)'];
                    var time = results[i]['n.TIME_TICKS'];
                    var type = results[i]['labels(n)'];
                    //console.log('result id: '+id+' time: '+time+' type: '+type);
                    if (type == "TestStep")
                    {
                        prevObj = {
                            "id": id,
                            "time": time,
                            "type": type
                        };
                    }
                    else if (type == "UIObject" && prevObj && prevObj.type == "UIObject")
                    {
                        // do nothing
                        //console.log("UIObject, do nothing");
                    }
                    else if (type != "Test") {
                        // define a link to prev obj
                        if (prevObj) {
                            //console.log("Link, prev "+prevObj.id+" "+prevObj.type+" "+ prevObj.time+" to "+id+" "+type+" "+time);
                            var queryLinkObjs = 'MATCH (a),(b) ' +
                                'WHERE ID(a) = ' + prevObj.id + ' AND ID(b) = ' + id + ' ' +
                                'CREATE (a)-[:LINK]->(b)\n';
                            
                            db.query(queryLinkObjs, null, function(err, results) {
                                if (err) console.error('neo4j query failed: ' + queryLinkObjs + ' err: ' + err + '\n');
                            });
                        }
                        prevObj = {
                            "id": id,
                            "time": time,
                            "type": type
                        };
                    }
                }
                console.log('Linking '+results.length+' nodes is done');
            }
        });
        if (callback) callback();
    }
};

module.exports.link();