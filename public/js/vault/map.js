var grid_size_min = 20;
var grid_size_max = 200;
var dialog;

function init_map_browser() {
	$.ajax('/vault/map').done(function(data) {
		var maps = '<div><ul class="maps">';
		$(data).find('maps map').each(function() {
			maps += '<li onClick="javascript:select_map(this);">/' + $(this).text() + '</li>';
		});
		maps += '</ul></div>';

		dialog = $(maps).windowframe({
			activator: 'input.browser',
			header: 'Maps from Resources',
		});
	});
}

function select_map(li) {
	$('input#url').val($(li).text());
	reset_dimension();

	dialog.close();
}

function reset_dimension() {
	$('input#width').val('');
	$('input#height').val('');
}

/* Grid
 */

function init_grid(grid_cell_size) {
	grid_init(grid_cell_size, 'rgba(240, 0, 0, 0.6)');

	var handle = $('#grid-handle');
	$('#slider').slider({
		value: grid_cell_size,
		min: grid_size_min,
		max: grid_size_max,
		create: function() {
			handle.text($(this).slider('value'));
		},
		slide: function(event, ui) {
			handle.text(ui.value);
			$('input[name="grid_size"]').val(ui.value);

			grid_draw(ui.value);
		}
	});

	/* Possible sizes
	 */
	var map_width = Math.round($('div.playarea > div').first().width());
	var map_height = Math.round($('div.playarea > div').first().height());

	var result = [];
	for (i = grid_size_min; i <= grid_size_max; i++) {
		if (((map_width % i) == 0) && ((map_height % i) == 0)) {
			result.push(i);
		}
	}

	if (result.length == 0) {
		$('span.sizes').text('None found.');
	} else {
		$('span.sizes').text(result.join(', '));
	}
}
