var ctx;
var lineX, lineY, lineEnd, linePos;
var leftMargin = 10;
var topMarginCircle = 40;
var textFromCircle = 20;
var itemWidth = 100;
var itemHeight = 50;
var radius = 10;
var speed = 50;

function visualize(data) {
	var canvas = document.getElementById('vis-canvas');
	var itemIndex = 0;
	var maxSteps = 5;
	var maxItems = 7;
	var timer;
	canvas.height = itemHeight * maxSteps;
	canvas.width = itemWidth * maxItems;
	ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $('#vis-title').removeClass('hidden').addClass('visible');
    $('#vis-container').removeClass('hidden').addClass('visible');

    timer = setInterval(function(){
    	for (var stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
	    	animateAll(itemIndex, stepIndex);
		}
    	itemIndex++;
		if (itemIndex >= maxItems) {
			clearInterval(timer);
				return;
		}
	}, speed);
 }

function AnimateLine(fromX, toX, y, end, callback) {
	ctx.beginPath();
  	ctx.moveTo(fromX, y);
  	ctx.lineTo(toX, y);
  	ctx.stroke();
  	ctx.closePath();

  	if (toX < end) {
	    requestAnimationFrame(function () {
    		AnimateLine(toX, toX + 10, y, end, callback);
		});
	} else {
		callback();
	}
}

function animateCircle(left, top) {
	ctx.beginPath();
	ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
	ctx.fillStyle = '#5bc0de';
	ctx.fill();
  	ctx.closePath();
	ctx.font = '12px "Helvetica Neue", Helvetica, Arial, sans-serif';
	ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
	ctx.fillText("Hello World!", left , top - textFromCircle);
}

function animateAll(itemIndex, stepIndex) {
    if (itemIndex == 0) {
		lineX = leftMargin;
    } else {
		lineX = leftMargin + (itemWidth * itemIndex) - (itemWidth/2) + radius;
	}
	lineEnd = leftMargin + (itemWidth * itemIndex) + (itemWidth/2) - radius;
	linePos = lineX + 1;
    ctx.fillStyle = '#000';

    AnimateLine(lineX, lineX + 1, (topMarginCircle + (itemHeight * (stepIndex))), lineEnd, function(left, top) {
    	animateCircle(leftMargin + (itemWidth * itemIndex) + (itemWidth/2), (topMarginCircle + (itemHeight * (stepIndex))));
    });
}