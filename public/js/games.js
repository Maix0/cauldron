function show_story(story_id) {
	$('div.stories').show();
	$('div#story' + story_id).show();
}

function close_story() {
	$('div.stories').hide();
	$('div.story').hide();
}

$(document).ready(function() {
	var stories = $('div.stories').detach();
	$('body').append(stories);
});
