/**
 * Created by gazitn on 7/7/2015.
 */
function searchTopics(query, queryType, autoSelect, callback) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'Type: TOPICS\n';
    // var available_topics_list = $('#available_topics_list');
    // available_topics_list.empty();
    lastQuery = query;
    reportString = reportString + 'Search: ' + query + '\n';
    if (queryType && queryType==testQueryTypes.TOPIC) {
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
        var jqxhr = $.ajax("/getTopics?q="+query+"&currentPaths=[]&dateCondition=" + JSON.stringify(dateCondition))
            .done(function(data) {
                var loadedTopics =  $('#available_topics_list');
                if (loadedTopics.length>0) {
                    var available_topics_list = $('#available_topics_list');
                    available_topics_list.empty();
                    //console.log("Search returned: " + data);
                    availableTopicsArray = JSON.parse(data);
                    if (availableTopicsArray && availableTopicsArray.length > 0) {
                        // create list of topics
                        reportString = reportString + 'Results #: ' + availableTopicsArray.length + '\n';
                        availableTopicsArray.forEach(function (topic, index) {
                            var new_topic = $('<li data-toggle="buttons" class="btn-group bizmoduleselect" available_topic_id="' + index + '">' +
                                '  <label class="btn btn-default">' +
                                '      <div class="bizcontent">' +
                                '          <h5>' + topic.name + '</h5>' +
                                '          <span class="badge">' + topic.occurances + '</span>' +
                                '      </div>' +
                                '  </label>' +
                                '</li>'
                            ).on('click', function (e, name, i) {
                                    return function () {
                                        //console.log('tagName: '+$(this).prop('tagName'));
                                        queries.push({query: name, type: testQueryTypes.TOPIC})
                                        return toggleTopic(i);
                                    };
                                }(this, topic.name, index));
                            available_topics_list.append(new_topic);
                        });
                    }
                    else {
                        available_topics_list.append(
                            '<li class="">' + query +
                            ': No topics found.' +
                            '</li>'
                        );
                    }
                    update();
                    if (callback) {
                        callback();
                    }
                }
                else {
                    $("#application_area").load("html/topics.html", function () {

                        var available_topics_list = $('#available_topics_list');
                        available_topics_list.empty();
                        //console.log("Search returned: " + data);
                        availableTopicsArray = JSON.parse(data);
                        if (availableTopicsArray && availableTopicsArray.length > 0) {
                            // create list of topics
                            reportString = reportString + 'Results #: ' + availableTopicsArray.length + '\n';
                            availableTopicsArray.forEach(function (topic, index) {
                                var new_topic = $('<li data-toggle="buttons" class="btn-group bizmoduleselect" available_topic_id="' + index + '">' +
                                    '  <label class="btn btn-default">' +
                                    '      <div class="bizcontent">' +
                                    '          <h5>' + topic.name + '</h5>' +
                                    '          <span class="badge">' + topic.occurances + '</span>' +
                                    '      </div>' +
                                    '  </label>' +
                                    '</li>'
                                ).on('click', function (e, name, i) {
                                        return function () {
                                            //console.log('tagName: '+$(this).prop('tagName'));
                                            queries.push({query: name, type: testQueryTypes.TOPIC})
                                            return toggleTopic(i);
                                        };
                                    }(this, topic.name, index));
                                available_topics_list.append(new_topic);
                            });
                        }
                        else {
                            available_topics_list.append(
                                '<li class="">' + query +
                                ': No topics found.' +
                                '</li>'
                            );
                        }
                        update();
                        if (callback) {
                            callback();
                        }

                    })
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

function toggleTopic(available_topic_id)
{
    if (!availableTopicsArray[available_topic_id].selected)
    {
        availableTopicsArray[available_topic_id].selected = true;
        selectedTopicsArray.push(availableTopicsArray[available_topic_id]);
    }
    else
    {
        availableTopicsArray[available_topic_id].selected = false;
        for(var i=0;i<selectedTopicsArray.length;i++)
        {
            if (selectedTopicsArray[i].name == availableTopicsArray[available_topic_id].name)
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

function showTopicsModal()
{
    $('#topicsModal').modal();
}
