function showTests(data) {
	$( "#all_results" ).load( "html/review.html", function(){
		var allTests = JSON.parse(data);
		var testsList = $('#review_tests_list');
		$('#review_results').removeClass('hidden');
		var li, label, div, h5, span;
		testsList.empty();
		allTests.forEach(function (test) {
		    li = $('<li>');
		    li.on('click', function(item, t){
		        return function() {
		            testOnClick(item, t);
		        }
		    }(li, test));
		    li.attr('data-test-id', test.test.id);
		    li.attr('data-toggle', 'buttons');
            label = $('<label>');
            div = $('<div>');
            h5 = $('<h5>');
            h5.text('Test: ' + test.test.id);
            span = $('<span>');
            span.addClass('badge');
            span.text(test.bbNodes.length);
            div.append(h5);
            div.append(span);
            label.append(div);
            li.append(label);
		    testsList.append(li);
		});

		var frame = $('#review_tests_sly');
		var container = $('#review_tests_container');
		var sly = new Sly(frame, {
			horizontal: 1,
			itemNav: 'basic',
			activateMiddle: true,
			smart: true,
			activateOn: 'click',
			mouseDragging: true,
			touchDragging: 1,
			releaseSwing: 1,
			startAt: 0,
			scrollBar: container.find('.scrollbar'),
			scrollBy: 1,
			pagesBar: container.find('.pages'),
			activatePageOn: 'click',
			speed: 200,
			moveBy: 600,
			elasticBounds: 1,
			dragHandle: 1,
			dynamicHandle: 1,
			clickBar: 1,

			// Buttons
			forward: container.find('.forward'),
			backward: container.find('.backward'),
			prevPage: container.find('.prevPage'),
			nextPage: container.find('.nextPage')
		}).init();
		$('li').removeClass('active');
	});
}

function visualizeReviewTest() {
	var panel, panelHeader, panelBody, container, frame, ul;
	var slyControlsHtml = '<div class="scrollbar"><div class="handle"><div class="mousearea"></div></div></div>\
	<button class="backward"><i class="glyphicon glyphicon-chevron-left small-40"></i></button><button class="forward"><i class="glyphicon glyphicon-chevron-right small-40"></i></button>\
	<div class="frame small"><ul class="slidee"></ul></div>\
	<div class="controls">\
	<button class="prevPage"><i class="glyphicon glyphicon-fast-backward small-22"></i> Prev Page</button>\
	<span class="divider"></span>\
	<button class="nextPage">Next Page <i class="glyphicon glyphicon-fast-forward small-22"></i></button></div>';

	var options = {
	    horizontal: 1,
	    itemNav: 'basic',
	    speed: 300,
	    mouseDragging: 1,
	    touchDragging: 1
	};

	$('#review_vis_container').html('');
	for (var i = 0; i < selectedTests.length; i++) {
		panel = $('<div>');
		panel.addClass('panel panel-default');
		panelHeader=$('<div>');
		panelHeader.addClass('panel-heading');
		panelBody=$('<div>');
		panelBody.addClass('panel-body');

		container = $('<div>');
		container.addClass('sly');
		container.html(slyControlsHtml);
		ul = $(container.find('ul'));
		createBBListForTest(selectedTests[i], ul);
		frame = container.find('.frame');
		panelHeader.text('Test ' + selectedTests[i].test.id);
		panel.append(panelHeader);
		panelBody.append(container);
		panel.append(panelBody);
		$('#review_vis_container').append(panel);

		var sly = new Sly(frame, {
			horizontal: 1,
			itemNav: 'basic',
			activateMiddle: false,
			smart: 1,
			activateOn: 'click',
			mouseDragging: 1,
			touchDragging: 1,
			releaseSwing: 1,
			startAt: 0,
			scrollBar: container.find('.scrollbar'),
			scrollBy: 1,
			pagesBar: container.find('.pages'),
			activatePageOn: 'click',
			speed: 200,
			moveBy: 600,
			elasticBounds: 1,
			dragHandle: 1,
			dynamicHandle: 1,
			clickBar: 1,

			// Buttons
			forward: container.find('.forward'),
			backward: container.find('.backward'),
			prevPage: container.find('.prevPage'),
			nextPage: container.find('.nextPage')
		}).init();
	}
}	

function createBBListForTest(test, ul) {
	var li, div, ddUl, ddLi;
	test.bbNodes.forEach(function (node) {
	    li = $('<li class="dropdown small">');
	    div = $('<div data-toggle="dropdown">');
	    div.css('height', '100%');
	    ddUl = $('<ul class="dropdown-menu dd">');
	    ddLi = $('<li class="dd">');
	    ddLi.text('Set as start');
	    ddLi.on('click', function(item, n, id){
	    	return function() {
	    		bbNodeSelect(item, n, id, 'start');
	    	};
	    }(li, node, test.test.id));
	    ddUl.append(ddLi);
	    ddLi = $('<li class="dd">');
	    ddLi.text('Set as end');
	    ddLi.on('click', function(item, n, id){
	    	return function() {
	    		bbNodeSelect(item, n, id, 'end');
	    	};
	    }(li, node, test.test.id));
	    ddUl.append(ddLi);
	    li.attr('data-bb-id', node.id);
	    div.text(node.type);
	    li.append(div);
	    li.append(ddUl);
	    ul.append(li);
	});
}

function testOnClick(li, test) {
    // toggle test selection
    var testIndex = selectedTests.indexOf(test);
    if (testIndex >= 0) {
    	li.removeClass('active');
        selectedTests.splice(testIndex, 1);
    } else {
    	li.addClass('active');
        selectedTests.push(test);
    }
    visualizeReviewTest();
}



function bbNodeSelect(li, node, testId, type) {
    var selectedTest = null;
    var ul = li.parent();
    for (var i = 0; i < selectedBBsByTest.length; i++) {
    	if (selectedBBsByTest[i].testId == testId) {
    		selectedTest = selectedBBsByTest[i];
    		break;
    	}
    }
    if (selectedTest == null) {
    	selectedTest = {testId: testId, startNode: null, endNode: null};
    	if (type == "start") {
    		selectedTest.startNode = node;
    	} else {
    		selectedTest.endNode = node;
    	}
    	selectedBBsByTest.push(selectedTest);
    	li.addClass('active ' + type);
    } else {
    	if (type == "start") {
    		selectedTest.startNode = node;
    	} else {
    		selectedTest.endNode = node;
    	}
    	var lis = ul.children();
    	for (i = 0; i < lis.length; i++) {
			if ($(lis[i]).hasClass(type)) {
				$(lis[i]).removeClass('active ' + type);
			}
    	}
	    li.addClass('active ' + type);
	    if (selectedTest.startNode != null && selectedTest.endNode != null) {
	    	expandNodes(ul);
	    	setTimeout(function(){
		    	collapseNodes(ul);
	    	}, 500);
	    }
    }
}

function collapseNodes(ul) {
	var lis = ul.children();
	var startIndex = -1;
	var li;
	for (i = 0; i < lis.length; i++) {
		if (startIndex < 0) {
			if ($(lis[i]).hasClass('start')) {
				startIndex = i;
				continue;
			}
		} else {
			if ($(lis[i]).hasClass('end')) {
				if (i - startIndex > 1) {
					li = $('<li class="small collapsed">');
					li.text('...');
					li.insertBefore($(lis[i]));
					li.on('click', function(list) {
						return function() {
							expandNodes(list)
						}
					}(ul));
				}
				break;
			} else {
				$(lis[i]).addClass('hidden');
			}
		}
	}
}

function expandNodes(ul) {
	var lis = ul.children();
	for (i = 0; i < lis.length; i++) {
		if ($(lis[i]).hasClass('hidden')) {
			$(lis[i]).removeClass('hidden');
		} else if ($(lis[i]).hasClass('collapsed')) {
			$(lis[i]).remove();
			break;
		}
	}
}
