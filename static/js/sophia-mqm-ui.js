var currentNodes = [];

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
    // TBD: until backend function is ready, manually pushing a known root node
    currentNodes.push('63354');
    var jqxhr = $.ajax( "/search?q="+$('#search-text').text())
      .done(function(data) {
        var currentNodes = JSON.parse(data);
        update();
      })
      .fail(function(err) {
        alert( "Unable to complete search at this time, try again later" );
        console.log("Search failed: "+err);

        // remove all nodes
        currentNodes.length = 0;
        update();        
      });    
}

function clearSearch() {
    // remove all nodes
    currentNodes.length = 0;
    // update the logo
    update();
}

function update() {
    updateLogo();
    if (currentNodes.length <= 0)
        clearSearchText();
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

function clearSearchText() {
    $('#search-text').val('');
}

function querySuggestions()
{
    var jqxhr = $.ajax( "/querySuggestions?currentNodes="+JSON.stringify(currentNodes))
      .done(function(data) {
        var suggestionsArray = JSON.parse(data);
        //alert('suggestionsArray length: '+suggestionsArray.length+" [0]: "+suggestionsArray[0])
        $('#suggestions-text').text('Try: '+suggestionsArray.join(", "));
      })
      .fail(function(err) {
        //alert( "error getting suggestions" );
        console.log("Error getting suggestions: "+err);
        $('#suggestions-text').html('<i>Suggestions not availbale at this time</i>');
      });    
}