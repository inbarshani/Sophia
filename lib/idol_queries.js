var http = require('http');
var sophia_config = require('./sophia_config');
var xml2js = require('xml2js').parseString;

var mqm_log = require("../processors/mqm_log");
var request = require("../processors/request");
var jetty_error_log = require("../processors/jetty_error_log");
var ui_raw = require("../processors/ui_raw");
var ui_logical = require("../processors/ui_logical");
var ui_objects = require("../processors/ui_objects");
var screen = require("../processors/screen");
var test = require("../processors/test");
var teststep = require("../processors/test_step");
var levenshtein = require('levenshtein');

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

function getDateConditionString(dateCondition) {
    if (dateCondition) {
        if (dateCondition.from && dateCondition.to) {
            return '&FieldText=NRANGE{' + dateCondition.from + ',' + dateCondition.to + '}:TIMESTAMP';
        } else if (dateCondition.from) {
            return '&FieldText=GREATER{' + dateCondition.from + '}:TIMESTAMP';
        } else if (dateCondition.to) {
            return '&FieldText=LESS{' + dateCondition.to + '}:TIMESTAMP';
        }
    }
    return '';
}

function handleSearchResults(response_data, resultsWithHash,isExpendedData, callback) {
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
                if (idol_document['TESTID'])
                    formatted_result.testID = idol_document['TESTID'][0];
                var result_type = formatted_result.type.toLowerCase();
                if (result_type == 'ui_objects')
                    formatted_result = ui_objects.extractDataFromIDOL(idol_document, formatted_result, isExpendedData);
                else if (result_type.indexOf('ui_') == 0)
                    formatted_result = ui_raw.extractDataFromIDOL(idol_document, formatted_result, isExpendedData);
                else if (result_type == 'ui')
                    formatted_result = ui_logical.extractDataFromIDOL(idol_document, 
                        formatted_result, resultsWithHash, isExpendedData);
                else if (result_type == 'test')
                    formatted_result = test.extractDataFromIDOL(idol_document, 
                        formatted_result, resultsWithHash, isExpendedData);
                else if (result_type == 'teststep')
                    formatted_result = teststep.extractDataFromIDOL(idol_document, 
                        formatted_result, resultsWithHash, isExpendedData);
                else if (result_type == 'screen')
                    formatted_result = screen.extractDataFromIDOL(idol_document, 
                        formatted_result, resultsWithHash, isExpendedData);
                else if (result_type == 'jetty_error_log')
                    formatted_result = jetty_error_log.extractDataFromIDOL(idol_document, formatted_result,isExpendedData);
                else if (result_type == 'request')
                    formatted_result = request.extractDataFromIDOL(idol_document, formatted_result, isExpendedData);
                else if (result_type == 'mqm_log' || result_type == 'sa_log')
                    formatted_result = mqm_log.extractDataFromIDOL(idol_document, formatted_result, isExpendedData);

                //console.log('formatted_result: '+require('util').inspect(formatted_result, {depth:4}));
                formatted_results['' + formatted_result.graph_node] = formatted_result;
            }
        }
        //console.log('formatted_results: '+require('util').inspect(formatted_results, {depth:4}));
        if (callback)
            callback(formatted_results);
    });
}

var queries = {

    idol_url: 'http://' + sophia_config.IDOL_SERVER + ':9000/action=',
    idol_maxResults: sophia_config.maxResults,
    idol_weight_threshold: 40,
    idol_topics_maxResults: 10,
    idol_to_neo_table: {},


    search: function(query, dateCondition, isExpendedData, callback) {
        var query_phrase = fixedEncodeURIComponent(query);

        var url_query = this.idol_url + 'Query&text=' + query_phrase + '[*10]:DRETITLE' +
            ' OR ' + query_phrase + ':DRECONTENT' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&MinScore=' + this.idol_weight_threshold +
            getDateConditionString(dateCondition) +
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
                handleSearchResults(response_data, false,isExpendedData, callback);
            });
        });
    },

    searchByReference: function(referencesArray, resultsWithHash, isExpendedData, callback) {
        var url_query = this.idol_url + 'Query' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&FieldText=MATCH{' + referencesArray.join(',') + '}:DREREFERENCE' +
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
                handleSearchResults(response_data, resultsWithHash,isExpendedData, callback);
            });
        });
    },

    searchByDocID: function(idsArray, resultsWithHash, isExpendedData, callback) {
        var url_query = this.idol_url + 'GetContent' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&ID=' + idsArray.join('+') +
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
                handleSearchResults(response_data, resultsWithHash,isExpendedData, callback);
            });
        });
    },

    searchTestsByID: function(testIDsArray, callback) {
        var url_query = this.idol_url + 'Query' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&FieldText=MATCH{' + testIDsArray.join(',') + '}:TESTID' +
            '+AND+MATCH{' + sophia_config.backboneRoot + '}:SOPHIATYPE' +
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
                handleSearchResults(response_data, false, false,callback);
            });
        });
    },

    getTopics: function(query_phrase, dateCondition, callback) {
        console.log('idol query get topics start');

        var url_query = this.idol_url + 'Query&Text=' + query_phrase + '[*10]:DRETITLE' +
            ' OR ' + query_phrase + ':DRECONTENT' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&MinScore=' + this.idol_weight_threshold +
            getDateConditionString(dateCondition) +
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
                    if (summary_terms) {
                        summary_terms_elements = summary_terms[0]['autn:element'];
                        if (summary_terms_elements) {
                            // console.log('[!!] IDOL topics number of summary_terms_elements: ' + summary_terms_elements.length);
                            for (var i = 0; i < summary_terms_elements.length && i < max_topics; i++) {
                                var result = summary_terms_elements[i];
                                //console.log('result '+i+': '+require('util').inspect(result, {showHidden: true, depth: 4}));
                                var formatted_result = {
                                    name: result['_'],
                                    occurances: result['$']['poccs']
                                };
                                // convert IDOL ids into Neo4j ids, using the 'reference' field
                                //  need to find the IDOL results in autn:hits
                                var idol_ids = result['$']['ids'].split(',');
                                var neo_ids = [];
                                //console.log('idol_to_neo_table: '+require('util').inspect(idol_to_neo_table, {showHidden: true, depth: 4}));
                                for (var j = 0; j < idol_ids.length; j++) {
                                    if (idol_to_neo_table['' + idol_ids[j]]) {
                                        neo_ids.push(idol_to_neo_table['' + idol_ids[j]]);
                                    } else {
                                        for (var k = 0; k < results.length; k++) {
                                            var result_id = results[k]['autn:id'][0];
                                            //console.log('result_id '+k+': '+require('util').inspect(result_id, {showHidden: true, depth: 4}));
                                            var neo_id = results[k]['autn:reference'][0];
                                            //console.log('neo_id '+k+': '+require('util').inspect(neo_id, {showHidden: true, depth: 4}));
                                            idol_to_neo_table['' + result_id] = neo_id;
                                            if (result_id == idol_ids[j]) {
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
                    } else
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
        //console.log('[!] data: ' + JSON.stringify(data));
        var date = new Date();
        date.setTime(data.timestamp);
        var dateFormat = date.toISOString();
        dateFormat = dateFormat.substring(0, dateFormat.indexOf('T'));

        var post_data = '#DREREFERENCE ' + node_id + '\r\n' +
            '#DREDATE ' + dateFormat + '\r\n' +
            '#DRETITLE ' + data.high_priority_index.replace('#', '') + '\r\n' +
            '#DREFIELD SophiaType=\"' + data.type + '\"\r\n';
        Object.keys(data).forEach(function(key) {
            if (key != 'type' && key != 'indexable_content' &&
                key != 'high_priority_index' && key != 'dontStore' && data[key])
                {
                    post_data = post_data + '#DREFIELD ' + key + '=\"' + 
                        data[key] + '\"\r\n';
                }
        });

        post_data = post_data + '#DRECONTENT\r\n' +
            data.indexable_content.replace('#', '') + '\r\n' +
            '#DREDBNAME ' + sophia_config.IDOL_DB_NAME + '\r\n' +
            '#DREENDDOC\r\n' +
            '#DREENDDATAREFERENCE\r\n';

        console.log('POST ' + post_data);

        var post_options = {
            host: sophia_config.IDOL_SERVER,
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

    updateIdolDocument: function(doc_id, node_id, data) {
        if (data.dontStore) return; // mechanism to allow ignoring some of the incoming data
        // set IDOL document properties via HTTP post to IDOL index
        //  fields are mapped from the data json to the IDOL format
        var id_field_query = '';
        if (doc_id) {
            console.log('[!] Setting doc #' + doc_id + ' in IDOL index');
            id_field_query = '#DREDOCID ' + doc_id + '\r\n';
        } else if (node_id) {
            console.log('[!] Setting doc with ref #' + node_id + ' in IDOL index');
            id_field_query = '#DREDOCREF ' + node_id + '\r\n';

        }

        var post_data = id_field_query;
        Object.keys(data).forEach(function(key) {
            post_data += '#DREFIELDNAME ' + key + '\r\n' +
                '#DREFIELDVALUE ' + data[key].toString().replace(/#|\"/, '') + '\r\n';
        });
        post_data += '#DREENDDATANOOP\r\n';

        var post_options = {
            host: sophia_config.IDOL_SERVER,
            port: '9001',
            path: '/DREREPLACE?DATABASEMATCH=' + sophia_config.IDOL_DB_NAME,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': post_data.length
            }
        };
        console.log('POST ' + post_data + '\nwith options:\n' + JSON.stringify(post_options));

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
                if (doc_id)
                    console.log('[!!] IDOL POST for doc_id ' + doc_id + ' completed: ' +
                        res.statusCode + '\ndata: ' + response_data);
                else if (node_id)
                    console.log('[!!] IDOL POST for ref id ' + node_id + ' completed: ' +
                        res.statusCode + '\ndata: ' + response_data);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    },

    analyzeImagePost: function(filePath, callback) {
        var post_options = {
            host: sophia_config.IDOL_OCR_SERVER,
            port: sophia_config.IDOL_OCR_SERVER_PORT,
            path: '/action=Analyze&ImagePath=' + filePath,
            method: 'POST'
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var response_data = "";
            res.on('data', function(chunk) {
                //console.log('[X] IDOL OCR add data');
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                //console.log('[X] IDOL OCR response end: '+
                //    require('util').inspect(res, {depth: 4}) + '\n' +
                //    'response_data:\n' + response_data);                
                xml2js(response_data, function(err, ocr_response) {
                    var token = '';
                    if (ocr_response.autnresponse.action[0] == 'ANALYZE') {
                        if (ocr_response.autnresponse.response[0].error) {
                            console.log('[X!] IDOL OCR Error: ' +
                                ocr_response.autnresponse.response[0].error[0].errorstring[0]);
                        } else {
                            token = ocr_response.autnresponse.responsedata[0].token[0];
                            console.log('[X] IDOL OCR token: '+token);
                        }
                    }
                    callback(token);
                });                
            });
            res.on('error', function(err) {
                console.log('[X!] IDOL OCR Request Error: ' + err);
            });

        }).on('error', function(e) {
            console.log("analyzeImagePost got error for filePath " + filePath +
                ": " + e.message);
            callback(null);
        });

        // post the data
        post_req.end();
    },

    analyzeImageCheck: function(token, callback){
        var http_options = {
            host: sophia_config.IDOL_OCR_SERVER,
            port: sophia_config.IDOL_OCR_SERVER_PORT,
            path: '/action=QueueInfo&QueueAction=GetStatus'+
                '&QueueName=Analyze&&Token='+token
        };

        // Set up the request
        var req = http.get(http_options, function(res) {
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                //console.log('[X] IDOL OCR getStatus end. '+
                //    'response_data:\n' + response_data);
                xml2js(response_data, function(err, ocr_results) {
                    var text = '';
                    var response = ocr_results.autnresponse.responsedata;
                    //console.log('response: '+
                    //    require('util').inspect(response[0], {depth: 4}));
                    //console.log('action: '+
                    //    require('util').inspect(response[0].actions[0].action[0]));
                    if (response[0].actions[0].action[0].error) {
                        console.log('[X!] IDOL OCR Error: ' +
                            response[0].actions[0].action[0].error[0]);
                        text = response[0].actions[0].action[0].error[0];
                    } 
                    else if (response[0].actions[0].action[0].status[0] == 'Finished')
                    {
                        var page = response[0].actions[0].action[0].page[0];
                        var task = page.ocrtask[0];
                        if (task.textblock != null) {
                            for (var i = 0; i < task.textblock.length; i++) {
                                if (task.textblock[i] != null) {
                                    text += task.textblock[i].text[0] + "\n";
                                }
                            }
                        }
                        console.log('[X] IDOL OCR text: '+text);
                    }
                    callback(text);
                });
            });
            res.on('error', function(err) {
                console.log('[X!] Error: ' + err);
            });

        }).on('error', function(e) {
            console.log("analyzeImageCheck got error for token " + token + 
                ": " + e.message);
            callback(null);
        });
    },

    searchReview: function(query, dateCondition, callback) {
        var query_phrase = fixedEncodeURIComponent(query);

        var url_query = this.idol_url + 'Query&Text=' + query_phrase + '&FieldText=MATCH{Test}:SOPHIATYPE' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&MinScore=' + this.idol_weight_threshold +
            getDateConditionString(dateCondition) +
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
                            if (result_type == 'ui')
                                formatted_result = ui_logical.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'test')
                                formatted_result = test.extractDataFromIDOL(idol_document, formatted_result);
                            else if (result_type == 'teststep')
                                formatted_result = teststep.extractDataFromIDOL(idol_document, formatted_result);
                            //console.log('formatted_result: '+require('util').inspect(formatted_result, {depth:4}));
                            formatted_results['' + formatted_result.graph_node] = formatted_result;
                        }
                    }
                    //console.log('formatted_results: '+require('util').inspect(formatted_results, {depth:4}));
                    if (callback)
                        callback(formatted_results);
                });
            });
        });
    },

    searchSimilar: function(nodeID, dateCondition, callback) {
        // since the IDOL 'Suggest' REST is not good enough,
        //  we first fetch the origianl step HASH, so we can screen results
        //  after IDOL query
        var url_query = this.idol_url + 'Suggest&Reference=' + nodeID +
            '&FieldText=MATCH{' + sophia_config.backboneTypes.join() + '}:SOPHIATYPE' +
            '&databasematch=' + sophia_config.IDOL_DB_NAME +
            '&maxResults=' + this.idol_maxResults +
            '&MinScore=' + this.idol_weight_threshold +
            getDateConditionString(dateCondition) +
            '&Print=ALL';

        this.searchByReference([nodeID], true, false, function(documents) {
            //console.log('[!!!] searchSimilar docs:\n' + JSON.stringify(documents));
            var testStepHash = documents['' + nodeID].hash;            
            if (!testStepHash) testStepHash='';
            //console.log('[!!!] searchSimilar testStep hash:\n' + testStepHash);
            var isTestStepHashEmpty = (testStepHash.length == 0);

            console.log('searchSimilar idol query url: ' + url_query);

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
                        var testID = documents['' + nodeID].testID;
                        formatted_results['' + testID] = [documents['' + nodeID]];
                        if (results) {
                            //console.log('[!!] IDOL search number of results: ' + results.length);
                            for (var i = 0; i < results.length; i++) {
                                var result = results[i];
                                //console.log('result '+i+': '+require('util').inspect(result, {depth:4}));
                                var formatted_result = {
                                    id: result['autn:id'][0],
                                    graph_node: result['autn:reference'][0]
                                };
                                var idol_document = result['autn:content'][0]['DOCUMENT'][0];
                                //console.log('idol_document: '+require('util').inspect(idol_document, {depth:4}));
                                var document_hash = '';
                                if (idol_document['HASH'] && idol_document['HASH'][0])
                                    document_hash = idol_document['HASH'][0];
                                //console.log('[!!!] searchSimilar document_hash:\n' + document_hash);
                                var lev = null;
                                if (!isTestStepHashEmpty)
                                {
                                    lev = new levenshtein(testStepHash, document_hash);
                                    //console.log('lev.distance/testStepHash.length - ' + lev.distance +'/'+ testStepHash.length + ':');
                                    //console.log('' + (lev.distance / testStepHash.length));
                                }
                                if ((isTestStepHashEmpty && document_hash.length == 0) ||
                                    (lev && (lev.distance / testStepHash.length <= sophia_config.hashSimiliarityThreshold)))
                                {
                                    console.log('[!!!] searchSimilar found similar step (graph node): '+formatted_result.graph_node);
                                    //console.log('[!!!] with document_hash:\n' + document_hash);
                                    formatted_result.testID = idol_document['TESTID'][0];
                                    //console.log('formatted_result: '+require('util').inspect(formatted_result, {depth:4}));
                                    if (formatted_results['' + formatted_result.testID])
                                        formatted_results['' + formatted_result.testID].push(formatted_result);
                                    else
                                        formatted_results['' + formatted_result.testID] = [formatted_result];
                                }
                            }
                        }
                        //console.log('formatted_results: '+require('util').inspect(formatted_results, {depth:4}));
                        if (callback)
                            callback(formatted_results);
                    });
                });
            });
        });
    }
};

module.exports = queries;
