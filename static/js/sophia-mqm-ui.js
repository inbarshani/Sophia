var currentPaths = [];
var reportString = '';
var currentBackboneNodes = [];
var currentDataNodes = [];
var suggestionsArray = [];
var isAjaxActive = 0;
var searchTypes = {FLOWS: 0, 
    SCREENS: 1,
    ISSUES: 2};
var searchType = searchTypes.FLOWS;
var user;
var lastQuery = "";

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

$(document).ready(function() {
    user = localStorage.getItem("user");
    if (!user)
        window.location.href = './login.html';

    $('#search-button').on('click', function(e) {
        search();
    });

    $('#search-text').keyup(function(e) {
        if (e.keyCode == 13) {
            search();
        }
    });

    $('#navbar-logo').on('click', function(e) {
        clearSearch();
    });

    update();
    $('body').click(onDocumentClick);
});

$(document).ajaxStart(function() {
    if (!user) {
        window.location.href = './login.html';
    }
    //console.log('ajaxStart, before increment, isAjaxActive: '+isAjaxActive);
    isAjaxActive = isAjaxActive+2;
    setTimeout(function() {
        //console.log('in timeout function, isAjaxActive: '+isAjaxActive);
        if (isAjaxActive > 0) {
            $("#busy").show();
        }
    }, 500);
});
$(document).ajaxComplete(function() {
    //console.log('ajaxComplete, before decrease, isAjaxActive: '+isAjaxActive);
    if (isAjaxActive > 0) isAjaxActive--;
    if (isAjaxActive == 0) {
        $("#busy").hide();
    }
});

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

function switchSearch(newSearchType) {
    if (searchType == newSearchType)
        return false; // false = no click
    // change results status
    if (searchType == searchTypes.SCREENS)
        $('#screens_results').removeClass('show').addClass('hidden');
    else if (searchType == searchTypes.FLOWS)
    {       
        currentPaths.length = 0;
        currentBackboneNodes.length = 0;
        currentDataNodes.length = 0;
        $('#flow-list').empty();
        $('#flow_results').removeClass('show').addClass('hidden');
    }

    // update searchType
    searchType = newSearchType;

    // update search options
    var id_of_li = "";
    if (searchType == searchTypes.FLOWS)
        id_of_li = "#search-flows";
    else if (searchType == searchTypes.SCREENS)
        id_of_li = "#search-screens";
    else if (searchType == searchTypes.ISSUES)
        id_of_li = "#search-issues";
    var search_type_li = $(id_of_li);
    search_type_li.removeClass('search').addClass('selected_search');
    // change siblings style
    search_type_li.siblings().removeClass('selected_search').addClass('search');

    // invoke search with last search term
    search(lastQuery);
}

function search(query){
    if (searchType == searchTypes.FLOWS)
    {
        searchFlows(query);
    }
    else if (searchType == searchTypes.SCREENS)
    {
        searchScreens(query);
    }
}

function searchFlows(query) {
    if (currentPaths.length == 0) {
        // clear flow list
        $('#flow-list').empty();
        reportString = 'FLOWS\n';
    }

    if (!query || query.length==0)
        query = $('#search-text').val();
    if (!query || query.length==0){
        // don't run without any query string
        return false;
    }

    lastQuery = query;
    reportString = reportString + 'Suggestions: ' + suggestionsArray.join(", ") + '\n';
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchFlows?q=" + fixedEncodeURIComponent(query) + '&' +
            'currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)))
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            updateCurrentPaths(responseData.paths_to_nodes);
            currentBackboneNodes = responseData.last_backbone_nodes;
            currentDataNodes = responseData.last_data_nodes;
            // add query and number of results to the list
            var currentStepNumber = $('#flow-list li').length + 1;
            $('#flow-list').append('<li class="list-group-item clickable" onClick="highlight(this, function(nodes) { return nodes } ([' + currentBackboneNodes.concat(currentDataNodes) + ']));">Step ' + currentStepNumber + ': ' +
                query + ' <span class="badge">' + currentPaths.length + '</span></li>');
            reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
            update();
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

function searchScreens(query) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'SCREENS\n';
    var screens_results_row = $('#screens_results_row');
    screens_results_row.empty();

    if (!query || query.length==0)
        query = $('#search-text').val();
    if (!query || query.length==0){
        // don't run without any query string
        return false;
    }

    lastQuery = query;
    reportString = reportString + 'Suggestions: ' + suggestionsArray.join(", ") + '\n';
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchScreens?q=" + fixedEncodeURIComponent(query))
        .done(function(data) {
            //console.log("Search returned: " + data);
            var timestampsArray = JSON.parse(data);
            if (timestampsArray.length > 0)
            {
                // create list of screens
                // <li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">
                //  <img src="timestamp"/>
                // </li>            
                timestampsArray.forEach(function(timestamp){
                    screens_results_row.append(
                            '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">'+
                            '  <img onclick="showModal(\'/screen/'+timestamp+'\');"'+
                            '       src="/screen/'+timestamp+'"/>'+
                            '</li>'
                        );
                });
            }
            else {
                screens_results_row.append(
                        '<li class="">'+
                        ' No screens found.'+
                        '</li>'
                    );                
            }

            update();
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}


function getScreens(node_id, callback) {
    var jqxhr = $.ajax("/getScreens?selectedNode=" + node_id)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            callback(responseData.prevScreenTimestamp, responseData.nextScreenTimestamp);
        })
        .fail(function(err) {
            console.log("getScreens failed: " + err);
        });
}

function clearSearch() {
    // remove all nodes
    currentPaths.length = 0;
    currentBackboneNodes.length = 0;
    currentDataNodes.length = 0;
    // clear flow list
    $('#flow-list').empty();
    // update the logo
    update();
}

function update() {
    reportAudit();

    updateNavigation();

    updateSearchResults();

    querySuggestions();
}

function updateNavigation() {    
    if (lastQuery.length > 0) {
        $('#navbar-logo').removeClass('hidden').addClass('show');
        $('#search-options').removeClass('hidden').addClass('show');
        $('#search-options-divider').removeClass('hidden').addClass('show');
        $('#logo').removeClass('show').addClass('hidden');
    } else {
        $('#logo').removeClass('hidden').addClass('show');
        $('#search-options').removeClass('show').addClass('hidden');
        $('#search-options-divider').removeClass('show').addClass('hidden');
        $('#navbar-logo').removeClass('show').addClass('hidden');
    }
}

function updateSearchResults() {
    // clear last search term
    //$('#search-text').val('');
    if (searchType == searchTypes.FLOWS && ($('#flow-list').has('li').length > 0))
    {
        $('#flow_results').removeClass('hidden').addClass('show');
        visualize();
    }
    else // no current flows search
    {
        $('#flow_results').removeClass('show').addClass('hidden');
    }
    if (searchType == searchTypes.SCREENS && ($('#screens_results_row').has('li').length > 0))
    {
        $('#screens_results').removeClass('hidden').addClass('show');
    }
    else
    {
        $('#screens_results').removeClass('show').addClass('hidden');        
    }
}

function showModal(src)
{
    var img = '<img src="' + src + '" class="img-responsive"/>';
    $('#myModal').modal();
    $('#myModal').on('shown.bs.modal', function(){
        $('#myModal .modal-body').html(img);
    });
    $('#myModal').on('hidden.bs.modal', function(){
        $('#myModal .modal-body').html('');
    });
}


function querySuggestions() {
    $('#suggestions-text').text('Loading...');
    var jqxhr = $.ajax("/querySuggestions?currentPaths=" + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)))
        .done(function(data) {
            if (data.length > 0) {
                suggestionsArray = JSON.parse(data);
            } else {
                suggestionsArray = [];
            }

            //alert('suggestionsArray length: '+suggestionsArray.length+" [0]: "+suggestionsArray[0])
            if (suggestionsArray.length > 0) {
                $('#suggestions-text').text('Try: ' + suggestionsArray.join(", "));
            } else
                $('#suggestions-text').html('<i>No suggestions</i>');
        })
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Error getting suggestions: " + err);
            $('#suggestions-text').html('<i>Suggestions not availbale at this time</i>');
        });
}

function reportAudit() {
    var jqxhr = $.ajax("/report?reportString=" + fixedEncodeURIComponent(reportString) +
            "&user=" + user)
        .done(function(data) {})
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Failed reporting audit log: " + err);
        });

}