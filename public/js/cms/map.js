var grid_size_min = 20;
var grid_size_max = 200;

function browse_local() {
	$.ajax('/cms/map').done(function(data) {
		var dialog =
			'<div class="overlay" onClick="javascript:$(this).remove()">' +
			'<div class="panel panel-default" onClick="javascript:event.stopPropagation();">' +
			'<div class="panel-heading">Maps from Resources<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$(this).parent().parent().parent().hide()"></span></div>' +
			'<div class="panel-body"><ul class="maps">';

		$(data).find('maps map').each(function() {
			dialog += '<li onClick="javascript:select_map($(this));">/' + $(this).text() + '</li>';
		});

		dialog += '</ul></div></div>';

		$('body').append(dialog);
		$('body div.overlay').show();
	});
}

function select_map(li) {
	$('input#url').val(li.text());
	reset_dimension();

	li.parent().parent().parent().parent().remove();
}

function reset_dimension() {
	$('input#width').val('');
	$('input#height').val('');
}

/* Grid
 */
function init_grid(grid_cell_size) {
	var cell = '<img src="/images/grid_cell.png" class="cell" style="float:left; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; position:relative;" />';

	var map_width = Math.round($('div.playarea > div').width());
	var map_height = Math.round($('div.playarea > div').height());

	var count_x = Math.floor(map_width / grid_cell_size);
	var count_y = Math.floor(map_height / grid_cell_size);
	var count = count_x * count_y;

	for (var i = 0 ;i < count; i++) {
		$('div.map').append(cell);
	}

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

			var count_x = Math.floor($('div.playarea > div').width() / ui.value);
			var count_y = Math.floor($('div.playarea > div').height() / ui.value);
			var count = count_x * count_y;

			var current = $('div.playarea img.cell').length;
			var diff = count - current;

			if (diff > 0) {
				for (var i = 0 ;i < diff; i++) {
					$('div.map').append(cell);
				}
			} else if (diff < 0) {
				for (var i = 0 ;i < -diff; i++) {
					$('div.playarea img.cell').first().remove();
				}
			}

			var cells = $('div.map img.cell');
			cells.css('width', ui.value + 'px');
			cells.css('height', ui.value + 'px');
		}
	});

	/* Possible sizes
	 */
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
