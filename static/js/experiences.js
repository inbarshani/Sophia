var quickEditConfig = {
    space: false,
    showbtn: false,
    checkold: true,
    submit: function(element, newValue) {
        // checkold doesn't work, do it myself
        if (element.text() == newValue)
            return true;
        // create a new line if this is the last item
        // do this before changing the DOM, as the last line
        //	is in the right format                
        if ($(element).closest("tr").is(":last-child")) {
            var tr = '<tr>' +
                '<td>+</td>' +
                '<td class="quickedit draft">Click to edit</td>' +
                '</tr>';
            $('#xp_steps tbody').append(tr);
            $('#xp_steps tr:last .quickedit').quickEdit(quickEditConfig);
        }
        // set value and add step number
        element.text(newValue);
        element.removeClass('draft');
        $(element).prev().text($('#xp_steps tr').length - 3);
    }
};


function loadXP() {
    $("#application_area").load("html/experiences.html", function() {
        // bind the search control
        $('#xp_steps .quickedit').quickEdit(quickEditConfig);
        $('#xp_flow_name').quickEdit({
            space: false,
            showbtn: false,
            checkold: true,
            autosubmit: true,
			submit: function(element, newValue) {
			        // checkold doesn't work, do it myself
			        if (element.text() == newValue)
			            return true;
			        // set value and add step number
			        element.text(newValue);
			        element.removeClass('draft');
			    }            
        });
        $('#xp_clear').on('click',function(){
        	clearXP();
        })
    });
}

function defineXPDone() {}

function searchXP() {
    //reportString = 'Type: SAVED_TESTS\n';
    clearXP();
    //  + "&dateCondition=" + JSON.stringify(dateCondition)
    /*
    var jqxhr = $.ajax("/tests?type=" + searchTypes.FLOWS + "&name="+query)
        .done(function(data) {
	        lastQuery = query;
	        reportString = reportString + 'Search: ' + query + '\n';

	        update();
        }) // end ajax done
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err.responseText);
            reportString = reportString + 'Result: failed query\n';

            clearXP();

            update();
        }); // end ajax err handling and ajax call for XP define
    */
}

function clearXP() {
	var tr = '<tr>' +
	    '<td>+</td>' +
	    '<td class="quickedit draft">Click to edit</td>' +
	    '</tr>';
	$('#xp_steps tbody').empty().append(tr);
	$('#xp_flow_name').text('Click to edit name');
	$('#xp_flow_name').addClass('draft');
    $('#xp_steps .quickedit').quickEdit(quickEditConfig);
}
