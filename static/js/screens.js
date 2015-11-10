// TODO: extract to configuration by server (use REST to get it?) 
//   the port is the one changing, maybe just calc it from this app
var screensServer = 'http://myd-vm00366:8085';
var screenGroups = null;
var screensGraphIDsGroups = null;
var screensShowGrouped = true;
var widthFactor = 1;
var heightFactor = 1;
var fonts_hashtable = {};
var colors_hashtable = {};
var backgrounds_hashtable = {};
var styles_hashtable = {};
var HIGHLIGHT = {
    FONT: 0,
    COLOR: 1,
    BACKGROUND: 2,
    STYLE: 3
};
var color_palette = {};
var rects = {};
var ACCORDION_SIZE = {
    LARGE: '400px',
    SMALL: '250px'
};

function componentToHex(c) {
    var hex = c.toString(16).toUpperCase();
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgbString) {
    var rgb = '';
    var isAlpha = rgbString.match(/^rgba/);
    if (isAlpha)
        rgb = rgbString.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)$/);
    else
        rgb = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (isAlpha && parseInt(rgb[4])==0)
        return null;
    return "#" + componentToHex(parseInt(rgb[1])) 
        + componentToHex(parseInt(rgb[2])) + componentToHex(parseInt(rgb[3]));
}

function loadScreens() {
    $("#application_area").load("html/screens.html", function() {
        // bind the search control
        $('#search-button').on('click', function(e) {
            searchScreensByText();
        });

        $('#search-text').placholder = 'Search Screens';

        $('#search-text').on('focus', function(e) {
            if ($('#search-text').css('font-style') == 'italic') {
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

        // toggle screen elements in modal
        $('#select_all').on('change', function(){
            toggleHighlightAll();
        });

        // fill color palette
        $.ajax("/screen-colors")
            .done(function(data) {
                color_palette = data;
                //console.log('Color palette returned: '+JSON.stringify(color_palette));
            })
            .fail(function(err) {
                console.log("Failed to retrieve color palette: " + err);
            });

    });
}

function searchScreensByText() {
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

function fillScreensCarousel() {
    var screens_results_row = $('#screens_results_row');
    var screens_carousel = $('#screens_carousel_items');
    screens_results_row.empty();
    screens_carousel.empty();
    //console.log("Search returned: " + data);
    var groups = Object.keys(screenGroups);
    var itemCounter = 0;
    for (var j = 0; j < groups.length; j++) {
        var screens = screenGroups[groups[j]];
        var screensArray = [];
        if (groups[j] == 'none') {
            screensArray = screens;
        } else {
        // if grouped, just one result per group
            if (screensShowGrouped)
                screensArray.push(screens[0]);
            else
                screensArray = screens;
        }
        for (var i = 0; i < screensArray.length; i++) {
            var timestamp = screensArray[i].timestamp;
            var graph_id = screensArray[i].graph_id;
            screens_results_row.append(
                '<li class="col-lg-2 col-md-2 col-sm-3 col-xs-4">' +
                '  <img onclick="showModal(' + itemCounter + ');"' +
                '       src="' + screensServer + '/screens/' + timestamp + '"/>' +
                '</li>'
            );
            var div_class = 'item aligned-container';
            if (itemCounter == 0) {
                div_class = 'item active aligned-container';
            }
            screens_carousel.append('<div class="' + div_class + '" graph_id="' + graph_id + '">' +
                '<img src="' + screensServer + '/screens/' + timestamp +
                '" class="screen-image-full" /></div>');
            itemCounter++;
        }
    }
    if (groups.length > 0) {
        $('#screensCarousel').carousel({
            interval: false,
            wrap: false
        });
        $('#screensCarousel')
            .on('slide.bs.carousel', clearDetails) // before slide
            .on('slid.bs.carousel', showHTMLLayout); // after slide
        $('#screens_carousel_items')
            .on('click', function(e) {
                //var offset = $(this).offset();
                //selectAtPoint(e.pageX - offset.left,e.pageY - offset.top);
                selectHoverObject();
              });
    } else {
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

function showHTMLLayout() {
    //console.log('showHTMLLayout');
    $('#accordion').removeClass('hidden');
    var active_div = $('#screens_carousel_items div.active');
    // calculate and store ratio of image to original image        
    var img = $('#screens_carousel_items div.active img');
    widthFactor = img[0].width / img[0].naturalWidth;
    heightFactor = img[0].height / img[0].naturalHeight;
    console.log('widthFactor: ' + widthFactor);
    console.log('heightFactor: ' + heightFactor);
    // get the objects for the current screen
    var graph_id = active_div.attr('graph_id');
    console.log('get objects for graph_id: ' + graph_id);
    var jqxhr = $.ajax("/screens/" + graph_id + '/objects')
        .done(function(uiObjectsData) {
            //console.log("Search returned: " + uiObjectsData);
            var li, label, input, checkbox, a, span;
            var screenUIObjects = uiObjectsData;
            var anchor = img.position();
            //console.log('screenUIObjects[0]: '+screenUIObjects[0]);
            //console.log('screenUIObjects[0] json: '+JSON.stringify(screenUIObjects[0]));
            var rects_z_order = [];            
            for (var i = 0; i < screenUIObjects.length; i++) {
                // get dimension and font of UI obj
                var rect = screenUIObjects[i].rect;                
                // draw rect on image
                //console.log('add rect: '+JSON.stringify(rect));
                var font = screenUIObjects[i].font_family + ' ' + screenUIObjects[i].font_size;
                // replace leading font 'null' with 'no font'
                font = font.replace(/^null/, 'no font');
                var color = screenUIObjects[i].color;
                var background = screenUIObjects[i].background;
                var styleClasses = screenUIObjects[i].classNames;
                var styleClassesArray = [];
                var all_props_string = '{ left: ' + rect.left + ', top: ' +
                    rect.top + ', width: ' + (rect.right - rect.left) +
                    ', height: ' + (rect.bottom - rect.top) + '} ' +
                    font;
                if (styleClasses && (typeof styleClasses == 'string'))
                {
                    styleClasses = styleClasses.trim();
                    all_props_string += ', classes: '+styleClasses;
                    styleClassesArray = styleClasses.split(' ');
                }
                if (color) {
                    color = rgbToHex(color);
                    if (color_palette[color])
                        color = color_palette[color];
                    all_props_string += ', color: ' + color;
                }
                if (background) {
                    background = rgbToHex(background);
                    if (background && color_palette[background])
                        background = color_palette[background];
                    if (background)
                        all_props_string += ', background color: ' + background;
                }
                var computed_rect = addUIRect(active_div, anchor, i, rect, all_props_string);
                if (screenUIObjects[i].visible && computed_rect) {
                    // save the rect original position for computing distance
                    //  use i as the locator, as it was added to the id of the HTML
                    //  element
                    rects[''+i] = {original: rect, computed: computed_rect};
                    // add the rect at the right z-order
                    computed_rect.id = i;
                    addToZOrder(rects_z_order, computed_rect);
                    // add rect id to the relevant categories
                    if (!fonts_hashtable[font]) {
                        fonts_hashtable[font] = {
                            highlighted: false,
                            rect_array: [i]
                        };
                    } else
                        fonts_hashtable[font].rect_array.push(i);
                    if (color) {
                        if (!colors_hashtable[color]) {
                            colors_hashtable[color] = {
                                highlighted: false,
                                rect_array: [i]
                            };
                        } else
                            colors_hashtable[color].rect_array.push(i);
                    }
                    if (background) {
                        if (!backgrounds_hashtable[background]) {
                            backgrounds_hashtable[background] = {
                                highlighted: false,
                                rect_array: [i]
                            };
                        } else
                            backgrounds_hashtable[background].rect_array.push(i);
                    }
                    styleClassesArray.forEach(function(style){
                        if (!styles_hashtable[style]) {
                            styles_hashtable[style] = {
                                highlighted: false,
                                rect_array: [i]
                            };
                        } else
                            styles_hashtable[style].rect_array.push(i);
                    });
                }
            }
            // go over z-order and assign the appropriate style
            for(var z=0;z<rects_z_order.length;z++)
            {
                $('#ui_rect_'+rects_z_order[z].id).css('z-index', (z+1));
            }

            addCategoryItems($('#fonts'), HIGHLIGHT.FONT);
            addCategoryItems($('#colors'), HIGHLIGHT.COLOR);
            addCategoryItems($('#backgrounds'), HIGHLIGHT.BACKGROUND);
            addCategoryItems($('#styles'), HIGHLIGHT.STYLE);
        })
        .fail(function(err) {
            console.log("Failed to get objects for screen " + graph_id + ": " + err);
        });
}

function addToZOrder(rects_z_order, computed_rect){
    var index = 0;
    var smaller = true;
    while(index < rects_z_order.length && smaller)
    {
        // compare with rect
        var target_rect = rects_z_order[index];
        // if this rect is inside the z-order rect, advancce
        // else if this rect is outside the z-order rect, advancce
        // else this rect intersect with the z-order rect and is not smaller
        //      so add it to at this position
        if ((computed_rect.left >= target_rect.left) &&
            (computed_rect.right <= target_rect.right) &&
            (computed_rect.top >= target_rect.top) &&
            (computed_rect.bottom <= target_rect.bottom))
        {
            index++;
        }
        else if ((computed_rect.left > target_rect.right) || 
           (computed_rect.right < target_rect.left) || 
           (computed_rect.top > target_rect.bottom) ||
           (computed_rect.bottom < target_rect.top))
        {
            index++;
        }
        else
            smaller = false;
    }
    if (!smaller)
        rects_z_order.splice(index, 0, computed_rect);
    else
        rects_z_order.push(computed_rect);    
}

function getHashtableByCategory(category)
{
    if (category == HIGHLIGHT.FONT)
        return fonts_hashtable;
    else if (category == HIGHLIGHT.BACKGROUND)
        return backgrounds_hashtable;
    else if (category == HIGHLIGHT.COLOR)
        return colors_hashtable;
    else if (category == HIGHLIGHT.STYLE)
        return styles_hashtable;
    else
        return null;
}

function addCategoryItems(root_element, category)
{
    var hashtable = getHashtableByCategory(category);
    root_element.html('');
    var keys = Object.keys(hashtable);
    var index = 0;
    keys.forEach(function(key) {
        li = $('<li>');
        li.addClass('list-group-item');
        label = $('<label>');
        label.addClass('checkbox-inline');
        input = $('<input>');
        input.attr('type', 'checkbox');
        input.attr('id', 'cb_type_' + index++);
        a = $('<a>');
        a.attr('href', '#');
        a.text(key);
        span = $('<span>');
        span.text('(' + hashtable[key].rect_array.length + ')');
        label.click(function(fs, cb) {
            return function() {
                toggleHighlightCategory(category, fs, cb);
            }
        }(key, input));
        label.append(input);
        label.append(a);
        label.append(span);
        li.append(label);
        root_element.append(li);
    });
}

function addUIRect(container, anchor, id, rect, all_props_string) {
    var div;
    var left = rect.left * widthFactor + anchor.left;
    var right = rect.right * widthFactor + anchor.left;
    var top = rect.top * heightFactor + anchor.top;
    var bottom = rect.bottom * heightFactor + anchor.top;
    var width = (right - left);
    var height = (bottom - top);
    if (width > 0 && height > 0) {
        div = $('<div>');
        div.attr('id', 'ui_rect_' + id);
        div.css('position', 'absolute');
        div.css('left', left + "px");
        div.css('top', top + "px");
        div.css('width', width + "px");
        div.css('height', height + "px");
        //div.attr('data-toggle', 'popover');
        //div.attr('data-content', createPopoverHtml(all_props_string));
        //div.attr('data-placement', 'top');
        div.attr('title', 'UI Element');
        container.append(div);
        return {left: left, right: right, top: top, bottom: bottom};
    }
    return null;
};

function createPopoverHtml(props) {
    var html = '<p>';
    html += props;
    html += '</p>';
    return html;
}

function selectHoverObject(){
    var obj =$('#screens_carousel_items div div:hover');
    if (obj.hasClass('ui_select'))
        obj.removeClass('ui_select');
    else
        obj.addClass('ui_select');
    updateSelection();
}

/* OBSOLETE: remove after November, if there is no need to select objects this way*/
/*
function selectAtPoint(x, y){
    // highlight all rects at point x,y
    var keys = Object.keys(rects);
    for(var k=0;k<keys.length;k++) {
        var computed_rect = rects[keys[k]].computed;
        if ((computed_rect.left <= x && computed_rect.right >= x) &&
            (computed_rect.top <= y && computed_rect.bottom >= y))
        {
            var obj_rect = $('#ui_rect_'+keys[k]);
            if (obj_rect.css('box-shadow').length > 0)
            {                
                // select the obj
                obj_rect.addClass('ui_select');
            }
        }
    };
}
*/
function toggleHighlightAll() {   
    // find items and highlight
    var checked = $('#select_all')[0].checked;
    if (checked) {
        // select all elements
        $('#screens_carousel_items div.active div').addClass('ui_show');
        // align all checkboxes
        $('#accordion li :checkbox').prop('checked', true);
    } else {
        // un-select all elements
        $('#screens_carousel_items div.active div').removeClass('ui_show');
        // align all checkboxes
        $('#accordion li :checkbox').prop('checked', false);
    }
    // update all categories hashes
    var fonts = Object.keys(fonts_hashtable);
    fonts.forEach(function(font_string) {
        fonts_hashtable[font_string].highlighted = checked;
    });
    var colors = Object.keys(colors_hashtable);
    colors.forEach(function(color_string) {
        colors_hashtable[color_string].highlighted = checked;
    });
    var backgrounds = Object.keys(backgrounds_hashtable);
    backgrounds.forEach(function(background_string) {
        backgrounds_hashtable[background_string].highlighted = checked;
    });
    // align distance label
    var highlighted_objects = $('.ui_show');
    if (highlighted_objects.length >= 2) {
        var first_obj_id=highlighted_objects[0].id.substring(8);
        var second_obj_id=highlighted_objects[1].id.substring(8);
        var first_rect = rects[first_obj_id].original;
        var second_rect = rects[second_obj_id].original;
        var distance = calcDistance(first_rect, second_rect);
        // now, add the distance information to the overlay
        //  TODO: use on-image popup instead of the side bar
        $('#distance_panel .panel-body').html(distance.toHTML());
        $('#distance_panel').removeClass('hidden');
        $('.panel-collapse').css('max-height', ACCORDION_SIZE.SMALL);
    } 
    else // not enough highlighted objects
    {
        $('#distance_panel').addClass('hidden'); 
        $('.panel-collapse').css('max-height', ACCORDION_SIZE.LARGE);   
    }
}

function toggleHighlightCategory(category, hash, checkbox) {
    // find items and highlight
    var hashtable = getHashtableByCategory(category);
    // toggle highlighted state
    hashtable[hash].highlighted = !(hashtable[hash].highlighted);
    // handle 'select all' checkbox
    if ($('#select_all')[0].checked && !(hashtable[hash].highlighted)) {
        // no longer selecting all, as this category is now checked off
        $('#select_all').prop('checked', false);
    }
    var object_ids = hashtable[hash].rect_array;
    object_ids.forEach(function(object_id) {
        if (hashtable[hash].highlighted) {
            checkbox.prop('checked', true);
            $('#ui_rect_' + object_id).addClass('ui_show');
        } else {
            checkbox.prop('checked', false);
            $('#ui_rect_' + object_id).removeClass('ui_show');
        }
    });
}

function updateSelection() {
    var selected_objects = $('.ui_select');
    // check if there are at least 2 selected objects, and if so, compute distance
    if (selected_objects.length > 1) {
        // get original location of selected object
        // get the id from 'ui_rect_x' where x is the id
        var obj_id=selected_objects[0].id.substring(8);
        var current_rect = rects[obj_id].original;
        var new_rect = rects[selected_objects[1].id.substring(8)].original;
        var distance = calcDistance(current_rect, new_rect);
        // now, add the distance information to the overlay
        $('#distance_panel .panel-body').html(distance.toHTML());
        $('#distance_panel').removeClass('hidden');
        $('.panel-collapse').css('max-height', ACCORDION_SIZE.SMALL);
    } 
    else {// not enough selected
        $('#distance_panel').addClass('hidden');  
        $('.panel-collapse').css('max-height', ACCORDION_SIZE.LARGE);  
    }
}

function showObjTooltip(obj) {
    return;
    var poX = obj.width() / 2;
    var poY = obj.height() / 2;
    var pos = obj.position();
    var options = {html: true};
    var poWidth = 360;
    var poHeight = 300;
    var tooHigh = false;
    poX += pos.left;
    poY = pos.top;
    if (poX < poWidth) {
        options.placement = 'right';
    } else if (poY < poHeight) {
        options.placement = 'bottom';
        tooHigh = true;
    }
    obj.popover(options).popover('show');
    if (tooHigh) {
        $('.popover').css('top', (poY + 10) + 'px');
    }
}

function calcDistance(first_rect, second_rect) {
    var distance = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        left_align: 0,
        right_align: 0,
        top_align: 0,
        bottom_align: 0,
        toHTML: function(){
            return 'Width = ' + (this.right-this.left) + '<br/>' +
                'Height = ' +(this.bottom-this.top) + '<br/>' +
                'Left alignment = ' +(this.left_align) + '<br/>' +
                'Right alignment = ' +(this.right_align) + '<br/>' +
                'Top alignment = ' +(this.top_align) + '<br/>' +
                'Bottom alignment = ' +(this.bottom_align) + '<br/>';
        }
    };
    if (first_rect.left < second_rect.left) {
        distance.left = first_rect.right;
        distance.right = second_rect.left;
    } else {
        distance.left = second_rect.right;
        distance.right = first_rect.left;
    } 
    if (first_rect.top < second_rect.top) {
        distance.top = first_rect.bottom;
        distance.bottom = second_rect.top;
    } else {
        distance.top = second_rect.bottom;
        distance.bottom = first_rect.top;
    }    
    distance.left_align = Math.abs(first_rect.left - second_rect.left);
    distance.top_align = Math.abs(first_rect.top - second_rect.top);
    distance.right_align = Math.abs(first_rect.right - second_rect.right);
    distance.bottom_align = Math.abs(first_rect.bottom - second_rect.bottom);
    return distance;
}

function showModal(itemIndex) {
    $('#screenModal').modal();
    if ($('#screens_carousel_items div.active').index() == itemIndex)
    {
        // handle edge case where there is no 'slid' event:
        //  launch of modal and using the active image (first time is 0)
        $('#screensCarousel').carousel(itemIndex);
        showHTMLLayout();
    }
    else
        $('#screensCarousel').carousel(itemIndex);
}

function clearScreensSearch() {
    screenGroups = null;
    $('#screens_results_row').empty();
    $('#screens_carousel_items').empty();
    $('#group_images').addClass('hidden');
}

function clearDetails() {
    fonts_hashtable = {};
    types_hashtable = {};
    colors_hashtable = {};
    styles_hashtable = {};
    $('#distance_panel').addClass('hidden');    
    $('#distance_panel .panel-body').empty();
    $('#fonts').empty();
    $('#types').empty();
    $('#colors').empty();
    $('#styles').empty();
    $('.panel-collapse').css('max-height', ACCORDION_SIZE.LARGE);
    $('#screens_carousel_items div.active div').remove();
}
