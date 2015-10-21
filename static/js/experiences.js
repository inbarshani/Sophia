var editableOptions = {
    type: 'text',
    mode: 'inline',
    send: 'never',
    showbuttons: false,
    unsavedclass: null,
    onblur: 'submit'
};
var xpStepsArray = [];
var xpName = '';


function loadXP() {
    $("#application_area").load("html/experiences.html", function() {
        // bind the search control
        $('#xp_steps .editable')
        	.editable(editableOptions)
        	.on('save', stepSave)
        	.on('hidden', stepNext);
        $('#xp_flow_name').editable(editableOptions)
        	.on('save',function(e, params){
		        // only act if new value is diff than current
		        var element = $(e.target);
		        if (element.text() == params.newValue)
		            return true;
		        // set value and add step number
		        element.text(params.newValue);
		        element.removeClass('draft');
        	});
 		$('#xp_clear').on('click',function(){
        	clearXP();
        })
        $('#xp_create').on('click',function(){
        	defineXPDone();
        })
    });
}

function stepNext(e, reason)
{
	if(reason === 'save' || reason === 'nochange') {
	    var $next = $(this).closest('tr').next().find('.editable');
	    setTimeout(function() {
	        $next.editable('show');
	    }, 300); 
	}	
}

function stepSave(e, params)
{
	// only react if new value is different than existing
	var element = $(e.target);
	if (element.text() == params.newValue)
	    return;
	// create a new line if this is the last item
	// do this before changing the DOM, as the last line
	//	is in the right format                
	if (element.closest("tr").is(":last-child")) {
	    var tr = '<tr>' +
	        '<td>+</td>' +
	        '<td class="editable"></td>' +
	        '</tr>';
	    $('#xp_steps tbody').append(tr);
	    $('#xp_steps tr:last .editable')
	    	.editable(editableOptions)
	    	.on('save', stepSave)
	    	.on('hidden', stepNext);
	}
	// set value and add step number
	element.text(params.newValue);
	element.removeClass('draft');
	element.prev().text($('#xp_steps tr').length - 3);
}

function defineXPDone() {
	xpStepsArray.length = 0;
	xpName = $('#xp_flow_name').text();
	// save all steps
	$('#xp_steps tbody tr').not(':last').each(function(){
		var step = $(this).find('td:last').text();
		xpStepsArray.push(step);
	});
	//console.log('steps: '+JSON.stringify(xpStepsArray));
	// lock table editing and remove buttons
	$('#xp_flow_name').editable('disable');
	$('#xp_steps .editable').editable('disable');
	$('#xp_create').addClass('disabled');
	// get XP data
	searchXP();
}

function searchXP() {
    reportString = 'Type: XP\n';
    //  + "&dateCondition=" + JSON.stringify(dateCondition)
    var query = JSON.stringify({name: $('#xp_flow_name').text(), steps: xpStepsArray});
    var jqxhr = $.ajax("/searchXP?name="+$('#xp_flow_name').text()+"&steps="
    	+JSON.stringify(xpStepsArray))
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
}

function clearXP() {
	var tr = '<tr>' +
	    '<td>+</td>' +
	    '<td class="editable"></td>' +
	    '</tr>';
	$('#xp_steps tbody').empty().append(tr);
	$('#xp_flow_name').text('');
	$('#xp_flow_name').editable('setValue', '', false);
	$('#xp_flow_name').editable('enable');
	$('#xp_create').removeClass('disabled');

    $('#xp_steps .editable')
    	.editable(editableOptions)
    	.on('save', stepSave)
	    .on('hidden', stepNext);
}
