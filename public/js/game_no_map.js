var game_id = null;

function change_map() {
	$.post('/game', {
		action: 'change_map',
		game_id: game_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		location.reload();
	});
}

$(document).ready(function() {
    game_id = parseInt($('input#game_id').val());
});
