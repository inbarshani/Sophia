/**
 * Created by gazitn on 9/1/2015.
 */
var allTests = [];
var selectedReviewTests = [];
var selectedBBsByTest = [];

function searchIssue(query, callback) {
    var jqxhr = $.ajax("/searchError?q=" + fixedEncodeURIComponent(query) +
    '&dateCondition=' + JSON.stringify(dateCondition))
        .done(function(data) {
            showIssues(data);
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            // remove all nodes
            allTests.length = 0;
            selectedReviewTests.length = 0;
            update();
        });
}