function searchSavedTests(query){
    reportString = 'Type: SAVED_TESTS\n';
    clearSavedTestsSearch();
    //  + "&dateCondition=" + JSON.stringify(dateCondition)
    var jqxhr = $.ajax("/tests?type=" + searchTypes.FLOWS + "&name="+query)
        .done(function(savedTestsArray) {
            $("#application_area").load("html/saved_tests.html", function () {
                var saved_tests_list = $('#saved-list');
                lastQuery = query;
                reportString = reportString + 'Search: ' + query + '\n';
                //console.log("Search returned: " + savedTestsArray);
                if (savedTestsArray.length > 0) {
                    for(var i=0;i<savedTestsArray.length;i++){                    	
                        var test = savedTestsArray[i];
                        updateTestStatus(test.id);
                    }
                    reportString = reportString + 'Results #: ' + savedTestsArray.length + '\n';
                }
                else {
                    saved_tests_list.append(
                        '<li class="">' +
                        ' There are no saved tests.' +
                        '</li>'
                    );
                }

                update();
            });
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err.responseText);
            reportString = reportString + 'Result: failed query\n';

            clearSavedTestsSearch();

            update();
        });
}

function updateTestStatus(testId){
	$.ajax("/tests/" + testId + '?dateCondition=' + JSON.stringify(dateCondition))
	.done(function(testDetails) {
		//console.log('test: '+JSON.stringify(testDetails));
	    var passedSteps = 0;
	    testDetails.queries.forEach(function(query){
	    	if (query.result > 0)
	    		passedSteps++;
	    });
	    var li_class = 'list-group-item';
	    if (passedSteps == testDetails.queries.length)
	    	li_class += ' list-group-item-success';
	    else
	    	li_class += ' list-group-item-danger';
	    var saved_test_item = $('#saved-list #'+testId);
	    var innerHtml = 'Test: '+ testDetails.name + '</br>' +
		        ''+passedSteps+' of ' + testDetails.queries.length + 
		        ' steps passed</br>' + 
		        ' Updated: '+new Date(testDetails.updated).toLocaleString();

	    if (saved_test_item.length == 0)
	    	saved_test_item = $('#saved-list').append(
		        '<li class="'+li_class+'" id="'+testId+'">' +
		        innerHtml +
		        '</li>'
		    );
	    else
	    {
	    	saved_test_item.removeClass('list-group-item-success list-group-item-danger');
	    	saved_test_item.addClass(li_class);
	    	saved_test_item.html(innerHtml);
	    }

	    setTimeout(function(){updateTestStatus(testId);},1000);
	})
	.fail(function(err){
	    alert("Unable to complete search at this time, try again later");
	    console.log("Search failed: " + err.responseText);
	    reportString = reportString + 'Result: failed query\n';
	    clearSavedTestsSearch();     						
	});	
}

function clearSavedTestsSearch()
{
}