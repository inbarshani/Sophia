/**
 * Created by gazitn on 7/7/2015.
 */
function searchFlows(query, callback) {
    if (currentPaths.length == 0) {
        reportString = 'Type: FLOWS\n';
    }
    var isFirstQuery = '';
    if ($('#flow-list > li').length == 0) {
        isFirstQuery = '&isFirstQuery=true';
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
                        addIconsToLast();
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
                addIconsToLast();
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
}

function addIconsToLast() {
    var lis = $('#flow-list > li');
    // don't remove old ones
    /*
    for (var i = 0; i < lis.length; i++) {
        if($(lis[i]).find('span').length > 1) {
            $($(lis[i]).find('span')[1]).remove();
        }
    }*/
    var currentIndex = lis.length - 1;
    var span = $('<span>');
    span.attr('title', "Remove step");
    span.addClass('glyphicon glyphicon-trash delete-flow');
    span.on('click', function() {
        //var items = $('#flow-list > li');
        //$(items[currentIndex]).remove();
        queries.splice(currentIndex, 1);
        reQueryFlows();
    });
    $(lis[currentIndex]).append(span);
}

function reQueryFlows() {
    var tempQueries = queries;
    clearSearch(searchTypes.FLOWS);
    var ul = $('#flow-list');
    ul.empty();
    var f = [];
    var timer;
    for (var i = tempQueries.length - 1; i >= 0; i--) {
        f[i] = (function(query, func) {
            return function() {
                queries.push(query);
                timer = setInterval(function(){
                    if (completeVisualize == true) {
                        clearInterval(timer);
                        searchFlows(query.query, func);
                    }
                }, 100);
            };
        }(tempQueries[i], f[i+1]));
    }
    if (f.length > 0) {
        f[0]();
    }
}