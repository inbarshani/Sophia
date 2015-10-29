// TODO: extract to configuration by server (use REST to get it?) 
//   the port is the one changing, maybe just calc it from this app
var screensServer = 'http://myd-vm00366:8085';
var screenGroups = null;
var screensGraphIDsGroups = null;
var screensShowGrouped = true;
var widthFactor = 1;
var heightFactor = 1;
var fonts_hashtable = {};
var types_hashtable = {};
var colors_hashtable = {};
var HIGHLIGHT = {
    FONT: 0,
    TYPE: 1,
    COLOR: 2
};

function loadScreens(){
    $("#application_area").load("html/screens.html", function () {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchScreensByText();
        });

        $('#search-text').placholder = 'Search Screens';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic' ) {
                $('#search-text').val('');
                $('#search-text').css('font-style', 'normal');
            }
        });

        $('#search-text').keyup(function(e) {
            if (e.keyCode == 13) {
                searchScreensByText();
            }
        });        

        $('#search-text').focus();

        $('#show_objs').on('change',showHTMLLayout);

        $('#date-cond').on('click', function(e) {
            openDateDialog();
        });
        /* comment until implemented for Screens
        $('#load-test').on('click', function(e) {
            openLoadTestDialog();
        });
        $('#save-test').on('click', function(e) {
            openSaveTestDialog();
        });*/

        $('#screens_toggle_groups').bootstrapSwitch();
        $('#screens_toggle_groups').on('switchChange.bootstrapSwitch', function(event, state) {
            screensShowGrouped = state;
            fillScreensCarousel();
        });
        // update button but skip event
        $('#screens_toggle_groups').bootstrapSwitch('state', screensShowGrouped, true);
    });
}

function searchScreensByText(){
    var query = $('#search-text').val();
    searchScreens(query);    
}


function searchScreens(query) {
    // change UI to show list of images instead of Screens
    //  clear top level vars
    reportString = 'Type: SCREENS\n';

    var jqxhr = $.ajax("/searchScreens?q=" + fixedEncodeURIComponent(query) + "&dateCondition=" + JSON.stringify(dateCondition))
        .done(function(data) {
            $('#group_images').removeClass('hidden');
            lastQuery = query;
            reportString = reportString + 'Search: ' + query + '\n';
            //console.log("Search returned: " + data);
            screenGroups = JSON.parse(data);
            fillScreensCarousel();
            reportString = reportString + 'Results #: ' + $('#screensCarousel img').length + '\n';
        })
        .fail(function(err) {
            alert("Unable to complete search at this time, try again later");
            console.log("Search failed: " + err);
            reportString = reportString + 'Result: failed query\n';

            update();
        });
}

function fillScreensCarousel(){
    var screens_results_row = $('#screens_results_row');
    var screens_carousel = $('#screens_carousel_items');
    screens_results_row.empty();
    screens_carousel.empty();
    //console.log("Search returned: " + data);
    var groups = Object.keys(screenGroups);
    var itemCounter = 0;
    for (var j=0;j<groups.length;j++)
    {
        var screens = screenGroups[groups[j]];
        var screensArray = [];
        if (groups[j] == 'none')
        {
            screensArray = screens;
        }
        else // if grouped, just one result per group
        {
            if (screensShowGrouped)
                screensArray.push(screens[0]);
            else
                screensArray = screens;       
        }
        for(var i=0;i<screensArray.length;i++){
            var timestamp = screensArray[i].timestamp;
            var graph_id = screensArray[i].graph_id;
            screens_results_row.append(
                '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">' +
                '  <img onclick="showModal('+itemCounter+');"' +
                '       src="'+screensServer+'/screens/' + timestamp + '"/>' +
                '</li>'
            );
            var div_class = 'item aligned-container';
            if (itemCounter == 0) {
                div_class = 'item active aligned-container'; 
            }
            screens_carousel.append('<div class="'+div_class+'" graph_id="'+graph_id+'">'+
                '<img src="'+screensServer+'/screens/' + timestamp + 
                '" class="screen-image-full" /></div>');
            itemCounter++;
        }
    }
    if (groups.length > 0) {
        $('#screensCarousel').carousel({interval: false, wrap: false});
        $('#screensCarousel').on('slid.bs.carousel', showHTMLLayout);
    }
    else {
        screens_results_row.append(
            '<li class="">' +
            ' No screens found.' +
            '</li>'
        );
    }
    $('.carousel-control').addClass('screen-carousel-control');
}

function getScreens(node_id, callback) {
    var jqxhr = $.ajax("/getNearScreens?selectedNode=" + node_id)
        .done(function(data) {
            //console.log("Search returned: " + data);
            var responseData = JSON.parse(data);
            callback(responseData.prevScreenTimestamp, responseData.nextScreenTimestamp);
        })
        .fail(function(err) {
            console.log("getScreens failed: " + err);
        });
}

function showHTMLLayout(){
    clearDetails();
    //console.log('showHTMLLayout');
    if ($('#show_objs')[0].checked) {
        $('#accordion').removeClass('hidden');
        var active_div =$('#screens_carousel_items div.active');
        // calculate and store ratio of image to original image        
        var img = $('#screens_carousel_items div.active img');
        widthFactor = img[0].width / img[0].naturalWidth;
        heightFactor = img[0].height / img[0].naturalHeight;
        console.log('widthFactor: '+widthFactor);
        console.log('heightFactor: '+heightFactor);
        // get the objects for the current screen
        var graph_id =active_div.attr('graph_id');
        console.log('get objects for graph_id: '+graph_id);
        var jqxhr = $.ajax("/screens/" + graph_id+'/objects')
            .done(function(uiObjectsData) {
                //console.log("Search returned: " + uiObjectsData);
                var li, label, input, checkbox, a, span;
                var screenUIObjects = uiObjectsData;
                var anchor = img.position();
                //console.log('screenUIObjects[0]: '+screenUIObjects[0]);
                //console.log('screenUIObjects[0] json: '+JSON.stringify(screenUIObjects[0]));
                for(var i=0;i<screenUIObjects.length;i++)
                {
                    // get dimension and font of UI obj
                    var rect = screenUIObjects[i].rect;
                    // draw rect on image
                    //console.log('add rect: '+JSON.stringify(rect));
                    var font = screenUIObjects[i].font_family + ' ' + screenUIObjects[i].font_size;
                    // replace leading font 'null' with 'no font'
                    font = font.replace(/^null/, 'no font');
                    var object_type = 'n/a';
                    if (screenUIObjects[i].micclass && screenUIObjects[i].micclass[0])
                        object_type  = '' + screenUIObjects[i].micclass[0];
                    var color = screenUIObjects[i].color;
                    var all_props_string = '{ left: '+rect.left+', top: '+
                        rect.top+', width: '+(rect.right - rect.left)+
                        ', height: '+(rect.bottom - rect.top)+'} '+ 
                        font;
                    if (color)
                        all_props_string += ' ' + color;
                    if (screenUIObjects[i].visible && 
                        addUIRect(active_div, anchor, i, rect, all_props_string))
                    {
                        if (!fonts_hashtable[font])
                        {
                            fonts_hashtable[font] = {
                                highlighted: false,
                                rect_array: [i]
                            };
                        }
                        else
                            fonts_hashtable[font].rect_array.push(i);
                        if (!types_hashtable[object_type])
                        {
                            types_hashtable[object_type] = {
                                highlighted: false,
                                rect_array: [i]
                            };
                        }
                        else
                            types_hashtable[object_type].rect_array.push(i);  
                        if (color)                      
                        {
                            if (!colors_hashtable[color])
                            {
                                colors_hashtable[color] = {
                                    highlighted: false,
                                    rect_array: [i]
                                };
                            }
                            else
                                colors_hashtable[color].rect_array.push(i);  
                        }
                    }
                }
                i = 0;
                var fonts = Object.keys(fonts_hashtable);
                fonts.forEach(function(font_string){
                    li = $('<li>');
                    li.addClass('list-group-item');
                    label = $('<label>');
                    label.addClass('checkbox-inline');
                    input = $('<input>');
                    input.attr('type', 'checkbox');
                    input.attr('id', 'cb_font_' + i++);
                    a = $('<a>');
                    a.attr('href', '#');
                    a.text(font_string);
                    span = $('<span>');
                    span.text('(' + fonts_hashtable[font_string].rect_array.length + ')');
                    label.click(function(fs, cb){
                        return function() {
                            toggleHighlightCategory(HIGHLIGHT.FONT, fs, cb);
                        }
                    }(font_string, input));
                    label.append(input);
                    label.append(a);
                    label.append(span);
                    li.append(label);
                    $('#fonts').append(li);
                });    
                i = 0;
                var types=Object.keys(types_hashtable);
                types.forEach(function(type_string){
                    li = $('<li>');
                    li.addClass('list-group-item');
                    label = $('<label>');
                    label.addClass('checkbox-inline');
                    input = $('<input>');
                    input.attr('type', 'checkbox');
                    input.attr('id', 'cb_type_' + i++);
                    a = $('<a>');
                    a.attr('href', '#');
                    a.text(type_string);
                    span = $('<span>');
                    span.text('(' + types_hashtable[type_string].rect_array.length + ')');
                    label.click(function(fs, cb){
                        return function() {
                            toggleHighlightCategory(HIGHLIGHT.TYPE, fs, cb);
                        }
                    }(type_string, input));
                    label.append(input);
                    label.append(a);
                    label.append(span);
                    li.append(label);
                    $('#types').append(li);
                });                
                i = 0;
                var colors=Object.keys(colors_hashtable);
                colors.forEach(function(color_string){
                    li = $('<li>');
                    li.addClass('list-group-item');
                    label = $('<label>');
                    label.addClass('checkbox-inline');
                    input = $('<input>');
                    input.attr('type', 'checkbox');
                    input.attr('id', 'cb_color_' + i++);
                    a = $('<a>');
                    a.attr('href', '#');
                    a.text(color_string);
                    span = $('<span>');
                    span.text('(' + colors_hashtable[color_string].rect_array.length + ')');
                    label.click(function(fs, cb){
                        return function() {
                            toggleHighlightCategory(HIGHLIGHT.COLOR,fs, cb);
                        }
                    }(color_string, input));
                    label.append(input);
                    label.append(a);
                    label.append(span);
                    li.append(label);
                    $('#colors').append(li);
                });                
            })
            .fail(function(err) {
                console.log("Failed to get objects for screen "+graph_id+": " + err);
            });
    } else {
        $('#accordion').addClass('hidden');
    }
}

function addUIRect(container, anchor, id, rect, all_props_string) {
    var left = rect.left * widthFactor + anchor.left;
    var right = rect.right * widthFactor + anchor.left;
    var top = rect.top * heightFactor + anchor.top;
    var bottom = rect.bottom * heightFactor + anchor.top;
    var width = (right-left);
    var height = (bottom-top);
    if (width > 0 && height > 0)
    {
        $('<div id="ui_rect_'+id+'" '+
            'style="position: absolute" title="'+all_props_string+'"/>')
        .appendTo(container)
        .css("left", left + "px")
        .css("top", top + "px")
        .css("width", width+"px")
        .css("height", height+"px")
        .on('click', function(){ toggleHighlightObject('ui_rect_'+id);});
        return true;
    }
    return false;
};

function toggleHighlightCategory(target, hash, checkbox) {   
    // find items and highlight
    var hashtable = {};
    if (target == HIGHLIGHT.FONT)
        hashtable = fonts_hashtable;
    else if (target == HIGHLIGHT.TYPE)
        hashtable = types_hashtable;
    else if (target == HIGHLIGHT.COLOR)
        hashtable = colors_hashtable;
    // toggle highlighted state
    hashtable[hash].highlighted = !(hashtable[hash].highlighted);
    var object_ids = hashtable[hash].rect_array;
    object_ids.forEach(function(object_id){
        if (hashtable[hash].highlighted) {
            checkbox.prop('checked', true);
            $('#ui_rect_'+object_id).addClass('ui_show');
        } else {
            checkbox.prop('checked', false);
            $('#ui_rect_'+object_id).removeClass('ui_show');
        }
    });
}

function toggleHighlightObject(id)
{
    var obj = $('#'+id)
    var highlighted = obj.hasClass('ui_show');
    if (!highlighted)
    {
        obj.addClass('ui_show');
    }
    else
    {
        obj.removeClass('ui_show');
    }
}

function showModal(itemIndex)
{
    $('#screenModal').modal();    
    $('#screensCarousel').carousel(itemIndex);
}

function clearScreensSearch()
{
    screenGroups = null;
    $('#screens_results_row').empty();
    $('#screens_carousel_items').empty();
    $('#group_images').addClass('hidden');
}

function clearDetails()
{
    fonts_hashtable = {};
    types_hashtable = {};
    colors_hashtable = {};
    $('#fonts').empty();
    $('#types').empty();    
    $('#colors').empty();  
    $('#screens_carousel_items div.active div').remove();
}