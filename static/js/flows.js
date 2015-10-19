/**
 * Created by gazitn on 7/7/2015.
 */
var currentBackboneNodes = [];
var currentDataNodes = [];
var currentPaths = [];
var flow_queries = [];


function loadFlows(){
    $("#application_area").load("html/flows.html", function () {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchFlowsByText();
        });

        $('#search-text').placholder = 'Search Flows';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic' ) {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchFlowsByText();
            }
        });        

        $('#search-text').focus();

        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });

    });
}

function searchFlowsByText(){
    var query = $('#search-text').val();
    searchFlows(query, testQueryTypes.QUERY);    
}

function searchFlows(query, type, callback) {
    if (!query || query.length == 0)
        return;

    flow_queries.push({query:query, type: type});
    if (currentPaths.length == 0) {
        reportString = 'Type: FLOWS\n';
    }
    var isFirstQuery = '';
    if ($('#flow-list > li').length == 0) {
        isFirstQuery = '&isFirstQuery=true';
    }
    lastQuery = query;
    var currentStepNumber = flow_queries.length;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchFlows?q=" + fixedEncodeURIComponent(query) +
    '&currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)) +
    '&dateCondition=' + JSON.stringify(dateCondition) +
    isFirstQuery)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            var li_html = '';
            flow_queries[flow_queries.length-1].result = responseData.paths_to_nodes.length;
            if (flow_queries[flow_queries.length -1].type == testQueryTypes.QUERY)
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
                flow_queries[flow_queries.length-1].pass = (responseData.paths_to_nodes.length > 0);
            }
            // add query and number of results to the list
            var new_item = $('#flow-list').append(li_html).find('li:last-child');
            reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
            addIconsToLast();
            if(flow_queries.length==1) {
                // first item
                $('#save-test').removeClass('disabled');
                $('#flow_results').removeClass('hidden').addClass('show');
                update();
            }
            visualize();
            if (callback) {
                callback();
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
        });
}

function getFlowsQueries(){
    return flow_queries;
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
    var currentIndex = flow_queries.length - 1;
    var new_item = $('#flow-list > li:last-child');

    var spanRemove = $('<span>');
    spanRemove.attr('title', "Remove step");
    spanRemove.addClass('glyphicon glyphicon-trash flow-step-icons-start');
    spanRemove.on('click', function() {
        flow_queries.splice(currentIndex, 1);
        reQueryFlows();
    });
    new_item.append(spanRemove);

    var spanIndent = $('<span>');
    spanIndent.addClass('glyphicon flow-step-icons');
    if (flow_queries[currentIndex].type == testQueryTypes.VERIFICATION)
    {
        if (flow_queries[currentIndex].pass)
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
            flow_queries[currentIndex].type = testQueryTypes.VERIFICATION;
            reQueryFlows();
        });
    }
    new_item.append(spanIndent);

}

function reQueryFlows() {
    var tempQueries = flow_queries;
    clearSearch(searchTypes.FLOWS);
    var ul = $('#flow-list');
    ul.empty();
    var f = [];
    var timer;
    for (var i = tempQueries.length - 1; i >= 0; i--) {
        f[i] = (function(query, func) {
            return function() {
                flow_queries.push(query);
                if (flow_queries.length == 1) // single time enable the save button
                    $('#save-test').removeClass('disabled');
                timer = setInterval(function(){
                    if (completeVisualize == true) {
                        clearInterval(timer);
                        searchFlows(query.query, query.type, func);
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
    // remove all UI & data about searches
    currentPaths.length = 0;
    currentBackboneNodes.length = 0;
    currentDataNodes.length = 0;    
    flow_queries.length = 0;
    $('#flow-results').empty();
    $('#flow-text').val('');
    $('#save-test').addClass('disabled');
}