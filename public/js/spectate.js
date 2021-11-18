const ROLL_NORMAL = 0;
const ROLL_ADVANTAGE = 1;
const ROLL_DISADVANTAGE = 2;
const FOW_OFF = 0;
const FOW_DAY = 1;
const FOW_NIGHT = 2;

const DEFAULT_Z_INDEX = 10000;
const LAYER_TOKEN = DEFAULT_Z_INDEX;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 1;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 2;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 3;
const LAYER_MARKER = DEFAULT_Z_INDEX + 4;
const LAYER_MENU = DEFAULT_Z_INDEX + 5;
const LAYER_VIEW = DEFAULT_Z_INDEX + 6;

var websocket;
var group_key = null;
var game_id = null;
var map_id = null;
var user_id = null;
var resources_key = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var focus_obj = null;
var fow_type = null;
var fow_obj = null;
var fow_default_distance = null;
var fow_char_distances = {};
var fow_light_char = {};

function websocket_send(data) {
	if (websocket == null) {
		return;
	}

	data.game_id = game_id;
	data.user_id = user_id;
	data = JSON.stringify(data);

	websocket.send(data);
}

function change_map() {
	document.location = '/spectate/' + game_id + '/' + $('select.map-selector').val();

}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function show_image(img) {
	var image = '<div class="overlay" onClick="javascript:$(this).remove()"><img src="' + $(img).attr('src') + '" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); max-width:80%; max-height:80%;" /></div>';

	$('body').append(image);
}

function message_to_sidebar(name, message) {
	if ((message.substr(0, 7) == 'http://') || (message.substr(0, 8) == 'https://')) {
		var parts = message.split('.');
		var extension = parts.pop();
		var images = ['gif', 'jpg', 'jpeg', 'png'];

		if (images.includes(extension)) {
			message = '<img src="' + message + '" style="width:160px; cursor:pointer;" onClick="javascript:show_image(this)" />';
		} else {
			message = '<a href="' + message + '" target="_blank">' + message + '</a>';
		}
	} else {
		message = message.replace(/</g, '&lt;');
		message = message.replace(/\n/g, '<br />');
	}

	if (name != null) {
		message = '<b>' + name + ':</b><span style="display:block; margin-left:15px;">' + message + '</span>';
	}

	write_sidebar(message);
}

function coord_to_grid(coord, edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

/* Object functions
 */
function object_alive(obj) {
	obj.css('background-color', '');
	if (obj.attr('is_hidden') == 'no') {
		obj.css('opacity', '1');
	}
	obj.find('div.hitpoints').css('display', 'block');
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

	var perc = Math.floor(100 * damage / hitpoints);
	var dmg = obj.find('div.damage');
	dmg.css('width', perc.toString() + '%');
	if (damage == hitpoints) {
		object_dead(obj);
	} else {
		object_alive(obj);
	}
}

function object_dead(obj) {
	obj.css('background-color', '#c03010');
	obj.css('opacity', '0.7');
	obj.find('div.hitpoints').css('display', 'none');
}

function object_hide(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, 0.5);
	} else {
		obj.hide(100);
	}
	obj.attr('is_hidden', 'yes');
}

function object_info(obj) {
	var info = '';

    if (obj.hasClass('zone') == false) {
		var name = obj.find('span.name');
		if (name.length > 0) {
			info += 'Name: ' + name.text() + '<br />';
		}

		if (obj.attr('id').substr(0, 5) == 'token') {
			info += 'Type: ' + obj.attr('type') + '<br />';
		}
		info += 'Armor class: ' + obj.attr('armor_class') + '<br />';

		info += 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

		var remaining = parseInt(obj.attr('hitpoints')) - parseInt(obj.attr('damage'));
		info +=
			'Damage: ' + obj.attr('damage') + '<br />' +
			'Hit points: ' + remaining.toString() + '<br />';

		if (obj.hasClass('character')) {
			info += 'Initiative bonus: ' + obj.attr('initiative') + '<br />';
		}
	}

	if (dungeon_master) {
		info += 'Object ID: ' + obj.attr('id') + '<br />';
	}

	write_sidebar(info);
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

function object_rotate(obj, rotation, speed = 500) {
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

	var currot = parseInt(obj.attr('rotation'));
	var anirot = rotation;

	if ((360 + currot - anirot) < (anirot - currot)) {
		anirot -= 360;
	} else if ((360 + anirot - currot) < (currot - anirot)) {
		anirot += 360;
	}

	img.stop(false, true);
	img.animate({
		rotation: anirot
	}, {
		duration: speed,
		step: function(now) {
        	$(this).css('transform', 'rotate(' + now + 'deg)');
		},
		done: function() {
			img.animate({ rotation: rotation });
		}
	});

	obj.attr('rotation', rotation);
}

function object_show(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, 1);
	} else {
		obj.show(100);
	}
	obj.attr('is_hidden', 'no');
}

function object_view(obj, max_size = 300) {
	var src = obj.find('img').prop('src');
	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; z-index:' + LAYER_VIEW + '; top:0; left:0; right:0; bottom:0; background-color:rgba(255, 255, 255, 0.8);';
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%)';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px;';

	var transform = obj.find('img').css('transform');
	if (transform != 'none') {
		img_style += ' transform:' + transform + ';';
	}

	if ((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) {
		img_style += ' border:1px solid #000000; background-color:#ffffff;';
	}

	var view = $('<div id="view" style="' + div_style + '" onClick="' + onclick +'"><span style="' + span_style + '"><img src="' + src + '" style="' + img_style + '" /></span></div>');
	$('body').append(view);
}

/* Effects
 */
function effect_create_object(effect_id, src, pos_x, pos_y, width, height) {
	width *= grid_cell_size;
	height *= grid_cell_size;

	var effect = $('<div id="' + effect_id +'" class="effect" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + width + 'px; height:' + height + 'px;"><img src="' + src + '" style="width:100%; height:100%;" /></div>');

	$('div.playarea div.effects').append(effect);
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('span#infobar').text('');
	$('img.pin').remove();
}

/* Door functions
 */
function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(door.attr('pos_y')) * grid_cell_size;
	var length = parseInt(door.attr('length')) * grid_cell_size;
	var direction = door.attr('direction');
	var state = door.attr('state');

	if (direction == 'horizontal') {
		var width = length;
		var height = 9;
		pos_y -= 4;
	} else if (direction == 'vertical') {
		var width = 9;
		var height = length;
		pos_x -= 4;
	} else {
		write_sidebar('Invalid door!');
		return;
	}

	door.css('left', pos_x + 'px');
	door.css('top', pos_y + 'px');
	door.css('width', width + 'px');
	door.css('height', height + 'px');

	if (state == 'open') {
		door_show_open(door);
	} else if (state == 'locked') {
		door_show_locked(door);
	}
}

function door_collision(x1, y1, x2, y2) {
	var x = ((x1 + 0.5) + (x2 + 0.5)) / 2;
	var y = ((y1 + 0.5) + (y2 + 0.5)) / 2;
	var result = false;

	$('div.door').each(function() {
		if ($(this).attr('state') == 'open') {
			return;
		}

		var direction = $(this).attr('direction');

		if (direction == 'horizontal') {
			var wx1 = parseInt($(this).attr('pos_x'));
			var wx2 = wx1 + parseInt($(this).attr('length'));
			var wy = parseInt($(this).attr('pos_y'));

			if ((y == wy) && (x >= wx1) && (x <= wx2)) {
				result = true;
				return false;
			}
		} else if (direction == 'vertical') {
			var wx = parseInt($(this).attr('pos_x'));
			var wy1 = parseInt($(this).attr('pos_y'));
			var wy2 = wy1 + parseInt($(this).attr('length'));

			if ((x == wx) && (y >= wy1) && (y <= wy2)) {
				result = true;
				return false;
			}
		}
	});

	return result;
}

function door_show_closed(door) {
	door.attr('state', 'closed');

	door.css('opacity', '1');
	door.css('background-color', '');

	/* Fog of War
	 */
	if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function door_show_open(door) {
	door.attr('state', 'open');

	door.css('opacity', '0.6');
	door.css('background-color', '#40c040');

	/* Fog of War
	 */
	if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function door_show_locked(door) {
	door_show_closed(door);
	if (dungeon_master) {
		door.css('background-color', '#c00000');
	}

	door.attr('state', 'locked');
}

function door_show_unlocked(door) {
	if (dungeon_master) {
		door_show_closed(door);
	}

	door.attr('state', 'closed');
}

/* Light functions 
 */
function light_create_object(instance_id, pos_x, pos_y, radius) {
	var light = '<div id="light' + instance_id + '" src="/images/light_on.png" class="light" radius="' + radius + '" state="on" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;">';
	if (dungeon_master) {
		light += '<img src="/images/light_on.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px" />';
	}
	light += '</div>';

	$('div.playarea div.lights').append(light);

	/* Fog of War
	 */
	fog_of_war_light($('div#light' + instance_id));

	if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_delete(obj) {
	delete fow_light_char[obj.prop('id')];

	obj.attr('state', 'delete');
	fog_of_war_light(obj);

	if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}

	obj.remove();
}

/* Wall functions
 */
function wall_position(wall) {
	var pos_x = parseInt(wall.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(wall.attr('pos_y')) * grid_cell_size;
	var length = parseInt(wall.attr('length')) * grid_cell_size;
	var direction = wall.attr('direction');

	if (direction == 'horizontal') {
		var width = length;
		var height = 5;
		pos_y -= 2;
	} else if (direction == 'vertical') {
		var width = 5;
		var height = length;
		pos_x -= 2;
	} else {
		write_sidebar('Invalid wall!');
		return;
	}

	if (dungeon_master == false) {
		wall.css('display', 'none');
	}

	wall.css('left', pos_x + 'px');
	wall.css('top', pos_y + 'px');
	wall.css('width', width + 'px');
	wall.css('height', height + 'px');
}

function wall_collision(x1, y1, x2, y2) {
	var x = ((x1 + 0.5) + (x2 + 0.5)) / 2;
	var y = ((y1 + 0.5) + (y2 + 0.5)) / 2;
	var result = false;

	$('div.wall').each(function() {
		var direction = $(this).attr('direction');

		if (direction == 'horizontal') {
			var wx1 = parseInt($(this).attr('pos_x'));
			var wx2 = wx1 + parseInt($(this).attr('length'));
			var wy = parseInt($(this).attr('pos_y'));

			if ((y == wy) && (x >= wx1) && (x <= wx2)) {
				result = true;
				return false;
			}
		} else if (direction == 'vertical') {
			var wx = parseInt($(this).attr('pos_x'));
			var wy1 = parseInt($(this).attr('pos_y'));
			var wy2 = wy1 + parseInt($(this).attr('length'));

			if ((x == wx) && (y >= wy1) && (y <= wy2)) {
				result = true;
				return false;
			}
		}
	});

	return result;
}

/* Zone functions
 */
function zone_create_object(id, pos_x, pos_y, width, height, color, opacity, group) {
	var id = 'zone' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	if (dungeon_master) {
		if (opacity < 0.2) {
			opacity = 0.2;
		} else if (opacity > 0.8) {
			opacity = 0.8;
		}
	}

	var zone = $('<div id="' + id + '" class="zone" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + ';" />');

	if (group != '') {
		zone.attr('group', group);
	}

	$('div.playarea div.zones').append(zone);

	if (dungeon_master) {
		$('div#' + id).append('<div class="script"></div>');
	}
}

/* Marker functions
*/
function marker_create(pos_x, pos_y, name = null) {
	var marker = $('<div class="marker" style="position:absolute; z-index:' + LAYER_MARKER + '; left:' + pos_x + 'px; top:' + pos_y + 'px;"><img src="/images/marker.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" /></div>');

	if (name != null) {
		marker.prepend('<span style="margin-bottom:3px">' + name + '</span>');
	}

	$('div.playarea div.markers').append(marker);
	setTimeout(function() {
		$('div.marker').first().remove();
	}, 5000);
}

/* Collectable functions
 */
function collectables_show() {
	$.post('/object/collectables/found', {
		game_id: game_id,
	}).done(function(data) {
		var body = $('div.collectables div.panel-body');
		body.empty();

		if ($(data).find('collectable').length == 0) {
			var spider = '<img src="/images/spider_web.png" style="float:right; height:100px; margin-bottom:100px; position:relative; top:-15px; right:-15px;" />';
			body.append(spider);
		} else {
			body.append('<div class="row"></div>');
			var row = body.find('div');

			$(data).find('collectable').each(function() {
				var image = $(this).find('image').text();
				var collectable = '<div class="col-sm-4" style="width:115px; height:115px;" onClick="javascript:object_view($(this), 600);"><img src="/resources/' + resources_key + '/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" /></div>';
				row.append(collectable);
			});
		}

		$('div.collectables').show();
	});
}

/* Journal functions
 */
function journal_add_entry(name, content) {
	var entry = '<div class="entry"><span class="writer">' + name + '</span><span class="content">' + content + '</span></div>';
	$('div.journal div.entries').append(entry);

	var panel = $('div.journal div.panel-body');
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_show() {
	object_unfocus();

	$('div.journal').show()

	var panel = $('div.journal div.panel-body');
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

/* Battle functions
 */
function battle_done() {
	write_sidebar('The battle is over!');
}

/* Condition functions
 */
function save_condition(obj, condition) {
	var conditions = localStorage.getItem('conditions');
	if (conditions == undefined) {
		conditions = {};
	} else {
		conditions = JSON.parse(conditions);
	}

	var key = obj.prop('id');
	if (condition != '') {
		conditions[key] = condition;
	} else {
		delete conditions[key];
	}

	localStorage.setItem('conditions', JSON.stringify(conditions));
}

function set_condition(obj, condition) {
	obj.find('span.conditions').remove();

	if (condition != '') {
		obj.append('<span class="conditions">' + condition + '</span>');
	}
}

function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.prop('tagName').toLowerCase() == 'img') {
		obj = obj.parent();
	}

	var parts = key.split('_');
	var travel_map_id = 0;
	if (parts[0] == 'condition') {
		key = parts[0];
		var condition_id = parts[1];
	} else if (parts[0] == 'alternate') {
		key = parts[0];
		var alternate_id = parts[1];
	} else if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
	} else if (parts[0] == 'travel') {
		key = parts[0];
		var travel_map_id = parts[1];
	}

	switch (key) {
		case 'fow_show':
			if (fow_obj == null) {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if (fow_type == FOW_NIGHT) {
					var distance = fow_char_distances[obj.prop('id')];
					fog_of_war_set_distance(distance);
				}
				fog_of_war_update(obj);
				fow_obj = obj;
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
		case 'view':
			object_view(obj);
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

/* Main
 */
$(document).ready(function() {
	group_key = $('div.playarea').attr('group_key');
	game_id = parseInt($('div.playarea').attr('game_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	user_id = parseInt($('div.playarea').attr('user_id'));
	resources_key = $('div.playarea').attr('resources_key');
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('is_dm') == 'yes');
	fow_type = parseInt($('div.playarea').attr('fog_of_war'));
	fow_default_distance = parseInt($('div.playarea').attr('fow_distance'));
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host')
	var ws_port = $('div.playarea').attr('ws_port')

	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + ws_host + ':' + ws_port + '/');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		write_sidebar('Connection established.');

		if (dungeon_master == false) {
			var data = {
				action: 'effect_request',
				map_id: map_id
			};
			websocket_send(data);
		}
	}

	websocket.onmessage = function(event) {
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return;
		}

		if (data.game_id != game_id) {
			return;
		}

		delete data.game_id;
		delete data.user_id;

		switch (data.action) {
			case 'alternate':
				var img_size = data.size * grid_cell_size;
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/characters/' + data.src);
				$('div#' + data.char_id).find('img').css('width', img_size + 'px');
				$('div#' + data.char_id).find('img').css('height', img_size + 'px');
				break;
			case 'audio':
				var audio = new Audio(data.filename);
				audio.play();
				break;
			case 'condition':
				var obj = $('div#' + data.object_id);
				set_condition(obj, data.condition);
				save_condition(obj, data.condition);
				break;
			case 'damage':
				var obj = $('div#' + data.instance_id);
				obj.attr('damage', data.damage);
				obj.find('div.damage').css('width', data.perc);
				if (data.perc == '100%') {
					object_dead(obj);
				} else {
					object_alive(obj);
				}
				break;
			case 'done':
				battle_done();
				break;
			case 'door_state':
				var obj = $('div#' + data.door_id);
				switch (data.state) {
					case 'closed': door_show_closed(obj); break;
					case 'locked': door_show_locked(obj); break;
					case 'open': door_show_open(obj); break;
					case 'unlocked': door_show_unlocked(obj); break;
				}
				break;
			case 'effect_create':
				if (data.map_id != map_id) {
					break;
				}
				if ($('div#' + data.instance_id).length == 0) {
					effect_create_object(data.instance_id, data.src, data.pos_x, data.pos_y, data.width, data.height);
				}
				break;
			case 'effect_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'hide':
				var obj = $('div#' + data.instance_id);
				object_hide(obj);
				break;
			case 'journal':
				journal_add_entry(data.name, data.content);
				write_sidebar(data.name + ' added a journal entry.');
				break;
			case 'light_create':
				light_create_object(data.instance_id, data.pos_x, data.pos_y, data.radius);
				break;
			case 'light_delete':
				var obj = $('div#' + data.instance_id);
				light_delete(obj);
				break;
			case 'light_toggle':
				var light = $('div#light' + data.light_id);
				light.attr('state', data.state);

				fog_of_war_light(light);
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);

				if (obj.hasClass('light')) {
					obj.css('left', data.pos_x + 'px');
					obj.css('top', data.pos_y + 'px');

					fog_of_war_light(obj);
					break;
				}

				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed, function() {
					/* Fog of War
					 */
					if (obj.is(fow_obj)) {
						fog_of_war_update(obj);
					}

				});
				break;
			case 'reload':
				document.location = '/spectate/' + game_id;
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate(obj, data.rotation, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.name, data.mesg);
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show(obj);
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height, data.color, data.opacity, data.group);
				break;
			case 'zone_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'zone_group':
				if (data.zone_group != '') {
					$('div#' + data.zone_id).attr('group', data.zone_group);
				} else {
					$('div#' + data.zone_id).removeAttr('group');
				}
				break;
		}
	};

	websocket.onerror = function(event) {
		write_sidebar('Connection error. Does your firewall allow outgoing traffic via port ' + ws_port + '?');
		websocket = null;
	};

	websocket.onclose = function(event) {
		write_sidebar('Connection closed.');
		websocket = null;
	};

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

	/* Windows
	 */
	$('div.windows > div').css('z-index', LAYER_MENU);

	/* Zones
	 */
	$('div.zone_create div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	/* Lights
	 */
	if (fow_type == FOW_NIGHT) {
		$('div.light').each(function() {
			fog_of_war_light($(this));
		});
	}

	/* Objects
	 */
	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').on('play', function() {
			$('button#playvideo').remove();
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		object_hide($(this));
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate($(this), $(this).attr('rotation'), 0);
	});

	/* Menu tokens
	 */
	$.contextMenu({
		selector: 'div.token img',
		callback: context_menu_handler,
		items: {
			'view': {name:'View', icon:'fa-search'}
		},
		zIndex: LAYER_MENU
	});

	/* Menu characters
	 */
	$.contextMenu({
		selector: 'div.character img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Get information', icon:'fa-info-circle'},
			'view': {name:'View', icon:'fa-search'}
		},
		zIndex: LAYER_MENU
	});

	$('div.collectables div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.journal div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('select.map-selector').click(function(event) {
		event.stopPropagation();
	});

	var conditions = localStorage.getItem('conditions');
	if (conditions != undefined) {
		conditions = JSON.parse(conditions);
		for (var [key, value] of Object.entries(conditions)) {
			set_condition($('div#' + key), value);
		}
	}

	var audio_file = $('div.playarea').attr('audio');
	if (audio_file != undefined) {
		var audio = new Audio(audio_file);
		audio.loop = true;
		audio.play();
	}
});
