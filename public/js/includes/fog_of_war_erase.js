const FOW_COLOR_SHADOW = '#181818';

function fog_of_war_clear_circle(obj) {
	var pos = object_position(obj);
	var x = pos.left + (grid_cell_size >> 1);
	var y = pos.top + (grid_cell_size >> 1);
	var r = parseInt($('div.playarea').attr('fow_distance')) * grid_cell_size + (grid_cell_size >> 1);

	drawing_ctx.beginPath();
	drawing_ctx.globalCompositeOperation = 'destination-out';
	drawing_ctx.fillStyle = 'rgba(0, 0, 0, 1)';
	drawing_ctx.arc(x, y, r, 0, 2*Math.PI, false);
	drawing_ctx.fill();
}

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

	if (is_dungeon_master) {
		$('div.characters > div').each(function() {
			fog_of_war_clear_circle($(this));
		});
	} else if (my_character != null) {
		fog_of_war_clear_circle(my_character);
	}
}

function fog_of_war_update(obj) {
}
