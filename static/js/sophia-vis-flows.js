var svg;
var g;
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

var allCircles = [];

var gx = 0;
var gy = 0;
var maxCols = 0;
var completeVisualize = false;


SVGElement.prototype.hasClass = function (className) {
    return new RegExp('(\\s|^)' + className + '(\\s|$)').test(this.getAttribute('class'));
};

SVGElement.prototype.addClass = function (className) { 
    if (!this.hasClass(className)) {
        this.setAttribute('class', this.getAttribute('class') + ' ' + className);
    }
};

SVGElement.prototype.removeClass = function (className) {
    var removedClass = this.getAttribute('class').replace(new RegExp('(\\s|^)' + className + '(\\s|$)', 'g'), '$2');
    if (this.hasClass(className)) {
        this.setAttribute('class', removedClass);
    }
};


function visualize() {
    completeVisualize = false;
    allCircles = [];
    gx = 0;
    gy = 0;
	svg = $('#vis-svg');
    g = $('#g');

	var itemIndex = 0;
	var maxPaths = 8;
	var maxItems = 7;

    g.html('');

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

    svg.attr('height', (itemHeight * currentPaths.length) + 'px');
    svg.attr('width', (itemWidth * maxCols) + 'px');
    $('#vis-container').css('height', (itemHeight * maxPaths) + 'px');
    $('#vis-container').css('width', 25 + (itemWidth * maxItems) + 'px');
/*    $('#scrollVertical').removeClass('hidden');
    $('#scrollHoriz').removeClass('hidden');
*/
    (function drawLine(){
        for (i = 0; i < rowIndex; i++) {
            if (nodesToDisplay[i][itemIndex]) {
                if (itemIndex == 0) {
                    lineX = leftMargin;
                } else {
                    lineX = leftMargin + (itemWidth * itemIndex) - (itemWidth/2) + radius;
                }
                lineEnd = leftMargin + (itemWidth * itemIndex) + (itemWidth/2) - radius;
                linePos = lineX + 1;

                animateLine(lineX, lineEnd, (topMarginCircle + (itemHeight * (i))));
                setTimeout(function(row, col){
                    animateCircle(leftMargin + (itemWidth * col) + (itemWidth/2), 
                        (topMarginCircle + (itemHeight * (row))), 
                        row, nodesToDisplay[row][col]);
                }, speed * 2, i, itemIndex);
            }
        }
        itemIndex++;
        if (itemIndex <= maxCols) {
            setTimeout( drawLine, speed );
        } else {
            completeVisualize = true;
        }
    })();

    setTimeout(function() {
        clickLastStep();
    }, (maxCols + 2) * speed);

}

function animateLine(fromX, toX, y) {
    var path = document.createElementNS('http://www.w3.org/2000/svg','path');
    g.append(path);
    path.setAttribute("d","M" + fromX + " " + y + " L" + toX + " " + y + " Z"); //Set path's data
    path.setAttribute("class","path"); //Set path's data
    var length = path.getTotalLength();
    path.style.strokeDasharray = length + ' ' + length;
    path.style.strokeDashoffset = length;
    path.getBoundingClientRect();
    path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset ' + speed/100 + 's linear';
    path.style.strokeDashoffset = length/2;
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
    g.append(circle);
    $(circle).click(function(event) {
        animateDetails(event.clientX, event.clientY, node);
    });

    allCircles.push({
        circle: circle,
        node: node,
        highlighted: false
    });

    (function drawCircle(){
        if( ++currRadius <= radius ) {
            circle.setAttribute("r", currRadius); //Set path's data
            setTimeout( drawCircle, speed );
        }
    })();

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
    g.append(text);

    (function drawText(){
        if (textOpacity < 1) {
            textOpacity+=0.1;
            text.setAttribute("opacity", textOpacity); //Set path's data
            setTimeout( drawText, speed );
        }
    })();
}

function animateDetails(x, y, node) {
    showDetails(x, y, node);
    $('#flowDetailsModal').modal();
}

function showDetails(x, y, node) {
    /*
    data: Object
    caption: "<some text,,,>"
    graph_node: "79989"
    id: "219637"
    type: "UI_Change"
    */
    $('#details #nodeType').text(node.data.type);
    $('#details #nodeCaption').html(node.data.caption.replace('\n','<br/>'));
    $('#details #nodeGraphID').text('Graph node: ' + node.data.graph_node);
    $('#details #nodeDocID').text('Document ID: ' + node.data.id);

    getScreens(node.data.graph_node, function(prevTimestamp, nextTimestamp){
        if (prevTimestamp)
        {
            $('#details #nodeScreens #screenBefore').html('Before:<br/>' +
                '<a target="_blank" href="'+ screensServer+'/screens/' + prevTimestamp + '">'+
                '<img class="img-thumbnail" src="'+
                screensServer+'/screens/' + prevTimestamp + '"></img></a>');
        }
        else
            $('#details #nodeScreens #screenBefore').html('No pre-action screen');

        if (nextTimestamp)
        {
            $('#details #nodeScreens #screenAfter').html('After:<br/>'+
                '<a target="_blank" href="'+ screensServer+'/screens/' + nextTimestamp + '">'+
                '<img class="img-thumbnail" src="' +
                screensServer+'/screens/' + nextTimestamp + '"></img></a>');
        }
        else
            $('#details #nodeScreens #screenAfter').html('No post-action screen');
    });
}

function highlight(li, nodes) {
    if ($(li).hasClass('active')) {
        $(".list-group-item.clickable.active").removeClass('active');
        for (var circle in allCircles) {
            if (allCircles[circle].highlighted) {
                allCircles[circle].highlighted = false;
                highlightNode(allCircles[circle], 0, 0)
            }
        }

    } else {
        $(".list-group-item.clickable.active").removeClass('active');
        $(li).addClass('active');
        for (var circle in allCircles) {
            if (allCircles[circle].highlighted) {
                allCircles[circle].highlighted = false;
                highlightNode(allCircles[circle], 0, 0)
            }
            if ($.inArray(allCircles[circle].node.id, nodes) > -1) {
                allCircles[circle].highlighted = true;
                highlightNode(allCircles[circle], 0, 1);
            }
        }
    }
}

function highlightNode(circle, alpha, highlight) {
    if (highlight) {
        circle.circle.addClass('highlighted');
    } else {
        circle.circle.removeClass('highlighted');
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
/*    
    var max = 0;
    var containerHeight = parseInt($('#vis-container').css('height'));
    var containerWidth = parseInt($('#vis-container').css('width'));
    switch (type) {
        case "up":
            if (gy >= 0) {
                return;
            }
            gy+=itemHeight;
            break;
        case "down":
            max = (currentPaths.length * itemHeight) - containerHeight;
            if (gy <= -max || max <= containerHeight) {
                return;
            }
            gy-=itemHeight;
            break;
        case "left":
            max = maxCols * itemWidth;
            if (gx <= -max || max <= containerWidth) {
                return;
            }
            gx-=itemWidth;
            break;
        case "right":
            if (gx >= 0) {
                return;
            }
            gx+=itemWidth;
            break;
        default:
            break;
    }
    moveVis();
*/    
}

function moveVis(x, y) {
    g.attr("transform", "translate(" + gx + "," + gy + ")"); 
}

