function showTestsForReview(data) {
	$( "#all_results" ).load( "html/review.html", function(){
		var allTests = JSON.parse(data);
		var testsList = $('#review_tests_list');
		$('#review_results').removeClass('hidden');
		var li, label, div, h5, span;
		testsList.empty();
		allTests.forEach(function (test) {
		    li = $('<li '+
			' data-toggle="tooltip"'+
	    	' data-placement="top" title="'+test.name+' (ID: '+test.test.id+
	    	')">');
		    li.on('click', function(item, t){
		        return function() {
		            testOnClick(item, t);
		        }
		    }(li, test));
		    li.attr('data-test-id', test.test.id);
		    li.attr('data-toggle', 'buttons');
            label = $('<label>');
            div = $('<div class="test_caption">');
            h5 = $('<h5>');
            h5.text(test.name.substring(0,35));
            span = $('<span>');
            span.addClass('badge');
            span.text(test.bbNodes.length);
            div.append(span);
            div.append(h5);
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
		//	prevPage: container.find('.prevPage'),
		//	nextPage: container.find('.nextPage')
		}).init();
		$('li').removeClass('active');
	});
}

function visualizeReviewTest(test) {
	var div, panelHeader, panelBody, container, frame, ul;
	var slyControlsHtml = '<div class="scrollbar"><div class="handle"><div class="mousearea"></div></div></div>\
	<button class="backward"><i class="glyphicon glyphicon-chevron-left small-40"></i></button><button class="forward"><i class="glyphicon glyphicon-chevron-right small-40"></i></button>\
	<div class="frame small"><ul class=".sly .frame ul div"></ul></div>\
	<div class="controls">';/*\
	<button class="prevPage"><i class="glyphicon glyphicon-fast-backward small-22"></i> Prev Page</button>\
	<span class="divider"></span>\
	<button class="nextPage">Next Page <i class="glyphicon glyphicon-fast-forward small-22"></i></button></div>';*/

	var options = {
	    horizontal: 1,
	    itemNav: 'basic',
	    speed: 300,
	    mouseDragging: 1,
	    touchDragging: 1
	};

	div = $('<div class="col-md-1" >');
	div.text('Test: ' + test.name.substring(0,35));
	div.attr('id','test-name-' + test.test.id);
	$('#review_vis_container').append(div);

	div = $('<div>');
	div.addClass('col-md-11');
	div.attr('id','test-sly-' + test.test.id);
	container = $('<div>');
	container.addClass('sly');
	container.html(slyControlsHtml);
	ul = $(container.find('ul'));
	createBBListForTest(test, ul);
	frame = container.find('.frame');
	div.append(container);
	$('#review_vis_container').append(div);

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

function createBBListForTest(test, ul) {
	var li, div, ddUl, ddLi;
	test.bbNodes.forEach(function (node) {
	    li = $('<li class="dropdown small">');
	    div = $('<div data-toggle="dropdown" data-toggle="tooltip"'+
	    	' data-placement="top" title="'+node.caption+' (ID: '+
	    	node.id+')" class="teststep_caption">');
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
	    ddLi = $('<li class="dd">');
	    ddLi.text('Search similar');
	    ddLi.on('click', function(node, test){
	    	return function() {
	    		nodeSearchSimilar(node, test);
	    	};
	    }(node, test));
	    ddUl.append(ddLi);
	    li.attr('data-bb-id', node.id);
	    if (node.similar)
	    	li.addClass('active');
	    //div.text(node.type);
	    div.text(node.type + ': ' + node.caption);
      //  div.title = node.caption;
        li.append(div);
	    li.append(ddUl);
	    ul.append(li);
	});
}

function testOnClick(li, test) {
    // toggle test selection
    var testIndex = selectedReviewTests.indexOf(test);
    if (testIndex >= 0) {
    	li.removeClass('active');
    	$('#test-name-' + test.test.id).remove();
    	$('#test-sly-' + test.test.id).remove();
        selectedReviewTests.splice(testIndex, 1);
        for (var i = 0; i < selectedBBsByTest.length; i++) {
	    	if (selectedBBsByTest[i].testId == test.test.id) {
	    		selectedBBsByTest.splice(i);
	    	}
	    }
	 
    } else {
    	li.addClass('active');
        selectedReviewTests.push(test);
	    visualizeReviewTest(test);
    }
}

function bbNodeSelect(li, node, testId, type) {
    var selectedReviewBBTest = findBBTest(testId);
    var ul = li.parent();
    if (selectedReviewBBTest == null) {
    	selectedReviewBBTest = {testId: testId, startNode: null, endNode: null, nodes: []};
    	if (type == "start") {
    		selectedReviewBBTest.startNode = node;
    	} else {
    		selectedReviewBBTest.endNode = node;
    	}
    	selectedBBsByTest.push(selectedReviewBBTest);
    	li.addClass('active ' + type);
    } else {
    	if (type == "start") {
    		selectedReviewBBTest.startNode = node;
    	} else {
    		selectedReviewBBTest.endNode = node;
    	}
    	var lis = ul.children();
    	for (i = 0; i < lis.length; i++) {
			if ($(lis[i]).hasClass(type)) {
				$(lis[i]).removeClass('active ' + type);
			}
    	}
	    li.addClass('active ' + type);
	    if (selectedReviewBBTest.startNode != null && selectedReviewBBTest.endNode != null) {
	    //	expandNodes(ul);
	    	setTimeout(function(){
		    	collapseNodesAndGetStats(testId,ul);
	    	}, 500);
	    }
    }
}

function nodeSearchSimilar(node, test)
{
	$("#search-text")
		.val('LIKE Step \''+node.caption.substring(0,20)+
			'\' of Test \''+test.name.substring(0,20)+'\'')
		.css('font-style', 'italic');
	searchReview('StepID='+node.id);
}

function collapseNodesAndGetStats(testId, ul) {
	var lis = ul.children();
	var startIndex = -1;
	var li;
    var nodes = [];
    var div;

	for (i = 0; i < lis.length; i++) {
		if (startIndex < 0) {
			if ($(lis[i]).hasClass('start')) {
				startIndex = i;
				nodes.push($(lis[i]).data('bb-id'));
				continue;
			}
		} else {
			if ($(lis[i]).hasClass('end')) {
				nodes.push($(lis[i]).data('bb-id'));
				if (i - startIndex > 1) {
				/*	li = $('<li class="small collapsed">');
					li.text('...');
					li.insertBefore($(lis[i]));
					li.on('click', function(list) {
						return function() {
							expandNodes(list)
						}
					}(ul));*/
                 //   li = $('<li class="small collapsed">');
                //    li.insertBefore($(lis[i]));
                //    li.append('<div id="divBetween">')
                /*    li.on('click', function(list) {
                        return function() {
                            expandNodes(list)
                        }
                    }(ul));*/
				}
				break;
			} else {
				if ($(lis[i]).data('bb-id').length > 0)
					nodes.push($(lis[i]).data('bb-id'));
				$(lis[i]).addClass('hidden');
			}
		}
	}
  	getNodesStats(testId, nodes, function(data, testId){
        var stats = JSON.parse(data);
        for(var i=0; i< selectedBBsByTest.length; i++) {
            if(selectedBBsByTest[i].testId==testId)
            {
                selectedBBsByTest[i].compareNodes = stats;
            }
        }
        displayStats(lis, ul, JSON.parse(data));
  	});
}

function expandNodes( ul) {
	var lis = ul.children();
	for (i = 0; i < lis.length+1; i++) {
		if ($(lis[i]).hasClass('hidden')) {
			$(lis[i]).removeClass('hidden');
		} else if ($(lis[i]).hasClass('collapsed')) {
			$(lis[i]).remove();
			break;
		}
	}
}
var compareDataInfo = [];
function displayStats(lis, ul, stats) {
    var colors = ['red', 'blue', 'green', 'teal', 'rosybrown', 'tan', 'plum', 'saddlebrown'];
	 var div;
	var li;
	var counter = 0;
	for (var name in stats) {
        div = $('<div class="divBetween">');
        if (counter++ % 3 == 0) {
        	li = $('<li class="stats">');
	        li.insertBefore($(lis[i]));
        }
        div.css('background-color', colors[counter]);
        li.append(div);	
        div.text(name + ':' + stats[name].length);
        div.on('click', function (list, type) {
            return function () {
                function bringDataForNodes(i) {
                	var found = false;
                	if (i >= selectedBBsByTest.length) {
                        searchBackBoneData(compareDataInfo, function(dataTests){
                            $("#compareTable").load("html/listTable.html", function() {
                                console.log(dataTests);
                                dataTests = JSON.parse(dataTests);
                                var table = $("#compareTableList");
                                var tr = '<tr>';
                                tr += '<th class="caption">' + "Caption" + '</td>';
                                //built the header/title of the table
                                for(var i=0; i<dataTests.length;i++)
                                {
                                    tr +='<th class="test">' + "Test " + dataTests[i].testId + '</th>';
                                }
                                tr += '</tr>';
                                table.append(tr);
                                tr =  '<tr>';
                                for(var i=0; i<dataTests.length;i++)
                                {
                                    var testNodes = dataTests[i]
                                   var nodes =  testNodes.dataNodes;
                                    for(var key in nodes)
                                    {
                                        console.log(nodes[key].caption);
                                        tr += '<td class="caption">' + nodes[key].caption + '</td>';
                                        tr += '</tr>';
                                        tr+='<tr>'
                                    }
                                }

                                table.append(tr);

                                var options = {
                                    valueNames: ['caption', 'test']
                                };

                                var userList = new List('users', options);
                            });
                        });
                		return;
                	}
                    if(selectedBBsByTest[i].compareNodes!==null && selectedBBsByTest[i].compareNodes[type]!==undefined) {
                    	for (var j = 0; j < compareDataInfo.length; j++) {
                    		if (compareDataInfo[j].testId == selectedBBsByTest[i].testId) {
                    			found = true;
                    		}
                    	}
                    	if (!found) {
	                        compareDataInfo.push({testId: selectedBBsByTest[i].testId, dataNodes: selectedBBsByTest[i].compareNodes[type]});
                    	}
                        bringDataForNodes(i+1);
                    }


                }
                
                bringDataForNodes(0);
		    };
        }(ul, name));
    }
}

function findBBTest(testId) {
    for (var i = 0; i < selectedBBsByTest.length; i++) {
    	if (selectedBBsByTest[i].testId == testId) {
    		return selectedBBsByTest[i];
    	}
    }
    return null;
}
