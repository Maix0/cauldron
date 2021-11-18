var game_id = null;

function change_map() {
	document.location = '/spectate/' + game_id + '/' + $('select.map-selector').val();
}

$(document).ready(function() {
    game_id = parseInt($('input#game_id').val());
});
