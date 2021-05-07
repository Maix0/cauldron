const CELL_PADDING = 0.25;
const POINTS_VISIBLE = 2;

var fow_map_width = null;
var fow_map_height = null;
var fow_checks = [
	[1, 0.5, 0.5],
	[2, 0.5, CELL_PADDING],
	[4, 1 - CELL_PADDING, 0.5],
	[8, 0.5, 1 - CELL_PADDING],
	[16, CELL_PADDING, 0.5]];
var fow_spot_max = null;

/* Check if two lines cross
 */
function on_segment(point, line_p1, line_p2) {
	return (point.left <= Math.max(line_p1.left, line_p2.left)) &&
	       (point.left >= Math.min(line_p1.left, line_p2.left)) &&
	       (point.top  <= Math.max(line_p1.top,  line_p2.top)) &&
	       (point.top  >= Math.min(line_p1.top,  line_p2.top));
}

function orientation(point1, point2, point3) {
	var value = (point2.top - point1.top) * (point3.left - point2.left) -
	            (point2.left - point1.left) * (point3.top - point2.top);

	if (value == 0) {
		return 0;
	}

	return (value > 0) ? 1 : 2;
}

function lines_intersect(line1_p1, line1_p2, line2_p1, line2_p2) {
	var o1 = orientation(line1_p1, line1_p2, line2_p1);
	var o2 = orientation(line1_p1, line1_p2, line2_p2);
	var o3 = orientation(line2_p1, line2_p2, line1_p1);
	var o4 = orientation(line2_p1, line2_p2, line1_p2);

	if ((o1 != o2) && (o3 != o4)) {
		return true;
	}

	if ((o1 == 0) && on_segment(line2_p1, line1_p1, line1_p2)) {
		return true;
	}

	if ((o2 == 0) && on_segment(line2_p2, line1_p1, line1_p2)) {
		return true;
	}

	if ((o3 == 0) && on_segment(line1_p1, line2_p1, line2_p2)) {
		return true;
	}

	if ((o4 == 0) && on_segment(line1_p2, line2_p1, line2_p2)) {
		return true;
	}

	return false;
}

/* Fog of War functions
 */
function fog_of_war_init() {
	fow_map_width = Math.floor($('div.playarea > div').width() / grid_cell_size);
	fow_map_height = Math.floor($('div.playarea > div').height() / grid_cell_size);

	for (var y = 0; y < fow_map_height; y++) {
		for (var x = 0; x < fow_map_width; x++) {
			var left = x * grid_cell_size;
			var top = y * grid_cell_size;
			var fog = '<div id="fow_' + x + '_' + y +'" class="fow" style="position:absolute; left:' + left + 'px; top:' + top + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; background-color:#202020;" />';

			$('div.playarea div.fog_of_war').append(fog);
		}
	}

	fow_spot_max = 0;
	for (s = 0; s < fow_checks.length; s++) {
		fow_spot_max += fow_checks[s][0];
	}

	$('div.fow').css('z-index', DEFAULT_Z_INDEX + 3);
}

function check_vision(char_pos, construct, fow_spots) {
	var cons_x = parseInt(construct.attr('pos_x'));
	var cons_y = parseInt(construct.attr('pos_y'));

	var cons_p1 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	var length = parseInt(construct.attr('length'));
	var direction = construct.attr('direction');

	if (direction == 'horizontal') {
		cons_x += length;
	} else if (direction == 'vertical') {
		cons_y += length;
	} else {
		return;
	}

	var cons_p2 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	for (var y = 0; y < fow_map_height; y++) {
		for (var x = 0; x < fow_map_width; x++) {
			if (fow_spots[y][x] == 0) {
				continue;
			}

			for (s = 0; s < fow_checks.length; s++) {
				var step = fow_checks[s];

				var cell_pos = {
					left: (x + step[1]) * grid_cell_size,
					top: (y + step[2]) * grid_cell_size
				}

				if (lines_intersect(char_pos, cell_pos, cons_p1, cons_p2)) {
					fow_spots[y][x] &= (fow_spot_max - step[0]);
				}
			}
		}
	}

	return fow_spots;
}

function fog_of_war_update(obj) {
	if (fow_spot_max == null) {
		return;
	}

	var pos = object_position(obj);

	var char_pos = {
		left: pos.left + (obj.width() / 2),
		top: pos.top + (obj.width() / 2)
	}

	var fow_spots = [];
	for (var y = 0; y < fow_map_height; y++) {
		fow_spots[y] = [];
		for (var x = 0; x < fow_map_width; x++) {
			fow_spots[y][x] = fow_spot_max;
		}
	}

	$('div.wall').each(function() {
		if ($(this).attr('transparent') == 'yes') {
			return;
		}

		fow_spots = check_vision(char_pos, $(this), fow_spots);
	});

	$('div.door').each(function() {
		if ($(this).attr('state') == 'open') {
			return;
		}

		fow_spots = check_vision(char_pos, $(this), fow_spots);
	});

	for (var y = 0; y < fow_map_height; y++) {
		for (var x = 0; x < fow_map_width; x++) {
			var fow_cell = fow_spots[y][x];

			var fow_bits = 0;
			for (b = 0; b < fow_checks.length; b++) {
				if ((fow_cell & 1) == 1) {
					fow_bits++;
				}
				fow_cell >>= 1;
			}

			if (fow_bits < POINTS_VISIBLE) {
				$('div#fow_' + x + '_' + y).show();
			} else {
				$('div#fow_' + x + '_' + y).hide();
			}
		}
	}
}

function fog_of_war_destroy() {
	$('div.fow').remove();
	fow_spot_max = null;
}
