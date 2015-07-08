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
                screens_results_row.empty();
                lastQuery = query;
                reportString = reportString + 'Search: ' + query + '\n';
                //console.log("Search returned: " + data);
                var timestampsArray = JSON.parse(data);
                if (timestampsArray.length > 0) {
                    // create list of screens
                    // <li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">
                    //  <img src="timestamp"/>
                    // </li>
                    timestampsArray.forEach(function (timestamp) {
                        screens_results_row.append(
                            '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">' +
                            '  <img onclick="showModal(\'/screen/' + timestamp + '\');"' +
                            '       src="/screen/' + timestamp + '"/>' +
                            '</li>'
                        );
                    });
                    reportString = reportString + 'Results #: ' + timestampsArray.length + '\n';
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