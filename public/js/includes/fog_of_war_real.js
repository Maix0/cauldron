const FOW_COLOR_SHADOW = '#202020';
const FOW_LIGHT_EDGE = 0.75;
const FOW_COVERED_CHECKS = 2;

var fog_of_war_distance = 0;
var fog_of_war_lights = {};

var canvas = null;
var canvas_width = 0;
var canvas_height = 0;
var ctx = null;
var image_data = null;

function get_edge_pos(obj_x, obj_y, wall_x, wall_y) {
	var edge_x = 0;
	var edge_y = 0;

	if (wall_x < obj_x) {
		if (obj_x != wall_x) {
			var factor = (1 / (obj_x - wall_x)) * obj_x;
			edge_y = Math.round(obj_y - ((obj_y - wall_y) * factor));
		} else {
			edge_y = obj_y;
		}
	} else if (wall_x > obj_x) {
		edge_x = canvas.width;

		if (obj_x != wall_x) {
			var factor = (1 / (wall_x - obj_x)) * (canvas.width - obj_x);
			edge_y = Math.round(obj_y - ((obj_y - wall_y) * factor));
		} else {
			edge_y = obj_y;
		}
	} else {
		edge_x = obj_x;

		if (wall_y > obj_y) {
			edge_y = canvas.height;
		}
	}

	var edge_pos = {
		left: edge_x,
		top: edge_y
	}

	return edge_pos;
}

function draw_fow_shape(ctx, obj_x, obj_y, pos1_x, pos1_y, pos2_x, pos2_y) {
	if (pos2_x < pos1_x) {
		var p = pos1_x;
		pos1_x = pos2_x;
		pos2_x = p;

		p = pos1_y;
		pos1_y = pos2_y;
		pos2_y = p;
	}

	ctx.beginPath();
	ctx.moveTo(pos1_x, pos1_y);

	var edge_pos = get_edge_pos(obj_x, obj_y, pos1_x, pos1_y);
	ctx.lineTo(edge_pos.left, edge_pos.top);

	var prev_edge_x = edge_pos.left;
	var edge_pos = get_edge_pos(obj_x, obj_y, pos2_x, pos2_y);

	if (edge_pos.left != prev_edge_x) {
		if ((pos1_x == pos2_x) || (pos1_y == pos2_y)) {
			/* Horizontal of vertical
			 */
			if (edge_pos.top < obj_y) {
				var corner_y = 0;
			} else {
				var corner_y = canvas.height;
			}

			ctx.lineTo(prev_edge_x, corner_y);
			ctx.lineTo(edge_pos.left, corner_y);
		} else if (pos1_x < obj_x < pos2_x) {
			var angle = (pos2_y - pos1_y) / (pos2_x - pos1_x);
			var y = pos1_y + (obj_x - pos1_x) * angle;

			if (y < obj_y) {
				var corner_y = 0;
			} else {
				var corner_y = canvas.height;
			}

			ctx.lineTo(prev_edge_x, corner_y);
			ctx.lineTo(edge_pos.left, corner_y);
		}
	}

	ctx.lineTo(edge_pos.left, edge_pos.top);

	ctx.lineTo(pos2_x, pos2_y);

	ctx.closePath();

	ctx.fill();
	ctx.stroke();
}

function draw_fow_shape_for_construct(ctx, obj_x, obj_y, construct) {
	var pos1_x = parseInt(construct.attr('pos_x')) * grid_cell_size;
	var pos1_y = parseInt(construct.attr('pos_y')) * grid_cell_size;

	var pos2_x = pos1_x;
	var pos2_y = pos1_y;

	var length = parseInt(construct.attr('length')) * grid_cell_size;
	var direction = construct.attr('direction');

	if (direction == 'horizontal') {
		pos2_x += length;
	} else if (direction == 'vertical') {
		pos2_y += length;
	} else {
		return;
	}

	draw_fow_shape(ctx, obj_x, obj_y, pos1_x, pos1_y, pos2_x, pos2_y);
}

function remove_fog_of_war() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw_light_sphere(pos_x, pos_y, radius) {
	var l_canvas = document.createElement('canvas');
	l_canvas.width = canvas.width;
	l_canvas.height = canvas.height;
	var l_ctx = l_canvas.getContext('2d');

	l_ctx.fillStyle = FOW_COLOR_SHADOW;
	l_ctx.strokeStyle = FOW_COLOR_SHADOW;
	l_ctx.lineWidth = 1;
	l_ctx.fillRect(0, 0, l_canvas.width, l_canvas.height);

	radius += Math.round(grid_cell_size * 0.7);

	/* Draw sphere
	 */
	var grad = l_ctx.createRadialGradient(pos_x, pos_y, 0, pos_x, pos_y, radius);
	grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
	grad.addColorStop(FOW_LIGHT_EDGE, 'rgba(0, 0, 0, ' + FOW_LIGHT_EDGE + ')');
	grad.addColorStop(0, 'rgba(0, 0, 0, 1)');

	var min_x = Math.min(pos_x - radius, 0);
	var min_y = Math.min(pos_y - radius, 0);
	var max_x = Math.max(pos_x + radius, l_canvas.width - 1);
	var max_y = Math.max(pos_y + radius, l_canvas.height - 1);

	l_ctx.globalCompositeOperation = 'xor';
	l_ctx.fillStyle = grad;
	l_ctx.fillRect(min_x, min_y, max_x, max_y);

	l_ctx.globalCompositeOperation = 'source-over';
	l_ctx.fillStyle = FOW_COLOR_SHADOW;

	/* Walls
	 */
	$('div.wall').each(function() {
		if ($(this).attr('transparent') == 'yes') {
			return;
		}

		draw_fow_shape_for_construct(l_ctx, pos_x, pos_y, $(this));
	});

	/* Doors
	 */
	$('div.door').each(function() {
		if ($(this).attr('state') == 'open') {
			return;
		}

		draw_fow_shape_for_construct(l_ctx, pos_x, pos_y, $(this));
	});

	ctx.globalCompositeOperation = 'destination-in';
	ctx.drawImage(l_canvas, 0, 0);
	ctx.globalCompositeOperation = 'source-over';
}

function fog_of_war_covered(obj) {
	if (image_data == null) {
		image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	var obj_pos = object_position(obj);
	var obj_x = obj_pos.left;
	var obj_y = obj_pos.top;

	var step = Math.round(grid_cell_size / (FOW_COVERED_CHECKS + 1));

	var visible = 0;
	for (var y = 1; y <= FOW_COVERED_CHECKS; y++) {
		for (var x = 1; x <= FOW_COVERED_CHECKS; x++) {
			var pos = (obj_y + y * step) * canvas.width;
			pos += (obj_x + x * step);
			var transparancy = image_data.data[pos * 4 + 3];
			if (transparancy < 192) {
				visible++;
			}
		}
	}

	return visible < 2;
}

/* Fog of war interface
 */
function fog_of_war_init(z_index) {
	var width = $('div.playarea > div').width();
	var height = $('div.playarea > div').height();

	$('div.fog_of_war').append('<canvas id="fow_real" class="fow" width="' + width + '" height="' + height + '"></canvas>');
	$('canvas#fow_real').css('z-index', z_index);

	canvas = document.getElementById('fow_real');

	if (ctx == null) {
		ctx = canvas.getContext('2d');
		ctx.fillStyle = FOW_COLOR_SHADOW;
		ctx.strokeStyle = FOW_COLOR_SHADOW;
		ctx.lineWidth = 1;
	}
}

function fog_of_war_set_distance(distance) {
	if (distance > 0) {
		distance = distance * grid_cell_size;
	}

	fog_of_war_distance = distance;
}

function fog_of_war_light(light) {
	var id = light.prop('id');
	var state = light.attr('state');

	if (state == 'delete') {
		delete fog_of_war_lights[id];
	} else {
		var pos = object_position(light);
		var radius = parseInt(light.attr('radius'));

		if (isNaN(radius)) {
			return;
		}

		fog_of_war_lights[id] = [pos.left, pos.top, radius, state];
	}
}

function fog_of_war_update(obj) {
	var half_cell = (grid_cell_size >> 1);
	var obj_pos = object_position(obj);
	var obj_x = obj_pos.left + half_cell;
	var obj_y = obj_pos.top + half_cell;

	if (fog_of_war_distance > 0) {
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		draw_light_sphere(obj_x, obj_y, fog_of_war_distance);

		for (var key in fog_of_war_lights) {
			var light = fog_of_war_lights[key];

			if (light[3] == 'off') {
				continue;
			}

			draw_light_sphere(light[0] + half_cell, light[1] + half_cell, light[2] * grid_cell_size);
		}
	} else {
		remove_fog_of_war();
	}

	/* Walls
	 */
	$('div.wall').each(function() {
		if ($(this).attr('transparent') == 'yes') {
			return;
		}

		draw_fow_shape_for_construct(ctx, obj_x, obj_y, $(this));
	});

	/* Doors
	 */
	$('div.door').each(function() {
		if ($(this).attr('state') == 'open') {
			return;
		}

		draw_fow_shape_for_construct(ctx, obj_x, obj_y, $(this));
	});

	/* Blinders
	 */
	$('div.blinder').each(function() {
		var pos1_x = parseInt($(this).attr('pos1_x'));
		var pos1_y = parseInt($(this).attr('pos1_y'));
		var pos2_x = parseInt($(this).attr('pos2_x'));
		var pos2_y = parseInt($(this).attr('pos2_y'));
		draw_fow_shape(ctx, obj_x, obj_y, pos1_x, pos1_y, pos2_x, pos2_y);
	});

	/* Zones
	 */
	var my_altitude = 0;
	$('div.zone').each(function() {
		if (zone_covers_position($(this), obj_pos)) {
			var zone_altitude = parseInt($(this).attr('altitude'));
			if (zone_altitude > my_altitude) {
				my_altitude = zone_altitude;
			}
		}
	});

	$('div.zone').each(function() {
		var zone_altitude = $(this).attr('altitude');
		if (zone_altitude <= my_altitude) {
			return true;
		}

		var zone_pos = object_position($(this));
		var zone_x = zone_pos.left;
		var zone_y = zone_pos.top;
		var zone_width = $(this).width();
		var zone_height = $(this).height();

		if (zone_pos.left + zone_width < obj_x) {
			draw_fow_shape(ctx, obj_x, obj_y, zone_x + zone_width, zone_y, zone_x + zone_width, zone_y + zone_height);
		} else if (zone_pos.left > obj_x) {
			draw_fow_shape(ctx, obj_x, obj_y, zone_x, zone_y, zone_x, zone_y + zone_height);
		}

		if (zone_pos.top + zone_height < obj_y) {
			draw_fow_shape(ctx, obj_x, obj_y, zone_x, zone_y + zone_height, zone_x + zone_width, zone_y + zone_height);
		} else if (zone_pos.top > obj_y) {
			draw_fow_shape(ctx, obj_x, obj_y, zone_x, zone_y, zone_x + zone_width, zone_y);
		}
	});

	/* Hide covered objects
	 */
	image_data = null;
	['character', 'token'].forEach(type => {
		$('div.' + type).removeClass('fow_covered');
		$('div.' + type).each(function() {
			if (fog_of_war_covered($(this))) {
				$(this).addClass('fow_covered');
			}
		});
	});
}

function fog_of_war_destroy() {
	remove_fog_of_war();
}
