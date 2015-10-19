/**
 * Created by gazitn on 7/7/2015.
 */

var screensTimestampsGroups = null;
var screensShowGrouped = true;

function loadScreens(){
    $("#application_area").load("html/screens.html", function () {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchScreensByText();
        });

        $('#search-text').placholder = 'Search Screens';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic' ) {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchScreensByText();
            }
        });        

        $('#search-text').focus();

        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        /* comment until implemented for Screens
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });*/

    });
}

function searchScreensByText(){
    var query = $('#search-text').val();
    searchScreens(query);    
}


function searchScreens(query) {
    // change UI to show list of images instead of Screens
    //  clear top level vars
    reportString = 'Type: SCREENS\n';

    var jqxhr = $.ajax("/searchScreens?q=" + fixedEncodeURIComponent(query) + "&dateCondition=" + JSON.stringify(dateCondition))
        .done(function(data) {
            $('#screens_toggle_groups').bootstrapSwitch();
            $('#screens_toggle_groups').on('switchChange.bootstrapSwitch', function(event, state) {
                screensShowGrouped = state;
                fillScreensCarousel();
                update();
            });
            lastQuery = query;
            reportString = reportString + 'Search: ' + query + '\n';
            //console.log("Search returned: " + data);
            screensTimestampsGroups = JSON.parse(data);
            fillScreensCarousel();
            // update button but skip event
            $('#screens_toggle_groups').bootstrapSwitch('state', screensShowGrouped, true);
            reportString = reportString + 'Results #: ' + $('#screensCarousel img').length + '\n';
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}

function fillScreensCarousel(){
    var screens_results_row = $('#screens_results_row');
    var screens_carousel = $('#screens_carousel_items');
    screens_results_row.empty();
    screens_carousel.empty();
    //console.log("Search returned: " + data);
    var groups = Object.keys(screensTimestampsGroups);
    var itemCounter = 0;
    for (var j=0;j<groups.length;j++)
    {
        var timestamps = screensTimestampsGroups[groups[j]];
        var timestampsArray = [];
        if (groups[j] == 'none')
        {
            timestampsArray = timestamps;
        }
        else // if grouped, just one result per group
        {
            if (screensShowGrouped)
                timestampsArray.push(timestamps[0]);
            else
                timestampsArray = timestamps;       
        }
        for(var i=0;i<timestampsArray.length;i++){
            var timestamp = timestampsArray[i];
            screens_results_row.append(
                '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">' +
                '  <img onclick="showModal('+itemCounter+');"' +
                '       src="'+screensServer+'/screen/' + timestamp + '"/>' +
                '</li>'
            );
            var div_class = 'item';
            if (itemCounter == 0) {div_class = 'item active'; firstItem = false;}
            screens_carousel.append('<div class="'+div_class+'">'+
                '<img src="'+screensServer+'/screen/' + timestamp + 
                '"/></div>');
            itemCounter++;
        }
    }
    if (groups.length > 0) {
        $('#screensCarousel').carousel({interval: false, wrap: false}); 
    }
    else {
        screens_results_row.append(
            '<li class="">' +
            ' No screens found.' +
            '</li>'
        );
    }
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

function clearScreensSearch()
{
    screensTimestampsGroups = null;
    $('#screens_results_row').empty();
    $('#screens_carousel_items').empty();
}