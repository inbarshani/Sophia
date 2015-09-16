function showIssues(data) {
    $( "#all_Issues" ).load( "html/issues.html", function(){
        var allTests = JSON.parse(data);
        var testsList = $('#issue_tests_list');
        $('#issue_results').removeClass('hidden');
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
            backward: container.find('.backward')
            //	prevPage: container.find('.prevPage'),
            //	nextPage: container.find('.nextPage')
        }).init();
        $('li').removeClass('active');
    });
}