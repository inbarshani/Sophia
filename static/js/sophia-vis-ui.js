var ctx;
var lineX, lineY, lineEnd, linePos;
var leftMargin = 10;
var topMarginCircle = 40;
var textFromCircle = 20;
var itemWidth = 100;
var itemHeight = 50;
var radius = 10;
var speed = 50;

function visualize() {
	var canvas = document.getElementById('vis-canvas');
	var itemIndex = 0;
	var maxPaths = 5;
	var maxItems = 7;
	var timer;
	canvas.height = itemHeight * maxPaths;
	canvas.width = itemWidth * maxItems;
	ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $('#vis-title').removeClass('hidden').addClass('visible');
    $('#vis-container').removeClass('hidden').addClass('visible');

    timer = setInterval(function(){
    	for (var pathIndex = 0; (pathIndex < maxPaths) && (pathIndex < currentPaths.length); pathIndex++) {
    		// check if we have a next node on this path to animate, and if we have - animate it
    		// itemIndex is zero based, so increase by one
    		var pathItemIndex = itemIndex + 1, nodeIndex = -1; // nodeIndex starts with inc
    		var nodes = currentPaths[pathIndex].nodes;
    		while (pathItemIndex > 0 && nodeIndex < (nodes.length -1))
    		{
    			nodeIndex++;
    			if (nodes[nodeIndex].data && nodes[nodeIndex].data.caption)
    				pathItemIndex--;
    		}
    		if (nodeIndex < (nodes.length-1))
	    		animatePath(itemIndex, pathIndex, nodeIndex);
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

function animateCircle(left, top, pathIndex, nodeInPathIndex) {
	ctx.beginPath();
	ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
	ctx.fillStyle = '#5bc0de';
	ctx.fill();
  	ctx.closePath();
	ctx.font = '12px "Helvetica Neue", Helvetica, Arial, sans-serif';
	ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    var text = currentPaths[pathIndex].nodes[nodeInPathIndex].data.caption;
	ctx.fillText(text.substring(0, 12), left , top - textFromCircle);
}

function animatePath(itemIndex, pathIndex, nodeInPathIndex) {
    if (itemIndex == 0) {
		lineX = leftMargin;
    } else {
		lineX = leftMargin + (itemWidth * itemIndex) - (itemWidth/2) + radius;
	}
	lineEnd = leftMargin + (itemWidth * itemIndex) + (itemWidth/2) - radius;
	linePos = lineX + 1;
    ctx.fillStyle = '#000';

    animateLine(lineX, lineX + 1, 
    	(topMarginCircle + (itemHeight * (pathIndex))), lineEnd, 
    	function(left, top) {
    		animateCircle(leftMargin + (itemWidth * itemIndex) + (itemWidth/2), 
    			(topMarginCircle + (itemHeight * (pathIndex))), 
    			pathIndex, nodeInPathIndex);
    	}
    );
}

function highlight(nodes)
{
	// TODO
}