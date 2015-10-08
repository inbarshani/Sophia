/**
 * Created by gazitn on 7/7/2015.
 */
function searchScreens(query) {
    // change UI to show list of images instead of flows
    //  clear top level vars
    reportString = 'Type: SCREENS\n';

    var jqxhr = $.ajax("/searchScreens?q=" + fixedEncodeURIComponent(query) + "&dateCondition=" + JSON.stringify(dateCondition))
        .done(function(data) {
            $("#all_results").load("html/screens.html", function () {
                var screens_results_row = $('#screens_results_row');
                var screens_carousel = $('#screens_carousel_items');
                screens_results_row.empty();
                screens_carousel.empty();
                lastQuery = query;
                reportString = reportString + 'Search: ' + query + '\n';
                //console.log("Search returned: " + data);
                var timestampsGroups = JSON.parse(data);
                var groups = Object.keys(timestampsGroups);
                var firstItem = true;
                for (var j=0;j<groups.length;j++)
                {
                    var timestamps = timestampsGroups[groups[j]];
                    var timestampsArray = [];
                    if (groups[j] == 'none')
                    {
                        timestampsArray = timestamps;
                    }
                    else // just one result per group
                        timestampsArray.push(timestamps[0]);
                    for(var i=0;i<timestampsArray.length;i++){
                        var timestamp = timestampsArray[i];
                        screens_results_row.append(
                            '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">' +
                            '  <img onclick="showModal('+i+');"' +
                            '       src="'+screensServer+'/screen/' + timestamp + '"/>' +
                            '</li>'
                        );
                        var div_class = 'item';
                        if (firstItem) {div_class = 'item active'; firstItem = false;}
                        screens_carousel.append('<div class="'+div_class+'">'+
                            '<img src="'+screensServer+'/screen/' + timestamp + 
                            '"/></div>');
                    }
                }
                if (groups.length > 0) {
                    $('#screensCarousel').carousel(); 
                    reportString = reportString + 'Results #: ' + $('#screensCarousel img').length + '\n';
                }
                else {
                    screens_results_row.append(
                        '<li class="">' +
                        ' No screens found.' +
                        '</li>'
                    );
                }

                update();
            });
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
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

function showModal(item)
{
    $('#screenModal').modal();
    $('#screensCarousel').carousel(item);
}