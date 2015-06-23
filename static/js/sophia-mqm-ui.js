var currentPaths = [];
var reportString = '';
var currentBackboneNodes = [];
var currentDataNodes = [];
var suggestionsArray = [];
var availableTopicsArray = [];
var selectedTopicsArray = [];
var isAjaxActive = 0;
var searchTypes = {FLOWS: 0, 
    SCREENS: 1,
    ISSUES: 2,
    TOPICS: 3};
var searchType = searchTypes.FLOWS;
var user;
var lastQuery = "";
var selectedTestID;
var queries = [];

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

$(document).ready(function() {
    user = localStorage.getItem("user");
    if (!user)
        window.location.href = './login.html';

    // restore last search type
    searchType = localStorage.getItem("sophiaSearchType");
    if (!searchType)
        searchType = searchTypes.FLOWS;
    updateSearchNavigation();

    $('#search-button').on('click', function(e) {
        search();
    });

    $('#search-text').keyup(function(e) {
        if (e.keyCode == 13) {
            search();
        }
    });

    $('#navbar-logo').on('click', function(e) {
        clearSearch();
    });

    update();
    
    $('body').click(onDocumentClick);

    $('#load-test').on('click', function(e) {
        openLoadTestDialog();
    });
    $('#save-test').on('click', function(e) {
        openSaveTestDialog();
    });
    $('#flow-test-type-radio').on('change', function(e) {
        showTests(searchTypes.FLOWS);
    });
    $('#topic-test-type-radio').on('change', function(e) {
        showTests(searchTypes.TOPICS);
    });
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
});

$(document).ajaxSend(function(event, xhr, settings ) {
    if (!user) {
        window.location.href = './login.html';
    }
    else
    {
        //console.log('ajaxStart for: '+settings.url+', before increment, isAjaxActive: '+isAjaxActive);
        isAjaxActive++;
        setTimeout(function() {
            //console.log('in timeout function for: '+settings.url+', isAjaxActive: '+isAjaxActive);
            if (isAjaxActive > 0) {
                $("#busy").show();
            }
        }, 500);
    }
});
$(document).ajaxComplete(function( event, xhr, settings ) {
    //console.log('ajaxComplete for: '+settings.url+', before decrease, isAjaxActive: '+isAjaxActive);
    if (isAjaxActive > 0) isAjaxActive--;
    if (isAjaxActive == 0) {
        $("#busy").hide();
    }
});

function updateCurrentPaths(newPaths) {
    if (currentPaths.length > 0) {
        // if there are existing paths of preivous queries, we need to combine
        newPaths.map(function(newPath) {
            var startNode = newPath.nodes[0].id;
            for (var i = 0; i < currentPaths.length; i++) {
                if (currentPaths[i].last_backbone == startNode ||
                    currentPaths[i].last_data == startNode) {
                    // combine newPath with currentPath
                    newPath.nodes.shift(); // remove the node common to previous and new path
                    newPath.nodes = currentPaths[i].nodes.concat(newPath.nodes);
                    break; // don't need to go over all the rest of the paths
                }
            }
        });
    }
    currentPaths = newPaths;
}

function switchSearch(newSearchType) {
    if (searchType == newSearchType)
        return false; // false = no click
    // change results status
    if (searchType == searchTypes.SCREENS)
        $('#screens_results').removeClass('show').addClass('hidden');
    else if (searchType == searchTypes.FLOWS)
    {       
        currentPaths.length = 0;
        currentBackboneNodes.length = 0;
        currentDataNodes.length = 0;
        $('#flow-list').empty();
        $('#flow_results').removeClass('show').addClass('hidden');
    }
    else if (searchType == searchTypes.TOPICS)
    {       
        availableTopicsArray.length = 0;
        selectedTopicsArray.length = 0;
        $('#availbale_topics_list').empty();
        updateSelectedTopics();
        $('#topics_results_row').removeClass('show').addClass('hidden');
    }

    // update searchType
    searchType = newSearchType;
    localStorage.setItem("sophiaSearchType", searchType);

    updateSearchNavigation();

    // invoke search with last search term
    search(lastQuery);
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
    else if (searchType == searchTypes.TOPICS)
        id_of_li = "#search-topics";
    var search_type_li = $(id_of_li);
    search_type_li.removeClass('search').addClass('selected_search');
    // change siblings style
    search_type_li.siblings().removeClass('selected_search').addClass('search');    
}

function search(query){
    $('#save-test').removeClass('disabled');
    if ($('#search-text').val().length > 0)
        query = $('#search-text').val();
    if (!query || query.length==0){
        // don't run without any query string
        return false;
    }
    queries.push(query);
    if (searchType == searchTypes.FLOWS)
    {
        searchFlows(query);
    }
    else if (searchType == searchTypes.SCREENS)
    {
        searchScreens(query);
    }
    else if (searchType == searchTypes.TOPICS)
    {
        searchTopics(query);
    }
}

function searchFlows(query, callback) {
    if (currentPaths.length == 0) {
        // clear flow list
        // $('#flow-list').empty();
        reportString = 'Type: FLOWS\n';
    }
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchFlows?q=" + fixedEncodeURIComponent(query) + '&' +
            'currentNodes=' + JSON.stringify(currentBackboneNodes.concat(currentDataNodes)))
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            updateCurrentPaths(responseData.paths_to_nodes);
            currentBackboneNodes = responseData.last_backbone_nodes;
            currentDataNodes = responseData.last_data_nodes;
            // add query and number of results to the list
            var currentStepNumber = $('#flow-list li').length + 1;
            $('#flow-list').append('<li class="list-group-item clickable" onClick="highlight(this, function(nodes) { return nodes } ([' + currentBackboneNodes.concat(currentDataNodes) + ']));">Step ' + currentStepNumber + ': ' +
                query + ' <span class="badge">' + currentPaths.length + '</span></li>');
            reportString = reportString + 'Results #: ' + currentPaths.length + '\n';
            update();
            if (callback) {
                callback();
            }
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            // remove all nodes
            currentPaths.length = 0;
            currentBackboneNodes.length = 0;
            currentDataNodes.length = 0;
            update();
        });
}

function searchScreens(query) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'Type: SCREENS\n';
    var screens_results_row = $('#screens_results_row');
    screens_results_row.empty();
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/searchScreens?q=" + fixedEncodeURIComponent(query))
        .done(function(data) {
            //console.log("Search returned: " + data);
            var timestampsArray = JSON.parse(data);
            if (timestampsArray.length > 0)
            {
                // create list of screens
                // <li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">
                //  <img src="timestamp"/>
                // </li>            
                timestampsArray.forEach(function(timestamp){
                    screens_results_row.append(
                            '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">'+
                            '  <img onclick="showModal(\'/screen/'+timestamp+'\');"'+
                            '       src="/screen/'+timestamp+'"/>'+
                            '</li>'
                        );
                });
                reportString = reportString + 'Results #: ' + timestampsArray.length + '\n';
            }
            else {
                screens_results_row.append(
                        '<li class="">'+
                        ' No screens found.'+
                        '</li>'
                    );                
            }

            update();
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}

function searchTopics(query) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'Type: TOPICS\n';
    var availbale_topics_list = $('#availbale_topics_list');
    availbale_topics_list.empty();
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    var jqxhr = $.ajax("/getTopics?q="+query+"&currentPaths=[]")
        .done(function(data) {
            //console.log("Search returned: " + data);
            availableTopicsArray = JSON.parse(data);
            if (availableTopicsArray && availableTopicsArray.length > 0)
            {
                // create list of topics
                reportString = reportString + 'Results #: ' + availableTopicsArray.length + '\n';
                availableTopicsArray.forEach(function(topic, index){
                    var new_topic = $('<li data-toggle="buttons" class="btn-group bizmoduleselect" available_topic_id="'+index+'">'+
                        '  <label class="btn btn-default">'+
                        '      <div class="bizcontent">'+
                        '          <h5>'+topic.name+'</h5>'+
                        '          <span class="badge">'+topic.occurances+'</span>'+
                        '      </div>'+
                        '  </label>'+
                        '</li>'
                        ).on('click', function(e){
                            //console.log('tagName: '+$(this).prop('tagName'));
                            var available_topic_id = parseInt($(this).attr('available_topic_id'));
                            return toggleTopic(available_topic_id);
                        });

                    availbale_topics_list.append(new_topic);
                });
            }
            else {
                availbale_topics_list.append(
                        '<li class="">'+
                        ' No topics found.'+
                        '</li>'
                    );                
            }

            update();
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}

function toggleTopic(availbale_topic_id)
{
    if (!availableTopicsArray[availbale_topic_id].selected)
    {
        availableTopicsArray[availbale_topic_id].selected = true;
        selectedTopicsArray.push(availableTopicsArray[availbale_topic_id]);
    }
    else
    {
        availableTopicsArray[availbale_topic_id].selected = false;
        for(var i=0;i<selectedTopicsArray.length;i++)
        {
            if (selectedTopicsArray[i].name == availableTopicsArray[availbale_topic_id].name)
                break;
        }
        if (i < selectedTopicsArray.length)
            selectedTopicsArray.splice(i, 1);
    }
    updateSelectedTopics();
    return true;
}

function updateSelectedTopics()
{    
    var relationsArray = [];

    for (var i=0;i<selectedTopicsArray.length;i++)
    {
        for (var j=0;j<i;j++)
        {
            queryRelation(relationsArray, i, j);
        }
        addRelation(relationsArray, i, i, 0);
    }
}

function queryRelation(relationsArray, sourceIndex, targetIndex)
{
    //console.log('ajax sourceIndex='+sourceIndex+' targetIndex='+targetIndex);
    var jqxhr = $.ajax("/getTopicsLinks?topicNodesA=" + JSON.stringify(selectedTopicsArray[sourceIndex].ids) +
        "&topicNodesB="+ JSON.stringify(selectedTopicsArray[targetIndex].ids))
        .done(function(data) {
            //console.log("getTopicsLinks returned: " + data);
            var numOfLinks = parseInt(data);
            addRelation(relationsArray, sourceIndex, targetIndex, numOfLinks);
        })
        .fail(function(err) {
            console.log("getTopicsLinks failed: " + err);
        });           
}

function addRelation(relationsArray, sourceIndex, targetIndex, numOfLinks) {
    var relation = {
        sourceIndex: sourceIndex,
        targetIndex: targetIndex,
        numOfLinks: numOfLinks
    };
    relationsArray.push(relation);

    var numOfTopics = selectedTopicsArray.length;

    if (relationsArray.length == ((numOfTopics +1) * numOfTopics / 2) )
        d3Topics.loadTopics(selectedTopicsArray, relationsArray);
}

function getScreens(node_id, callback) {
    var jqxhr = $.ajax("/getScreens?selectedNode=" + node_id)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            callback(responseData.prevScreenTimestamp, responseData.nextScreenTimestamp);
        })
        .fail(function(err) {
            console.log("getScreens failed: " + err);
        });
}

function clearSearch() {
    queries = [];
    $('#save-test').addClass('disabled');
    $('#search-text').val('');
    reportString = '';
    lastQuery = '';
    searchType = searchTypes.FLOWS;
    // remove all nodes
    currentPaths.length = 0;
    currentBackboneNodes.length = 0;
    currentDataNodes.length = 0;
    // clear flow list
    $('#flow-list').empty();
    // update the logo
    update();

    $('#search-text').focus();
}

function update() {
    reportAudit();

    updateNavigation();

    updateSearchResults();

}

function updateNavigation() {    
    if (lastQuery.length > 0) {
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

function updateSearchResults() {
    // clear last search term
    //$('#search-text').val('');
    if (searchType == searchTypes.FLOWS && ($('#flow-list').has('li').length > 0))
    {
        $('#flow_results').removeClass('hidden').addClass('show');
        visualize();
    }
    else // no current flows search
    {
        $('#flow_results').removeClass('show').addClass('hidden');
    }

    if (searchType == searchTypes.SCREENS && ($('#screens_results_row').has('li').length > 0))
    {
        $('#screens_results').removeClass('hidden').addClass('show');
    }
    else
    {
        $('#screens_results').removeClass('show').addClass('hidden');        
    }

    if (searchType == searchTypes.TOPICS && ($('#availbale_topics').has('div').length > 0))
    {
        $('#topics_results_row').removeClass('hidden').addClass('show');
    }
    else
    {
        $('#topics_results_row').removeClass('show').addClass('hidden');        
    }

}

function showModal(src)
{
    var img = '<img src="' + src + '" class="img-responsive"/>';
    $('#screenModal').modal();
    $('#screenModal').on('shown.bs.modal', function(){
        $('#screenModal .modal-body').html(img);
    });
    $('#screenModal').on('hidden.bs.modal', function(){
        $('#screenModal .modal-body').html('');
    });
}

function showTopicsModal()
{
    $('#topicsModal').modal();    
}


function reportAudit() {
    var jqxhr = $.ajax("/report?reportString=" + fixedEncodeURIComponent(reportString) +
            "&user=" + user)
        .fail(function(err) {
            //alert( "error getting suggestions" );
            console.log("Failed reporting audit log: " + err);
        });

}

function openLoadTestDialog() {
    $('#loadTestModal').modal('show');
}

function openSaveTestDialog() {
    $('#saveTestModal').modal('show');
}

function showTests(type) {
    $('#tests-list').empty();
    var jqxhr = $.ajax("/tests/type/" + type)
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
    $('#search-text').val('');
    clearSearch();
    // navigate to Flows or Topics based on type

    var jqxhr = $.ajax("/tests/id/" + selectedTestID)
        .done(function(test) {
            queries = [];
            var ul;
            var type = test.type;
            if (type == searchTypes.FLOWS) {
                ul = $('#flow-list');
            } else if (type == searchTypes.TOPICS) {
                ul = $('#availbale_topics_list');
            }
            ul.empty();
            var f = [];
            for (var i = test.queries.length - 1; i >= 0; i--) {
                f[i] = (function(query, func) {
                    return function() {
                        queries.push(query);
                        searchFlows(query, func);
                    };
                }(test.queries[i].query, f[i+1]));
            }
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
        'queries': queries
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
