/**
 * Created by gazitn on 7/7/2015.
 */
var allTests = [];
var selectedReviewTests = [];
var selectedBBsByTest = [];

function loadReviews(){
    $("#application_area").load("html/review.html", function () {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchReviewByText();
        });

        $('#search-text').placholder = 'Search Test Executions';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic' ) {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchReviewByText();
            }
        });        

        $('#search-text').focus();

        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        /* remove load/save until implemented for Review
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });*/

    });
}

function searchReviewByText(){
    var query = $('#search-text').val();
    searchReview(query);    
}

function searchReview(query, callback) {
    clearReviewsSearch();
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
    var query = fixedEncodeURIComponent(JSON.stringify(compareDataInfoObject));
    var jqxhr = $.ajax("/searchBackBoneData?o=" + query)
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

function getNodesStats(name, testId, nodes, callback) {
    var jqxhr = $.ajax("/testNodesData?nodes=" + JSON.stringify(nodes))
        .done(function(data) {
            callback(data, testId, name);
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}

function clearReviewsSearch()
{
    // remove all UI & data about searches
    allTests.length = 0;
    selectedReviewTests.length = 0;
    selectedBBsByTest.length = 0;
    $('#review_tests_list').empty();
    $('#review_vis_container').empty();
    $('#pagination').empty();    
}
