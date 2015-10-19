var fullData;
var table;
d3.timeline = function() {
    var DISPLAY_TYPES = ["circle", "rect"];

    var hover = function () {},
        mouseover = function () {},
        mouseout = function () {},
        click = function () {},
        scroll = function () {},
        labelFunction = function(label) { return label; },
        navigateLeft = function () {},
        navigateRight = function () {},
        orient = "bottom",
        width = null,
        height = null,
        rowSeperatorsColor = null,
        backgroundColor = null,
        tickFormat = { format: d3.time.format("%I %p"),
            tickTime: d3.time.hours,
            tickInterval: 1,
            tickSize: 6 },
        colorCycle = d3.scale.category20(),
        colorPropertyName = null,
        display = "rect",
        beginning = 0,
        labelMargin = 0,
        ending = 0,
        margin = {left: 30, right:30, top: 30, bottom:30},
        stacked = false,
        rotateTicks = false,
        timeIsRelative = false,
        fullLengthBackgrounds = false,
        itemHeight = 20,
        itemMargin = 5,
        navMargin = 60,
        showTimeAxis = true,
        showAxisTop = false,
        showTodayLine = false,
        timeAxisTick = false,
        timeAxisTickFormat = {stroke: "stroke-dasharray", spacing: "4 10"},
        showTodayFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
        showBorderLine = false,
        showBorderFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
        showAxisHeaderBackground = false,
        showAxisNav = false,
        showAxisCalendarYear = false,
        axisBgColor = "white",
        chartData = {}
        ;

    var appendTimeAxis = function(g, xAxis, yPosition) {

        if(showAxisHeaderBackground){ appendAxisHeaderBackground(g, 0, 0); }

        if(showAxisNav){ appendTimeAxisNav(g) };

        var axis = g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + 0 + "," + yPosition + ")")
            .call(xAxis);
    };

    var appendTimeAxisCalendarYear = function (nav) {
        var calendarLabel = beginning.getFullYear();

        if (beginning.getFullYear() != ending.getFullYear()) {
            calendarLabel = beginning.getFullYear() + "-" + ending.getFullYear()
        }

        nav.append("text")
            .attr("transform", "translate(" + 20 + ", 0)")
            .attr("x", 0)
            .attr("y", 14)
            .attr("class", "calendarYear")
            .text(calendarLabel)
        ;
    };
    var appendTimeAxisNav = function (g) {
        var timelineBlocks = 6;
        var leftNavMargin = (margin.left - navMargin);
        var incrementValue = (width - margin.left)/timelineBlocks;
        var rightNavMargin = (width - margin.right - incrementValue + navMargin);

        var nav = g.append('g')
                .attr("class", "axis")
                .attr("transform", "translate(0, 20)")
            ;

        if(showAxisCalendarYear) { appendTimeAxisCalendarYear(nav) };

        nav.append("text")
            .attr("transform", "translate(" + leftNavMargin + ", 0)")
            .attr("x", 0)
            .attr("y", 14)
            .attr("class", "chevron")
            .text("<")
            .on("click", function () {
                return navigateLeft(beginning, chartData);
            })
        ;

        nav.append("text")
            .attr("transform", "translate(" + rightNavMargin + ", 0)")
            .attr("x", 0)
            .attr("y", 14)
            .attr("class", "chevron")
            .text(">")
            .on("click", function () {
                return navigateRight(ending, chartData);
            })
        ;
    };

    var appendAxisHeaderBackground = function (g, xAxis, yAxis) {
        g.insert("rect")
            .attr("class", "row-green-bar")
            .attr("x", xAxis)
            .attr("width", width)
            .attr("y", yAxis)
            .attr("height", itemHeight)
            .attr("fill", axisBgColor);
    };

    var appendTimeAxisTick = function(g, xAxis, maxStack) {
        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
            .attr(timeAxisTickFormat.stroke, timeAxisTickFormat.spacing)
            .call(xAxis.tickFormat("").tickSize(-(margin.top + (itemHeight + itemMargin) * (maxStack - 1) + 3), 0, 0));
    };

    var appendBackgroundBar = function (yAxisMapping, index, g, data, datum) {
        var greenbarYAxis = ((itemHeight + itemMargin) * yAxisMapping[index]) + margin.top;
        g.selectAll("svg").data(data).enter()
            .insert("rect")
            .attr("class", "row-green-bar")
            .attr("x", fullLengthBackgrounds ? 0 : margin.left)
            .attr("width", fullLengthBackgrounds ? width : (width - margin.right - margin.left))
            .attr("y", greenbarYAxis)
            .attr("height", itemHeight)
            .attr("fill", backgroundColor instanceof Function ? backgroundColor(datum, index) : backgroundColor)
        ;
    };

    var appendLabel = function (gParent, yAxisMapping, index, hasLabel, datum) {
        var fullItemHeight    = itemHeight + itemMargin;
        var rowsDown          = fullItemHeight + fullItemHeight * (yAxisMapping[index] || 1);

        gParent.append("text")
            .attr("class", "timeline-label")
            .attr("transform", "translate(" + labelMargin + "," + rowsDown + ")")
            .text(hasLabel ? labelFunction(datum.label) : datum.id)
            .on("click", function (d, i) { click(d, index, datum); });
    };

    function timeline (gParent) {
        var g = gParent.append("g");
        var gParentSize = gParent[0][0].getBoundingClientRect();

        var gParentItem = d3.select(gParent[0][0]);

        var yAxisMapping = {},
            maxStack = 1,
            minTime = 0,
            maxTime = 0;

        setWidth();

        // check if the user wants relative time
        // if so, substract the first timestamp from each subsequent timestamps
        if(timeIsRelative){
            g.each(function (d, i) {
                d.forEach(function (datum, index) {
                    datum.times.forEach(function (time, j) {
                        if(index === 0 && j === 0){
                            originTime = time.starting_time;               //Store the timestamp that will serve as origin
                            time.starting_time = 0;                        //Set the origin
                            time.ending_time = time.ending_time - originTime;     //Store the relative time (millis)
                        }else{
                            time.starting_time = time.starting_time - originTime;
                            time.ending_time = time.ending_time - originTime;
                        }
                    });
                });
            });
        }

        // check how many stacks we're gonna need
        // do this here so that we can draw the axis before the graph
        if (stacked || ending === 0 || beginning === 0) {
            g.each(function (d, i) {
                d.forEach(function (datum, index) {

                    // create y mapping for stacked graph
                    if (stacked && Object.keys(yAxisMapping).indexOf(index) == -1) {
                        yAxisMapping[index] = maxStack;
                        maxStack++;
                    }

                    // figure out beginning and ending times if they are unspecified
                    datum.times.forEach(function (time, i) {
                        if(beginning === 0)
                            if (time.starting_time < minTime || (minTime === 0 && timeIsRelative === false))
                                minTime = time.starting_time;
                        if(ending === 0)
                            if (time.ending_time > maxTime)
                                maxTime = time.ending_time;
                    });
                });
            });

            if (ending === 0) {
                ending = maxTime;
            }
            if (beginning === 0) {
                beginning = minTime;
            }
        }

        var scaleFactor = (1/(ending - beginning)) * (width - margin.left - margin.right);

        // draw the axis
        var xScale = d3.time.scale()
            .domain([beginning, ending])
            .range([margin.left, width - margin.right]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient(orient)
            .tickFormat(tickFormat.format)
            .ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval)
            .tickSize(tickFormat.tickSize);

        // draw the chart
        g.each(function(d, i) {
            chartData = d;
            d.forEach( function(datum, index){
                var data = datum.times;
                var hasLabel = (typeof(datum.label) != "undefined");

                // issue warning about using id per data set. Ids should be individual to data elements
                if (typeof(datum.id) != "undefined") {
                    console.warn("d3Timeline Warning: Ids per dataset is deprecated in favor of a 'class' key. Ids are now per data element.");
                }

                if (backgroundColor) { appendBackgroundBar(yAxisMapping, index, g, data, datum); }

                g.selectAll("svg").data(data).enter()
                    .append(function(d, i) {
                        return document.createElementNS(d3.ns.prefix.svg, "display" in d? d.display:display);
                    })
                    .attr("x", getXPos)
                    .attr("y", getStackPosition)
                    .attr("width", function (d, i) {
                        return (d.ending_time - d.starting_time) * scaleFactor;
                    })
                    .attr("cy", function(d, i) {
                        return getStackPosition(d, i) + itemHeight/2;
                    })
                    .attr("cx", getXPos)
                    .attr("r", itemHeight / 2)
                    .attr("height", itemHeight)
                    .style("fill", function(d, i){
                        var dColorPropName;
                        if (d.color) return d.color;
                        if( colorPropertyName ){
                            dColorPropName = d[colorPropertyName];
                            if ( dColorPropName ) {
                                return colorCycle( dColorPropName );
                            } else {
                                return colorCycle( datum[colorPropertyName] );
                            }
                        }
                        return colorCycle(index);
                    })
                    .on("mousemove", function (d, i) {
                        hover(d, index, datum);
                    })
                    .on("mouseover", function (d, i) {
                        mouseover(d, i, datum);
                    })
                    .on("mouseout", function (d, i) {
                        mouseout(d, i, datum);
                    })
                    .on("click", function (d, i) {
                        click(d, index, datum);
                    })
                    .attr("class", function (d, i) {
                        return datum.class ? "timelineSeries_"+datum.class : "timelineSeries_"+index;
                    })
                    .attr("id", function(d, i) {
                        // use deprecated id field
                        if (datum.id && !d.id) {
                            return 'timelineItem_'+datum.id;
                        }

                        return d.id ? d.id : "timelineItem_"+index+"_"+i;
                    })
                ;

                g.selectAll("svg").data(data).enter()
                    .append("text")
                    .attr("x", getXTextPos)
                    .attr("y", getStackTextPosition)
                    .text(function(d) {
                        return d.label;
                    })
                ;

                if (rowSeperatorsColor) {
                    var lineYAxis = ( itemHeight + itemMargin / 2 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]);
                    gParent.append("svg:line")
                        .attr("class", "row-seperator")
                        .attr("x1", 0 + margin.left)
                        .attr("x2", width - margin.right)
                        .attr("y1", lineYAxis)
                        .attr("y2", lineYAxis)
                        .attr("stroke-width", 1)
                        .attr("stroke", rowSeperatorsColor);
                }

                // add the label
                if (hasLabel) { appendLabel(gParent, yAxisMapping, index, hasLabel, datum); }

                if (typeof(datum.icon) !== "undefined") {
                    gParent.append("image")
                        .attr("class", "timeline-label")
                        .attr("transform", "translate("+ 0 +","+ (margin.top + (itemHeight + itemMargin) * yAxisMapping[index])+")")
                        .attr("xlink:href", datum.icon)
                        .attr("width", margin.left)
                        .attr("height", itemHeight);
                }

                function getStackPosition(d, i) {
                    if (stacked) {
                        return margin.top + (itemHeight + itemMargin) * yAxisMapping[index];
                    }
                    return margin.top;
                }
                function getStackTextPosition(d, i) {
                    if (stacked) {
                        return margin.top + (itemHeight + itemMargin) * yAxisMapping[index] + itemHeight * 0.75;
                    }
                    return margin.top + itemHeight * 0.75;
                }
            });
        });

        var belowLastItem = (margin.top + (itemHeight + itemMargin) * maxStack);
        var aboveFirstItem = margin.top;
        var timeAxisYPosition = showAxisTop ? aboveFirstItem : belowLastItem;
        if (showTimeAxis) { appendTimeAxis(g, xAxis, timeAxisYPosition); }
        if (timeAxisTick) { appendTimeAxisTick(g, xAxis, maxStack); }

        if (width > gParentSize.width) {
            var move = function() {
                var x = Math.min(0, Math.max(gParentSize.width - width, d3.event.translate[0]));
                zoom.translate([x, 0]);
                g.attr("transform", "translate(" + x + ",0)");
                scroll(x*scaleFactor, xScale);
            };

            var zoom = d3.behavior.zoom().x(xScale).on("zoom", move);

            gParent
                .attr("class", "scrollable")
                .call(zoom);
        }

        if (rotateTicks) {
            g.selectAll(".tick text")
                .attr("transform", function(d) {
                    return "rotate(" + rotateTicks + ")translate("
                        + (this.getBBox().width / 2 + 10) + "," // TODO: change this 10
                        + this.getBBox().height / 2 + ")";
                });
        }

        var gSize = g[0][0].getBoundingClientRect();
        setHeight();

        if (showBorderLine) {
            g.each(function (d, i) {
                d.forEach(function (datum) {
                    var times = datum.times;
                    times.forEach(function (time) {
                        appendLine(xScale(time.starting_time), showBorderFormat);
                        appendLine(xScale(time.ending_time), showBorderFormat);
                    });
                });
            });
        }

        if (showTodayLine) {
            var todayLine = xScale(new Date());
            appendLine(todayLine, showTodayFormat);
        }

        function getXPos(d, i) {
            return margin.left + (d.starting_time - beginning) * scaleFactor;
        }

        function getXTextPos(d, i) {
            return margin.left + (d.starting_time - beginning) * scaleFactor + 5;
        }

        function setHeight() {
            if (!height && !gParentItem.attr("height")) {
                if (itemHeight) {
                    // set height based off of item height
                    height = gSize.height + gSize.top - gParentSize.top;
                    // set bounding rectangle height
                    d3.select(gParent[0][0]).attr("height", height);
                } else {
                    throw "height of the timeline is not set";
                }
            } else {
                if (!height) {
                    height = gParentItem.attr("height");
                } else {
                    gParentItem.attr("height", height);
                }
            }
        }

        function setWidth() {
            if (!width && !gParentSize.width) {
                try {
                    width = gParentItem.attr("width");
                    if (!width) {
                        throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
                    }
                } catch (err) {
                    console.log( err );
                }
            } else if (!(width && gParentSize.width)) {
                try {
                    width = gParentItem.attr("width");
                } catch (err) {
                    console.log( err );
                }
            }
            // if both are set, do nothing
        }

        function appendLine(lineScale, lineFormat) {
            gParent.append("svg:line")
                .attr("x1", lineScale)
                .attr("y1", lineFormat.marginTop)
                .attr("x2", lineScale)
                .attr("y2", height - lineFormat.marginBottom)
                .style("stroke", lineFormat.color)//"rgb(6,120,155)")
                .style("stroke-width", lineFormat.width);
        }

    }

    // SETTINGS

    timeline.margin = function (p) {
        if (!arguments.length) return margin;
        margin = p;
        return timeline;
    };

    timeline.orient = function (orientation) {
        if (!arguments.length) return orient;
        orient = orientation;
        return timeline;
    };

    timeline.itemHeight = function (h) {
        if (!arguments.length) return itemHeight;
        itemHeight = h;
        return timeline;
    };

    timeline.itemMargin = function (h) {
        if (!arguments.length) return itemMargin;
        itemMargin = h;
        return timeline;
    };

    timeline.navMargin = function (h) {
        if (!arguments.length) return navMargin;
        navMargin = h;
        return timeline;
    };

    timeline.height = function (h) {
        if (!arguments.length) return height;
        height = h;
        return timeline;
    };

    timeline.width = function (w) {
        if (!arguments.length) return width;
        width = w;
        return timeline;
    };

    timeline.display = function (displayType) {
        if (!arguments.length || (DISPLAY_TYPES.indexOf(displayType) == -1)) return display;
        display = displayType;
        return timeline;
    };

    timeline.labelFormat = function(f) {
        if (!arguments.length) return null;
        labelFunction = f;
        return timeline;
    };

    timeline.tickFormat = function (format) {
        if (!arguments.length) return tickFormat;
        tickFormat = format;
        return timeline;
    };

    timeline.hover = function (hoverFunc) {
        if (!arguments.length) return hover;
        hover = hoverFunc;
        return timeline;
    };

    timeline.mouseover = function (mouseoverFunc) {
        if (!arguments.length) return mouseoverFunc;
        mouseover = mouseoverFunc;
        return timeline;
    };

    timeline.mouseout = function (mouseoverFunc) {
        if (!arguments.length) return mouseoverFunc;
        mouseout = mouseoverFunc;
        return timeline;
    };

    timeline.click = function (clickFunc) {
        if (!arguments.length) return click;
        click = clickFunc;
        return timeline;
    };

    timeline.scroll = function (scrollFunc) {
        if (!arguments.length) return scroll;
        scroll = scrollFunc;
        return timeline;
    };

    timeline.colors = function (colorFormat) {
        if (!arguments.length) return colorCycle;
        colorCycle = colorFormat;
        return timeline;
    };

    timeline.beginning = function (b) {
        if (!arguments.length) return beginning;
        beginning = b;
        return timeline;
    };

    timeline.ending = function (e) {
        if (!arguments.length) return ending;
        ending = e;
        return timeline;
    };

    timeline.labelMargin = function (m) {
        if (!arguments.length) return ending;
        labelMargin = m;
        return timeline;
    };

    timeline.rotateTicks = function (degrees) {
        rotateTicks = degrees;
        return timeline;
    };

    timeline.stack = function () {
        stacked = !stacked;
        return timeline;
    };

    timeline.relativeTime = function() {
        timeIsRelative = !timeIsRelative;
        return timeline;
    };

    timeline.showBorderLine = function () {
        showBorderLine = !showBorderLine;
        return timeline;
    };

    timeline.showBorderFormat = function(borderFormat) {
        if (!arguments.length) return showBorderFormat;
        showBorderFormat = borderFormat;
        return timeline;
    };

    timeline.showToday = function () {
        showTodayLine = !showTodayLine;
        return timeline;
    };

    timeline.showTodayFormat = function(todayFormat) {
        if (!arguments.length) return showTodayFormat;
        showTodayFormat = todayFormat;
        return timeline;
    };

    timeline.colorProperty = function(colorProp) {
        if (!arguments.length) return colorPropertyName;
        colorPropertyName = colorProp;
        return timeline;
    };

    timeline.rowSeperators = function (color) {
        if (!arguments.length) return rowSeperatorsColor;
        rowSeperatorsColor = color;
        return timeline;

    };

    timeline.background = function (color) {
        if (!arguments.length) return backgroundColor;
        backgroundColor = color;
        return timeline;
    };

    timeline.showTimeAxis = function () {
        showTimeAxis = !showTimeAxis;
        return timeline;
    };

    timeline.showAxisTop = function () {
        showAxisTop = !showAxisTop;
        return timeline;
    };

    timeline.showAxisCalendarYear = function () {
        showAxisCalendarYear = !showAxisCalendarYear;
        return timeline;
    };

    timeline.showTimeAxisTick = function () {
        timeAxisTick = !timeAxisTick;
        return timeline;
    };

    timeline.fullLengthBackgrounds = function () {
        fullLengthBackgrounds = !fullLengthBackgrounds;
        return timeline;
    };

    timeline.showTimeAxisTickFormat = function(format) {
        if (!arguments.length) return timeAxisTickFormat;
        timeAxisTickFormat = format;
        return timeline;
    };

    timeline.showAxisHeaderBackground = function(bgColor) {
        showAxisHeaderBackground = !showAxisHeaderBackground;
        if(bgColor) { (axisBgColor = bgColor) };
        return timeline;
    };

    timeline.navigate = function (navigateBackwards, navigateForwards) {
        navigateLeft = navigateBackwards;
        navigateRight = navigateForwards;
        showAxisNav = !showAxisNav;
        return timeline;
    };

    return timeline;
};
function showIssues(data) {
    $( "#all_results" ).load( "html/issues.html", function(){
        /*	An array to store all the data */
        var testData = [
            {times: [{"starting_time": 1355752800000, "ending_time": 1355759900000}, {"starting_time": 1355767900000, "ending_time": 1355774400000}]},
            {times: [{"starting_time": 1355759910000, "ending_time": 1355761900000}, ]},
            {times: [{"starting_time": 1355761910000, "ending_time": 1355763910000}]},
        ];
        var width = 500;
        var chart = d3.timeline();
        var svg = d3.select("#timeline1").append("svg").attr("width", width)
                .datum(testData).call(chart);

        var items = [];
        var dataObj = JSON.parse(data);
        var table = $("#tableNodes");
        var obj =  dataObj.dataNodes;
        for(var key in obj)
        {
            var type = obj[key].type;
            var timestamp = new Date(obj[key].timestamp*1000);
            var date =  obj[key].date;
            var caption = obj[key].caption;
            var  tr =  '<tr>';
            tr+='<td>' +timestamp + '</td>';
            tr+='<td>' +timestamp+ '</td>';
            tr+='<td>' +type + '</td>';
            tr += '<td>'+ caption +'</td>';
            //tr+='<td>' +date + '</td>';
            tr += '</tr>';
            table.append(tr);
            table.hide();
        }

         fullData = table;
         table = $("#tableNodes").children();

        $.ajax({
           url: "http://codepen.io/chris-creditdesign/pen/87c2848937b6962f4efd2a67e5ea2031.html",
            // url: "table-nih.html",
            dataType: 'text',
           success: function(data) {

                /* Helper function to format and parse date from data */
                function getDate(d) {
                    /*	If d is a number or a string in the format Day Month Year
                     process it as normal. Other wise presume that it may be a string
                     in the format Month Year and add 1 to the start so that Firefox
                     and safari can parse the date */
                    if (typeof d === "number") {
                        return new Date(d);
                    } else if (Date.parse(d)) {
                        return new Date(d);
                    } else {
                        return new Date("1 " + d);
                    }
                }

        //        var fullData = $(data);
        //        var table = $(data).find("table tbody tr");

                /* Grab the tables headline and caption so that we can reproduce them in the widget */
                var headline = $(fullData).find("h2.table-heading").text();

       //         var standfirst = $(data).find("table caption p").text();

                /* Hides the table and shows the SVG if javascript is enabled */
                // $("h2:contains('Dogs at work')").parent("section").parent("div").css({"display":"none"});
                // $("h2:contains('Dogs at work') + table").css({"width":"630px"});
             //   $(".outerwrapper span.timeline-heading").text(headline);
             //   $(".outerwrapper p.timeline-standfirst").text(standfirst);
                // $(".outerwrapper").css({"display":"block"});

                /*	Push an object into the items array for each table row/point on the timeline */
                for (var i = 0; i < $(table).length; i++) {
                    var newObject = {};
                    items.push(newObject);
                };

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
                        items[i].link = $(table).eq(i).children('td').eq(4).html();
                    }

                    if ($(table).eq(i).children('td').eq(5).html() !== " ") {
                        items[i].img = $(table).eq(i).children('td').eq(5).html();
                        items[i].credit = $(table).eq(i).children('td').eq(6).html();
                    }
                };
                console.log(items);
                /*	Insert an .event div for each event */
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

                var eventWidth = $('.outerwrapper .info-box').width();

                var position = 0;

                var panelWidth = eventWidth * items.length;

                $(".outerwrapper .info-box .panel").css({
                    "width": panelWidth + "px"
                });

                /* Load D3 */
                /* All of the D3/svg code is contained within the callback function */
                /* Loading D3 via a html script tag into ie6-8 will to cause a runtime error */
                $.getScript("http://d3js.org/d3.v3.min.js", function() {
                    // $.getScript("http://d3js.org/d3.v3.min.js", function() {
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

                    /*	Find the earliest and latest time in the range */
                    var timeFirst = d3.min(items, function(d) {
                        return d.date1;
                    });
                    var timeLast = d3.max(items, function(d) {
                        return d.date2;
                    });

                    /*	Work out the time span of the whole timeline in miliseconds plus one tenth of this value */
                    var timeDiff = timeLast - timeFirst;
                    timeDiff = timeDiff + (timeDiff * 0.1);

                    /*	Extend the time range before the first date and after the last date
                     to make for a more attractive timeline */
                    var timeBegin = getDate(items[counter].date1.getTime() - timeDiff);
                    var timeEnd = getDate(items[counter].date1.getTime() + timeDiff);

                    /* Scales */
                    var x = d3.time.scale()
                        .domain([timeBegin, timeEnd])
                        .range([0, width]);

                    /*	Create the SVG and its elements */
                    var chart = d3.select(".timeline")
                        .append("svg")
                        .attr("width", width + marginRight + marginLeft)
                        .attr("height", height + marginTop + marginBottom)
                        .attr("class", "chart");

                    /*	Draw the four icons for zooming and moving through the time line as well as their enclosing
                     rects. Add functionality for hover and click. */
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
                        .attr("fill", "#D3D3D3")
                        .style("opacity", 0.5);

                    var miniHolder = chart.append("g")
                        .attr("clip-path", "url(#clip)");

                    var mini = miniHolder.append("g")
                        .attr("width", width)
                        .attr("height", miniHeight)
                        .attr("class", "mini")
                        .attr("transform", "translate(0," + (height - miniHeight) + ")")

                    /* create three seperate x axis for Year, Month and Day based on the same x scale */
                    var xYearAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(15, 0)
                        .ticks(d3.time.years, 1)
                        .tickFormat(d3.time.format('%Y'))
                        .orient('top');

                    var yearAxis = mini.append('g')
                        .attr('class', 'year-axis')
                        .call(xYearAxis);

                    var xMonthAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(-miniHeight, 0)
                        .orient('top');

                    var monthAxis = mini.append('g')
                        .attr('class', 'axis')
                        .call(xMonthAxis);

                    var xDayAxis = d3.svg.axis()
                        .scale(x)
                        .tickSize(10, 0)
                        .tickFormat(function(d) {
                            return '';
                        })
                        .orient('bottom');

                    var dayAxis = mini.append('g')
                        .attr('class', 'axis')
                        .attr("transform", "translate(0," + (miniHeight - 10) + ")")
                        .call(xDayAxis);

                    /* draw the static triangle to act as a pointer */
                    chart.append("path")
                        .attr("d", "M10,0 L20,20 L0,20z")
                        .style("fill","red")
                        .style("pointer-events", "none")
                        .attr("transform", "translate(" + ((width / 2) - 10) + "," + height + ")");

                    /* 	Add rect for each point on the timeline */
                    var locations = mini.append("g").selectAll("rect")
                        .data(items)
                        .enter()
                        .append("rect")
                        .attr("class", function(d, i) {
                            if (i === counter) {
                                return "locations selected";
                            } else {
                                return "locations";
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

                            var eventLeft = parseInt(d3.select(this).attr("x"));
                            var eventWidth = parseInt(d3.select(this).attr("width"));

                            var eventTop = parseInt(d3.select(this).attr("y"));

                            var tooltipHeight = parseInt($(".outerwrapper .timeline .tooltip").css("height"));

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
                        if ((timeEnd - timeBegin) > 157788000000) {
                            xMonthAxis.ticks(d3.time.years, 1).tickFormat(function(d) {
                                return '';
                            });
                            xDayAxis.ticks(d3.time.years, 1);
                        }
                        /* ticks for than a year, 31,557,600,000 milliseconds */
                        else if ((timeEnd - timeBegin) > 31557600000) {
                            xMonthAxis.ticks(d3.time.months, 3).tickFormat(d3.time.format('%d %b'));
                            xDayAxis.ticks(d3.time.months, 1);
                        }
                        /* ticks for than six months 31,557,600,000 milliseconds divided by 2 */
                        else if ((timeEnd - timeBegin) > 15778800000) {
                            xMonthAxis.ticks(d3.time.months, 1).tickFormat(d3.time.format('%d %b'));
                            xDayAxis.ticks(d3.time.weeks, 1);
                        }
                        /* ticks for than two months 31,557,600,000 milliseconds divided by 6 */
                        else if ((timeEnd - timeBegin) > 5259600000) {
                            xMonthAxis.ticks(d3.time.months, 1).tickFormat(d3.time.format('%d %b'));
                            xDayAxis.ticks(d3.time.days, 1);
                        }
                        /* ticks for than a month 31,557,600,000 milliseconds divided by 12 */
                        else if ((timeEnd - timeBegin) > 2629800000) {
                            xMonthAxis.ticks(d3.time.weeks, 1).tickFormat(d3.time.format('%d %b'));
                            xDayAxis.ticks(d3.time.days, 1);
                        }
                        /* ticks for a day */
                        else {
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
                                    return "locations";
                                };
                            })
                            .transition()
                            .duration(duration)
                            .attr("x", function(d, i) {
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

                    /* Initial call of show position to adjust the timeline on page load */
                    showLocation();

                }); /* End of getScript callback function */
           }
        }); /* End of Ajax success function */
    });
}