/**
 * Created by gazitn on 7/7/2015.
 */
var trendsBackboneNodes = [];
var trendsPaths = [];

function searchTrends(query, callback) {
    var jqxhr = $.ajax("/searchTrends?q=" + fixedEncodeURIComponent(query) +
    '&dateCondition=' + JSON.stringify(dateCondition))
        .done(function(data) {
            $( "#all_results" ).load( "html/trends.html", function(){
                var trends = JSON.parse(data);
                var trendsList = $('#trends_list');
                $('#trends_results').removeClass('hidden');
                var li, label, div, h5, span;
                trendsList.empty();
                trends.forEach(function (trend) {
                    li = $('<li>');
                    li.addClass('btn-group bizmoduleselect');
                    li.on('click', function(t){
                        return function() {
                            $('#trends-vis-container').text(t.test.id);
                        }
                    }(trend));
                    li.data('trend-id', trend.test.id);
                    li.data('toggle', 'buttons');
                    label = $('<label>');
                    label.addClass('btn btn-default');
                    div = $('<div>');
                    h5 = $('<h5>');
                    h5.text('Test: ' + trend.test.id);
                    span = $('<span>');
                    span.addClass('badge');
                    span.text(trend.bbNodes.length);
                    div.append(h5);
                    div.append(span);
                    label.append(div);
                    li.append(label);
                    trendsList.append(li);
                });
            });
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            // remove all nodes
            trendsPaths.length = 0;
            trendsBackboneNodes.length = 0;
            update();
        });
}
