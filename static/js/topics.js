var availableTopicsArray = [];
var selectedTopicsArray = [];
var topics_queries = [];

function loadTopics() {
    $("#application_area").load("html/topics.html", function() {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchTopicsByText();
        });

        $('#search-text').placholder = 'Search Topics';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic') {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchTopicsByText();
            }
        });

        $('#search-text').focus();

        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });
    });
}

function searchTopicsByText() {
    var query = $('#search-text').val();
    searchTopics(query, testQueryTypes.QUERY);
}

function getTopicsQueries(){
    return topics_queries;
}


function searchTopics(query, queryType, autoSelect, callback) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'Type: TOPICS\n';
    // var available_topics_list = $('#available_topics_list');
    // available_topics_list.empty();
    topics_queries.push({query:query, type: queryType});
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    if (queryType && queryType == testQueryTypes.TOPIC) {
        for (var i = 0; i < availableTopicsArray.length; i++) {
            if (availableTopicsArray[i].name == query) {
                selectedTopicsArray.push(availableTopicsArray[i]);
                updateSelectedTopics();
                break;
            }
        }
        if (callback) {
            callback();
        }
    } else {
        var jqxhr = $.ajax("/getTopics?q=" + query + "&currentPaths=[]&dateCondition=" + JSON.stringify(dateCondition))
            .done(function(data) {
                if(topics_queries.length==1) {
                    // first item
                    $('#save-test').removeClass('disabled');
                    $('#topics_results_row').removeClass('hidden');
                    update();
                }
                var available_topics_list = $('#available_topics_list');
                available_topics_list.empty();
                //console.log("Search returned: " + data);
                availableTopicsArray = JSON.parse(data);
                if (availableTopicsArray && availableTopicsArray.length > 0) {
                    // create list of topics
                    reportString = reportString + 'Results #: ' + availableTopicsArray.length + '\n';
                    availableTopicsArray.forEach(function(topic, index) {
                        var new_topic = $('<li data-toggle="buttons" class="btn-group bizmoduleselect" available_topic_id="' + index + '">' +
                            '  <label class="btn btn-default">' +
                            '      <div class="bizcontent">' +
                            '          <h5>' + topic.name + '</h5>' +
                            '          <span class="badge">' + topic.occurances + '</span>' +
                            '      </div>' +
                            '  </label>' +
                            '</li>'
                        ).on('click', function(e, name, i) {
                            return function() {
                                //console.log('tagName: '+$(this).prop('tagName'));
                                topics_queries.push({
                                    query: name,
                                    type: testQueryTypes.TOPIC
                                })
                                return toggleTopic(i);
                            };
                        }(this, topic.name, index));
                        available_topics_list.append(new_topic);
                    });
                } else {
                    available_topics_list.append(
                        '<li class="">' + query +
                        ': No topics found.' +
                        '</li>'
                    );
                }
                if (callback) {
                    callback();
                }
            })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
    }
}

function toggleTopic(available_topic_id) {
    if (!availableTopicsArray[available_topic_id].selected) {
        availableTopicsArray[available_topic_id].selected = true;
        selectedTopicsArray.push(availableTopicsArray[available_topic_id]);
    } else {
        availableTopicsArray[available_topic_id].selected = false;
        for (var i = 0; i < selectedTopicsArray.length; i++) {
            if (selectedTopicsArray[i].name == availableTopicsArray[available_topic_id].name)
                break;
        }
        if (i < selectedTopicsArray.length)
            selectedTopicsArray.splice(i, 1);
    }
    updateSelectedTopics();
    return true;
}

function updateSelectedTopics() {
    var relationsArray = [];

    for (var i = 0; i < selectedTopicsArray.length; i++) {
        for (var j = 0; j < i; j++) {
            queryRelation(relationsArray, i, j);
        }
        addRelation(relationsArray, i, i, 0);
    }
}

function queryRelation(relationsArray, sourceIndex, targetIndex) {
    //console.log('ajax sourceIndex='+sourceIndex+' targetIndex='+targetIndex);
    var jqxhr = $.ajax("/getTopicsLinks?topicNodesA=" + JSON.stringify(selectedTopicsArray[sourceIndex].ids) +
            "&topicNodesB=" + JSON.stringify(selectedTopicsArray[targetIndex].ids))
        .done(function(data) {
            //console.log("getTopicsLinks returned: " + data);
            var numOfLinks = parseInt(data);
            addRelation(relationsArray, sourceIndex, targetIndex, numOfLinks);
        })
        .fail(function(err) {
            console.log("getTopicsLinks failed: " + err);
        });
}

function showTopicsModal() {
    $('#topicsModal').modal();
}

function clearTopicsSearch()
{
    // remove all UI & data about searches
    availableTopicsArray.length = 0;
    selectedTopicsArray.length = 0;
    topics_queries.length = 0;
    $('#available_topics_list').empty();
    $('#topics-vis-container').empty();
    $('#topics_results_row').addClass('hidden');
    $('#save-test').addClass('disabled');
    updateSelectedTopics();
}
