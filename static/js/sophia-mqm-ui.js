var currentNodes = [];
var reportString = '';

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
});

function search() {
    if (currentNodes.length == 0) {
        // clear flow list
        $('#flow-list').empty();
        reportString = '';
    }

    var query = $('#search-text').val();
    reportString = reportString + query + '\n';
    var jqxhr = $.ajax("/search?q=" + fixedEncodeURIComponent(query) + '&' +
            'currentNodes=' + JSON.stringify(currentNodes))
        .done(function(data) {
            console.log("Search returned: " + data);
            currentNodes = JSON.parse(data);
            // add query and number of results to the list
            var currentStepNumber = $('#flow-list').has('li').length + 1;
            $('#flow-list').append('<li class="list-group-item">Step ' + currentStepNumber + ': ' + 
                query + ' <span class="badge">' + currentNodes.length + '</span></li>');
            reportString = reportString + 'result: ' + currentNodes.length + '\n';
            update();
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'result: failed query\n';

            // remove all nodes
            currentNodes.length = 0;
            update();
        });
}

function clearSearch() {
    // remove all nodes
    currentNodes.length = 0;
    // clear flow list
    $('#flow-list').empty();
    // update the logo
    update();
}

function update() {
    reportAudit();

    updateLogo();

    updateSearchBox();

    querySuggestions();
}

function updateLogo() {
    if (currentNodes.length > 0) {
        $('#navbar-logo').removeClass('hidden').addClass('visible');
        $('#logo').removeClass('visible').addClass('hidden');
    } else {
        $('#logo').removeClass('hidden').addClass('visible');
        $('#navbar-logo').removeClass('visible').addClass('hidden');
    }
}

function updateSearchBox() {
    // clear last search term
    $('#search-text').val('');
    // show/hide the flow title
    if ($('#flow-list').has('li').length > 0)
    {
        $('#flow-title').removeClass('hidden').addClass('visible');
    }
    else // no current search
    {
        $('#flow-title').removeClass('visible').addClass('hidden');   
    }
}

function querySuggestions() {
    var jqxhr = $.ajax("/querySuggestions?currentNodes=" + JSON.stringify(currentNodes))
        .done(function(data) {
            var suggestionsArray = JSON.parse(data);
            //alert('suggestionsArray length: '+suggestionsArray.length+" [0]: "+suggestionsArray[0])
            $('#suggestions-text').text('Try: ' + suggestionsArray.join(", "));
        })
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Error getting suggestions: " + err);
            $('#suggestions-text').html('<i>Suggestions not availbale at this time</i>');
        });
}

function reportAudit(){
    var jqxhr = $.ajax("/report?reportString=" + fixedEncodeURIComponent(reportString))
        .done(function(data) {
        })
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Failed reporting audit log: " + err);
        });

}