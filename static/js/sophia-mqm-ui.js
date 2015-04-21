var currentNodes = [];

$(document).ready(function() {

    $('#search-button').on('click', function(e) {
        search();
    });

    $('#search-text').keyup(function(e) {
        if (e.keyCode == 13) {
            search();
        }
    });

    $('#navbar-logo').on('click', function(e) {
        clearSearch();
    });
});

function search() {
    // TBD: until backend function is ready, manual pushing a node
    currentNodes.push('1');
    // update the logo
    update();
}

function clearSearch() {
    // remove all nodes
    currentNodes.length = 0;
    // update the logo
    update();
}

function update() {
    switchLogo();
    if (currentNodes.length <= 0)
        clearSearchText();
}

function switchLogo() {
    if (currentNodes.length > 0) {
        $('#navbar-logo').removeClass('hidden').addClass('visible');
        $('#logo').removeClass('visible').addClass('hidden');
    } else {
        $('#logo').removeClass('hidden').addClass('visible');
        $('#navbar-logo').removeClass('visible').addClass('hidden');
    }
}

function clearSearchText() {
    $('#search-text').val('');
}