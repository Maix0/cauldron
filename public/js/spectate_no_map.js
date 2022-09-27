var adventure_id = null;

function change_map() {
	document.location = '/spectate/' + adventure_id + '/' + $('select.map-selector').val();
}

$(document).ready(function() {
    adventure_id = parseInt($('input#adventure_id').val());
});
