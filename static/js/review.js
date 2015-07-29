/**
 * Created by gazitn on 7/7/2015.
 */
var allTests = [];
var selectedReviewTests = [];
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
            selectedReviewTests.length = 0;
            update();
        });
}

function searchBackBoneData(compareDataInfoObject, callback) {
    var jqxhr = $.ajax("/searchBackBoneData?o=" + JSON.stringify(compareDataInfoObject))
        .done(function(data) {
            callback(data);
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';
            update();
        });
}

function getNodesStats(testId, nodes, callback) {
    var jqxhr = $.ajax("/testNodesData?nodes=" + JSON.stringify(nodes))
        .done(function(data) {
            callback(data, testId);
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}
