
function loadXP(){
    $("#application_area").load("html/experiences.html", function () {
        // bind the search control

    });
}

function defineXPDone(){
}

function searchXP(){
    //reportString = 'Type: SAVED_TESTS\n';
    clearXP();
    //  + "&dateCondition=" + JSON.stringify(dateCondition)
    /*
    var jqxhr = $.ajax("/tests?type=" + searchTypes.FLOWS + "&name="+query)
        .done(function(data) {
	        lastQuery = query;
	        reportString = reportString + 'Search: ' + query + '\n';

	        update();
        }) // end ajax done
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err.responseText);
            reportString = reportString + 'Result: failed query\n';

            clearXP();

            update();
        }); // end ajax err handling and ajax call for XP define
    */
}

function clearXP()
{
}