var fs = require("fs");
var neo4j = require("neo4j");
// connect to neo4j DB
var db = new neo4j.GraphDatabase('http://localhost:7474');
var dateTime = require("./dateTime");
// xml processing
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var select = xpath.useNamespaces({
    "qtpRep": "http://www.mercury.com/qtp/ObjectRepository"
});

function processObjectXML(objectXML, parentNodeID) {
    //console.log("object xml: "+objectXML.toString());
    // get object meta data
    var name = objectXML.getAttribute("Name");
    var params = {
        data: {
            "Name": name
        }
    };
    // mark the root
    params.data.root = (!parentNodeID);
    // read update time
    var updateTime = select("./qtpRep:LastUpdateTime/text()", objectXML).toString();
    // Wednesday, October 08, 2014 11:32:44
    updateTime = updateTime.split(" ")[4];
    var date = dateTime.getDateFromFormat(updateTime, "HH:mm:ss");
    date.setDate(8);
    date.setMonth(9);
    date.setFullYear(2014);
    params.data.TIME = date.toString();
    params.data.TIME_TICKS = date.getTime();
    // read properties
    var propertyNodes = select("./qtpRep:Properties/qtpRep:Property", objectXML);
    propertyNodes.forEach(function(propertyNode) {
        var propValue = select("./qtpRep:Value/text()", propertyNode).toString().trim();
        //console.log(propertyNode.getAttribute("Name")+": "+propValue);
        params.data[propertyNode.getAttribute("Name")] =
            propValue.substring("<![CDATA[".length, propValue.length - "]]>".length);
        //console.log(propertyNode.getAttribute("Name")+" fixed to: "+params.data[propertyNode.getAttribute("Name")]);
    });
    var queryCreateObject = 'CREATE (n:UIObject {data}) return ID(n)\n';
    db.query(queryCreateObject, params, function(err, results) {
        if (err) console.error('neo4j query failed: ' + queryCreateObject + ' params: ' + JSON.stringify(params) + '\n');
        else if (parentNodeID) {
            //console.log("results: "+results);
            var nodeID = results[0]['ID(n)'];
            // link to the parent node
            var linkQuery = 'MATCH (p:UIObject),(n:UIObject) WHERE ID(p)=' + parentNodeID +
                ' AND ID(n)=' + nodeID + ' CREATE (p)-[:PARENT]->(n)';
            //console.log("linkQuery: " + linkQuery);
            db.query(linkQuery, null, function(err, results) {
                if (err) console.error('neo4j query failed: ' + linkQuery + '\n');
                var childObjectsXML = select("./qtpRep:ChildObjects/qtpRep:Object", objectXML);
                childObjectsXML.forEach(function(childObjectXML) {
                    processObjectXML(childObjectXML, nodeID);
                });
            });
        } else {
            //console.log("results: "+results);
            var nodeID = results[0]['ID(n)'];
            //console.log("node id: "+nodeID);
            var childObjectsXML = select("./qtpRep:ChildObjects/qtpRep:Object", objectXML);
            childObjectsXML.forEach(function(childObjectXML) {
                processObjectXML(childObjectXML, nodeID);
            });
        }
    });

}

module.exports = {
    read: function(callback) {
        var xmlFiles = fs.readdirSync("./recording 8-10, 11-00");
        xmlFiles.forEach(function(xmlFileName) {
            if (xmlFileName.substring(xmlFileName.length - 4) === ".xml") {
                var xml = fs.readFileSync("./recording 8-10, 11-00/"+xmlFileName, {
                    "encoding": "utf16le",
                    "flag": "r"
                });
                var testObjectsXML = new dom().parseFromString(xml)
                    // go over all Object nodes, add the core object to the DB with its properties
                    // add all child objects with the core object as parent
                select("//qtpRep:Objects/qtpRep:Object", testObjectsXML).forEach(function(objectXML) {
                    processObjectXML(objectXML, null);
                });
            }
        });
        if (callback) callback();
    }
}
