/**
 * Created by gazitn on 7/7/2015.
 */
var allTests = [];
var selectedTests = [];
var selectedBBsByTest = [];

function searchReview(query, callback) {
    var jqxhr = $.ajax("/searchreview?q=" + fixedEncodeURIComponent(query) +
    '&dateCondition=' + JSON.stringify(dateCondition))
        .done(function(data) {
            showTestsForReview(data);
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
