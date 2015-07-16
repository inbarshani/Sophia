function visualizeReviewTest() {
    $('#review_vis_container').html('');
    selectedTests.forEach(function (test) {
    // just for testing... delete this
        var p = $('<p>');
        p.text(test.test.id);
        $('#review_vis_container').append(p);
    });
}
