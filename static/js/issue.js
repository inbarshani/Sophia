/**
 * Created by gazitn on 9/1/2015.
 */
var allTests = [];
var selectedReviewTests = [];
var selectedBBsByTest = [];
var issues_queries = [];


function loadIssues(){
    $("#application_area").load("html/issues.html", function () {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchByText();
        });

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic' ) {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchByText();
            }
        });        

        $('#search-text').focus();
        
        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        /* Disable load/save until it's implemented for issues
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });
        */
    });
}

function searchByText(){
    var query = $('#search-text').val();
    searchIssues(query);    
}


function searchIssues(query, callback) {
    var jqxhr = $.ajax("/searchError?q=" + fixedEncodeURIComponent(query) +
    '&dateCondition=' + JSON.stringify(dateCondition)+'&&isExpendedData=true')
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