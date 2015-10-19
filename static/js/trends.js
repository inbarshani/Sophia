/**
 * Created by gazitn on 7/7/2015.
 */
var allTests = [];
var selectedTests = [];

function searchTrends(query, callback) {
    var jqxhr = $.ajax("/searchTrends?q=" + fixedEncodeURIComponent(query) +
    '&dateCondition=' + JSON.stringify(dateCondition))
        .done(function(data) {
            $( "#application_area" ).load( "html/trends.html", function(){
                var allTests = JSON.parse(data);
                var testsList = $('#trends_tests_list');
                $('#trends_results').removeClass('hidden');
                var li, label, div, h5, span;
                testsList.empty();
                allTests.forEach(function (test) {
                    li = $('<li>');
                    li.addClass('btn-group bizmoduleselect');
                    li.on('click', function(t){
                        return function() {
                            testOnClick(t);
                        }
                    }(test));
                    li.attr('data-test-id', test.test.id);
                    li.attr('data-toggle', 'buttons');
                    label = $('<label>');
                    label.addClass('btn btn-default');
                    div = $('<div>');
                    h5 = $('<h5>');
                    h5.text('Test: ' + test.test.id);
                    span = $('<span>');
                    span.addClass('badge');
                    span.text(test.bbNodes.length);
                    div.append(h5);
                    div.append(span);
                    label.append(div);
                    li.append(label);
                    testsList.append(li);
                });
            });
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            // remove all nodes
            allTests.length = 0;
            selectedTests.length = 0;
            update();
        });
}

function testOnClick(test) {
    // toggle test selection
    var testIndex = selectedTests.indexOf(test);
    if (testIndex >= 0) {
        selectedTests.splice(testIndex, 1);
    } else {
        selectedTests.push(test);
    }
    visualizeTrendTest();
}
