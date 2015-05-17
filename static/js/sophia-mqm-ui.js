var currentPaths = [];
var reportString = '';
var currentBackboneNodes = [];
var currentDataNodes = [];
var suggestionsArray = [];

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

$(document).ready(function() {

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

function search() {
    if (currentPaths.length == 0) {
        // clear flow list
        $('#flow-list').empty();
        reportString = '';
    }

    var query = $('#search-text').val();
    reportString = reportString + 'Suggestions: ' + suggestionsArray.join(", ") + '\n';
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/search?q=" + fixedEncodeURIComponent(query) + '&' +
            'currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)))
        .done(function(data) {
            //console.log("Search returned: " + data);
            responseData = JSON.parse(data);
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

function getScreens(node_id, callback)
{
    var jqxhr = $.ajax("/getScreens?selectedNode=" + node_id)
    .done(function(data) {
        //console.log("Search returned: " + data);
        responseData = JSON.parse(data);
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

    updateLogo();

    updateSearchResults();

    querySuggestions();
}

function updateLogo() {
    if (currentPaths.length > 0) {
        $('#navbar-logo').removeClass('hidden').addClass('visible');
        $('#logo').removeClass('visible').addClass('hidden');
    } else {
        $('#logo').removeClass('hidden').addClass('visible');
        $('#navbar-logo').removeClass('visible').addClass('hidden');
    }
}

function updateSearchResults() {
    // clear last search term
    $('#search-text').val('');
    // show/hide the flow title and paths
    if ($('#flow-list').has('li').length > 0) {
        $('#flow-title').removeClass('hidden').addClass('visible');
        visualize();
    } else // no current search
    {
        $('#flow-title').removeClass('visible').addClass('hidden');
        $('#vis-title').removeClass('visible').addClass('hidden');
        $('#vis-container').removeClass('visible').addClass('hidden');
    }
}

function querySuggestions() {
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
    var jqxhr = $.ajax("/report?reportString=" + fixedEncodeURIComponent(reportString))
        .done(function(data) {})
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Failed reporting audit log: " + err);
        });

}