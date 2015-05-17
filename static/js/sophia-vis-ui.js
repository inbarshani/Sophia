var svg;
var lineX, lineY, lineEnd, linePos;
var leftMargin = 10;
var topMarginCircle = 40;
var textFromCircle = 20;
var itemWidth = 100;
var itemHeight = 50;
var radius = 10;
var speed = 50;

var detailsWidth = '300px';
var detailsHeight = '350px';

var clickableAreas = [];

var highlightStyle = ['#5bc0de', '#00ff00']

var timerGlobal;
var timerCircles = [];
var timerText;

function visualize() {

    clickableAreas = [];
	svg = $('#vis-svg');

	var itemIndex = 0;
	var maxPaths = 5;
	var maxItems = 7;
    var maxCols = 0;
	svg.attr('height', (itemHeight * maxPaths) + 'px');
	svg.attr('width', (itemWidth * maxItems) + 'px');

    svg.html('');

    $('#vis-title').removeClass('hidden').addClass('visible');
    $('#vis-container').removeClass('hidden').addClass('visible');

    var nodesToDisplay = new Array();
    var rowIndex = 0;
    var colIndex = 0;
    for (var i = 0; i < currentPaths.length; i++) {
        colIndex = 0;
        for (var j = 0; j < currentPaths[i].nodes.length; j++) {
            if (currentPaths[i].nodes[j].data && currentPaths[i].nodes[j].data.caption) {
                if (colIndex == 0) {
                    nodesToDisplay[rowIndex] = new Array();    
                }
                nodesToDisplay[rowIndex][colIndex] = currentPaths[i].nodes[j];
                colIndex++;
            }
        }
        if (colIndex > 0) {
            rowIndex++;
        }
        if (colIndex > maxCols) {
            maxCols = colIndex;
        }
    }

    timerGlobal = setInterval(function(){
        for (i = 0; i < rowIndex; i++) {
            if (nodesToDisplay[i][itemIndex]) {
                animatePath(i, itemIndex, nodesToDisplay[i][itemIndex]);
            }
        }
        itemIndex++;
        if (itemIndex > maxCols) {
            clearInterval(timerGlobal);
            clickLastStep();
            return;
        }
    }, speed);
 }

function animateLine(fromX, toX, y, callback) {
    var path = document.createElementNS('http://www.w3.org/2000/svg','path');
    svg.append(path);
    path.setAttribute("d","M" + fromX + " " + y + " L" + toX + " " + y + " Z"); //Set path's data
    path.setAttribute("class","path"); //Set path's data
    var length = path.getTotalLength();
    path.style.strokeDasharray = length + ' ' + length;
    path.style.strokeDashoffset = length;
    path.getBoundingClientRect();
    path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset ' + speed/100 + 's linear';
    path.style.strokeDashoffset = length/2;
    setTimeout(function() {
        callback();
    }, speed * 10);
}

function animateCircle(left, top, row, node) {
    var textToDisplay = '';
    var currRadius = 0;
    var textOpacity = 0;
    var iterations = 0;
    var circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute("class", "circle"); //Set path's data
    circle.setAttribute("r", 0); //Set path's data
    circle.setAttribute("cx", left); //Set path's data
    circle.setAttribute("cy", top); //Set path's data
    svg.append(circle);
    $(circle).click(function(event) {
        animateDetails(event.clientX, event.clientY, node);
    });
    timerCircles[node.id] = setInterval(function(){
        if (currRadius >= radius) {
            clearInterval(timerCircles[node.id]);
            return;
        }
        circle.setAttribute("r", ++currRadius); //Set path's data
    }, speed);

    var text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('class', 'text');
    text.setAttribute('x', left);
    text.setAttribute('y', top - textFromCircle);
    text.setAttribute('opacity', '0');
    if (node.data.caption.length > 12) {
        textToDisplay = node.data.caption.substring(0, 12);
    } else {
        textToDisplay = node.data.caption;
    }
    text.textContent = textToDisplay;
    svg.append(text);
    timerText = setInterval(function(){
        if (textOpacity >= 1) {
            clearInterval(timerCircles);
            return;
        }
        textOpacity+=0.1;
        text.setAttribute("opacity", textOpacity); //Set path's data
    }, speed);
}

function animatePath(row, col, node) {
    if (col == 0) {
		lineX = leftMargin;
    } else {
		lineX = leftMargin + (itemWidth * col) - (itemWidth/2) + radius;
	}
	lineEnd = leftMargin + (itemWidth * col) + (itemWidth/2) - radius;
	linePos = lineX + 1;
//    ctx.fillStyle = '#000';

    animateLine(lineX, lineEnd, 
    	(topMarginCircle + (itemHeight * (row))), 
    	function() {
    		animateCircle(leftMargin + (itemWidth * col) + (itemWidth/2), 
    			(topMarginCircle + (itemHeight * (row))), 
    			row, node);
    	}
    );
}

function onDocumentClick(event) {
    if (event.target.tagName.toLowerCase() != 'circle') {
        hideDetails();
    }
}

function animateDetails(x, y, node) {
    if (!$('#details').hasClass('hidden')) {
        hideDetails(function() {
            showDetails(x, y, node);
        });
    } else {
        showDetails(x, y, node);
    }
}

function showDetails(x, y, node) {
    $('#details').css('left', x);
    $('#details').css('top', y);
    $('#details').removeClass('hidden');
    $("#details").animate({
        height: detailsHeight,
        width: detailsWidth
    });
    /*
    data: Object
    caption: "<some text,,,>"
    graph_node: "79989"
    id: "219637"
    type: "UI_Change"
    */
    $('#detailsText').html('');
    var li = $('<li>');
    li.addClass('list-group-item');
    li.text(node.data.type);
    $('#detailsText').append(li);
    li = $('<li>');
    li.addClass('list-group-item');
    li.text(node.data.caption);
    $('#detailsText').append(li);
    li = $('<li>');
    li.addClass('list-group-item');
    li.text('Graph node: ' + node.data.graph_node);
    $('#detailsText').append(li);
    li = $('<li>');
    li.addClass('list-group-item');
    li.text('ID: ' + node.data.id);
    $('#detailsText').append(li);

    getScreens(node.data.graph_node, function(prevTimestamp, nextTimestamp){
        var li = $('<li>');
        li.addClass('list-group-item');
        if (prevTimestamp && nextTimestamp)
        {
            li.html('Screens: <a href="/screen/' + prevTimestamp + '">Before</a>, '+
                '<a href="/screen/' + nextTimestamp + '">After</a>');
        }
        else if (prevTimestamp)
        {
            li.html('Previous screen: <a href="/screen/' + prevTimestamp + '">Before</a>');
        }
        else if (nextTimestamp)
        {
            li.html('Next screen: <a href="/screen/' + nextTimestamp + '">After</a>');
        }
        else
            li.text('No screens.');
        $('#detailsText').append(li);
    });
}

function hideDetails(callback) {
    $("#details").animate({
        height: '0px',
        width: '0px'
    }, function() {
            $('#details').addClass('hidden');
            if (callback) {
                callback();
            }
        }
    );
}

function highlight(li, nodes) {
    if ($(li).hasClass('active')) {
        $(".list-group-item.clickable.active").removeClass('active');
        for (var circle in clickableAreas) {
            if (clickableAreas[circle].highlighted) {
                clickableAreas[circle].highlighted = false;
                highlightNode(clickableAreas[circle].x, clickableAreas[circle].y, 0, 0)
            }
        }

    } else {
        $(".list-group-item.clickable.active").removeClass('active');
        $(li).addClass('active');
        for (var circle in clickableAreas) {
            if (clickableAreas[circle].highlighted) {
                clickableAreas[circle].highlighted = false;
                highlightNode(clickableAreas[circle].x, clickableAreas[circle].y, 0, 0)
            }
            if ($.inArray(clickableAreas[circle].node.id, nodes) > -1) {
                clickableAreas[circle].highlighted = true;
                highlightNode(clickableAreas[circle].x, clickableAreas[circle].y, 0, 1);
            }
        }
    }
}

function highlightNode(x, y, alpha, dir) {
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI, false);

    ctx.fillStyle = highlightStyle[dir];;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.closePath();
    if (alpha < 1) {
        requestAnimationFrame(function () {
            highlightNode(x, y, alpha + 0.05, dir);
        });
    }
}

function clickLastStep() {
    $('#flow-list li').last().click();
}

function showVisScroll() {
    $('#scrollVertical').removeClass('hidden');
    $('#scrollHoriz').removeClass('hidden');
}

function hideVisScroll() {
    $('#scrollVertical').addClass('hidden');
    $('#scrollHoriz').addClass('hidden');
}

function scrollVis(type) {
    var x=0;
    var y = 0;
    switch (type) {
        case "up":
            y-=1;
            break;
        case "down":
            y+=1;
            break;
        case "left":
            x-=1;
            break;
        case "right":
            x+=1;
            break;
        default:
            break;
    }
    moveVis(x,y);
}

function moveVis(x, y) {
    
}