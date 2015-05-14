var ctx;
var lineX, lineY, lineEnd, linePos;
var leftMargin = 10;
var topMarginCircle = 40;
var textFromCircle = 20;
var itemWidth = 100;
var itemHeight = 50;
var radius = 10;
var speed = 50;

var detailsWidth = '300px';
var detailsHeight = '300px';

var clickableAreas = [];

var highlightStyle = ['#5bc0de', '#00ff00']

function visualize() {
    clickableAreas = [];
	var canvas = document.getElementById('vis-canvas');
	var itemIndex = 0;
	var maxPaths = 5;
	var maxItems = 7;
	var timer;
	canvas.height = itemHeight * maxPaths;
	canvas.width = itemWidth * maxItems;
	ctx = canvas.getContext('2d');
    canvas.addEventListener('mouseup', onCanvasClick, false);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $('#vis-title').removeClass('hidden').addClass('visible');
    $('#vis-container').removeClass('hidden').addClass('visible');

    var nodesToDisplay = new Array();
    var rowIndex = 0;
    var colIndex = 0;
    for (var i = 0; i < currentPaths.length && i < maxPaths; i++) {
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
    }


    timer = setInterval(function(){
        for (i = 0; i < rowIndex; i++) {
            if (nodesToDisplay[i][itemIndex]) {
                animatePath(i, itemIndex, nodesToDisplay[i][itemIndex]);
            }
        }
        itemIndex++;
        if (itemIndex >= maxItems) {
            clearInterval(timer);
                return;
        }
    }, speed);
 }

function animateLine(fromX, toX, y, end, callback) {
	ctx.beginPath();
  	ctx.moveTo(fromX, y);
  	ctx.lineTo(toX, y);
  	ctx.stroke();
  	ctx.closePath();

  	if (toX < end) {
	    requestAnimationFrame(function () {
    		animateLine(toX, toX + 10, y, end, callback);
		});
	} else {
		callback();
	}
}

function animateCircle(left, top, row, node) {
	ctx.beginPath();
	ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
	ctx.fillStyle = '#5bc0de';
	ctx.fill();
  	ctx.closePath();
	ctx.font = '12px "Helvetica Neue", Helvetica, Arial, sans-serif';
	ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    var text = node.data.caption;
	ctx.fillText(text.substring(0, 12), left , top - textFromCircle);
    clickableAreas.push({
        x: left - radius,
        y: top - radius,
        width: radius * 2,
        height: radius * 2,
        node: node
    });
}

function animatePath(row, col, node) {
    if (col == 0) {
		lineX = leftMargin;
    } else {
		lineX = leftMargin + (itemWidth * col) - (itemWidth/2) + radius;
	}
	lineEnd = leftMargin + (itemWidth * col) + (itemWidth/2) - radius;
	linePos = lineX + 1;
    ctx.fillStyle = '#000';

    animateLine(lineX, lineX + 1, 
    	(topMarginCircle + (itemHeight * (row))), lineEnd, 
    	function() {
    		animateCircle(leftMargin + (itemWidth * col) + (itemWidth/2), 
    			(topMarginCircle + (itemHeight * (row))), 
    			row, node);
    	}
    );
}

function onCanvasClick(event) {
    var mouseX = event.offsetX;
    var mouseY = event.offsetY;

    for (var circle in clickableAreas) {
        if (isClickInside(clickableAreas[circle], mouseX, mouseY)) {
            animateDetails(event.clientX, event.clientY, clickableAreas[circle].node);
            return;
        }
    }
    hideDetails();
}

function isClickInside(shape, clickX, clickY) {
    return (clickX >= shape.x) && (clickY >= shape.y) && (clickX <= (shape.x + shape.width)) && (clickY <= (shape.y + shape.height));
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

function highlight(li, nodes)
{
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