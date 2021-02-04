var game_id = null;

function change_map() {
	$.post('/object/change_map', {
		game_id: game_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		document.location = '/game/' + game_id;
	});
}

$(document).ready(function() {
    game_id = parseInt($('input#game_id').val());
});
