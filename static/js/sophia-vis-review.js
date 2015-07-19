function showTests(data) {
	$( "#all_results" ).load( "html/review.html", function(){
		var allTests = JSON.parse(data);
		var testsList = $('#review_tests_list');
		$('#review_results').removeClass('hidden');
		var li, label, div, h5, span;
		testsList.empty();
		allTests.forEach(function (test) {
		    li = $('<li>');
		    li.on('click', function(t){
		        return function() {
		            testOnClick(t);
		        }
		    }(test));
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
			prev: container.find('.prev'),
			next: container.find('.next'),
			prevPage: container.find('.prevPage'),
			nextPage: container.find('.nextPage')
		}).init();

	});
}

function visualizeReviewTest() {
	var panel, panelHeader, panelBody, container, frame, ul;
	var slyControlsHtml = '<div class="scrollbar"><div class="handle"><div class="mousearea"></div></div></div>\
	<button class="backward"><i class="glyphicon glyphicon-chevron-left"></i></button><button class="forward"><i class="glyphicon glyphicon-chevron-right"></i></button>\
	<div class="frame"><ul class="slidee"></ul></div>\
	<div class="controls">\
	<button class="prevPage"><i class="glyphicon glyphicon-fast-backward"></i> Prev Page</button>\
	<span class="divider"></span><button class="prev"><i class="glyphicon glyphicon-chevron-left"></i> Prev</button>\
	<span class="divider"></span>\
	<button class="next">Next <i class="glyphicon glyphicon-chevron-right"></i></button>\
	<span class="divider"></span>\
	<button class="nextPage">Next Page <i class="glyphicon glyphicon-fast-forward"></i></button></div>';

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
			prev: container.find('.prev'),
			next: container.find('.next'),
			prevPage: container.find('.prevPage'),
			nextPage: container.find('.nextPage')
		}).init();
	}
}	

function createBBListForTest(test, ul) {
	var li;
	test.bbNodes.forEach(function (node) {
	    li = $('<li>');
	    li.on('click', function(n){
	        return function() {
	            bbNodeClick(n);
	        }
	    }(node));
	    li.attr('data-trend-id', node.id);
	    li.attr('data-toggle', 'buttons');
	    li.text(node.type);
	    ul.append(li);
	});
}

function testOnClick(test) {
    // toggle test selection
    var testIndex = selectedTests.indexOf(test);
    if (testIndex >= 0) {
        selectedTests.splice(testIndex, 1);
    } else {
        selectedTests.push(test);
    }
    visualizeReviewTest();
}

function bbNodeClick(node) {
	
}

