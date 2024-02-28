const FOW_COLOR_SHADOW = '#181818';

function fog_of_war_clear_circle(x, y, r) {
	drawing_ctx.beginPath();
	drawing_ctx.globalCompositeOperation = 'destination-out';
	drawing_ctx.fillStyle = 'rgba(0, 0, 0, 1)';
	drawing_ctx.arc(x, y, r, 0, 2*Math.PI, false);
	drawing_ctx.fill();
}

/* Fog of war interface
 */
function fog_of_war_init(z_index, is_dungeon_master) {
	if (is_dungeon_master == false) {
		$('div.playarea div.effects').after($('div.drawing'));
		$('div.drawing canvas').css('position', 'relative');
		$('div.drawing canvas').css('z-index', z_index);
	}

	fog_of_war_reset(is_dungeon_master);
}

function fog_of_war_reset(is_dungeon_master) {
	drawing_ctx.beginPath();
	drawing_ctx.globalCompositeOperation = 'source-over';
	drawing_ctx.rect(0, 0, drawing_canvas.width, drawing_canvas.height)
	if (is_dungeon_master) {
		drawing_ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
	} else {
		drawing_ctx.fillStyle = FOW_COLOR_SHADOW;
	}
	drawing_ctx.fill();

	var half_grid = (grid_cell_size >> 1);
	var r = parseInt($('div.playarea').attr('fow_distance')) * grid_cell_size + half_grid;

	var x = parseInt($('div.playarea').attr('start_x')) * grid_cell_size + half_grid;
	var y = parseInt($('div.playarea').attr('start_y')) * grid_cell_size + half_grid;
	fog_of_war_clear_circle(x, y, r);

	if (is_dungeon_master) {
		$('div.characters div.character').each(function() {
			var pos = object_position($(this));
			var x = pos.left + half_grid;
			var y = pos.top + half_grid;

			fog_of_war_clear_circle(x, y, r);
		});
	} else if (my_character != null) {
		var pos = object_position(my_character);
		var x = pos.left + half_grid;
		var y = pos.top + half_grid;

		fog_of_war_clear_circle(x, y, r);
	}
}

function fog_of_war_update(obj) {
}
