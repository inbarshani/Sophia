var http = require('http');
var sophia_consts = require('./sophia_consts');
var xml2js = require('xml2js').parseString;

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

var queries = {

    idol_url: 'http://16.60.168.105:9000/action=',
    idol_maxResults: 50,
    idol_weight_threshold: 60,
    idol_suggestions_maxResults: 5,

    search: function(query, callback) {
        var url_query = this.idol_url + 'Query&text=' + fixedEncodeURIComponent(query) + 
            '&databasematch='+ sophia_consts.IDOL_DB_NAME +
            '&maxResults='+this.idol_maxResults+
            '&MinScore='+this.idol_weight_threshold;

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
                    //console.log(require('util').inspect(search_results.autnresponse.responsedata[0]));
                    var results = search_results.autnresponse.responsedata[0]['autn:hit'];
                    //console.log(require('util').inspect(results));
                    var formatted_results = [];
                    if (results) {
                        console.log('[!!] IDOL search number of results: ' + results.length);
                        for (var i = 0; i < results.length; i++) {
                            var result = results[i];
                            //console.log('result '+i+': '+require('util').inspect(result));
                            var formatted_result = {
                                id: result['autn:id'][0],
                                graph_node: result['autn:reference'][0]
                            };
                            //console.log('formatted_result: '+formatted_result);
                            formatted_results.push(formatted_result);
                        }
                    }
                    if (callback)
                        callback(formatted_results);
                });
            });
        });
    },

    getSuggestedTerms: function(graphNodes, callback)
    {   
        if (!graphNodes || graphNodes.length == 0)
        {
            if (callback) callback(null);
            return;
        }


        if (graphNodes && graphNodes.length > 250)     
            graphNodes.length = 250;
        
        var url_query = '';

        if (graphNodes.length == 0)
        {
            url_query = this.idol_url + 'Query&FieldText=MATCH{' + 
                sophia_consts.backboneTypes.join(',') + '}:DRETITLE' +
                '&databasematch='+ sophia_consts.IDOL_DB_NAME +
                '&maxResults='+this.idol_maxResults+
                '&MinScore='+this.idol_weight_threshold+
                '&QuerySummary=true';
        }
        else
        {
            url_query = this.idol_url + 'Query&FieldText=EQUAL{' + 
                graphNodes.join(',') + '}:DREREFERENCE' +
                '&databasematch='+ sophia_consts.IDOL_DB_NAME +
                '&maxResults='+this.idol_maxResults+
                '&MinScore='+this.idol_weight_threshold+
                '&QuerySummary=true';
        }

        console.log('idol query get suggestions url: ' + url_query);
        
        var max_suggestions = this.idol_suggestions_maxResults;

        http.get(url_query, function(res) {
            //res.setEncoding('utf8');
            var response_data = "";
            res.on('data', function(chunk) {
                if (chunk != null && chunk != "") {
                    response_data += chunk;
                }
            });
            res.on('end', function() {
                console.log('[!!] IDOL get suggestions for ' + url_query + ' completed: ' +
                    res.statusCode); // + '\ndata: ' + response_data);
                // extract node numbers from response XML
                xml2js(response_data, function(err, search_results) {
                    //console.log('suggestion results: '+require('util').inspect(search_results, {showHidden: true, depth: 6}));
                    var results = search_results.autnresponse.responsedata[0]['autn:qs'];
                    //console.log(require('util').inspect(results, {showHidden: true, depth: 6}));
                    results = results[0]['autn:element'];
                    var formatted_results = [];
                    if (results) {
                        console.log('[!!] IDOL suggestions number of results: ' + results.length);
                        for (var i = 0; i < results.length && i < max_suggestions; i++) {
                            var result = results[i];
                            console.log('result '+i+': '+require('util').inspect(result, {showHidden: true, depth: 4}));
                            var formatted_result = result['_'];
                            console.log('formatted_result: '+formatted_result);
                            formatted_results.push(formatted_result);
                        }
                    }
                    if (callback)
                        callback(formatted_results);
                });
            });
        });        
    },
    
    addToIdol: function(node_id, data) {
        // add to IDOL via HTTP post to IDOL index
        //  fields are mapped from the data json to the IDOL format
        console.log('[!] Adding node #' + node_id + ' to IDOL index');
        var date = new Date();
        date.setTime(data.timestamp);
        var dateFormat = date.toISOString();
        dateFormat = dateFormat.substring(0,dateFormat.indexOf('T'));
        console.log('date: ' + dateFormat);
    
        var post_data = '#DREREFERENCE ' + node_id + '\r\n' +
            '#DREDATE ' + dateFormat + '\r\n' +
            '#DRETITLE ' + data.type + '\r\n';
        Object.keys(data).forEach(function(key) {
            if (key != 'type' && key != 'indexable_content')
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
    }    

};

module.exports = queries;