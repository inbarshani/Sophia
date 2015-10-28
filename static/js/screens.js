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
                '"/></div>');
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
    if ($('#show_objs')[0].checked)
    {
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
                var screenUIObjects = uiObjectsData;
                var anchor = img.position();
                //console.log('screenUIObjects[0]: '+screenUIObjects[0]);
                //console.log('screenUIObjects[0] json: '+JSON.stringify(screenUIObjects[0]));
                var uiObjectsCounter = 0;
                for(var i=0;i<screenUIObjects.length;i++)
                {
                    // get dimension and font of UI obj
                    var rect = screenUIObjects[i].rect;
                    // draw rect on image
                    //console.log('add rect: '+JSON.stringify(rect));
                    if (screenUIObjects[i].visible && addUIRect(active_div, anchor, rect,i))
                    {
                        uiObjectsCounter++;
                        var font = screenUIObjects[i].font_family + ' ' + screenUIObjects[i].font_size;
                        var object_type = 'n/a';
                        if (screenUIObjects[i].micclass && screenUIObjects[i].micclass[0])
                            object_type  = '' + screenUIObjects[i].micclass[0];
                        var color = screenUIObjects[i].color;
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
                var fonts = Object.keys(fonts_hashtable);
                fonts.forEach(function(font_string){
                    var item = $('<li><a href="#">'+font_string+'</a></li>');
                    item.appendTo($('#fonts'))
                        .find('a')
                        .on('click', function() { toggleHighlightCategory(HIGHLIGHT.FONT,font_string);});
                });    
                var types=Object.keys(types_hashtable);
                types.forEach(function(type_string){
                    var item = $('<li><a href="#">'+type_string+'</a></li>');
                    item.appendTo($('#types'))
                        .find('a')
                       .on('click',  function() { toggleHighlightCategory(HIGHLIGHT.TYPE, type_string);});
                });                
                var colors=Object.keys(colors_hashtable);
                colors.forEach(function(color_string){
                    var item = $('<li><a href="#">'+color_string+'</a></li>');
                    item.appendTo($('#colors'))
                        .find('a')
                       .on('click',  function() { toggleHighlightCategory(HIGHLIGHT.COLOR, color_string);});
                });                
            })
            .fail(function(err) {
                console.log("Failed to get objects for screen "+graph_id+": " + err);
            });

    }
}

function addUIRect(container, anchor, rect, id) {
    var left = rect.left * widthFactor + anchor.left;
    var right = rect.right * widthFactor + anchor.left;
    var top = rect.top * heightFactor + anchor.top;
    var bottom = rect.bottom * heightFactor + anchor.top;
    var width = (right-left);
    var height = (bottom-top);
    if (width > 0 && height > 0)
    {
        $('<div id="ui_rect_'+id+'" style="position: absolute" />')
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

function toggleHighlightCategory(target, hash)
{
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
        if (hashtable[hash].highlighted)
            $('#ui_rect_'+object_id).addClass('ui_show').tooltip("enable");
        else
            $('#ui_rect_'+object_id).removeClass('ui_show').tooltip("disable");
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