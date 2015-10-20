var reportString = '';
var suggestionsArray = [];
var testQueryTypes = {QUERY: 0, 
    TOPIC: 1,
    VERIFICATION: 2};
var isAjaxActive = 0;
var searchTypes = {
    FLOWS: 0, 
    SCREENS: 1,
    ISSUES: 2,
    TOPICS: 3,
    TRENDS: 4,
    SAVED: 5,
    REVIEW: 6,
    XP: 7
};
var searchType = searchTypes.FLOWS;
var user;
var lastQuery = "";
var selectedTestID;
var dateCondition = {from: null, to: null};


function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

$(document).ready(function() {
    //for tooltip
    $('[data-toggle="tooltip"]').tooltip();
    //for tooltip
    user = localStorage.getItem("user");
    if (!user)
        window.location.href = './login.html';

    // restore last search type
    searchType = localStorage.getItem("sophiaSearchType");
    switchSearch(searchType);

    $('#navbar-logo').on('click', function(e) {
        clearSearch();
    });

    update();
    
    $('#load-test-btn').on('click', function(e) {
        loadTest();
    });
    $('#save-test-btn').on('click', function(e) {
        saveTest();
    });

    $('#test-name-field').keyup(function(e) {
        if ($(this).val().length > 0) {
            $('#save-test-btn').removeClass('disabled');
        } else {
            $('#save-test-btn').addClass('disabled');
            return;
        }
        if (e.keyCode == 13) {
            saveTest();
        }
    });
    $('#fromDate').datetimepicker()
        .on('dp.change', function(){
            $('#fromDate').data("DateTimePicker").hide();
        });
    $('#toDate').datetimepicker()
        .on('dp.change', function(){
            $('#toDate').data("DateTimePicker").hide();
        });

    $('#date-cond-btn-submit').on('click', function(e) {
        setDateCondition();
    });
    $('#date-cond-btn-remove').on('click', function(e) {
        removeDateCondition();
    });
});

$(document).ajaxSend(function(event, xhr, settings ) {
    if (!user) {
        window.location.href = './login.html';
    }
    else
    {
        console.log('Sophia ajaxSend for: '+settings.url+', before increment, isAjaxActive: '+isAjaxActive);
        isAjaxActive++;
        setTimeout(function() {
            //console.log('in timeout function for: '+settings.url+', isAjaxActive: '+isAjaxActive);
            if (isAjaxActive > 0) {
                $("#busy").show();
            }
        }, 500);
    }
});
$(document).ajaxError(function( event, xhr, settings, error ) {
    console.log('Sophia ajaxError for: '+settings.url+
        ', statusText: '+xhr.statusText+', error: '+error);
});
$(document).ajaxComplete(function( event, xhr, settings ) {
    //console.log('Sophia ajaxComplete for: '+settings.url+', statusText: '+xhr.statusText);
    console.log('Sophia ajaxComplete for: '+settings.url+', before decrease, isAjaxActive: '+isAjaxActive);
    if (isAjaxActive > 0) isAjaxActive--;
    if (isAjaxActive == 0) {
        $("#busy").hide();
    }
});


function switchSearch(newSearchType) {
    // change results status
    if (searchType == searchTypes.SCREENS)
    {
        clearScreensSearch();
    }
    else if (searchType == searchTypes.FLOWS) {       
        clearFlowsSearch();
    } else if (searchType == searchTypes.TOPICS) {       
        clearTopicsSearch();
    } else if (searchType == searchTypes.SAVED) {
        clearSavedTestsSearch();
    } else if (searchType == searchTypes.REVIEW) {
        clearReviewsSearch();
    } else if (searchType == searchTypes.ISSUES) {
        clearIssuesSearch();
    } else if (searchType == searchTypes.XP) {
        clearXP();
    }

    // update searchType
    searchType = newSearchType;
    $( "#application_area" ).html('');
    localStorage.setItem("sophiaSearchType", searchType);

    updateSearchNavigation();
    updateView();
}

function updateSearchNavigation()
{
    // update search options
    var id_of_li = "";
    if (searchType == searchTypes.FLOWS)
        id_of_li = "#search-flows";
    else if (searchType == searchTypes.SCREENS)
        id_of_li = "#search-screens";
    else if (searchType == searchTypes.ISSUES)
        id_of_li = "#search-issues";
    else if (searchType == searchTypes.TOPICS) {
        id_of_li = "#search-topics";
        $("#topics-vis-container").html("");
        d3Topics.svg = null;
    } 
    else if (searchType == searchTypes.SAVED)
        id_of_li = "#search-saved";
    else if (searchType == searchTypes.REVIEW)
        id_of_li = "#search-review";
    else if (searchType == searchTypes.XP)
        id_of_li = "#search-xp";

    var search_type_li = $(id_of_li);
    search_type_li.removeClass('search').addClass('selected_search');
    // change siblings style
    search_type_li.siblings().removeClass('selected_search').addClass('search');    
}

function clearSearch(searchType) {
    reportString = '';
    lastQuery = '';
    if (!searchType) {
        searchType = searchTypes.FLOWS;
    }
    switchSearch(searchType);
    update();
}

function update() {
    reportAudit();

    updateNavigation();
}

function updateNavigation() {    
    if (lastQuery && lastQuery.length > 0) {
        $('#navbar-logo').removeClass('hidden').addClass('show');
        //$('#search-options').removeClass('hidden').addClass('show');
        $('#search-options-divider').removeClass('hidden').addClass('show');
        $('#logo').removeClass('show').addClass('hidden');
    } else {
        $('#logo').removeClass('hidden').addClass('show');
        //$('#search-options').removeClass('show').addClass('hidden');
        $('#search-options-divider').removeClass('show').addClass('hidden');
        $('#navbar-logo').removeClass('show').addClass('hidden');
    }
}

function updateView() {
    if (searchType == searchTypes.FLOWS) {
        loadFlows();
    }
    else if (searchType == searchTypes.SCREENS){
        loadScreens(); 
    }
    else if (searchType == searchTypes.TOPICS){
        loadTopics();
    }
    else if (searchType == searchTypes.REVIEW){
        loadReviews();
    }
    else if (searchType == searchTypes.ISSUES){
        loadIssues();
    }
    else if (searchType == searchTypes.SAVED){
        loadSavedTests();
    }
    else if (searchType == searchTypes.XP){
        loadXP();
    }
}

function reportAudit() {
    var jqxhr = $.ajax("/report?reportString=" + fixedEncodeURIComponent(reportString) +
            "&user=" + user)
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Failed reporting audit log: " + err);
        });

}

function openDateDialog() {
    $('#dateModal').modal('show');
}

function openLoadTestDialog() {
    $('#loadTestModal').modal('show');
    showTests(searchType);
}

function openSaveTestDialog() {
    $('#saveTestModal').modal('show');
}

function showTests(type) {
    $('#tests-list').empty();
    var jqxhr = $.ajax("/tests?type=" + type)
        .done(function(tests) {
            //console.log("getTopicsLinks returned: " + data);
            var li;
            for (var i = 0; i < tests.length; i++) {
                li = $('<li>', {
                    class: 'list-group-item clickable',
                    text: tests[i].name,
                    click: (function(test) {
                        return function() {
                            selectTest(this, test);
                        };
                    }(tests[i]))
                });
                $('#tests-list').append(li);
           }
        })
        .fail(function(err) {
            console.log("showTests failed: " + err);
        });           

}

function selectTest(li, test) {
    selectedTestID = test.id;
    $("ul > li").removeClass('active');
    $(li).addClass('active');
    $('#test-details').html('');
    var p = $('<p>', {
        html: '<strong>Name:</strong>'
    });
    $('#test-details').append(p)
    p = $('<p>', {
        text: test.name
    });
    $('#test-details').append(p)
    p = $('<p>', {
        html: '<strong>Created:</strong>'
    });
    $('#test-details').append(p)
    p = $('<p>', {
        text: test.created
    });
    $('#test-details').append(p)
}

function loadTest() {
    if (!selectedTestID) {
        console.log("No test selected");
        return;
    }
    $('#loadTestModal').modal('hide');

    var jqxhr = $.ajax("/tests/" + selectedTestID)
        .done(function(test) {
            var ul;
            var type = test.type;
            switchSearch(type);
            // chain all calls to search(query), and add a final call
            //  to save the test run
            var f = [];
            f[test.queries.length] = (function(){
                    var params = {
                        queries: getSearchQueries()
                    };
                    //console.log('save test on load');
                    $.ajax({  
                        type: 'POST',  
                        url: '/tests/'+selectedTestID+'/runs',
                        cache: false,
                        data: JSON.stringify(params),
                        headers: { "Content-Type": "application/json"  }
                    });
                });
            for (var i = test.queries.length - 1; i >= 0; i--) {
                f[i] = (function(query, func) {
                    return function() {
                        //console.log('run query #'+i);
                        if (type == searchTypes.FLOWS) {
                            searchFlows(query.query, query.type, func);
                        } else if (type == searchTypes.TOPICS) {
                            searchTopics(query.query, query.type, true, func);
                        }
                    };
                }(test.queries[i], f[i+1]));
            }
            // add a function to 'save' the test run on completion of load
            f[0]();
        })
        .fail(function(err) {
            console.log("loadTest failed: " + err);
        });           
}

function saveTest() {
    var testName = $('#test-name-field').val();
    var params = {
        'user': user,
        'type': searchType,
        'name': testName,
        'queries': getSearchQueries()
    };
    $.ajax({  
        type: 'POST',  
        url: '/saveTest/',
        cache: false,
        data: JSON.stringify(params),
        headers: { "Content-Type": "application/json"  }, 
        success: function(data){
            if (data != 'OK') {
                $('#save-test-error').text('Error ' + data.errno + ': ' + data.code);
                $('#save-test-error').addClass('alert-danger');
                $('#save-test-error').removeClass('hidden');
                setTimeout(function() {
                    $('#save-test-error').text('');
                    $('#save-test-error').removeClass('alert-danger');
                    $('#save-test-error').addClass('hidden');
                }, 5000);
            } else {
                $('#save-test-error').text('Test saved successfully');
                $('#save-test-error').addClass('alert-success');
                $('#save-test-error').removeClass('hidden');
                setTimeout(function() {
                    $('#save-test-error').text('');
                    $('#save-test-error').removeClass('alert-success');
                    $('#save-test-error').addClass('hidden');
                    $('#saveTestModal').modal('hide');
                }, 3000);

            }
        },
        error: function (textStatus, errorThrown){
            $('#save-test-error').text(textStatus);
            $('#save-test-error').addClass('alert-danger');
            $('#save-test-error').removeClass('hidden');
            setTimeout(function() {
                $('#save-test-error').text('');
                $('#save-test-error').removeClass('alert-danger');
                $('#save-test-error').addClass('hidden');
            }, 5000);
        }
    });  
}

function getSearchQueries(){
    if (searchType == searchTypes.FLOWS) {
        return getFlowsQueries();
    } else if (searchType == searchTypes.TOPICS) {
        return getTopicsQueries();
    }    
}

function setDateCondition() {
    if ($('#fromDate').data('DateTimePicker').date()) {
        dateCondition.from = $('#fromDate').data('DateTimePicker').date().unix() * 1000;
    } else {
        dateCondition.from = null;
    }
    if ($('#toDate').data('DateTimePicker').date()) {
        dateCondition.to = $('#toDate').data('DateTimePicker').date().unix() * 1000;
    } else {
        dateCondition.to = null;
    }
    $('#dateModal').modal('hide');
    if (dateCondition.from || dateCondition.to) {
        $('#dateCondIndicator').removeClass('hidden');
        $('#dateCondIndicator').tooltip({title: 'Date condition exists'});
   } else {
        $('#dateCondIndicator').addClass('hidden');
    }
}

function removeDateCondition() {
    dateCondition = {from: null, to: null};
    $('#fromDate').data('DateTimePicker').date(null);
    $('#toDate').data('DateTimePicker').date(null);
    $('#dateModal').modal('hide');
    $('#dateCondIndicator').addClass('hidden');
    $('#dateCondIndicator').tooltip('destroy');
}