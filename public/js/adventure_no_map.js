var adventure_id = null;

function change_map() {
	$.post('/object/change_map', {
		adventure_id: adventure_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		document.location = '/adventure/' + adventure_id;
	});
}

$(document).ready(function() {
    adventure_id = parseInt($('input#adventure_id').val());
});
