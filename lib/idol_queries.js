var http = require('http');
var xml2js = require('xml2js').parseString;

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

var queries = {

    idol_url: 'http://16.60.168.105:9000/action=Query',
    idol_maxResults: 50,
    idol_weight_threshold: 60,

    search: function(query, callback) {
        var url_query = this.idol_url + '&text=' + fixedEncodeURIComponent(query) + 
            '&databasematch=Sophia'+
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
                console.log('[!!] IDOL search for ' + query + ' completed: ' +
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
    }

}

module.exports = queries;