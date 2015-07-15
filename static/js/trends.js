/**
 * Created by gazitn on 7/8/2015.
 */
/*function searchTrends(query, callback) {
    if (currentPaths.length == 0) {
        reportString = 'Type: TRENDS\n';
    }
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchFlows?q=" + fixedEncodeURIComponent(query) +
    '&currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)) +
    '&dateCondition=' + JSON.stringify(dateCondition) +
    isFirstQuery)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            updateCurrentPaths(responseData.paths_to_nodes);
            currentBackboneNodes = responseData.last_backbone_nodes;
            currentDataNodes = responseData.last_data_nodes;
            // add query and number of results to the list
            var currentStepNumber = $('#flow-list li').length + 1;
            var loaded = $("#flow-list");
            if(loaded.length==0) {
                $("#all_results").load("html/flows.html"
                    , function () {
                        loaded = true;
                        $('#flow-list').append('<li class="list-group-item clickable" onClick="highlight(this, function(nodes) { return nodes } ([' + currentBackboneNodes.concat(currentDataNodes) + ']));">Step ' + currentStepNumber + ': ' +
                        query + ' <span class="badge">' + currentPaths.length + '</span></li>');
                        reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
                        update();
                        addRemoveLast();
                        if (callback) {
                            callback();
                        }
                    });
            }
            else {
                $('#flow-list').append('<li class="list-group-item clickable" onClick="highlight(this, function(nodes) { return nodes } ([' + currentBackboneNodes.concat(currentDataNodes) + ']));">Step ' + currentStepNumber + ': ' +
                query + ' <span class="badge">' + currentPaths.length + '</span></li>');
                reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
                update();
                addRemoveLast();
                if (callback) {
                    callback();
                }
            }

        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            // remove all nodes
            currentPaths.length = 0;
            currentBackboneNodes.length = 0;
            currentDataNodes.length = 0;
            update();
        });
}*/
