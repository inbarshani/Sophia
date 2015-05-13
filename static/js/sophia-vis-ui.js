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

function highlight(nodes)
{
	// TODO
}