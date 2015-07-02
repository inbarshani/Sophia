var http = require('http');
var sophia_consts = require('./sophia_consts');
var xml2js = require('xml2js').parseString;

var mqm_log = require("../processors/mqm_log");
var request = require("../processors/request");
var jetty_error_log = require("../processors/jetty_error_log");
var ui_raw = require("../processors/ui_raw");
var ui_logical = require("../processors/ui_logical");
var screen = require("../processors/screen");
var test = require("../processors/test");
var teststep = require("../processors/test_step");

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

var queries = {

    idol_url: 'http://16.60.168.105:9000/action=',
    idol_maxResults: sophia_consts.maxResults,
    idol_weight_threshold: 40,
    idol_topics_maxResults: 10,
    idol_to_neo_table: {},


    search: function(query, callback) {
        var query_phrase=fixedEncodeURIComponent(query);
        var url_query = this.idol_url + 'Query&text=' + query_phrase + '[*10]:DRETITLE' +
            ' OR '+query_phrase+':DRECONTENT' +
            '&databasematch='+ sophia_consts.IDOL_DB_NAME +
            '&maxResults='+this.idol_maxResults+
            '&MinScore='+this.idol_weight_threshold+
            '&Print=ALL';

        console.log('idol query url: ' + url_query);

        var http_req = http.get(url_query, function(res) {
            //res.setEncoding('utf8');
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                console.log('[!!] IDOL search for ' + url_query + ' completed: ' +
                    res.statusCode); // + '\ndata: ' + response_data);
                // extract node numbers from response XML
                xml2js(response_data, function(err, search_results) {
                    //console.log(require('util').inspect(search_results.autnresponse, {depth:6}));
                    var results = search_results.autnresponse.responsedata[0]['autn:hit'];
                    //console.log(require('util').inspect(results));
                    var formatted_results = {};
                    if (results) {
                        console.log('[!!] IDOL search number of results: ' + results.length);
                        for (var i = 0; i < results.length; i++) {
                            var result = results[i];
                            //console.log('result '+i+': '+require('util').inspect(result, {depth:4}));
                            var formatted_result = {
                                id: result['autn:id'][0],
                                graph_node: result['autn:reference'][0]
                            };
                            var idol_document = result['autn:content'][0]['DOCUMENT'][0];
                            //console.log('idol_document: '+require('util').inspect(idol_document, {depth:4}));
                            formatted_result.type = idol_document['SOPHIATYPE'][0];
                            var result_type = formatted_result.type.toLowerCase();
                            if (result_type.indexOf('ui_') == 0)
                                formatted_result = ui_raw.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'ui')
                                formatted_result = ui_logical.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'test')
                                formatted_result = test.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'teststep')
                                formatted_result = teststep.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'screen')
                                formatted_result = screen.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'jetty_error_log')
                                formatted_result = jetty_error_log.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'request')
                                formatted_result = request.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'mqm_log')
                                formatted_result = mqm_log.extractDataFromIDOL(idol_document, formatted_result);

                            //console.log('formatted_result: '+require('util').inspect(formatted_result, {depth:4}));
                            formatted_results[''+formatted_result.graph_node] = formatted_result;
                        }
                    }
                    //console.log('formatted_results: '+require('util').inspect(formatted_results, {depth:4}));
                    if (callback)
                        callback(formatted_results);
                });
            });
        });
    },

    getTopics: function(query_phrase, graphNodes, callback)
    {   
        console.log('idol query get topics start');

        if (graphNodes && graphNodes.length > 250)     
            graphNodes.length = 250;
        
        var nodes_query = '';

        if (!graphNodes || graphNodes.length == 0)
        {
            /* don't limit to just backbone nodes
            nodes_query = '&FieldText=MATCH{' + 
                sophia_consts.backboneTypes.join(',') + '}:SophiaType';
            */
        }
        else
        {
            nodes_query = '&FieldText=EQUAL{' + 
                graphNodes.join(',') + '}:DREREFERENCE';
        }
        var url_query = this.idol_url + 'Query&Text=' + query_phrase + '[*10]:DRETITLE' +
            ' OR '+query_phrase+':DRECONTENT' +
            nodes_query +
            '&databasematch='+ sophia_consts.IDOL_DB_NAME +
            '&maxResults='+this.idol_maxResults+
            '&MinScore='+this.idol_weight_threshold+
            '&QuerySummary=true';

        console.log('idol query get topics url: ' + url_query);
        
        var max_topics = this.idol_topics_maxResults;
        var idol_to_neo_table = this.idol_to_neo_table;

        http.get(url_query, function(res) {
            //res.setEncoding('utf8');
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                console.log('[!!] IDOL get stopics for ' + url_query + ' completed: ' +
                    res.statusCode); // + '\ndata: ' + response_data);
                // extract node numbers from response XML
                xml2js(response_data, function(err, search_results) {
                    //console.log('suggestion results: '+require('util').inspect(search_results, {showHidden: true, depth: 6}));
                    // create the list of topics
                    var formatted_results = [];
                    var summary_terms = search_results.autnresponse.responsedata[0]['autn:qs'];
                    var results = search_results.autnresponse.responsedata[0]['autn:hit'];
                    //console.log(require('util').inspect(summary_terms, {showHidden: true, depth: 6}));
                    if (summary_terms)
                    {
                        summary_terms_elements = summary_terms[0]['autn:element'];
                        if (summary_terms_elements) {
                            // console.log('[!!] IDOL topics number of summary_terms_elements: ' + summary_terms_elements.length);
                            for (var i = 0; i < summary_terms_elements.length && i < max_topics; i++) {
                                var result = summary_terms_elements[i];
                                //console.log('result '+i+': '+require('util').inspect(result, {showHidden: true, depth: 4}));
                                var formatted_result = 
                                    {
                                        name: result['_'],
                                        occurances: result['$']['poccs']                                        
                                    };
                                // convert IDOL ids into Neo4j ids, using the 'reference' field
                                //  need to find the IDOL results in autn:hits
                                var idol_ids = result['$']['ids'].split(',');
                                var neo_ids = [];
                                //console.log('idol_to_neo_table: '+require('util').inspect(idol_to_neo_table, {showHidden: true, depth: 4}));
                                for(var j=0;j<idol_ids.length;j++)
                                {
                                    if (idol_to_neo_table[''+idol_ids[j]])
                                    {
                                        neo_ids.push(idol_to_neo_table[''+idol_ids[j]]);
                                    }
                                    else
                                    {
                                        for (var k=0;k<results.length;k++)
                                        {
                                            var result_id = results[k]['autn:id'][0];
                                            //console.log('result_id '+k+': '+require('util').inspect(result_id, {showHidden: true, depth: 4}));
                                            var neo_id = results[k]['autn:reference'][0];
                                            //console.log('neo_id '+k+': '+require('util').inspect(neo_id, {showHidden: true, depth: 4}));
                                            idol_to_neo_table[''+result_id] = neo_id;
                                            if (result_id == idol_ids[j])
                                            {
                                                neo_ids.push(neo_id);
                                                break;
                                            }
                                        }                                        
                                    }
                                }
                                formatted_result.ids = neo_ids;
                                //console.log('formatted_result: '+formatted_result);
                                formatted_results.push(formatted_result);
                            }
                        }
                    }
                    else
                        console.log('No topics found');
                    if (callback)
                        callback(formatted_results);
                });
            });
        });        
    },
    
    addToIdol: function(node_id, data) {
        if (data.dontStore) return; // mechanism to allow ignoring some of the incoming data
        // add to IDOL via HTTP post to IDOL index
        //  fields are mapped from the data json to the IDOL format
        console.log('[!] Adding node #' + node_id + ' to IDOL index');
        var date = new Date();
        date.setTime(data.timestamp);
        var dateFormat = date.toISOString();
        dateFormat = dateFormat.substring(0,dateFormat.indexOf('T'));
    
        var post_data = '#DREREFERENCE ' + node_id + '\r\n' +
            '#DREDATE ' + dateFormat + '\r\n' +
            '#DRETITLE ' + data.high_priority_index.replace('#', '') + '\r\n'+
            '#DREFIELD SophiaType=\"' + data.type + '\"\r\n';
        Object.keys(data).forEach(function(key) {
            if (key != 'type' && key != 'indexable_content' && 
                key != 'high_priority_index' && key != 'dontStore')
                post_data = post_data + '#DREFIELD ' + key + '=\"' + data[key].toString().replace(/#|\"/, '') + '\"\r\n';
        });
    
        post_data = post_data + '#DRECONTENT\r\n' +
            data.indexable_content.replace('#', '') + '\r\n' + 
            '#DREDBNAME '+sophia_consts.IDOL_DB_NAME+'\r\n' +
            '#DREENDDOC\r\n' +
            '#DREENDDATAREFERENCE\r\n';
    
        console.log('POST ' + post_data);
        
        var post_options = {
            host: '16.60.168.105',
            port: '9001',
            path: '/DREADDDATA',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': post_data.length
            }
        };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            //res.setEncoding('utf8');
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                console.log('[!!] IDOL POST for node_id ' + node_id + ' completed: ' +
                    res.statusCode + '\ndata: ' + response_data);
            });
        });
    
        // post the data
        post_req.write(post_data);
        post_req.end();
    },
    analyzeImage: function(filePath, callback) {
//        var post_data = 'ImageData=' + data;
       
        var post_options = {
            host: '16.60.168.105',
            port: '18000',
            path: '/action=Analyze&Synchronous=true&ImagePath=' + filePath,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': 0
            }
        };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                xml2js(response_data, function(err, search_results) {
                    var text = '';
                    if (search_results.autnresponse.action[0] == 'ANALYZE') {
                        if (search_results.autnresponse.responsedata[0].error) {
                            console.log('[X!] IDOL OCR Error: ' +
                                search_results.autnresponse.responsedata[0].error[0].errorstring[0]);
                        } else {
                            var page = search_results.autnresponse.responsedata[0].page[0];
                            var task = page.ocrtask[0];
                            if (task.textblock != null) {
                                for (var i = 0; i < task.textblock.length; i++) {
                                    if (task.textblock[i] != null) {
                                        text += task.textblock[i].text[0] + "\n";
                                    }
                                }
                            }
                        }
                    }
                    callback(text);
                });
            });
            res.on('error', function(err) {
                console.log('[X!] Error: ' + err);
            });

        });
    
        // post the data
        post_req.write("");
        post_req.end();
    },


};

module.exports = queries;