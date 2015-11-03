var fullData;
var table;
var items = [];
var color;
//var eventWidth;
var position = 0;
var panelWidth;
/*	Define the dimensions of the SVG */
var duration = 200;
var marginTop = 5;
var marginRight = 0;
var marginBottom = 40;
var marginLeft = 0;
var padding = 2;
var width = 630 - marginRight - marginLeft;
var height = 290 - marginTop - marginBottom;
var miniHeight = 75;
var mainHeight = height - miniHeight - 50;
var zoom = 1;
var maxZoom = 10;
var zoomIncrement = 1;
/*	A global variable to control which event/location to show */
var counter = 0;
/*	A global variable to control the amout of ticks visible */
var ticks = 8;
var timeFirst;
var timeLast;
var timeDiff;
var timeBegin;
var timeEnd;
var x;
var chart;
var miniHolder;
var mini;
var xYearAxis;
var yearAxis;
var xMonthAxis;
var monthAxis;
var xDayAxis;
var dayAxis;
var locations;
var eventLeft;
var eventWidth;
var eventTop;
var tooltipHeight;

function CreateTable(data)
{
    var labelColorTestData = [];
    var dataObj = JSON.parse(data);
    var obj =  dataObj.dataNodes;
    var table = $("#tableNodes");
    var array = $.map(obj, function(value, index) {
        return [value];
    });
    function compare(a,b) {
        if (a.timestamp < b.timestamp)
            return -1;
        if (a.timestamp > b.timestamp)
            return 1;
        return 0;
    }
    array.sort(compare);
    var screen =4;
    var isfirstkey = 1;
    var firstkeyTimeStemp;
    var count = 4;
    var colors = ['#CDCECE', '#A4A5A5', '#737373', '#505050'];
    for(var key in obj)
    {
        if(isfirstkey>0)
        {
            firstkeyTimeStemp = obj[key].timestamp;
            isfirstkey--;
        }
        if(count>0)
        {
            var type = obj[key].type;
            var timestamp = new Date(obj[key].timestamp * 1000);
            var date = obj[key].date;
            var caption = obj[key].caption;
            var tr = '<tr>';
            tr += '<td>' + timestamp + '</td>';
            tr += '<td>' + timestamp + '</td>';
            tr += '<td>' + type + '</td>';
            tr += '<td>' + caption + '</td>';
            //tr+='<td>' +date + '</td>';
            tr+='<td>' +colors[count-1] + '</td>';
            tr += '</tr>';
            table.append(tr);
            table.hide();
            count--;
        }

    }
    return table;
}
function getDate(d) {
    /*	If d is a number or a string in the format Day Month Year
     process it as normal. Other wise presume that it may be a string
     in the format Month Year and add 1 to the start so that Firefox
     and safari can parse the date */
    if (typeof d === "number") {
        return new Date(d);
    } else if (Date.parse(d)) {
        return new Date(d);
    } else
    {
        return new Date("1 " + d);
    }
}
function AddProperties(table, items)
{
    /*	Add a prorerty to the objects for each column in the table/bit of info we want to show
     i.e date, headline, the text, image link and credit */
    for (var i = 0; i < $(table).length; i++) {

        var dateStart = $(table).eq(i).children('td').eq(0).html();
        var dateEnd;

        if ($(table).eq(i).children('td').eq(1).html() === " ") {
            dateEnd = $(table).eq(i).children('td').eq(0).html();
        } else {
            dateEnd = $(table).eq(i).children('td').eq(1).html();
        }

        items[i].dateStart = dateStart;
        items[i].dateEnd = dateEnd;
        items[i].date1 = getDate(dateStart);
        items[i].date2 = getDate(dateEnd);

        if ($(table).eq(i).children('td').eq(2).html() !== " ") {
            items[i].headline = $(table).eq(i).children('td').eq(2).html();
        }

        if ($(table).eq(i).children('td').eq(3).html() !== " ") {
            items[i].text = $(table).eq(i).children('td').eq(3).html();
        }

        if ($(table).eq(i).children('td').eq(4).html() !== " ") {
            //       items[i].link = $(table).eq(i).children('td').eq(4).html();
        }
        if ($(table).eq(i).children('td').eq(4).html() !== " ") {
            items[i].color = $(table).eq(i).children('td').eq(4).html();
        }

    };
}
function InsertEventsDiv(items)
{
    for (var i = 0; i < items.length; i++) {
        $(".outerwrapper .info-box .panel").append('<div class="event-' + i + '"></div>');
    };

    for (var i = 0; i < $('.outerwrapper div[class^="event"]').length; i++) {

        if (items[i].img) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<span class="timeline-img">' + items[i].img + '</span>');
        }

        if (items[i].date1 < items[i].date2) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<h3>' + items[i].dateStart + ' - ' + items[i].dateEnd + '</h3>');
        } else {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<h5>' + items[i].dateStart + '</h5>');
        }

        if (items[i].headline) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<h3>' + items[i].headline + ' (' + (i + 1) + ' of ' + items.length + ')</h3>');
        } else {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<h6> (' + (i + 1) + ' of ' + items.length + ')</h6>');
        }

        if (items[i].text) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<p>' + items[i].text + '</p>');
        }

        if (items[i].link) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<p>' + items[i].link + '</p>');
        }

        if (items[i].img) {
            $('.outerwrapper div[class="event-' + i + '"]')
                .append('<p class="credit">PICTURE CREDIT: ' + items[i].credit + '</p>')
        }
    };
}
function ZoomInIcon(chart)
{
    var zoomInIcon = chart.append("path")
        .attr("d", "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM15.687,9.051h-4v2.833H8.854v4.001h2.833v2.833h4v-2.834h2.832v-3.999h-2.833V9.051z")
        .style("pointer-events", "none")
        .attr("transform", "translate(5,60), scale(1.25)");

    var zoomInButton = chart.append("rect")
        .attr("width", 50)
        .attr("height", 50)
        //        .style("fill", colourBackground[4])
        .style("opacity", 0.2)
        .attr("transform", "translate(0,55)")
        .style("cursor", "pointer")
        .on("click", function(e) {
            if (zoom < maxZoom) {
                zoom += zoomIncrement;
                showLocation();
            };
            d3.event.preventDefault();
            return false;
        })
        .on("mouseover", function() {
            if (zoom < maxZoom) {
                d3.select(this).transition()
                    .duration(duration)
                    .style("opacity", 0.5);
            };
        })
        .on("mouseout", function() {
            d3.select(this).transition()
                .duration(duration)
                .style("opacity", 0.2);
        });
}
function ZoomOutIcon(chart)
{
    var zoomOutIcon = chart.append("path")
        .attr("d", "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM8.854,11.884v4.001l9.665-0.001v-3.999L8.854,11.884z")
        .style("pointer-events", "none")
        .attr("transform", "translate(55,60), scale(1.25)");

    var zoomOutButton = chart.append("rect")
        .attr("width", 50)
        .attr("height", 50)
        .style("fill", "gray")
        .style("opacity", 0.2)
        .attr("transform", "translate(50,55)")
        .style("cursor", "pointer")
        .on("click", function(e) {
            if (zoom > 1) {
                zoom -= zoomIncrement;
                showLocation();
            };

            d3.event.preventDefault();
            return false;
        })
        .on("mouseover", function() {
            if (zoom > 1) {
                d3.select(this).transition()
                    .duration(duration)
                    .style("opacity", 0.5);
            };

        })
        .on("mouseout", function() {
            d3.select(this).transition()
                .duration(duration)
                .style("opacity", 0.2);
        });
}
function ClippingPath(chart, height, miniHeight, width, marginBottom, marginTop)
{
    /*	Prepare a cliping path to stop the locations and scales breaking spilling over the edges
     of the SVG in IE */
    chart.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height + marginTop + marginBottom);

    chart.append("g")
        .append("rect")
        .attr("x", 0)
        .attr("y", (height - miniHeight))
        .attr("width", width)
        .attr("height", miniHeight)
        .attr("fill", "white")
        .style("opacity", 0.5);

    var miniHolder = chart.append("g")
        .attr("clip-path", "url(#clip)");
    return miniHolder;
}
function LeftIcon(chart, counter)
{


}
function showIssues(data) {
    $('#results_table').removeClass('hidden');
    $('#results_timeline').removeClass('hidden');

    var table = CreateTable(data);
    fullData = table;
    table = $("#tableNodes").children();
    /*	Push an object into the items array for each table row/point on the timeline */
    for (var i = 0; i < $(table).length; i++) {
        var newObject = {};
        items.push(newObject);
    };
    AddProperties(table, items);

    InsertEventsDiv(items)
    /*	Insert an .event div for each event */

   /* $(".outerwrapper svg.chart .locations:hover ").css({
        "fill": color
    });*/
 /* $(".outerwrapper svg.chart .locations").css({
        fill: '#CDCECE'
    });*/
    eventWidth = $('.outerwrapper .info-box').width();

    panelWidth = eventWidth * (items.length+1);
    $(".outerwrapper .info-box .panel").css({
        "width": panelWidth + "px"
    });
    /*	Find the earliest and latest time in the range */
    timeFirst = d3.min(items, function(d) {
        return d.date1;
    });
    timeLast = d3.max(items, function(d) {
        return d.date2;
    });
    /*	Work out the time span of the whole timeline in miliseconds plus one tenth of this value */
    timeDiff = timeLast - timeFirst;
    timeDiff = timeDiff + (timeDiff * 0.1);
    /*	Extend the time range before the first date and after the last date to make for a more attractive timeline */
    timeBegin = getDate(items[counter].date1.getTime() - timeDiff);
    timeEnd = getDate(items[counter].date1.getTime() + timeDiff);
    /* Scales */
    x = d3.time.scale()
            .domain([timeBegin, timeEnd])
            .range([0, width]);
    /*	Create the SVG and its elements */
    chart = d3.select(".timeline")
                        .append("svg")
                        .attr("width", width + marginRight + marginLeft)
                        .attr("height", height + marginTop + marginBottom)
                        .attr("class", "chart");

    /*	Draw the four icons for zooming and moving through the time line as well as their enclosing rects. Add functionality for hover and click. */
    ZoomInIcon(chart);
    ZoomOutIcon(chart);
   // LeftIcon(chart, counter);
    var leftIcon = chart.append("path")
        .attr("d", "M20.834,8.037L9.641,14.5c-1.43,0.824-1.43,2.175,0,3l11.193,6.463c1.429,0.826,2.598,0.15,2.598-1.5V9.537C23.432,7.887,22.263,7.211,20.834,8.037z")
        .style("pointer-events", "none")
        .attr("transform", "translate(0,0), scale(1.5)");

    var leftButton = chart.append("rect")
        .attr("width", 50)
        .attr("height", 50)
        .style("fill", "gray")
        .style("opacity", 0.2)
        .attr("transform", "translate(0,0)")
        .style("cursor", "pointer")
        .on("click", function(e) {
            if (counter > 0) {
                counter -= 1;
            };

            showLocation();
            d3.event.preventDefault();
            return false;
        })
        .on("mouseover", function() {

            if (counter > 0) {
                d3.select(this).transition()
                    .duration(duration)
                    .style("opacity", 0.5);
            };
        })
        .on("mouseout", function() {
            d3.select(this).transition()
                .duration(duration)
                .style("opacity", 0.2);
        });
   // var leftButton = LeftButton(chart);

                    var rightIcon = chart.append("path")
                        .attr("d", "M11.166,23.963L22.359,17.5c1.43-0.824,1.43-2.175,0-3L11.166,8.037c-1.429-0.826-2.598-0.15-2.598,1.5v12.926C8.568,24.113,9.737,24.789,11.166,23.963z")
                        .style("pointer-events", "none")
                        .attr("transform", "translate(50,0), scale(1.5)");

                    var rightButton = chart.append("rect")
                        .attr("width", 50)
                        .attr("height", 50)
                        .style("fill", "gray")
                        .style("opacity", 0.2)
                        .attr("transform", "translate(50,0)")
                        .style("cursor", "pointer")
                        .on("click", function(e) {
                            if (counter < (items.length - 1)) {
                                counter += 1;
                            };

                            showLocation();
                            d3.event.preventDefault();
                            return false;
                        })
                        .on("mouseover", function() {

                            if (counter < (items.length - 1)) {
                                d3.select(this).transition()
                                    .duration(duration)
                                    .style("opacity", 0.5);
                            };

                        })
                        .on("mouseout", function() {
                            d3.select(this).transition()
                                .duration(duration)
                                .style("opacity", 0.2);
                        });

    miniHolder = ClippingPath(chart, height, miniHeight, width, marginBottom, marginTop);
    /*	Prepare a cliping path to stop the locations and scales breaking spilling over the edges
     of the SVG in IE */
    mini = miniHolder.append("g")
        .attr("width", width)
        .attr("height", miniHeight)
        .attr("class", "mini")
        .attr("transform", "translate(0," + (height - miniHeight) + ")")
    /* create three seperate x axis for Year, Month and Day based on the same x scale */
    xYearAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(15, 0)
                        .ticks(d3.time.years, 1)
                        .tickFormat(d3.time.format('%Y'))
                        .orient('top');
    yearAxis = mini.append('g')
                        .attr('class', 'year-axis')
                        .call(xYearAxis);
    xMonthAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(-miniHeight, 0)
                        .orient('top');
    monthAxis = mini.append('g')
                        .attr('class', 'axis')
                        .call(xMonthAxis);
    xDayAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(10, 0)
                        .tickFormat(function(d) {
                            return '';
                        })
                        .orient('bottom');
    dayAxis = mini.append('g')
                        .attr('class', 'axis')
                        .attr("transform", "translate(0," + (miniHeight - 10) + ")")
                        .call(xDayAxis);

                    /* draw the static triangle to act as a pointer */
                 /*   chart.append("path")
                        .attr("d", "M10,0 L20,20 L0,20z")
                        .style("fill","red")
                        .style("pointer-events", "none")
                        .attr("transform", "translate(" + ((width / 2) - 10) + "," + height + ")");*/

                    /* 	Add rect for each point on the timeline */
                    locations = mini.append("g").selectAll("rect")
                        .data(items)
                        .enter()
                        .append("rect")
                        .attr("class", function(d, i) {
                            if (i === counter) {
                                return "locations selected";
                            } else {
                                return "locations"+i;
                            };

                        })
                        .attr("x", function(d, i) {
                            return x(d.date1);
                        })
                        .attr("y", function(d, i) {
                            /*	Work out if the first date of the current range overlaps the last date of the previous
                             if so move the current rect down so that there is no overlap*/
                            var prev = 0;

                            if (i > 0) {
                                prev = i - 1;
                            }
                            if (i === 0) {
                                return 0;
                            } else if (items[prev].date2 < items[i].date1) {
                                return 0;
                            } else {
                                return (miniHeight - 10) / 2;
                            }
                        })

                        .attr("width", function(d) {
                            if (d.date1 < d.date2) {
                                /* 	decide the width of the rect based on the range of dates */
                                return x(d.date2) - x(d.date1);
                            } else {
                                /* 	if no end date is specified add 86,400,000 milliseconds (1 day) to the first
                                 date to create a span of time for the width
                                 but make sure that it is at least 4 px wide */
                                var thisWidth = x(getDate(d.date1.getTime() + 86400000)) - x(d.date1);

                                if (thisWidth < 4) {
                                    return 4;
                                } else {
                                    return thisWidth;
                                }
                            }
                        })

                        .attr("height", function(d, i) {
                            /*	Work out if the first date of the current range overlaps the last date of the previous
                             if so half the height of the block to accomadate */
                            var prev = 0;
                            var next;

                            if (i > 0) {
                                prev = i - 1;
                            }

                            if (i < items.length - 1) {
                                next = i + 1
                            } else {
                                next = items.length - 1;
                            }

                            if (prev > 0) {
                                if (items[i].date2 > items[next].date1) {
                                    return (miniHeight - 10) / 2;
                                } else if (items[prev].date2 > items[i].date1) {
                                    return (miniHeight - 10) / 2;
                                } else {
                                    return (miniHeight - 10);
                                }
                            } else {
                                return (miniHeight - 10);
                            }

                        })
                        .on("mouseover", function(d, i) {

                            if (d.date1 < d.date2) {
                                d3.select(".outerwrapper .timeline .tooltip")
                                    .html("<p>" + d.dateStart + " - <br />" + d.dateEnd + "</p>");
                            } else {
                                d3.select(".outerwrapper .timeline .tooltip")
                                    .html("<p>" + d.dateStart + "</p>");
                            }

                            eventLeft = parseInt(d3.select(this).attr("x"));
                           // eventWidth = parseInt(d3.select(this).attr("width"));

                            eventTop = parseInt(d3.select(this).attr("y"));

                            tooltipHeight = parseInt($(".outerwrapper .timeline .tooltip").css("height"));

                            $(".outerwrapper .timeline .tooltip")
                                .css({
                                    "left": eventLeft + (eventWidth / 2) + "px",
                                    "top": 145 - (tooltipHeight - eventTop) + "px"
                                });

                            $(".outerwrapper .timeline .tooltip").css({
                                "opacity": 1,
                                "display": "block"
                            });

                        })
                        .on("mouseout", function() {
                            $(".outerwrapper .timeline .tooltip").css({
                                "opacity": 0,
                                "display": "none"
                            });
                        })
                        .on("click", function(d, i) {
                            counter = i;

                            showLocation();

                            $(".outerwrapper .timeline .tooltip").css({
                                "opacity": 0,
                                "display": "none"
                            });

                            d3.event.preventDefault();
                            return false;
                        })


                    /*	Function to add the info for the next selected location
                     Adds the relevent content to info-box and provides a new value for xPosition
                     to center the timeline on the selected location*/

                    /* Initial call of show position to adjust the timeline on page load */
                    showLocation();
}

function showLocation() {

    position = eventWidth * counter;

    $('.outerwrapper .info-box').animate({
        scrollLeft: position
    }, duration);

    /*	Recalculate the start and end point of the time range based upon
     the current location and the zoom level */
    timeBegin = getDate(items[counter].date1.getTime() - (timeDiff / zoom));
    timeEnd = getDate(items[counter].date1.getTime() + (timeDiff / zoom));

    /*	Replace the values used in the x domain */
    x.domain([timeBegin, timeEnd]);

    /*	Adjust the ticks for each x axis depening on the time range */
    /* ticks for than 5 years, 157,788,000,000 milliseconds */
  /*  if ((timeEnd - timeBegin) > 157788000000) {
        xMonthAxis.ticks(d3.time.years, 1).tickFormat(function(d) {
            return '';
        });
        xDayAxis.ticks(d3.time.years, 1);
    }
    /* ticks for than a year, 31,557,600,000 milliseconds */
  /*  else if ((timeEnd - timeBegin) > 31557600000) {
        xMonthAxis.ticks(d3.time.months, 3).tickFormat(d3.time.format('%d %b'));
        xDayAxis.ticks(d3.time.months, 1);
    }
    /* ticks for than six months 31,557,600,000 milliseconds divided by 2 */
  /*  else if ((timeEnd - timeBegin) > 15778800000) {
        xMonthAxis.ticks(d3.time.months, 1).tickFormat(d3.time.format('%d %b'));
        xDayAxis.ticks(d3.time.weeks, 1);
    }
    /* ticks for than two months 31,557,600,000 milliseconds divided by 6 */
  /*  else if ((timeEnd - timeBegin) > 5259600000) {
        xMonthAxis.ticks(d3.time.months, 1).tickFormat(d3.time.format('%d %b'));
        xDayAxis.ticks(d3.time.days, 1);
    }
    /* ticks for than a month 31,557,600,000 milliseconds divided by 12 */
  /*  else if ((timeEnd - timeBegin) > 2629800000) {
        xMonthAxis.ticks(d3.time.weeks, 1).tickFormat(d3.time.format('%d %b'));
        xDayAxis.ticks(d3.time.days, 1);
    }
    /* ticks for a day */
 /*   else {
        xMonthAxis.ticks(d3.time.days, 4).tickFormat(d3.time.format('%d %b'));
        xDayAxis.ticks(d3.time.days, 1);
    }

    /*	Redraw each x axis based on the new domain */
    yearAxis.transition()
        .duration(duration)
        .call(xYearAxis);

    monthAxis.transition()
        .duration(duration)
        .call(xMonthAxis);

    dayAxis.transition()
        .duration(duration)
        .call(xDayAxis)

    /*	Give the selected location the class of 'selected'
     then animate the locations to their new position based on the updated x scale */
    locations.classed("selected", false)
        .attr("class", function(d, i) {
            if (i === counter) {
                return "locations selected";
            } else {
                return "locations"+i;
            };
        })
        .transition()
        .duration(duration)
        .attr("x", function(d, i) {
            $(".outerwrapper svg.chart .locations"+i).css({
                fill: items[i].color// '#CDCECE'
            });
            return x(d.date1);
        })
        .attr("width", function(d) {
            if (d.date1 < d.date2) {
                /* 	decide the width of the rect based on the range of dates */
                return x(d.date2) - x(d.date1);
            } else {
                /* 	if no end date is specified add 86,400,000 milliseconds to the first
                 date to create a span of time for the width
                 but make sure that it is at least 4 px wide */
                var thisWidth = x(getDate(d.date1.getTime() + 86400000)) - x(d.date1);

                if (thisWidth < 4) {
                    return 4;
                } else {
                    return thisWidth;
                }
            }
        });

}

