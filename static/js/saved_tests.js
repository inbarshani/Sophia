var intervals = [];

function searchSavedTests(query){
    reportString = 'Type: SAVED_TESTS\n';
    //  + "&dateCondition=" + JSON.stringify(dateCondition)
    var jqxhr = $.ajax("/tests/type/" + searchTypes.FLOWS)
        .done(function(savedTestsArray) {
            $("#all_results").load("html/saved_tests.html", function () {
            	/* fix */
                var saved_tests_list = $('#saved-list');
                lastQuery = query;
                reportString = reportString + 'Search: ' + query + '\n';
                //console.log("Search returned: " + savedTestsArray);
                if (savedTestsArray.length > 0) {
                    for(var i=0;i<savedTestsArray.length;i++){                    	
                        var test = savedTestsArray[i];
                        updateTestStatus(test.id);
                        intervals.push(setInterval(function(){
                        	updateTestStatus(test.id);
                        },1000));
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

            update();
        });
}

function updateTestStatus(testId){
	$.ajax("/tests/id/" + testId)
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
		        ' steps passed</br>';

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
	})
	.fail(function(err){
	    alert("Unable to complete search at this time, try again later");
	    console.log("Search failed: " + err.responseText);
	    reportString = reportString + 'Result: failed query\n';        						
	});	
}

function clearSavedTestsSearch()
{
	intervals.forEach(function(interval){
		clearInterval(interval);
	});
	intervals.length = 0;
}