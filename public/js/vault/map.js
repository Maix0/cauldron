var grid_size_min = 20;
var grid_size_max = 200;

function init_resource_browsers() {
	$.ajax('/vault/map/maps').done(function(data) {
		var list = '<div><ul class="browse-list">';
		$(data).find('map').each(function() {
			list += '<li>/' + $(this).text() + '</li>';
		});
		list += '</ul></div>';

		var map_dialog = $(list).windowframe({
			activator: 'input.map_browser',
			header: 'Maps from Resources',
		});

		map_dialog.find('li').click(function() {
			var file = $(this).text();
			$('input#url').val(file);
			reset_dimension();

			var title = $('input#title');
			if (title.val() == '') {
				var parts = file.split('/');
				var name = parts.pop().split('.').shift();
				name = name.charAt(0).toUpperCase() + name.substr(1);
				name = name.replace(/_/g, ' ');
				title.val(name);
			}

			map_dialog.close();
		});
	});

	$.ajax('/vault/map/audio').done(function(data) {
		var audio_dialog = $('<div></div>').windowframe({
			activator: 'input.audio_browser',
			header: 'Audio from Resources',
		});

		var audio = $(data).find('audio');

		if (audio.length > 0) {
			var list = '<ul class="browse-list">';
			$(data).find('audio').each(function() {
				list += '<li>/' + $(this).text() + '</li>';
			});
			list += '</div>';

			audio_dialog.append(list);

			audio_dialog.find('li').click(function() {
				$('input#audio').val($(this).text());

				audio_dialog.close();
			});
		} else {
			audio_dialog.append('<p>No audio files have been found in the Resources \'audio\' directory.</p>');
		}
	});
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
