const DEFAULT_Z_INDEX = 10000;
const LAYER_TOKEN = DEFAULT_Z_INDEX;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 1;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 2;
const LAYER_MARKER = DEFAULT_Z_INDEX + 3;
const LAYER_MENU = DEFAULT_Z_INDEX + 4;

var game_id = null;
var map_id = null;
var resources_key = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var constructs_visible = true;
var wf_script_editor = null;
var wf_script_manual = null;
var wf_zone_create = null;
var fow_obj = null;
var mouse_x = 0;
var mouse_y = 0;
var measuring = false;
var measure_diff_x = 0;
var measure_diff_y = 0;
var door_x = 0;
var door_y = 0;
var wall_x = 0;
var wall_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var ctrl_down = null;

function websocket_send(data) {
	switch (data.action) {
		case 'zone_opacity':
			if (data.opacity == 0) {
				write_sidebar('Zone made transparent.');
			} else {
				write_sidebar('Zone made solid.');
			}
			break;
	}
}

function filter_library() {
	var filter = $('input#filter').val().toLowerCase();

	localStorage.setItem('cms_token_filter', filter);

	$('div.library div.well').show();

	if (filter == '') {
		return;
	}

	$('div.library div.well').each(function() {
		var name = $(this).find('div.name').text().toLowerCase();
		if (name.includes(filter) == false) {
			$(this).hide();
		}
	});
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function toggle_constructs() {
	if (constructs_visible) {
		$('div.blinder').hide();
		$('div.door').hide();
		$('div.wall').hide();
	} else {
		$('div.blinder').show();
		$('div.door').show();
		$('div.wall').show();
	}

	constructs_visible = constructs_visible == false;
}

function coord_to_grid(coord, edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

function capture_mouse_position(event) {
	var scr = screen_scroll();
	mouse_x = event.clientX + scr.left - 16;
	mouse_y = event.clientY + scr.top - 41;
}

function key_down(event) {
	if (event.which == 17) {
		ctrl_down = true;
	} else if (event.which == 27) {
		blinder_stop();
		door_stop();
		wall_stop();
	}
}

function key_up(event) {
	if (event.which == 17) {
		ctrl_down = false;
	}
}

function set_condition(obj, condition) {
	write_sidebar(obj.find('span').text() + ' is now ' + condition + '.');
}

/* Object functions
 */
function object_armor_class(obj) {
	var armor_class = obj.attr('armor_class');

	if ((armor_class = window.prompt('Armor class:', armor_class)) == undefined) {
		return;
	}

	if (isNaN(armor_class)) {
		write_sidebar('Invalid armor class.');
		return;
	}

	obj.attr('armor_class', armor_class);

	$.post('/object/armor_class', {
		instance_id: obj.prop('id'),
		armor_class: armor_class
	});
}

function object_create(icon, x, y) {
	if ($(icon).hasClass('icon')) {
		// New token
		var token_id = $(icon).attr('token_id');
		var width = parseInt($(icon).attr('obj_width')) * grid_cell_size;
		var height = parseInt($(icon).attr('obj_height')) * grid_cell_size;
		var url = $(icon).attr('src');
		var armor_class = $(icon).attr('armor_class');
		var hitpoints = $(icon).attr('hitpoints');
		var type = $(icon).parent().find('div.name').text();
		var rotation = 180;
		var hidden = 'no';

		var scr = screen_scroll();
		x += scr.left - 30;
		y += scr.top - 40;
	} else {
		// Duplicated token
		var token_id = $(icon).parent().attr('token_id');
		var width = $(icon).width();
		var height = $(icon).height();
		var url = $(icon).attr('src');
		var armor_class = $(icon).parent().attr('armor_class');
		var hitpoints = $(icon).parent().attr('hitpoints');
		var type = $(icon).parent().attr('type');
		var rotation = $(icon).parent().attr('rotation');
		var hidden = $(icon).parent().attr('is_hidden');
	}

	x = coord_to_grid(x, false);
	y = coord_to_grid(y, false);

	$.post('/object/create_token', {
		map_id: map_id,
		token_id: token_id,
		pos_x: x / grid_cell_size,
		pos_y: y / grid_cell_size,
	}).done(function(data) {
		var instance_id = $(data).find('instance_id').text();

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token" style="left:' + x + 'px; top:' + y + 'px; z-index:' + DEFAULT_Z_INDEX + '" type="' + type + '" is_hidden="no" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="0" name="">' +
		          '<img src="' + url + '" style="width:' + width + 'px; height:' + height + 'px;" />' +
		          '</div>';

		$('div.playarea div.tokens').append(obj);

		if (parseInt(hitpoints) > 0) {
			$.post('/object/hitpoints', {
				instance_id: 'token' + instance_id,
				hitpoints: hitpoints
			});
		}

		if (parseInt(armor_class) != 10) {
			$.post('/object/armor_class', {
				instance_id: 'token' + instance_id,
				armor_class: armor_class
			});
		}

		if (parseInt(rotation) > 0) {
			object_rotate($('div#token' + instance_id), rotation);
		}

		if (hidden == 'yes') {
			object_hide($('div#token' + instance_id));
		}

		$('div.playarea div#token' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			},
		});
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_damage(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));
	damage += points;

	if (damage > hitpoints) {
		damage = hitpoints;
	} else if (damage < 0) {
		damage = 0;
	}

	obj.attr('damage', damage);

	if (points > 0) {
		points = '+' + points.toString();
	}

	write_sidebar('Character damage:<br />' + points + ' (' + damage + '/' + hitpoints + ')');
}

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id'),
	}).done(function() {
		obj.remove();

		if ((fow_obj != null) && (obj.hasClass('wall') || obj.hasClass('door'))) {
			fog_of_war_update(fow_obj);
		}
	});
}

function object_hide(obj) {
	obj.fadeTo(0, 0.5);
	obj.attr('is_hidden', 'yes');

	var data = {
		action: 'hide',
		instance_id: obj.prop('id'),
	};

	$.post('/object/hide', {
		action: 'hide',
		instance_id: obj.prop('id'),
	});
}

function object_hitpoints(obj) {
	var hitpoints = obj.attr('hitpoints');

	if ((hitpoints = window.prompt('Hitpoints:', hitpoints)) == undefined) {
		return;
	}

	if (isNaN(hitpoints)) {
		write_sidebar('Invalid hitpoints.');
		return;
	}

	obj.attr('hitpoints', hitpoints);

	$.post('/object/hitpoints', {
		instance_id: obj.prop('id'),
		hitpoints: hitpoints
	});
}

function object_info(obj) {
	var info ='';

	if (obj.attr('id').substr(0, 5) == 'token') {
		info += 'Type: ' + obj.attr('type') + '<br />';
	}

	if (obj.attr('id').substr(0, 4) != 'zone') {
		info +=
			'Armor class: ' + obj.attr('armor_class') + '<br />' +
			'Hitpoints: ' + obj.attr('hitpoints') + '<br />' +
			'Damage: ' + obj.attr('damage') + '<br />';
	}

	info += 'Object ID: ' + obj.attr('id') + '<br />';

	var name = obj.attr('name');
	if (name == undefined) {
		name = obj.find('span.name').text();
	}
	if ((name != undefined) && (name != '')) {
		info = 'Name: ' + name + '<br />' + info;
	}

	write_sidebar(info);
}

function object_move(obj) {
	var pos = object_position(obj);
	var map = $('div.playarea div');

	var min = 0;
	var max_x = map.width() - obj.width();
	var max_y = map.height() - obj.height();

	if (obj.prop('id') == 'start') {
		min += grid_cell_size;
		max_x -= grid_cell_size;
		max_y -= grid_cell_size;
	}

	if (pos.left < min) {
		pos.left = min;
	} else if (pos.left > max_x) {
		pos.left = max_x;
	}
	pos.left = coord_to_grid(pos.left);

	if (pos.top < min) {
		pos.top = min;
	} else if (pos.top > max_y) {
		pos.top = max_y;
	}
	pos.top = coord_to_grid(pos.top);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	$.post('/object/move', {
		instance_id: obj.prop('id'),
		map_id: map_id,
		pos_x: (pos.left / grid_cell_size),
		pos_y: (pos.top / grid_cell_size)
	});

	if (obj.hasClass('zone')) {
		zone_init_presence();
	}

	if (obj.hasClass('character') == false) {
		return;
	}

	if (obj.is(fow_obj)) {
		fog_of_war_update(obj);
	}

	/* Zone events
	 */
	var zone_events = {
		leave: [],
		move:  [],
		enter: []
	}

	var char_id = obj.prop('id');
	var char_pos = object_position(obj);

	$('div.zone').each(function() {
		var zone_pos = object_position($(this));

		var in_zone = true;
		if (char_pos.left < zone_pos.left) {
			in_zone = false;
		} else if (char_pos.top < zone_pos.top) {
			in_zone = false;
		} else if (char_pos.left >= zone_pos.left + $(this).width()) {
			in_zone = false;
		} else if (char_pos.top >= zone_pos.top + $(this).height()) {
			in_zone = false;
		}

		var zone_id = $(this).prop('id');
		var zone_event = null;

		if (Array.isArray(zone_presence[char_id]) == false) {
			zone_presence[char_id] = [];
		}

		if (in_zone) {
			if (zone_presence[char_id].includes(zone_id) == false) {
				zone_presence[char_id].push(zone_id);
				zone_event = 'enter';
			} else {
				zone_event = 'move';
			}
		} else {
			if (zone_presence[char_id].includes(zone_id)) {
				zone_presence = array_remove(zone_presence, zone_id);
				zone_event = 'leave';
			}
		}

		if (zone_event != null) {
			zone_events[zone_event].push(zone_id);

		}
	});

	zone_events = filter_zone_events(zone_events);

	for (var [event_type, items] of Object.entries(zone_events)) {
		items.forEach(function(zone_id) {
			zone_run_script(zone_id, char_id, event_type, pos.left, pos.top, true);
		});
	}
}

function object_name(obj) {
	var name = $(obj).attr('name');
	if ((name = window.prompt('Name:', name)) == undefined) {
		return;
	}

	$(obj).attr('name', name);

	$.post('/object/name', {
		instance_id: obj.prop('id'),
		name: name
	});
}

function object_position(obj) {
	var pos = obj.position();
	pos.left = Math.round(pos.left);
	pos.top = Math.round(pos.top);

	var scr = screen_scroll();
	pos.left += scr.left;
	pos.top += scr.top;

	return pos;
}

function object_rotate(obj, rotation, send_to_backend = true) {
	var img = obj.find('img');
	var width = img.width() / grid_cell_size;
	var height = img.height() / grid_cell_size;

	if ((width % 2) != (height % 2)) {
		if (width > height) {
			var tox = ((width - 1) * grid_cell_size) >> 1;
			var toy = (height * grid_cell_size) >> 1;
		} else {
			var tox = (width * grid_cell_size) >> 1;
			var toy = ((height - 1) * grid_cell_size) >> 1;
		}

		img.css('transform-origin', tox + 'px ' + toy + 'px');
	}

	img.css('transform', 'rotate(' + rotation + 'deg)');
	obj.attr('rotation', rotation);

	if (send_to_backend) {
		$.post('/object/rotate', {
			instance_id: obj.prop('id'),
			rotation: rotation
		});
	}
}

function object_show(obj) {
	obj.fadeTo(0, 1);
	obj.attr('is_hidden', 'no');

	var data = {
		action: 'show',
		instance_id: obj.prop('id'),
	};

	$.post('/object/show', {
		instance_id: obj.prop('id'),
	});
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('img.pin').remove();
	$('span#infobar').text('');

	measuring = false;
}

/* Blinder functions
 */
function blinder_create(pos1_x, pos1_y, pos2_x, pos2_y) {
	$.post('/object/create_blinder', {
		map_id: map_id,
		pos1_x: pos1_x,
		pos1_y: pos1_y,
		pos2_x: pos2_x,
		pos2_y: pos2_y
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_blinder').first().attr('id', 'blinder' + instance_id);

		$.contextMenu({
			selector: 'div#blinder' + instance_id,
			callback: context_menu_handler,
			items: {
				'delete': {name:'Delete', icon:'fa-trash'},
				'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'}
			},
			zIndex: LAYER_MENU
		});

		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_blinder').remove();
		alert('Blinder create error');
	});
}

function points_angle(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	var angle = Math.atan2(dy, dx) * 180 / Math.PI;
	if (angle < 0) {
		angle += 360;
	}

	return angle;
}

function points_distance(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	return Math.sqrt(dx * dx + dy * dy);
}

function blinder_position(blinder) {
	var pos1_x = parseInt(blinder.attr('pos1_x'));
	var pos1_y = parseInt(blinder.attr('pos1_y')) - 2;
	var pos2_x = parseInt(blinder.attr('pos2_x'));
	var pos2_y = parseInt(blinder.attr('pos2_y')) - 2;
	var angle = points_angle(pos1_x, pos1_y, pos2_x, pos2_y);
	var distance = points_distance(pos1_x, pos1_y, pos2_x, pos2_y);

	blinder.css('left', pos1_x + 'px');
	blinder.css('top', pos1_y + 'px');
	blinder.css('width', distance + 'px');
	blinder.css('height', '4px');
	blinder.css('transform', 'rotate(' + angle + 'deg)');
}

function blinder_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_blinder').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
//	$('body').off('keydown');
//	$('body').off('keyup');
}

/* Door functions
 */
function door_create(pos_x, pos_y, length, direction, state) {
	$.post('/object/create_door', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		length: length,
		direction: direction,
		state: state
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_door').attr('id', 'door' + instance_id);

		$.contextMenu({
			selector: 'div#door' + instance_id,
			callback: context_menu_handler,
			items: {
				'door_lock': {name:'Lock', icon:'fa-lock'},
				'door_unlock': {name:'Unlock', icon:'fa-unlock'},
				'sep1:': '-',
				'delete': {name:'Delete', icon:'fa-trash'}
			},
			zIndex: LAYER_MENU
		});

		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_door').remove();
		alert('Door create error');
	});
}

function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x'));
	var pos_y = parseInt(door.attr('pos_y'));
	var length = parseInt(door.attr('length'));
	var direction = door.attr('direction');
	var state = door.attr('state');

	pos_x *= grid_cell_size;
	pos_y *= grid_cell_size;
	length *= grid_cell_size;

	if (direction == 'horizontal') {
		var width = length;
		var height = 9;
		pos_y -= 4;
	} else if (direction == 'vertical') {
		var width = 9;
		var height = length;
		pos_x -= 4;
	} else {
		return;
	}

	door.css('left', pos_x + 'px');
	door.css('top', pos_y + 'px');
	door.css('width', width + 'px');
	door.css('height', height + 'px');

	if (state == 'locked') {
		door.css('background-color', '#c00000');
	}
}

function door_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_door').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
//	$('body').off('keydown');
}

/* Light functions
 */
function light_create(pos_x, pos_y, radius) {
	$.post('/object/create_light', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		radius: radius
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		pos_x *= grid_cell_size;
		pos_y *= grid_cell_size;

		var light = $('<img id="light' + instance_id + '" src="/images/light_on.png" class="light" radius="' + radius + '" state="on" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px" />');
		$('div.playarea div.lights').append(light);

		$('img#light' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$.contextMenu({
			selector: 'img#light' + instance_id,
			callback: context_menu_handler,
			items: {
				'light_radius': {name:'Radius', icon:'fa-dot-circle-o'},
				'light_toggle': {name:'On / off', icon:'fa-toggle-on'},
				'delete': {name:'Delete', icon:'fa-trash'}
			},
			zIndex: LAYER_MENU
		});
	}).fail(function(data) {
		alert('Light create error');
	});
}

/* Wall functions
 */
function wall_create(pos_x, pos_y, length, direction, transparent) {
	$.post('/object/create_wall', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		length: length,
		direction: direction,
		transparent: transparent
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_wall').first().attr('id', 'wall' + instance_id);

		$.contextMenu({
			selector: 'div#wall' + instance_id,
			callback: context_menu_handler,
			items: {
				'delete': {name:'Delete', icon:'fa-trash'},
				'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'}
			},
			zIndex: LAYER_MENU
		});

		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_wall').remove();
		alert('Wall create error');
	});
}

function wall_position(wall) {
	var pos_x = parseInt(wall.attr('pos_x'));
	var pos_y = parseInt(wall.attr('pos_y'));
	var length = parseInt(wall.attr('length'));
	var direction = wall.attr('direction');

	pos_x *= grid_cell_size;
	pos_y *= grid_cell_size;
	length *= grid_cell_size;

	if (direction == 'horizontal') {
		var width = length;
		var height = 5;
		pos_y -= 2;
	} else if (direction == 'vertical') {
		var width = 5;
		var height = length;
		pos_x -= 2;
	} else {
		return;
	}

	wall.css('left', pos_x + 'px');
	wall.css('top', pos_y + 'px');
	wall.css('width', width + 'px');
	wall.css('height', height + 'px');
}

function wall_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_wall').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
//	$('body').off('keydown');
//	$('body').off('keyup');
}

/* Zone functions
 */
function zone_init_presence() {
	zone_presence = [];

	$('div.character').each(function() {
		var character = $(this);
		var char_id = character.prop('id');
		zone_presence[char_id] = [];

		$('div.zone').each(function() {
			var my_pos = object_position(character);
			var zone_pos = object_position($(this));

			if (my_pos.left < zone_pos.left) {
				return;
			} else if (my_pos.top < zone_pos.top) {
				return;
			} else if (my_pos.left >= zone_pos.left + $(this).width()) {
				return;
			} else if (my_pos.top >= zone_pos.top + $(this).height()) {
				return;
			}

			zone_presence[char_id].push($(this).prop('id'));
		});
	});
}

function zone_create(width, height, color, opacity, group, altitude) {
	$.post('/object/create_zone', {
		map_id: map_id,
		pos_x: zone_x / grid_cell_size,
		pos_y: zone_y / grid_cell_size,
		width: width,
		height: height,
		color: color,
		opacity: opacity,
		group: group,
		altitude: altitude
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		width *= grid_cell_size;
		height *= grid_cell_size;

		if (opacity < 0.2) {
			opacity = 0.2;
		} else if (opacity > 0.8) {
			opacity = 0.8;
		}

		var zone = $('<div id="zone' + instance_id + '" class="zone" altitude="' + altitude + '" style="position:absolute; left:' + zone_x + 'px; top:' + zone_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + ';"><div class="script"></div></div>');

		if (group != '') {
			zone.attr('group', group);
		}

		$('div.playarea div.zones').prepend(zone);

		$('div#zone' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$.contextMenu({
			selector: 'div#zone' + instance_id,
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'script': {name:'Event script', icon:'fa-edit'},
				'sep1': '-',
				'distance': {name:'Measure distance', icon:'fa-map-signs'},
				'coordinates': {name:'Get coordinates', icon:'fa-flag'},
				'sep2': '-',
				'delete': {name:'Delete', icon:'fa-trash'}
			},
			zIndex: LAYER_MENU
		});
	}).fail(function(data) {
		alert('Zone create error');
	});
}

function zone_group_highlight() {
	var group = $(this).attr('group');

	if ((group == undefined) || (group == '')) {
		return;
	}

	$('div.zone[group="' + group + '"]').css('border', '3px double #ff8000');
}

function zone_group_unhighlight() {
	$('div.zone').css('border', '');
}

/* Collectable functions
 */
function collectables_select(obj) {
	var instance_id = obj.prop('id').substr(5);
	$.post('/object/collectables/unused', {
		game_id: game_id,
		instance_id: instance_id
	}).done(function(data) {
		var body = $('<div class="collectables"><select class="form-control" ><option value="0">-</option></select></div>');

		$(data).find('collectable').each(function() {
			var c_id = $(this).attr('id');
			var c_token_id = $(this).find('map_token_id').text();
			var c_name = $(this).find('name').text();
			var collectable = $('<option value="' + c_id + '">' + c_name + '</option>');

			if (c_token_id == instance_id) {
				collectable.attr('selected', 'selected');
			}

			body.find('select').append(collectable);
		});

		var wf_collectables = $(body).windowframe({
			style: 'default',
			header: 'Collectables',
			buttons: {
				'Save': function() {
					var collectable_id = $('div.collectables select').val();
					$.post('/object/collectable/place', {
						collectable_id: collectable_id,
						instance_id: instance_id
					}).done(function() {
						wf_collectables.close();
					});
				},
				'Cancel': function() {
					$(this).close();
				}
			},
			close: function() {
				wf_collectables.destroy();
				delete body;
			}
		});

		wf_collectables.open();
	});
}

/* Input functions
 */
function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.hasClass('light') == false) {
		if (obj.prop('tagName').toLowerCase() == 'img') {
			var obj = $(this).parent();
		}
	}

	var parts = key.split('_');
	if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
	}

	switch (key) {
		case 'armor_class':
			object_armor_class(obj);
			break;
		case 'blinder_create':
			blinder_stop();
			door_stop();
			measuring_stop();
			wall_stop();

//			$('body').keydown(key_down);
//			$('body').keyup(key_up);
//			ctrl_down = false;

			if (ctrl_down) {
				var blinder_x = mouse_x;
				var blinder_y = mouse_y;
			} else {
				var blinder_x = coord_to_grid(mouse_x, true);
				var blinder_y = coord_to_grid(mouse_y, true);
			}

			var blinder = '<div id="new_blinder" class="blinder" pos1_x="' + blinder_x + '" pos1_y="' + blinder_y + '" pos2_x="' + blinder_x + '" pos2_y="' + blinder_y + '" />';
			$('div.playarea div.blinders').append(blinder);
			$('div#new_blinder').each(function() {
				blinder_position($(this));
			});

			$('div.playarea').mousemove(function(event) {
				capture_mouse_position(event);

				if (ctrl_down) {
					var blinder_x = mouse_x;
					var blinder_y = mouse_y;
				} else {
					var blinder_x = coord_to_grid(mouse_x, true);
					var blinder_y = coord_to_grid(mouse_y, true);
				}

				$('div.playarea div#new_blinder').last().each(function() {
					$(this).attr('pos2_x', blinder_x);
					$(this).attr('pos2_y', blinder_y);
					blinder_position($(this));
				});
			});

			$('div.playarea').on('click', function(event) {
				blinder_stop(false);

				var pos1_x = $('div.playarea div#new_blinder').attr('pos1_x');
				var pos1_y = $('div.playarea div#new_blinder').attr('pos1_y');
				var pos2_x = $('div.playarea div#new_blinder').attr('pos2_x');
				var pos2_y = $('div.playarea div#new_blinder').attr('pos2_y');

				blinder_create(pos1_x, pos1_y, pos2_x, pos2_y);
			});
			break;
		case 'collectable':
			collectables_select(obj);
			break;
		case 'coordinates':
			var pos_x = coord_to_grid(mouse_x, false) / grid_cell_size;
			var pos_y = coord_to_grid(mouse_y, false) / grid_cell_size;
			write_sidebar('Coordinates: ' + pos_x + ', ' + pos_y);
			break;
		case 'delete':
			if (confirm('Delete object?')) {
				var group = obj.attr('group');
				if (group != undefined) {
					if (confirm('Delete all zones in group ' + group + '?')) {
						$('div.zone[group="' + group +'"]').each(function() {
							object_delete($(this));
						});
					} else {
						object_delete(obj);
					}
				} else {
					object_delete(obj);
				}
			}
			break;
		case 'distance':
			blinder_stop();
			door_stop();
			measuring_stop();
			wall_stop();

			var pos_x = coord_to_grid(mouse_x, false) + (grid_cell_size >> 1) - 12;
			var pos_y = coord_to_grid(mouse_y, false) - (grid_cell_size >> 1) + 7;
			var marker = '<img src="/images/pin.png" style="position:absolute; z-index:' + LAYER_MARKER + '; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" class="pin" />';
			$('div.playarea div.markers').append(marker);

			$('div.playarea').mousemove(function(event) {
				var from_x = coord_to_grid(mouse_x, false);
				var from_y = coord_to_grid(mouse_y, false);

				var scr = screen_scroll();

				var to_x = event.clientX + scr.left - 16;
				to_x = coord_to_grid(to_x, false);
				var to_y = event.clientY + scr.top - 41;
				to_y = coord_to_grid(to_y, false);

				measure_diff_x = Math.round(Math.abs(to_x - from_x) / grid_cell_size);
				measure_diff_y = Math.round(Math.abs(to_y - from_y) / grid_cell_size);

				var distance = (measure_diff_x > measure_diff_y) ? measure_diff_x : measure_diff_y;

				$('span#infobar').text(distance + ' / ' + (distance * 5) + 'ft / ' + (measure_diff_x + 1) + 'x' + (measure_diff_y + 1));
			});

			measuring = true;

			$('div.playarea').on('click', function(event) {
				measuring_stop();
			});
			break;
		case 'door_create':
			blinder_stop();
			door_stop();
			measuring_stop();
			wall_stop();

			$('body').keydown(key_down);

			door_x = coord_to_grid(mouse_x, true) / grid_cell_size;
			door_y = coord_to_grid(mouse_y, true) / grid_cell_size;

			var door = '<div id="new_door" class="door" pos_x="' + door_x + '" pos_y="' + door_y + '" length="0" direction="horizontal" />';
			$('div.playarea div.doors').append(door);
			$('div.playarea div#new_door').each(function() {
				door_position($(this));
			});

			$('div.playarea').mousemove(function(event) {
				capture_mouse_position(event);

				var pos_x = door_x;
				var pos_y = door_y;
				var end_x = coord_to_grid(mouse_x, true) / grid_cell_size;
				var end_y = coord_to_grid(mouse_y, true) / grid_cell_size;

				var diff_x = Math.abs(end_x - pos_x);
				var diff_y = Math.abs(end_y - pos_y);

				if (diff_x > diff_y) {
					if (end_x < pos_x) {
						pos_x = end_x;
					}
					var length = diff_x;
					var direction = 'horizontal';
				} else {
					if (end_y < pos_y) {
						pos_y = end_y;
					}
					var length = diff_y;
					var direction = 'vertical';
				}

				$('div.playarea div#new_door').each(function() {
					$(this).attr('pos_x', pos_x);
					$(this).attr('pos_y', pos_y);
					$(this).attr('length', length);
					$(this).attr('direction', direction);
					door_position($(this));
				});
			});

			$('div.playarea').on('click', function(event) {
				door_stop(false);

				var pos_x = $('div.playarea div#new_door').attr('pos_x');
				var pos_y = $('div.playarea div#new_door').attr('pos_y');
				var length = $('div.playarea div#new_door').attr('length');
				var direction = $('div.playarea div#new_door').attr('direction');

				door_create(pos_x, pos_y, length, direction, 'closed');
			});
			break;
		case 'door_lock':
			obj.css('background-color', '#c00000');
			$.post('/object/door_state', {
				door_id: obj.prop('id').substr(4),
				state: 'locked'
			});
			break;
		case 'door_unlock':
			obj.css('background-color', '');
			$.post('/object/door_state', {
				door_id: obj.prop('id').substr(4),
				state: 'closed'
			});

			break;
		case 'duplicate':
			var pos = object_position(obj);
			object_create($(this), pos.left + grid_cell_size, pos.top);
			break;
		case 'fow':
			if (fow_obj == null) {
				fog_of_war_set_distance(0);
				var distance = null;
				if ((distance = window.prompt('Fog of War distance (leave empty for unlimited distance):')) != undefined) {
					if (distance != '') {
						distance = parseInt(distance);
						if (isNaN(distance)) {
							write_sidebar('Invalid distance');
						} else if (distance < 1) {
							write_sidebar('Invalid distance');
						} else {
							fog_of_war_set_distance(distance);
						}
					}

					fog_of_war_init(LAYER_FOG_OF_WAR);
					fog_of_war_update(obj);
					fow_obj = obj;
				}
			} else if (obj.is(fow_obj)) {
				fog_of_war_destroy();
				fow_obj = null;
			} else {
				fog_of_war_update(obj);
				fow_obj = obj;
			}
			break;
		case 'info':
			object_info(obj);
			break;
		case 'light_create':
			var pos_x = coord_to_grid(mouse_x, false) / grid_cell_size;
			var pos_y = coord_to_grid(mouse_y, false) / grid_cell_size;
			var radius = 3;

			if ((radius = window.prompt('Radius:', radius)) == undefined) {
				return;
			}

			radius = parseInt(radius);
			if (isNaN(radius)) {
				write_sidebar('Invalid radius.');
				return;
			} else if (radius < 0) {
				write_sidebar('Invalid radius.');
				return;
			}

			light_create(pos_x, pos_y, radius);
			break;
		case 'light_radius':
			var radius = obj.attr('radius');
			
			if ((radius = window.prompt('Radius:', radius)) == undefined) {
				return;
			}
			
			$.post('/object/light_radius', {
				light_id: obj.prop('id').substr(5),
				radius: radius
			}).done(function(data) {
				obj.attr('radius', radius);
				obj.attr('title', 'Radius: ' + obj.attr('radius'));
			});
			break;
		case 'light_toggle':
			var toggle = { on:'off', off:'on' };
			var state = toggle[obj.attr('state')];

			$.post('/object/light_state', {
				light_id: obj.prop('id').substr(5),
				state: state
			}).done(function(data) {
				obj.attr('state', state);
				obj.attr('src', '/images/light_' + state + '.png');
			});
			break;
		case 'presence':
			if (obj.attr('is_hidden') == 'yes') {
				object_show(obj);
			} else {
				object_hide(obj);
			}
			break;
		case 'hitpoints':
			object_hitpoints(obj);
			break;
		case 'lower':
			z_index--;
			obj.css('z-index', z_index);
			break;
		case 'name':
			object_name(obj);
			break;
		case 'rotate':
			var compass = { 'n':   0, 'ne':  45, 'e':  90, 'se': 135,
			                's': 180, 'sw': 225, 'w': 270, 'nw': 315 };
			if ((direction = compass[direction]) != undefined) {
				object_rotate(obj, direction);
			}
			break;
		case 'script':
			$('div.script_editor input#zone_id').val($(this).prop('id'));
			$('div.script_editor input#zone_group').val($(this).attr('group'));
			$('div.script_editor textarea').val($(this).find('div.script').text());
			zone_group_change(true);
			wf_script_editor.open();
			$('div.script_editor textarea').focus();
			break;
		case 'wall_create':
		case 'window_create':
			blinder_stop();
			door_stop();
			measuring_stop();
			wall_stop();

			if (key == 'wall_create') {
				$('body').keydown(key_down);
				$('body').keyup(key_up);
			}
			ctrl_down = false;

			wall_x = coord_to_grid(mouse_x, true) / grid_cell_size;
			wall_y = coord_to_grid(mouse_y, true) / grid_cell_size;

			var type = (key == 'wall_create') ? 'wall' : 'wall window';
			var wall = '<div id="new_wall" class="' + type + '" pos_x="' + wall_x + '" pos_y="' + wall_y + '" length="0" direction="horizontal" />';
			$('div.playarea div.walls').append(wall);
			$('div#new_wall').each(function() {
				wall_position($(this));
			});

			$('div.playarea').mousemove(function(event) {
				capture_mouse_position(event);

				var pos_x = wall_x;
				var pos_y = wall_y;
				var end_x = coord_to_grid(mouse_x, true) / grid_cell_size;
				var end_y = coord_to_grid(mouse_y, true) / grid_cell_size;

				var diff_x = Math.abs(end_x - pos_x);
				var diff_y = Math.abs(end_y - pos_y);

				if (diff_x > diff_y) {
					if (end_x < pos_x) {
						pos_x = end_x;
					}
					var length = diff_x;
					var direction = 'horizontal';
				} else {
					if (end_y < pos_y) {
						pos_y = end_y;
					}
					var length = diff_y;
					var direction = 'vertical';
				}

				$('div.playarea div#new_wall').last().each(function() {
					$(this).attr('pos_x', pos_x);
					$(this).attr('pos_y', pos_y);
					$(this).attr('length', length);
					$(this).attr('direction', direction);
					wall_position($(this));
				});
			});

			$('div.playarea').on('click', function(event) {
				if (ctrl_down == false) {
					wall_stop(false);
				}

				var pos_x = $('div.playarea div#new_wall').attr('pos_x');
				var pos_y = $('div.playarea div#new_wall').attr('pos_y');
				var length = $('div.playarea div#new_wall').attr('length');
				var direction = $('div.playarea div#new_wall').attr('direction');

				wall_create(pos_x, pos_y, length, direction, key == 'window_create');

				if (ctrl_down) {
					wall_x = coord_to_grid(mouse_x, true) / grid_cell_size;
					wall_y = coord_to_grid(mouse_y, true) / grid_cell_size;

					var wall = '<div id="new_wall" class="wall" pos_x="' + wall_x + '" pos_y="' + wall_y + '" length="0" direction="horizontal" />';
					$('div.playarea div.walls').append(wall);
					$('div#new_wall').each(function() {
						wall_position($(this));
					});
				}
			});
			break;
		case 'zone_create':
			blinder_stop();
			door_stop();
			wall_stop();

			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			if (measuring) {
				$('div.zone_create input#width').val(measure_diff_x + 1);
				$('div.zone_create input#height').val(measure_diff_y + 1);

				measuring_stop();
			} else {
				$('div.zone_create input#width').val(3);
				$('div.zone_create input#height').val(3);
			}
			measuring_stop();

			wf_zone_create.open();
			$('div.zone_create div.panel-body').prop('scrollTop', 0);
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

/* Main
 */
$(document).ready(function() {
	game_id = parseInt($('div.playarea').attr('game_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	resources_key = parseInt($('div.playarea').attr('resources_key'));
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));

	write_sidebar('Game ID: ' + game_id);

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		var count_x = Math.floor($('div.playarea > div').width() / grid_cell_size);
		var count_y = Math.floor($('div.playarea > div').height() / grid_cell_size);
		var count = count_x * count_y;

		var cell = '<img src="/images/grid_cell.png" style="float:left; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; position:relative;" />';
		for (var i = 0 ;i < count; i++) {
			$('div.playarea div.grid').append(cell);
		}
	}

	/* Player start position
	 */
	$('div#start').draggable({
		handle: 'img',
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	/* Windows
	 */
	$('div.windows > div').css('z-index', LAYER_MENU);

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	$.contextMenu({
		selector: 'div.blinder',
		callback: context_menu_handler,
		items: {
			'delete': {name:'Delete', icon:'fa-trash'},
			'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'}
		},
		zIndex: LAYER_MENU
	});

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	$.contextMenu({
		selector: 'div.door',
		callback: context_menu_handler,
		items: {
			'door_lock': {name:'Lock', icon:'fa-lock'},
			'door_unlock': {name:'Unlock', icon:'fa-unlock'},
			'sep1:': '-',
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: LAYER_MENU
	});

	/* Lights
	 */
	$('img.light').each(function() {
		$(this).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});
		$(this).attr('title', 'Radius: ' + $(this).attr('radius'));
	});

	$.contextMenu({
		selector: 'img.light',
		callback: context_menu_handler,
		items: {
			'light_radius': {name:'Set radius', icon:'fa-dot-circle-o'},
			'light_toggle': {name:'Turn on / off', icon:'fa-toggle-on'},
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: LAYER_MENU
	});

	/* Script
	 */
	wf_script_editor = $('div.script_editor').windowframe({
		width:500,
		header: 'Event script',
		buttons: {
			'Save': function() {
				script_save();
				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			},
			'Help': function() {
				wf_script_manual.open();
			}
		}
	});

	wf_script_manual = $('div.script_manual').windowframe({
		width: 1000,
		header: 'Script manual'
	});

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	$.contextMenu({
		selector: 'div.wall',
		callback: context_menu_handler,
		items: {
			'delete': {name:'Delete', icon:'fa-trash'},
			'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'}
		},
		zIndex: LAYER_MENU
	});

	/* Zones
	 */
	$('div.zone').draggable({
		stop: function(event, ui) {
			object_move($(this));
		},
	});

	$('div.zone').hover(zone_group_highlight, zone_group_unhighlight);

	zone_init_presence();

	wf_zone_create = $('div.zone_create').windowframe({
		width: 450,
		header: 'Create zone',
		buttons: {
			'Create zone': function() {
				var width = parseInt($('input#width').val());
				var height = parseInt($('input#height').val());
				var color = $('input#color').val();
				var opacity = parseFloat($('input#opacity').val());
				var group = $('input#group').val();
				var altitude = parseInt($('input#altitude').val());

				if (isNaN(width)) {
					write_sidebar('Invalid width.');
					return;
				} else if (isNaN(height)) {
					write_sidebar('Invalid height.');
					return;
				} else if (isNaN(opacity)) {
					write_sidebar('Invalid opacity.');
					return;
				}

				if (opacity < 0) {
					opacity = 0;
				} else if (opacity > 1) {
					opacity = 1;
				}

				zone_x -= Math.floor((width - 1) / 2) * grid_cell_size;
				zone_y -= Math.floor((height - 1) / 2) * grid_cell_size;

				zone_create(width, height, color, opacity, group, altitude);

				$(this).close();
			}
		}
	});

	$.contextMenu({
		selector: 'div.zone',
		callback: context_menu_handler,
		items: {
			'info': {name:'Get information', icon:'fa-info-circle'},
			'script': {name:'Edit event script', icon:'fa-edit'},
			'sep1': '-',
			'distance': {name:'Measure distance', icon:'fa-map-signs'},
			'coordinates': {name:'Get coordinates', icon:'fa-flag'},
			'sep2': '-',
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: LAYER_MENU
	});

	$('div.script_editor div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.script_manual div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Objects
	 */
	$('div.token[is_hidden=no]').each(function() {
		$(this).show();
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate($(this), $(this).attr('rotation'), false);
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate($(this), $(this).attr('rotation'), false);
	});

	$('div.token').draggable({
		handle: 'img',
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$('div.character').draggable({
		handle: 'img',
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$('div.token[is_hidden=yes]').each(function() {
		$(this).fadeTo(0, 0.5);
	});

	$('div.character[is_hidden=yes]').each(function() {
		$(this).fadeTo(0, 0.5);
	});

	$.contextMenu({
		selector: 'div.token img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Get information', icon:'fa-info-circle'},
			'name': {name:'Set name', icon:'fa-edit'},
			'rotate': {name:'Rotate', icon:'fa-compass', items:{
				'rotate_n':  {name:'North', icon:'fa-arrow-circle-up'},
				'rotate_ne': {name:'North East'},
				'rotate_e':  {name:'East', icon:'fa-arrow-circle-right'},
				'rotate_se': {name:'South East'},
				'rotate_s':  {name:'South', icon:'fa-arrow-circle-down'},
				'rotate_sw': {name:'South West'},
				'rotate_w':  {name:'West', icon:'fa-arrow-circle-left'},
				'rotate_nw': {name:'North West'},
			}},
			'presence': {name:'Toggle presence', icon:'fa-low-vision'},
			'collectable': {name:'Assign collectable', icon:'fa-key'},
			'sep1': '-',
			'armor_class': {name:'Set armor class', icon:'fa-shield'},
			'hitpoints': {name:'Set hitpoints', icon:'fa-heartbeat'},
			'sep2': '-',
			'distance': {name:'Measure distance', icon:'fa-map-signs'},
			'coordinates': {name:'Get coordinates', icon:'fa-flag'},
			'sep3': '-',
			'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'},
			'door_create': {name:'Create door', icon:'fa-columns'},
			'wall_create': {name:'Create wall', icon:'fa-th-large'},
			'window_create': {name:'Create window', icon:'fa-window-maximize'},
			'zone_create': {name:'Create zone', icon:'fa-square-o'},
			'sep4': '-',
			'lower': {name:'Lower', icon:'fa-arrow-down'},
			'duplicate': {name:'Duplicate', icon:'fa-copy'},
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: LAYER_MENU
	});

	$.contextMenu({
		selector: 'div.character img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Get information', icon:'fa-info-circle'},
			'presence': {name:'Toggle presence', icon:'fa-low-vision'},
			'rotate': {name:'Rotate', icon:'fa-compass', items:{
				'rotate_n':  {name:'North', icon:'fa-arrow-circle-up'},
				'rotate_ne': {name:'North East'},
				'rotate_e':  {name:'East', icon:'fa-arrow-circle-right'},
				'rotate_se': {name:'South East'},
				'rotate_s':  {name:'South', icon:'fa-arrow-circle-down'},
				'rotate_sw': {name:'South West'},
				'rotate_w':  {name:'West', icon:'fa-arrow-circle-left'},
				'rotate_nw': {name:'North West'},
			}},
			'fow': {name:'Toggle fog of war', icon:'fa-cloud'},
			'sep1': '-',
			'distance': {name:'Measure distance', icon:'fa-map-signs'},
			'coordinates': {name:'Get coordinates', icon:'fa-flag'},
			'sep2': '-',
			'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'},
			'door_create': {name:'Create door', icon:'fa-columns'},
			'wall_create': {name:'Create wall', icon:'fa-th-large'},
			'window_create': {name:'Create window', icon:'fa-window-maximize'},
			'zone_create': {name:'Create zone', icon:'fa-square-o'}
		},
		zIndex: LAYER_MENU
	});

	$.contextMenu({
		selector: 'div.playarea > div',
		callback: context_menu_handler,
		items: {
			'distance': {name:'Measure distance', icon:'fa-map-signs'},
			'coordinates': {name:'Get coordinates', icon:'fa-flag'},
			'sep1': '-',
			'blinder_create': {name:'Create blinder', icon:'fa-eye-slash'},
			'door_create': {name:'Create door', icon:'fa-columns'},
			'light_create': {name:'Create light', icon:'fa-lightbulb-o'},
			'wall_create': {name:'Create wall', icon:'fa-th-large'},
			'window_create': {name:'Create window', icon:'fa-window-maximize'},
			'zone_create': {name:'Create zone', icon:'fa-square-o'}
		},
		zIndex: LAYER_MENU
	});

	$('div.collectables div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Library
	 */
	$('div.library img.icon').draggable({
		helper: 'clone',
		appendTo: 'div.playarea',
		stop: function(event, ui) {
			object_create($(this), event.pageX, event.pageY);
		}
	});

	/* Capture right mouse click
	 */
	$('div.playarea').mousedown(function(event) {
		if (event.which == 3) {
			capture_mouse_position(event);
		}
	});

	$('body').keydown(key_down);
	$('body').keyup(key_up);

	$('input#filter').val(localStorage.getItem('cms_token_filter'));
	filter_library();
});
