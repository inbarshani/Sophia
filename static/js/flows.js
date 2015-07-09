/**
 * Created by gazitn on 7/7/2015.
 */
var currentBackboneNodes = [];
var currentDataNodes = [];
var currentPaths = [];


function searchFlows(query, callback) {
    if (currentPaths.length == 0) {
        reportString = 'Type: FLOWS\n';
    }
    var isFirstQuery = '';
    if ($('#flow-list > li').length == 0) {
        isFirstQuery = '&isFirstQuery=true';
    }
    lastQuery = query;
    var currentStepNumber = queries.length;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchFlows?q=" + fixedEncodeURIComponent(query) +
    '&currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)) +
    '&dateCondition=' + JSON.stringify(dateCondition) +
    isFirstQuery)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            var li_html = '';
            if (queries[queries.length -1].type == testQueryTypes.QUERY)
            {
                updateCurrentPaths(responseData.paths_to_nodes);
                currentBackboneNodes = responseData.last_backbone_nodes;
                currentDataNodes = responseData.last_data_nodes;
                li_html = '<li class="list-group-item clickable" ' +
                    'onClick="highlight(this, function(nodes) { return nodes } ([' + 
                    currentBackboneNodes.concat(currentDataNodes) + ']));">Step ' + 
                    currentStepNumber + ': ' + query + ' <span class="badge">' + 
                    currentPaths.length + '</span></li>';
            }
            else // verification
            {
                li_html = '<li class="list-group-item" style="margin-left: 40px;">' +
                    'Step ' + currentStepNumber + ': ' + query + ' <span class="badge">' + 
                    responseData.paths_to_nodes.length + '</span></li>';
                queries[queries.length-1].pass = (responseData.paths_to_nodes.length > 0);
            }
            // add query and number of results to the list
            var loaded = $("#flow-list");
            if(loaded.length==0) {
                $("#all_results").load("html/flows.html"
                    , function () {
                        loaded = true;
                        var new_item = $('#flow-list').append(li_html).find('li:last-child');
                        reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
                        update();
                        addIconsToLast(new_item);
                        if (callback) {
                            callback();
                        }
                    });
            }
            else {
                var new_item = $('#flow-list').append(li_html).find('li:last-child');
                reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
                update();
                addIconsToLast(new_item);
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

function updateCurrentPaths(newPaths) {
    if (currentPaths.length > 0) {
        // if there are existing paths of preivous queries, we need to combine
        newPaths.map(function(newPath) {
            var startNode = newPath.nodes[0].id;
            for (var i = 0; i < currentPaths.length; i++) {
                if (currentPaths[i].last_backbone == startNode ||
                    currentPaths[i].last_data == startNode) {
                    // combine newPath with currentPath
                    newPath.nodes.shift(); // remove the node common to previous and new path
                    newPath.nodes = currentPaths[i].nodes.concat(newPath.nodes);
                    break; // don't need to go over all the rest of the paths
                }
            }
        });
    }
    currentPaths = newPaths;
}


function addIconsToLast() {
    var currentIndex = queries.length - 1;
    var new_item = $('#flow-list > li:last-child');

    var spanRemove = $('<span>');
    spanRemove.attr('title', "Remove step");
    spanRemove.addClass('glyphicon glyphicon-trash flow-step-icons-start');
    spanRemove.on('click', function() {
        queries.splice(currentIndex, 1);
        reQueryFlows();
    });
    new_item.append(spanRemove);

    var spanIndent = $('<span>');
    spanIndent.addClass('glyphicon flow-step-icons');
    if (queries[currentIndex].type == testQueryTypes.VERIFICATION)
    {
        if (queries[currentIndex].pass)
        {
            spanIndent.addClass('glyphicon-ok-circle');
            spanIndent.attr('title', "Verified");
            new_item.addClass('list-group-item-success')
        }
        else
        {
            spanIndent.addClass('glyphicon-remove-circle');
            spanIndent.attr('title', "Failed");
            new_item.addClass('list-group-item-danger')
        }
    }
    else
    {
        spanIndent.addClass('glyphicon-check');
        spanIndent.attr('title', "Set verification");
        spanIndent.on('click', function() {
            queries[currentIndex].type = testQueryTypes.VERIFICATION;
            reQueryFlows();
        });
    }
    new_item.append(spanIndent);

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

function clearFlowsSearch()
{
    // remove all nodes
    currentPaths.length = 0;
    currentBackboneNodes.length = 0;
    currentDataNodes.length = 0;
    $('#flow-list').empty();
}