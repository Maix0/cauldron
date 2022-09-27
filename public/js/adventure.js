const ROLL_NORMAL = 0;
const ROLL_ADVANTAGE = 1;
const ROLL_DISADVANTAGE = 2;
const FOW_OFF = 0;
const FOW_DAY_CELL = 1;
const FOW_DAY_REAL = 2;
const FOW_NIGHT_CELL = 3;
const FOW_NIGHT_REAL = 4;

const DEFAULT_Z_INDEX = 10000;
const LAYER_TOKEN = DEFAULT_Z_INDEX;
const LAYER_EFFECT = DEFAULT_Z_INDEX + 1;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 2;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 3;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 4;
const LAYER_MARKER = DEFAULT_Z_INDEX + 5;
const LAYER_MENU = DEFAULT_Z_INDEX + 6;
const LAYER_VIEW = DEFAULT_Z_INDEX + 2000;

const DRAW_DEFAULT_COLOR = 1;
const DRAW_DEFAULT_WIDTH = 1;

var websocket;
var group_key = null;
var adventure_id = null;
var map_id = null;
var user_id = null;
var resources_key = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var dungeon_master = null;
var my_name = null;
var my_character = null;
var wf_collectables = null;
var wf_effect_create = null;
var wf_journal = null;
var wf_script_editor = null;
var wf_script_manual = null;
var wf_zone_create = null;
var wf_play_audio = null;
var temporary_hitpoints = 0;
var keep_centered = true;
var focus_obj = null;
var fow_type = null;
var fow_obj = null;
var fow_default_distance = null;
var fow_char_distances = {};
var fow_light_char = {};
var input_history = null;
var input_index = -1;
var mouse_x = 0;
var mouse_y = 0;
var effect_counter = 1;
var effect_x = 0;
var effect_y = 0;
var stick_to = null;
var stick_to_x = 0;
var stick_to_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var zone_menu = null;
var menu_defaults = {
	root: 'div.playarea',
	z_index: LAYER_MENU
};
var ctrl_down = false;
var shift_down = false;
var alt_down = false;
var drawing_canvas = null;
var drawing_ctx = null;
var drawing_history = [];

/* Websocket
 */
function websocket_send(data) {
	if (websocket == null) {
		return;
	}

	data.adventure_id = adventure_id;
	data.from_user_id = user_id;
	data = JSON.stringify(data);

	websocket.send(data);
}

function map_switch() {
	$.post('/object/change_map', {
		adventure_id: adventure_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		var data = {
			action: 'reload'
		};
		websocket_send(data);

		document.location = '/adventure/' + adventure_id;
	});
}

function map_image() {
	$.ajax('/adventure/maps').done(function(data) {
		var maps = '<div><ul class="map_image">';
		$(data).find('maps map').each(function() {
			maps += '<li>/' + $(this).text() + '</li>';
		});
		maps += '</ul></div>';

		var map_dialog = $(maps).windowframe({
			header: 'Maps from Resources',
		});

		$('ul.map_image li').click(function() {
			var map_url = $(this).text();
			var resources_key = $('div.playarea').attr('resources_key');

			map_url = map_url.substr(0, 11) + resources_key + map_url.substr(10);
			map_dialog.close();

			var data = {
				action: 'map_image',
				url: map_url
			};
			websocket_send(data);

			var image = $('<img src="' + map_url + '" />');
			image.one('load', function() {
				$('div#map_background').css('background-image', 'url(' + map_url + ')');
				delete image;
			});
		});

		map_dialog.open();
	});
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function scroll_to_my_character(speed = 1000) {
	if (my_character != null) {
		var spot = my_character;
	} else if (focus_obj != null) {
		var spot = focus_obj;
	} else {
		var spot = $('div.character').first();
		if (spot.length == 0) {
			write_sidebar('No characters on this map!');
			return;
		}
	}

	var pos_x = -($('div.playarea').width() >> 1);
	var pos_y = -($('div.playarea').height() >> 1);

	var pos = object_position(spot);

	pos_x += pos.left + (grid_cell_size >> 1);
	pos_y += pos.top + (grid_cell_size >> 1);

	$('div.playarea').animate({
		scrollLeft: pos_x,
		scrollTop:  pos_y
	}, speed);
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function show_image(img) {
	var image = '<div class="image_overlay" onClick="javascript:$(this).remove()"><img src="' + $(img).attr('src') + '" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); border:1px solid #000000; max-width:80%; max-height:80%; cursor:pointer" /></div>';

	$('body').append(image);
	$('body div.image_overlay').show();
}

function message_to_sidebar(name, message) {
	if ((message.substring(0, 7) == 'http://') || (message.substring(0, 8) == 'https://')) {
		var parts = message.split('.');
		var extension = parts.pop();
		var images = ['gif', 'jpg', 'jpeg', 'png'];

		if (images.includes(extension)) {
			message = '<img src="' + message + '" style="cursor:pointer;" onClick="javascript:show_image(this)" />';
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

function send_message(message, name, write_to_sidebar = true) {
	var data = {
		action: 'say',
		name: name,
		mesg: message
	};
	websocket_send(data);

	if (write_to_sidebar) {
		message_to_sidebar(name, message);
	}
}

function roll_dice(dice, send_to_others = true) {
	var dice_str = dice.replace(/ /g, '');
	dice = dice_str.replace(/\+-/g, '-');
	dice = dice.replace(/-/g, '+-');

	var dices = [2, 4, 6, 8, 10, 12, 20, 100];
	var parts = dice.split('+');
	var output = '';
	var result = 0;

	if (parts.length > 5) {
		return false;
	}

	for (i = 0; i < parts.length; i++) {
		var roll = parts[i].trim().split('d');
		if (roll.length > 2) {
			return false;
		} else if (roll.length == 2) {
			if (roll[0] == '') {
				var count = 1;
			} else {
				var count = parseInt(roll[0]);
			}
			var sides = parseInt(roll[1]);

			if (dices.includes(sides) == false) {
				return false;
			}

			if (count > 25) {
				return false;
			}

			if (isNaN(count) || isNaN(sides)) {
				return false;
			}

			for (r = 0; r < count; r++) {
				var roll = Math.floor(Math.random() * sides) + 1;
				output += '[' + roll + '] ';
				result += roll;
			}
		} else {
			var value = parseInt(roll[0]);
			if (isNaN(value)) {
				return false
			}

			output += roll.toString() + ' ';
			result += value;
		}
	}

	var message = 'Dice roll ' + dice_str + ':\n' + output + ' > ' + result;
	if (send_to_others) {
		send_message(message, my_name);
	} else {
		write_sidebar(message);
	}

	return true;
}

function roll_d20(bonus, type = ROLL_NORMAL) {
	if (bonus == '') {
		bonus = 0;
	} else {
		bonus = parseInt(bonus);
		if (isNaN(bonus)) {
			write_sidebar('Invalid roll bonus.');
			return;
		}
	}

	var roll = Math.floor(Math.random() * 20) + 1;

	switch (type) {
		case ROLL_ADVANTAGE:
			var message = 'Advantage d';
			break;
		case ROLL_DISADVANTAGE:
			var message = 'Disadvantage d';
			break;
		default:
			var message = 'D';
			break;
	}

	message += 'ice roll 1d20';
	if (bonus > 0) {
		message += '+' + bonus;
	} else if (bonus < 0) {
		message += bonus;
	}
	message += ':\n';

	if (type != ROLL_NORMAL) {
		var extra = Math.floor(Math.random() * 20) + 1;
		message += '[' + roll + '] [' + extra + '] > ';
		if (type == ROLL_ADVANTAGE) {
			if (extra > roll) {
				roll = extra;
			}
		} else {
			if (extra < roll) {
				roll = extra;
			}
		}
		message += '[' + roll + ']';

		if ((roll == 20) && (bonus == 0)) {
			message += ' CRIT!';
		}

		message += '\n';
	}

	if ((type == ROLL_NORMAL) || (bonus != 0)) {
		message += '[' + roll + '] ';
		if (bonus != 0) {
			message += bonus + ' ';
		}
		message += '> ' + (roll + bonus);

		if (roll == 20) {
			message += ' CRIT!';
		}
	}

	send_message(message, my_name);
}

function show_help() {
	var help =
		(dungeon_master ?
		'<b>/add &lt;name&gt;</b>: Add NPC to the combat and make it its turn.<br />' : '') +
		'<b>/clear</b>: Clear this sidebar.<br />' +
		(dungeon_master ?
		'<b>/combat</b>: Start a new combat.<br />' : '') +
		'<b>/d20 [&lt;bonus&gt]</b>: Roll d20 dice.<br />' +
		'<b>/d20a [&lt;bonus&gt]</b>: Roll d20 dice with advantage.<br />' +
		'<b>/d20d [&lt;bonus&gt]</b>: Roll d20 dice with disadvantage.<br />' +
		(dungeon_master ? '' :
		'<b>/damage &lt;points&gt;</b>: Damage your character.<br />') +
		(dungeon_master ?
		'<b>/dmroll &lt;dice&gt;</b>: Privately roll dice.<br />' +
		'<b>/done</b>: End the combat.<br />' : '') +
		(dungeon_master ? '' :
		'<b>/heal &lt;points&gt;</b>: Heal your character.<br />') +
		'<b>/labels [hide|show]</b>: Manage character name labels and health bars visibility.<br />' +
		'<b>/log &lt;message&gt;</b>: Add message to journal.<br />' +
		(dungeon_master ?
		'<b>/next [&lt;name&gt;]</b>: Next turn in combat.<br />' +
		'<b>/ping</b>: See who\'s online in the session.<br />' +
		'<b>/reload</b>: Reload current page.<br />' +
		'<b>/remove &lt;name&gt;</b>: Remove one from the combat.<br />' : '') +
		'<b>/roll &lt;dice&gt;</b>: Roll dice.<br />' +
		(dungeon_master ?
		'<b>/walls [hide|show]</b>: Manage walls and windows visibility.<br />' : '') +
		'<b>&lt;message&gt;</b>: Send text message.<br />' +
		'<br />Right-click an icon or the map for a menu with options. Move a character via w, a, s and d and rotate via q and e.';

	write_sidebar(help);
}

function coord_to_grid(coord, edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

function center_character(button) {
	if (keep_centered == false) {
		keep_centered = true;
		if ((my_character != null) || (focus_obj != null)) {
			scroll_to_my_character(0);
		}
		$(button).addClass('btn-primary');
		$(button).removeClass('btn-default');
	} else {
		keep_centered = false;
		$(button).removeClass('btn-primary');
		$(button).addClass('btn-default');
	}

	$(button).blur();
}

function interface_color(button, swap = true) {
	var color = localStorage.getItem('interface_color');

	if (color == undefined) {
		color = 'light';
	}

	if (swap) {
		color = (color == 'light') ? 'dark' : 'light';
	}

	if (color == 'dark') {
		$('div.wrapper').addClass('dark');
		$(button).text('Bright interface');
		localStorage.setItem('interface_color', 'dark');
	} else {
		$('div.wrapper').removeClass('dark');
		$(button).text('Dark interface');
		localStorage.setItem('interface_color', 'light');
	}
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

function object_contextmenu_dm(event) {
	var menu_entries = {};

	menu_entries['info'] = { name:'Get information', icon:'fa-info-circle' };
	menu_entries['view'] = { name:'View', icon:'fa-search' };
	var rotate = {
		'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
		'rotate_ne': { name:'North East' },
		'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
		'rotate_se': { name:'South East' },
		'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
		'rotate_sw': { name:'South West' },
		'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
		'rotate_nw': { name:'North West' }
	};
	menu_entries['rotate'] = { name:'Rotate', icon:'fa-compass', items:rotate };
	menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };
	menu_entries['sep1'] = '-';

	var label = $(this).parent().is(focus_obj) ? 'Unfocus' : 'Focus';
	menu_entries['focus'] = { name:label, icon:'fa-binoculars' };

	menu_entries['handover'] = { name:'Hand over', icon:'fa-hand-stop-o' };
	menu_entries['takeback'] = { name:'Take back', icon:'fa-hand-grab-o' };
	menu_entries['sep2'] = '-';
	menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
	menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
	menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
	menu_entries['zone_create'] = { name:'Zone', icon:'fa-square-o' };
	menu_entries['sep3'] = '-';
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	var hitpoints = parseInt($(this).parent().attr('hitpoints'));
	if (hitpoints > 0) {
		menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
		menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };
	}

	var has = $(this).parent().find('span.conditions').text().split(',');
	var conditions = {};
	conditions['condition_0'] = { name: 'None' };
	conditions['sep0'] = '-';
	$('div.conditions div').each(function() {
		var con_id = $(this).attr('con_id');
		var name = $(this).text();
		var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
		conditions['condition_' + con_id] = { name: name, icon: icon};
	});

	menu_entries['sep4'] = '-';
	menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions};
	menu_entries['sep5'] = '-';
	menu_entries['lower'] = { name:'Lower', icon:'fa-arrow-down' };
	menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

	show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);

	return false;
}

function object_contextmenu_player(event) {
	var menu_entries = {
		'view': { name:'View', icon:'fa-search' },
		'stick': { name:'Stick to / unstick', icon:'fa-lock' },
		'attack': { name:'Attack', icon:'fa-legal' },
		'sep': '-',
		'marker': { name:'Set marker', icon:'fa-map-marker' },
		'distance': { name:'Measure distance', icon:'fa-map-signs' }
	};

	show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
	return false;
}

function object_create(icon, x, y) {
	var token_id = $(icon).attr('token_id');
	var width = parseInt($(icon).attr('obj_width')) * grid_cell_size;
	var height = parseInt($(icon).attr('obj_height')) * grid_cell_size;
	var url = $(icon).attr('src');
	var armor_class = $(icon).attr('armor_class');
	var hitpoints = $(icon).attr('hitpoints');
	var type = $(icon).parent().find('div.name').text();
	var rotation = 180;

	var scr = screen_scroll();
	x = coord_to_grid(x + scr.left - 30, false);
	y = coord_to_grid(y + scr.top - 40, false);

	$.post('/object/create_token', {
		map_id: map_id,
		token_id: token_id,
		pos_x: x / grid_cell_size,
		pos_y: y / grid_cell_size,
	}).done(function(data) {
		var instance_id = $(data).find('instance_id').text();

		var data = {
			action: 'create',
			instance_id: instance_id,
			pos_x: x,
			pos_y: y,
			type: type,
			armor_class: armor_class,
			hitpoints: hitpoints,
			url: url,
			width: width,
			height:height
		};
		websocket_send(data);

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token" style="left:' + x + 'px; top:' + y + 'px; z-index:' + DEFAULT_Z_INDEX + '" type="' + type + '" is_hidden="no" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="0" name="">' +
		          (hitpoints > 0 ? '<div class="hitpoints"><div class="damage" style="width:0%"></div></div>' : '') +
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
			object_rotate($('div#token' + instance_id), rotation, true, 0);
		}

		$('div.playarea div#token' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div#token' + instance_id).contextmenu(object_contextmenu_dm);
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_damage(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));

	if (obj.is(my_character) && (points > 0)) {
		if ((points -= temporary_hitpoints) <= 0) {
			temporary_hitpoints = -points;
			return;
		}

		temporary_hitpoints = 0;
	}

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

	var data = {
		action: 'damage',
		instance_id: obj.prop('id'),
		damage: damage,
		perc: dmg.css('width')
	};
	websocket_send(data);

	$.post('/object/damage', {
		instance_id: obj.prop('id'),
		damage: damage
	});
}

function object_dead(obj) {
	obj.css('background-color', '#c03010');
	obj.css('opacity', '0.7');
	obj.find('div.hitpoints').css('display', 'none');
}

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id')
	}).done(function() {
		obj.remove();

		var data = {
			action: 'delete',
			instance_id: obj.prop('id')
		};
		websocket_send(data);
	});
}

function object_hide(obj, send = true) {
	if (dungeon_master) {
		obj.fadeTo(0, 0.5);
	} else {
		obj.hide(100);
	}
	obj.attr('is_hidden', 'yes');

	if (send) {
		var data = {
			action: 'hide',
			instance_id: obj.prop('id')
		};
		websocket_send(data);

		$.post('/object/hide', {
			instance_id: obj.prop('id')
		});
	}
}

function object_info(obj) {
	var info = '';

	if (obj.hasClass('zone') == false) {
		var name = obj.find('span.name');
		if (name.length > 0) {
			info += 'Name: ' + name.text() + '<br />';
		}

		if (dungeon_master || obj.is(my_character)) {
			if (obj.attr('id').substring(0, 5) == 'token') {
				info += 'Type: ' + obj.attr('type') + '<br />';
			}
			info += 'Armor class: ' + obj.attr('armor_class') + '<br />';
		}

		info += 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

		var hitpoints = parseInt(obj.attr('hitpoints'))

		if (hitpoints > 0) {
			var remaining = hitpoints - parseInt(obj.attr('damage'));
			var bloodied = (((2 * remaining <= hitpoints) && (remaining > 0)) ? ' (bloodied)' : '');
			info +=
				'Damage: ' + obj.attr('damage') + '<br />' +
				'Hit points: ' + remaining.toString() + bloodied + '<br />';
		}

		if (obj.is(my_character)) {
			info += 'Temp, hit points: ' + temporary_hitpoints.toString() + '<br />';
		}

		if (obj.hasClass('character')) {
			info += 'Initiative bonus: ' + obj.attr('initiative') + '<br />';
		}
	}

	if (dungeon_master) {
		info += 'Object ID: ' + obj.attr('id') + '<br />';
	}

	write_sidebar(info);
}

function object_move(obj, speed = 200) {
	var map = $('div.playarea div');
	var max_x = map.width() - obj.width();
	var max_y = map.height() - obj.height();
	var pos = object_position(obj);

	if (pos.left < 0) {
		pos.left = 0;
	} else if (pos.left > max_x) {
		pos.left = max_x;
	}
	pos.left = coord_to_grid(pos.left);

	if (pos.top < 0) {
		pos.top = 0;
	} else if (pos.top > max_y) {
		pos.top = max_y;
	}
	pos.top = coord_to_grid(pos.top);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	var data = {
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: pos.left,
		pos_y: pos.top,
		speed: speed
	};
	websocket_send(data);

	if (obj.hasClass('effect') == false) {
		$.post('/object/move', {
			instance_id: obj.prop('id'),
			pos_x: Math.round(pos.left / grid_cell_size),
			pos_y: Math.round(pos.top / grid_cell_size)
		});
	}

	if (obj.is(my_character)) {
		zone_check_events(obj, pos);
	}

	/* Fog of War
	 */
	if (obj.is(fow_obj) || ((fow_type != FOW_OFF) && obj.is(my_character))) {
		fog_of_war_update(obj);
	}

	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		if (obj.hasClass('character')) {
			light_follow(obj);
		} else if (obj.hasClass('light')) {
			fog_of_war_light(obj);
			if (fow_obj != null) {	
				fog_of_war_update(fow_obj);
			}
		}
	}
}

function object_move_to_sticked(obj) {
	var pos = object_position(obj);
	var new_x = (pos.left + stick_to_x * grid_cell_size).toString();
	var new_y = (pos.top + stick_to_y * grid_cell_size).toString();

	my_character.css('left', new_x + 'px');
	my_character.css('top', new_y + 'px');
	object_move(my_character);
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

function object_rotate(obj, rotation, send_to_backend = true, speed = 500) {
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

	if (send_to_backend) {
		var data = {
			action: 'rotate',
			instance_id: obj.prop('id'),
			rotation: rotation,
			speed: speed
		};
		websocket_send(data);

		$.post('/object/rotate', {
			instance_id: obj.prop('id'),
			rotation: rotation
		});
	}
}

function object_show(obj, send = true) {
	if (dungeon_master) {
		obj.fadeTo(0, 1);
	} else {
		obj.show(100);
	}
	obj.attr('is_hidden', 'no');

	if (send) {
		var data = {
			action: 'show',
			instance_id: obj.prop('id')
		};
		websocket_send(data);

		$.post('/object/show', {
			instance_id: obj.prop('id')
		});
	}
}

function object_step(obj, x, y) {
	var pos = object_position(obj);
	var img = $(obj).find('img');
	var width = Math.round(img.width() / grid_cell_size);
	var height = Math.round(img.height() / grid_cell_size);

	/* Wall collision?
	 */
	var pos_x = pos.left / grid_cell_size;
	var pos_y = pos.top / grid_cell_size;

	if ((width == 1) && (height == 1)) {
		/* 1 x 1
		 */
		if (wall_collision(pos_x, pos_y, pos_x + x, pos_y + y)) {
			return;
		}
		if (door_collision(pos_x, pos_y, pos_x + x, pos_y + y)) {
			return;
		}
	} else if (width == height) {
		/* N x N
		 */
		pos_x += x;
		pos_y += y;
		width -= 1;
		height -= 1;

		for (bx = 0; bx < width; bx++) {
			if (wall_collision(pos_x + bx, pos_y, pos_x + bx + 1, pos_y)) {
				return;
			}
			if (wall_collision(pos_x + bx, pos_y + height, pos_x + bx + 1, pos_y + height)) {
				return;
			}

			if (door_collision(pos_x + bx, pos_y, pos_x + bx + 1, pos_y)) {
				return;
			}
			if (door_collision(pos_x + bx, pos_y + height, pos_x + bx + 1, pos_y + height)) {
				return;
			}
		}

		for (by = 0; by < height; by++) {
			if (wall_collision(pos_x, pos_y + by, pos_x, pos_y + by + 1)) {
				return;
			}
			if (wall_collision(pos_x + width, pos_y + by, pos_x + width, pos_y + by + 1)) {
				return;
			}

			if (door_collision(pos_x, pos_y + by, pos_x, pos_y + by + 1)) {
				return;
			}
			if (door_collision(pos_x + width, pos_y + by, pos_x + width, pos_y + by + 1)) {
				return;
			}
		}
	}

	pos.left += (x * grid_cell_size);
	pos.top += (y * grid_cell_size);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');
	object_move(obj, 50);

	if (stick_to != null) {
		stick_to_x += x;
		stick_to_y += y;
	}

	if (keep_centered) {
		scroll_to_my_character(0);
	}
}

function object_steer(event) {
	if (my_character != null) {
		var hitpoints = parseInt(my_character.attr('hitpoints'));
		var damage = parseInt(my_character.attr('damage'));

		if (damage == hitpoints) {
			return;
		}
	}

	if (my_character != null) {
		var obj = my_character;
	} else if (focus_obj != null) {
		var obj = focus_obj;
	} else {
		return;
	}

	switch (event.which) {
		case 81: // q
			object_turn(obj, -45);
			return;
		case 69: // e
			object_turn(obj, 45);
			return;
	}

	var directions = {
		  0: [ 0, -1],
		 45: [ 1, -1],
		 90: [ 1,  0],
		135: [ 1,  1],
		180: [ 0,  1],
		225: [-1,  1],
		270: [-1,  0],
		315: [-1, -1]
	}

	var rotation = parseInt(obj.attr('rotation'));

	switch (event.which) {
		case 65: // a
			rotation = (rotation + 270) % 360;
			break;
		case 68: // d
			rotation = (rotation + 90) % 360;
			break;
		case 87: // w
			break;
		case 83: // s
			rotation = (rotation + 180) % 360;
			break;
		default:
			return;
	}

	var direction = directions[rotation];
	var x = direction[0];
	var y = direction[1];

	object_step(obj, x, y);
}

function object_turn(obj, direction) {
	var rotation = parseInt(obj.attr('rotation')) + direction;
	if (rotation < 0) {
		rotation += 360;
	} else if (rotation >= 360) {
		rotation -= 360;
	}

	object_rotate(obj, rotation, true, 100);
}

function object_unfocus() {
	if (focus_obj != null) {
		focus_obj.find('img').css('border', '');
		focus_obj = null;
	}
}

function object_view(obj, max_size = 300) {
	var collectable_id = obj.attr('c_id');

	if (my_character != null) {
		var char_pos = object_position(my_character);
		var obj_pos = object_position(obj);
		var diff_x = Math.abs(char_pos.left - obj_pos.left) / grid_cell_size;
		var diff_y = Math.abs(char_pos.top - obj_pos.top) / grid_cell_size;

		if ((diff_x > 2) || (diff_y > 2)) {
			collectable_id = undefined;
		}
	}

	if (collectable_id == undefined) {
		var src = obj.find('img').prop('src');
	} else {
		var src = '/resources/' + resources_key + '/collectables/' + obj.attr('c_src');
	}

	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; z-index:' + LAYER_VIEW + '; top:0; left:0; right:0; bottom:0; background-color:rgba(255, 255, 255, 0.8);';
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%)';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px;';

	var transform = obj.find('img').css('transform');
	if ((transform != 'none') && (collectable_id == undefined)) {
		img_style += ' transform:' + transform + ';';
	}

	if (((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) || (collectable_id != undefined)) {
		img_style += ' border:1px solid #000000; background-color:#ffffff;';
	}

	var view = $('<div id="view" style="' + div_style + '" onClick="' + onclick +'"><span style="' + span_style + '"><img src="' + src + '" style="' + img_style + '" /></span></div>');
	$('body').append(view);

	if ((collectable_id != undefined) && (dungeon_master == false)) {
		$('div#view span').append('<div class="btn-group" style="width:100%"><button class="btn btn-default" style="width:100%">Take item</button></div>');
		$('div#view span button').on('click', function() {
			obj.attr('c_id', null);

			$.post('/object/collectable/found', {
				collectable_id: collectable_id
			});

			send_message(my_name + ' has found an item! Check the inventory.', my_name, false);

			if (obj.attr('c_hide') == 'yes') {
				object_hide(obj);
			}
		});
	}
}

/* Effects
 */
function effect_create_object(effect_id, src, pos_x, pos_y, width, height) {
	width *= grid_cell_size;
	height *= grid_cell_size;

	var effect = $('<div id="' + effect_id +'" class="effect" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + width + 'px; height:' + height + 'px; z-index:' + LAYER_EFFECT + ';"><img src="' + src + '" style="width:100%; height:100%;" /></div>');

	$('div.playarea div.effects').append(effect);
}

function effect_create(template) {
	wf_effect_create.close();

	var src = $(template).prop('src');

	var width = parseInt($('input#effect_width').val());
	if (width == undefined) {
		write_sidebar('Invalid effect width.');
		return;
	}
	if ((width < 1) || (width > 50)) {
		write_sidebar('Invalid effect width.');
		return;
	}

	var height = parseInt($('input#effect_height').val());
	if (height == undefined) {
		write_sidebar('Invalid effect height.');
		return;
	}
	if ((height < 1) || (height > 50)) {
		write_sidebar('Invalid effect height.');
		return;
	}

	var effect_id = effect_counter + '_' + map_id;
	effect_create_object(effect_id, src, effect_x, effect_y, width, height);
	effect_create_final(effect_id, src, width, height);
	effect_counter++;
}

function effect_create_final(effect_id, src, width, height) {
	var data = {
		action: 'effect_create',
		map_id: map_id,
		instance_id: effect_id,
		src: src,
		pos_x: effect_x,
		pos_y: effect_y,
		width: width,
		height: height
	};
	websocket_send(data);

	$('div#' + effect_id).draggable({
		containment: 'div.playarea > div',
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$('div#' + effect_id).contextmenu(function(event) {
		var menu_entries = {
			'handover': { name:'Hand over', icon:'fa-hand-stop-o' },
			'takeback': { name:'Take back', icon:'fa-hand-grab-o' },
			'sep1': '-',
			'marker': { name:'Set marker', icon:'fa-map-marker' },
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Get coordinates', icon:'fa-flag' },
			'sep2': '-',
			'effect_duplicate': { name:'Duplicate', icon:'fa-copy' },
			'effect_delete': { name:'Delete', icon:'fa-trash' }
		};

		show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('span#infobar').text('');
	$('div.ruler').remove();
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

function door_send_state(door) {
	var data = {
		action: 'door_state',
		door_id: door.prop('id'),
		state: door.attr('state')
	};
	websocket_send(data);

	$.post('/object/door_state', {
		door_id: door.prop('id').substring(4),
		state: door.attr('state')
	});
}

function door_nearby(door) {
	if (my_character == null) {
		return false;
	}

	var door_x = parseInt(door.attr('pos_x'));
	var door_y = parseInt(door.attr('pos_y'));
	var length = parseInt(door.attr('length'));
	var direction = door.attr('direction');

	if (direction == 'horizontal') {
		door_y -= 0.5;
	} else if (direction == 'vertical') {
		door_x -= 0.5;
	}

	var my_pos = object_position(my_character);
	var my_x = my_pos.left / grid_cell_size;
	var my_y = my_pos.top / grid_cell_size;

	var my_size = my_character.width() / grid_cell_size;
	if (door_x > my_x) {
		my_x += (my_size - 1);
	}
	if (door_y > my_y) {
		my_y += (my_size - 1);
	}

	while (length > 0) {
		var dist_x = Math.abs(door_x - my_x);
		var dist_y = Math.abs(door_y - my_y);
		var distance = Math.max(dist_x, dist_y);

		if (distance <= 1.5) {
			return true;
		}

		if (direction == 'horizontal') {
			door_x++;
		} else if (direction == 'vertical') {
			door_y++;
		} else {
			write_sidebar('Invalid door');
		}

		length--;
	}

	return false;
}

function door_make_closed(door) {
	if (door.attr('state') != 'open') {
		return;
	}

	if (dungeon_master == false) {
		if (door_nearby(door) == false) {
			write_sidebar('You are too far away.');
			return;
		}
	}

	write_sidebar('The door is now closed.');
	door_show_closed(door);
	door_send_state(door);
}

function door_make_locked(door) {
	if ((dungeon_master == false) || (door.attr('state') == 'locked')) {
		return;
	}

	write_sidebar('The door is now locked.');
	door_show_locked(door);
	door_send_state(door);
}

function door_make_open(door) {
	if (door.attr('state') == 'open') {
		return;
	}

	if (dungeon_master == false) {
		if (door_nearby(door) == false) {
			write_sidebar('You are too far away.');
			return;
		}

		if (door.attr('state') == 'locked') {
			write_sidebar('The door won\'t go open.');
			return;
		}
	}

	write_sidebar('The door is now open.');
	door_show_open(door);
	door_send_state(door);
}

function door_make_unlocked(door) {
	if ((dungeon_master == false) || (door.attr('state') != 'locked')) {
		return;
	}

	write_sidebar('The door is now unlocked.');
	door_show_unlocked(door);
	door_send_state(door);
}

function door_show_closed(door) {
	door.attr('state', 'closed');

	door.css('opacity', '1');
	door.css('background-color', '');

	/* Fog of War
	 */
	if ((fow_type != FOW_OFF) && (my_character != null)) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function door_show_open(door) {
	door.attr('state', 'open');

	door.css('opacity', '0.6');
	door.css('background-color', '#40c040');

	/* Fog of War
	 */
	if ((fow_type != FOW_OFF) && (my_character != null)) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
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
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		fog_of_war_light($('div#light' + instance_id));
	}

	if ((fow_type != FOW_OFF) && my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_create(pos_x, pos_y, radius) {
	$.post('/object/create_light', {
		map_id: map_id,
		pos_x: pos_x / grid_cell_size,
		pos_y: pos_y / grid_cell_size,
		radius: radius
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		light_create_object(instance_id, pos_x, pos_y, radius);

		var data = {
			action: 'light_create',
			instance_id: instance_id,
			pos_x: pos_x,
			pos_y: pos_y,
			radius: radius
		};
		websocket_send(data);

		$('div#light' + instance_id).draggable({
			containment: 'div.playarea > div',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div#light' + instance_id).contextmenu(function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'on') {
				menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
			} else {
				menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
			}

			menu_entries['light_attach'] = { name:'Attach to character', icon:'fa-compress' };
			menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		alert('Light create error');
	});
}

function light_follow(character, pos_x = null, pos_y = null) {
	var fow_update = false;

	for (var [key, value] of Object.entries(fow_light_char)) {
		if (character.prop('id') != value) {
			continue;
		}

		if (pos_x == null) {
			var pos = object_position(character);
			pos_x = pos.left;
			pos_y = pos.top;
		}

		var light = $('div#' + key);
		light.css('left', pos_x + 'px');
		light.css('top', pos_y + 'px');
		object_move(light);

		if (fow_obj != null) {
			fow_update = true;
			fog_of_war_light(light);
		}
	}

	if (fow_update) {
		fog_of_war_update(fow_obj);
	}
}

function light_state(obj, state) {
	obj.attr('state', state);
	obj.find('img').attr('src', '/images/light_' + state + '.png');

	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		fog_of_war_light(obj);
	}

	if ((fow_type != FOW_OFF) && (my_character != null)) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_delete(obj) {
	delete fow_light_char[obj.prop('id')];

	obj.attr('state', 'delete');
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		fog_of_war_light(obj);
	}

	if ((fow_type != FOW_OFF) && (my_character != null)) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
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

/* Blinder functions
 */
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
	var pos1_y = parseInt(blinder.attr('pos1_y'));
	var pos2_x = parseInt(blinder.attr('pos2_x'));
	var pos2_y = parseInt(blinder.attr('pos2_y'));
	var angle = points_angle(pos1_x, pos1_y, pos2_x, pos2_y);
	var distance = points_distance(pos1_x, pos1_y, pos2_x, pos2_y);

	if (dungeon_master == false) {
		blinder.css('display', 'none');
	}

	blinder.css('left', pos1_x + 'px');
	blinder.css('top', pos1_y + 'px');
	blinder.css('width', distance + 'px');
	blinder.css('height', '4px');
	blinder.css('transform', 'rotate(' + angle + 'deg)');
}

/* Zone functions
 */
function zone_announce_group_id(zone_id, zone_group) {
	var data = {
		action: 'zone_group',
		zone_id: zone_id,
		zone_group: zone_group
	};
	websocket_send(data);
}

function zone_check_events(obj, pos) {
	var zone_events = {
		leave: [],
		move:  [],
		enter: []
	}

	$('div.zone').each(function() {
		var in_zone = zone_covers_position($(this), pos);
		var zone_id = $(this).prop('id');
		var zone_event = null;

		if (in_zone) {
			if (zone_presence.includes(zone_id) == false) {
				zone_presence.push(zone_id);
				zone_event = 'enter';
			} else {
				zone_event = 'move';
			}
		} else {
			if (zone_presence.includes(zone_id)) {
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
			var data = {
				action: 'event',
				zone: zone_id,
				character: obj.prop('id'),
				zone_event: event_type,
				pos_x: pos.left,
				pos_y: pos.top
			};
			websocket_send(data);
		});
	}
}

function zone_check_presence_for_turn(character) {
	var char_id = character.prop('id');
	var my_pos = object_position(character);

	$('div.zone').each(function() {
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

		zone_run_script($(this).prop('id'), char_id, 'turn', my_pos.left, my_pos.top);
	});
}

function zone_covers_position(zone, pos) {
	var zone_pos = object_position(zone);

	if (pos.left < zone_pos.left) {
		return false;
	} else if (pos.top < zone_pos.top) {
		return false;
	} else if (pos.left >= zone_pos.left + zone.width()) {
		return false;
	} else if (pos.top >= zone_pos.top + zone.height()) {
		return false;
	}

	return true;
}

function zone_create_object(id, pos_x, pos_y, width, height, color, opacity, group, altitude) {
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

	var zone = $('<div id="' + id + '" class="zone" altitude="' + altitude + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + ';" />');

	if (group != '') {
		zone.attr('group', group);
	}

	$('div.playarea div.zones').append(zone);

	if (dungeon_master) {
		$('div#' + id).append('<div class="script"></div>');
	}

	if (altitude > 0) {
		if ((fow_type != FOW_OFF) && (my_character != null)) {
			fog_of_war_update(my_character);
		} else if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}
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

		zone_create_object(instance_id, zone_x, zone_y, width, height, color, opacity, group, altitude);

		$('div#zone' + instance_id).draggable({
			containment: 'div.playarea > div',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		var data = {
			action: 'zone_create',
			instance_id: instance_id,
			pos_x: zone_x,
			pos_y: zone_y,
			width: width,
			height: height,
			color: color,
			opacity: opacity,
			group: group,
			altitude: altitude
		};
		websocket_send(data);

		$('div#zone' + instance_id).contextmenu(function(event) {
			var menu_entries = zone_menu;

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		alert('Zone create error');
	});
}

function zone_delete(obj) {
	var zone_id = obj.prop('id');
	if (zone_id.substring(0, 4) != 'zone') {
		return;
	}

	$.post('/object/delete', {
		instance_id:zone_id
	}).done(function() {
		var data = {
			action: 'zone_delete',
			instance_id: zone_id
		};
		websocket_send(data);

		obj.remove();
	});
}

function zone_init_presence() {
	if (my_character == null) {
		return;
	}

	var my_pos = object_position(my_character);

	zone_presence = [];
	$('div.zone').each(function() {
		if (zone_covers_position($(this), my_pos)) {
			zone_presence.push($(this).prop('id'));
		}
	});
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
		adventure_id: adventure_id,
	}).done(function(data) {
		var body = wf_collectables.body();
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
	});
}

/* Journal functions
 */
function journal_add_entry(name, content) {
	var entry = '<div class="entry"><span class="writer">' + name + '</span><span class="content">' + content + '</span></div>';
	$('div.journal div.entries').append(entry);

	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_save_entry(name, content) {
	var data = {
		action: 'journal',
		name: name,
		content: content
	};
	websocket_send(data);

	$.post('/object/journal', {
		adventure_id: adventure_id,
		content: content
	});
}

function journal_show() {
	object_unfocus();

	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_write() {
	var textarea = $('div.journal textarea');
	var content = textarea.val().trim();
	textarea.val('');

	if (content == '') {
		return;
	}

	journal_add_entry(my_name, content);
	journal_save_entry(my_name, content);
}

/* Combat functions
 */
function combat_done() {
	if (dungeon_master) {
		combat_stop();
	}

	temporary_hitpoints = 0;

	write_sidebar('The combat is over.');
}

/* Condition functions
 */
function save_conditions(obj, condition) {
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

function set_conditions(obj, conditions) {
	obj.find('span.conditions').remove();

	if (conditions != '') {
		obj.append('<span class="conditions">' + conditions + '</span>');
	}
}

function set_condition(obj, condition, only_set = false) {
	var key = obj.prop('id');

	if (condition != null) {
		var conditions = $('div#' + key).find('span.conditions').text();
		if (conditions == '') {
			conditions = [];
		} else {
			conditions = conditions.replace('<br />', '');
			conditions = conditions.split(',');
		}

		if (conditions.includes(condition)) {
			if (only_set) {
				return;
			}
			conditions = array_remove(conditions, condition);
		} else {
			conditions.push(condition);
			conditions.sort();
		}
	} else {
		var conditions = [];
	}

	conditions = conditions.join(',<br />');
	set_conditions(obj, conditions);
	save_conditions(obj, conditions);

	var data = {
		action: 'condition',
		object_id: key,
		condition: conditions
	};
	websocket_send(data);
}

/* Input functions
 */
function handle_input(input) {
	input = input.trim();

	if (input == '') {
		return;
	}

	if (input.substring(0, 1) != '/') {
		if (input.substring(0, 4).toLowerCase() == "dice") {
			return;
		}
		send_message(input, my_name);
		return;
	}

	var parts = input.split(' ', 1);
	var command = parts[0].substring(1);
	var param = input.substring(parts[0].length + 1).trim();

	switch (command) {
		case 'add':
			if (dungeon_master == false) {
				break;
			}

			if (param.trim() == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
			} else {
				combat_add(param);
			}
			break;
		case 'audio':
			wf_play_audio.open();
			break;
		case 'cauldron':
			write_sidebar('<img src="/images/cauldron.png" />');
			break;
		case 'clear':
			$('div.sidebar').empty();
			break;
		case 'combat':
			if (dungeon_master == false) {
				break;
			}

			combat_start();
			break;
		case 'd20':
			roll_d20(param);
			break;
		case 'd20a':
			roll_d20(param, ROLL_ADVANTAGE);
			break;
		case 'd20d':
			roll_d20(param, ROLL_DISADVANTAGE);
			break;
		case 'damage':
		case 'dmg':
			if (my_character == null) {
				write_sidebar('You have no character.');
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				$('div.input input').val(input);
				break;
			}

			object_damage(my_character, points);
			break;
		case 'dmroll':
			if (dungeon_master == false) {
				break;
			}

			if (roll_dice(param, false) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
			}
			break;
		case 'done':
			if (dungeon_master == false) {
				break;
			}

			combat_done();

			var data = {
				action: 'done'
			};
			websocket_send(data);
			break;
		case 'heal':
			if (my_character == null) {
				write_sidebar('You have no character.');
				$('div.input input').val(input);
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points');
				break;
			}

			object_damage(my_character, -points);
			break;
		case 'help':
			show_help();
			break;
		case 'history':
			var history = 'Input history:<br />\n';
			input_history.forEach(function(value) {
				history += value + '<br />\n';
			});
			write_sidebar(history);
			break;
		case 'inventory':
			wf_collectables.open();
			break;
		case 'journal':
			wf_journal.open();
			break;
		case 'labels':
			if ((param == 'off') || (param == 'hide')) {
				$('div.character div.hitpoints').css('display', 'none');
				$('div.character span').css('display', 'none');

				$('div.character').hover(function() {
					$(this).find('div.hitpoints').css('display', 'block');
					$(this).find('span').css('display', 'block');
				}, function() {
					$(this).find('div.hitpoints').css('display', 'none');
					$(this).find('span').css('display', 'none');
				});
			} else if ((param == 'on') || (param == 'show')) {
				$('div.character div.hitpoints').css('display', 'block');
				$('div.character span').css('display', 'block');

				$('div.character').off('mouseenter mouseleave');
			}
			break;
		case 'log':
			if (param != '') {
				journal_add_entry(my_name, param);
				journal_save_entry(my_name, param);
				write_sidebar('Journal entry added.');
			}
			break;
		case 'next':
			if (dungeon_master == false) {
				break;
			}

			combat_next(param);
			break;
		case 'ping':
			if (dungeon_master == false) {
				break;
			}

			write_sidebar('Present in this session:');

			var data = {
				action: 'ping'
			};
			websocket_send(data);
			break;
		case 'reload':
			if (dungeon_master == false) {
				break;
			}

			var data = {
				action: 'reload'
			};
			websocket_send(data);

			location.reload();
			break;
		case 'remove':
			if (dungeon_master == false) {
				break;
			}

			if (param == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
			} else {
				combat_remove(param);
			}
			break;
		case 'roll':
			if (roll_dice(param) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
			}
			break;
		case 'version':
			var version = $('div.playarea').attr('version');
			write_sidebar('Cauldron v' + version + '.');
			break;
		case 'walls':
			if (dungeon_master == false) {
				return;
			}

			if ((param == 'off') || (param == 'hide')) {
				$('div.wall').css('display', 'none');
				$('div.blinder').css('display', 'none');
			} else if ((param == 'on') || (param == 'show')) {
				$('div.wall').css('display', 'block');
				$('div.blinder').css('display', 'block');
			}
			break;
		default:
			write_sidebar('Unknown command.');
			$('div.input input').val(input);
	}
}

function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.prop('tagName').toLowerCase() == 'img') {
		obj = obj.parent();
	}

	var parts = key.split('_');
	var travel_map_id = 0;
	if (parts[0] == 'alternate') {
		key = parts[0];
		var alternate_id = parts[1];
	} else if (parts[0] == 'condition') {
		key = parts[0];
		var condition_id = parts[1];
	} else if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
	} else if (parts[0] == 'shape') {
		key = parts[0];
		var shape_change_id = parts[1];
	} else if (parts[0] == 'travel') {
		key = parts[0];
		var travel_map_id = parts[1];
	}

	switch (key) {
		case 'alternate':
			if (alternate_id == 0) {
				var filename = my_character.find('img').attr('orig_src');
				var size = 1;
			} else {
				var alternate = $('div.alternates div[icon_id=' + alternate_id + ']');
				var filename = 'characters/' + alternate.attr('filename');
				var size = alternate.attr('size');
			}

			var img_size = size * grid_cell_size;

			my_character.find('img').attr('src', '/resources/' + resources_key + '/' + filename);
			my_character.find('img').css('width', img_size + 'px');
			my_character.find('img').css('height', img_size + 'px');

			var data = {
				action: 'alternate',
				char_id: my_character.attr('id'),
				size: size,
				src: filename
			};
			websocket_send(data);

			$.post('/object/alternate', {
				adventure_id: adventure_id,
				char_id: my_character.attr('char_id'),
				alternate_id: alternate_id
			});

			if ((fow_type != FOW_OFF) && (my_character != null)) {
				fog_of_war_update(my_character);
			}
			break;
		case 'armor':
			if (my_character == null) {
				return;
			}

			var armor_class = my_character.attr('armor_class');
			var points = window.prompt('Armor class:', armor_class);
			if (points == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid armor class.');
				break;
			}

			var data = {
				action: 'armor',
				instance_id: my_character.prop('id'),
				points: points
			};
			websocket_send(data);

			$.post('/object/armor_class', {
				instance_id: my_character.prop('id'),
				armor_class: points
			});

			my_character.attr('armor_class', points);
			break;
		case 'attack':
			var bonus = 0;
			if ((bonus = window.prompt('Attack bonus:', bonus)) == undefined) {
				break;
			}

			bonus = parseInt(bonus);
			if (isNaN(bonus)) {
				write_sidebar('Invalid attack bonus.');
				break;
			}

			var armor_class = parseInt(obj.attr('armor_class'));

			var message = '';
			var name = obj.find('span.name').text();
			if (name != '') {
				message += 'Target: ' + name + '\n';
			} else {
				message += 'Target: ' + obj.prop('id') + '\n';
			}

			var roll = Math.floor(Math.random() * 20) + 1;

			if (dungeon_master == false) {
				message += 'Attack roll: [' + roll + ']';

				if (bonus > 0) {
					message += ' ' + bonus + ' > ' + (roll + bonus);
				}

				message += '\n';
			}

			message += 'Result: ';

			if (roll == 20) {
				message += 'CRIT!';
			} else if (((roll + bonus) >= armor_class) && (roll > 1)) {
				message += 'hit!';
			} else {
				message += 'miss';
			}

			send_message(message, my_name);

			if (dungeon_master) {
				write_sidebar('&nbsp;&nbsp;&nbsp;&nbsp;Attack roll: ' + roll);
			}
			break;
		case 'condition':
			if (condition_id > 0) {
				var condition = $('div.conditions div[con_id=' + condition_id + ']').text();
				set_condition(obj, condition);
			} else {
				set_condition(obj, null);
			}
			break;
		case 'coordinates':
			var pos_x = coord_to_grid(mouse_x, false) / grid_cell_size;
			var pos_y = coord_to_grid(mouse_y, false) / grid_cell_size;
			write_sidebar('Coordinates: ' + pos_x + ', ' + pos_y);
			break;
		case 'damage':
			var points = window.prompt('Points:');
			if (points == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				break;
			}

			object_damage(obj, points);
			break;
		case 'delete':
			if (confirm('Delete object?')) {
				object_delete(obj);
			}
			break;
		case 'distance':
			measuring_stop();

			var ruler_position = function(to_x, to_y) {
				var angle = points_angle(ruler_x, ruler_y, to_x, to_y);
				var distance = points_distance(ruler_x, ruler_y, to_x, to_y);

				var ruler = $('div.ruler');
				ruler.css('width', distance + 'px');
				ruler.css('height', '4px');
				ruler.css('transform', 'rotate(' + angle + 'deg)');

				var from_x = coord_to_grid(mouse_x, false);
				var from_y = coord_to_grid(mouse_y, false);

				measure_diff_x = Math.round(Math.abs(to_x - from_x) / grid_cell_size);
				measure_diff_y = Math.round(Math.abs(to_y - from_y) / grid_cell_size);

				var distance = (measure_diff_x > measure_diff_y) ? measure_diff_x : measure_diff_y;

				$('span#infobar').text(distance + ' / ' + (distance * 5) + 'ft / ' + (measure_diff_x + 1) + 'x' + (measure_diff_y + 1));
			}

			var ruler_x = coord_to_grid(mouse_x, false);
			var ruler_y = coord_to_grid(mouse_y, false);
			var ruler = '<div class="ruler" />';
			$('div.playarea div.markers').append(ruler);
			$('div.ruler').each(function() {
				ruler_position(ruler_x, ruler_y);
			});

			var ruler = $('div.ruler');
			ruler.css('left', (ruler_x + (grid_cell_size >> 1)) + 'px');
			ruler.css('top', (ruler_y + (grid_cell_size >> 1)) + 'px');

			$('div.playarea').mousemove(function(event) {
				var scr = screen_scroll();
				var to_x = event.clientX + scr.left - 16;
				to_x = coord_to_grid(to_x, false);
				var to_y = event.clientY + scr.top - 41;
				to_y = coord_to_grid(to_y, false);

				ruler_position(to_x, to_y);
			});

			$('div.playarea').on('click', function(event) {
				measuring_stop();
			});
			break;
		case 'door_close':
			door_make_closed(obj);
			break;
		case 'door_lock':
			door_make_locked(obj);
			break;
		case 'door_open':
			door_make_open(obj);
			break;
		case 'door_unlock':
			door_make_unlocked(obj);
			break;
		case 'effect_create':
			effect_x = coord_to_grid(mouse_x, false);
			effect_y = coord_to_grid(mouse_y, false);
			wf_effect_create.open();
			break;
		case 'effect_duplicate':
			var pos = object_position($(this));
			effect_x = pos.left + grid_cell_size;
			effect_y = pos.top;

			var src = $(this).find('img').prop('src');
			var width = parseInt($(this).width()) / grid_cell_size;
			var height = parseInt($(this).height()) / grid_cell_size;

			var effect_id = effect_counter + '_' + map_id;
			effect_create_object(effect_id, src, effect_x, effect_y, width, height);
			effect_create_final(effect_id, src, width, height);
			effect_counter++;
			break;
		case 'effect_delete':
			var data = {
				action: 'effect_delete',
				instance_id: obj.prop('id')
			};
			websocket_send(data);

			obj.remove();
			break;
		case 'focus':
			if (focus_obj != null) {
				focus_obj.find('img').css('border', '');
			}
			if (obj.is(focus_obj) == false) {
				focus_obj = obj;
				focus_obj.find('img').css('border', '1px solid #ffa000');
			} else {
				focus_obj = null;
			}
			break;
		case 'fow_show':
			if (fow_obj == null) {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
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
		case 'fow_distance':
			var distance = fow_char_distances[obj.prop('id')];
			if ((distance = window.prompt('Distance:', distance)) == undefined) {
				return;
			}

			distance = parseInt(distance);
			if (isNaN(distance)) {
				write_sidebar('Invalid distance.');
				break;
			} else if (distance < 1) {
				write_sidebar('Invalid distance.');
				break;
			}

			fow_char_distances[obj.prop('id')] = distance;

			if (obj.is(fow_obj)) {
				fog_of_war_set_distance(distance);
				fog_of_war_update(fow_obj);
			}

			var data = {
				action: 'fow_distance',
				instance_id: obj.prop('id'),
				distance: distance
			};
			websocket_send(data);
			break;
		case 'handover':
			if (focus_obj == null) {
				write_sidebar('Focus on a character first.');
				return;
			}

			if (focus_obj.hasClass('character') == false) {
				write_sidebar('Focus on a character first.');
				return;
			}

			var data = {
				action: 'handover',
				instance_id: obj.prop('id'),
				owner_id: focus_obj.prop('id')
			};
			websocket_send(data);
			break;
		case 'heal':
			var points = window.prompt('Points:');
			if (points == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points.');
				break;
			}

			object_damage(obj, -points);
			break;
		case 'info':
			object_info(obj);
			break;
		case 'light_create':
			var pos_x = coord_to_grid(mouse_x, false);
			var pos_y = coord_to_grid(mouse_y, false);

			wf_light_create = $('<p><input id="light_new" type="text" value="3" class="form-control" /></p>').windowframe({
				width: 530,
				style: 'danger',
				header: 'Create light',
				buttons: {
					'Create': function() {
						var radius = parseInt($('input#light_new').val());

						if (isNaN(radius)) {
							write_sidebar('Invalid radius.');
							return;
						} else if (radius < 0) {
							write_sidebar('Invalid radius.');
							return;
						}

						light_create(pos_x, pos_y, radius);

						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					}
				},
				open: function() {
					$('input#light_new').focus();
				},
				close: function() {
					wf_light_create.destroy();
				}
			});

			wf_light_create.open();
			break;
		case 'light_delete':
			if (confirm('Delete light?')) {
				$.post('/object/delete', {
					instance_id: obj.prop('id'),
				}).done(function() {
					var data = {
						action: 'light_delete',
						instance_id: obj.prop('id')
					};
					websocket_send(data);

					light_delete(obj);
				});
			}
			break;
		case 'light_attach':
			if (focus_obj == null) {
				write_sidebar('Focus on a character first.');
				break;
			}

			if (focus_obj.hasClass('character') == false) {
				write_sidebar('Focus on a character first.');
				break;
			}

			var pos = object_position(focus_obj);
			obj.css('left', pos.left + 'px');
			obj.css('top', pos.top + 'px');
			object_move(obj);

			if (fow_obj != null) {
				fog_of_war_light(obj);
				fog_of_war_update(fow_obj);
			}

			fow_light_char[obj.prop('id')] = focus_obj.prop('id');
			break;
		case 'light_detach':
			for (var [key, value] of Object.entries(fow_light_char)) {
				if (obj.attr('id') == value) {
					delete fow_light_char[key];
				}
			}
			break;
		case 'light_remove':
			if (confirm('Remove light?') == false) {
				break;
			}

			for (var [key, value] of Object.entries(fow_light_char)) {
				if (obj.attr('id') == value) {
					delete fow_light_char[key];

					$.post('/object/delete', {
						instance_id: key,
					}).done(function() {
						var data = {
							action: 'light_delete',
							instance_id: key
						};
						websocket_send(data);

						var light = $('div#' + key);
						light_delete(light);
					});
				}
			}
			break;
		case 'light_toggle':
			var toggle = { on:'off', off:'on' };
			var state = toggle[obj.attr('state')];
			var light_id = obj.prop('id').substring(5);

			$.post('/object/light_state', {
				light_id: light_id,
				state: state
			}).done(function() {
				var data = {
					action: 'light_state',
					light_id: light_id,
					state: state
				};
				websocket_send(data);

				var light = $('div#light' + light_id);
				light_state(light, state);
			});
			break;
		case 'lower':
			z_index--;
			obj.css('z-index', z_index);
			var data = {
				action: 'lower',
				instance_id: obj.prop('id')
			};
			websocket_send(data);
			break;
		case 'marker':
			marker_create(mouse_x - 25, mouse_y - 50);

			var data = {
				action: 'marker',
				name: my_name,
				pos_x: mouse_x - 25,
				pos_y: mouse_y - 69
			};
			websocket_send(data);
			break;
		case 'maxhp':
			if (my_character == null) {
				return;
			}

			var max_hp = my_character.attr('hitpoints');
			var points = window.prompt('Maximum hit points:', max_hp);
			if (points == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid hit points.');
				break;
			}

			var data = {
				action: 'maxhp',
				instance_id: my_character.prop('id'),
				points: points
			};
			websocket_send(data);

			$.post('/object/hitpoints', {
				instance_id: my_character.prop('id'),
				hitpoints: points
			});

			my_character.attr('hitpoints', points);
			object_damage(my_character, points - max_hp);
			break;
		case 'presence':
			if (obj.attr('is_hidden') == 'yes') {
				object_show(obj);
			} else {
				object_hide(obj);
			}
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
			$('input#zone_group').val($(this).attr('group'));
			$('div.script_editor textarea').val($(this).find('div.script').text());
			zone_group_change(true);
			wf_script_editor.open();
			$('div.script_editor textarea').focus();
			break;
		case 'shape':
			if (shape_change_id == 0) {
				var filename = obj.find('img').attr('orig_src');
			} else {
				var shape = $('div.shape_change div[shape_id=' + shape_change_id + ']');
				var filename = 'tokens/' + shape_change_id.toString() + '.' + shape.attr('extension');
			}

			obj.find('img').attr('src', '/resources/' + resources_key + '/' + filename);
			obj.find('img').css('width', grid_cell_size + 'px');
			obj.find('img').css('height', grid_cell_size + 'px');

			var data = {
				action: 'shape',
				char_id: obj.attr('id'),
				src: filename
			};
			websocket_send(data);

			$.post('/object/shape', {
				adventure_id: adventure_id,
				char_id: obj.attr('char_id'),
				token_id: shape_change_id
			});
			break;
		case 'stick':
			var obj_pos = object_position(obj);
			var obj_x = Math.floor(obj_pos.left / grid_cell_size);
			var obj_y = Math.floor(obj_pos.top / grid_cell_size);

			var my_pos = object_position(my_character);
			var my_x = Math.floor(my_pos.left / grid_cell_size);
			var my_y = Math.floor(my_pos.top / grid_cell_size);

			stick_to_x = my_x - obj_x;
			stick_to_y = my_y - obj_y;

			if ((Math.abs(stick_to_x) > 3) || (Math.abs(stick_to_y) > 3)) {
				stick_to = null;
				write_sidebar('Object too far.');
			} else if (obj.prop('id') == stick_to) {
				stick_to = null;
			} else {
				stick_to = obj.prop('id');
			}
			break;
		case 'takeback':
			var data = {
				action: 'takeback',
				instance_id: obj.prop('id')
			};
			websocket_send(data);
			break;
		case 'temphp':
			var points = window.prompt('Temporary hit points:', temporary_hitpoints);
			if (points == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid hit points.');
				break;
			}

			temporary_hitpoints = points;
			break;
		case 'travel':
			var data = {
				action: 'travel',
				instance_id: obj.prop('id'),
				char_id: obj.attr('char_id'),
				hitpoints: obj.attr('hitpoints'),
				map_id: travel_map_id
			};
			websocket_send(data);

			var parts = window.location.pathname.split('/');
			if (parts.length == 3) {
				window.open('/adventure/' + adventure_id + '/' + travel_map_id);
			}

			object_hide(obj);
			break;
		case 'view':
			object_view(obj);
			break;
		case 'zone_create':
			object_unfocus();

			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			$('div.zone_create input#width').val(3);
			$('div.zone_create input#height').val(3);
			wf_zone_create.open();
			$('div.zone_create div.panel-body').prop('scrollTop', 0);
			break;
		case 'zone_delete':
			if (confirm('Delete zone?')) {
				var group = obj.attr('group');
				if (group != undefined) {
					if (confirm('Delete all zones in group ' + group + '?')) {
						$('div.zone[group="' + group + '"]').each(function() {
							zone_delete($(this));
						});
					} else {
						zone_delete(obj);
					}
				} else {
					zone_delete(obj);
				}
			}
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

function key_down(event) {
	if (event.which == 16) {
		shift_down = true;
	} else if (event.which == 17) {
		ctrl_down = true;
	} else if (event.which == 18) {
		alt_down = true;
	}
}

function key_up(event) {
	if (event.which == 16) {
		shift_down = false;
		$('canvas#drawing').off('mousemove');
	} else if (event.which == 17) {
		ctrl_down = false;
		if (shift_down == false) {
			$('canvas#drawing').off('mousemove');
		}
	} else if (event.which == 18) {
		alt_down = false;
	}
}

/* Main
 */
$(document).ready(function() {
	group_key = $('div.playarea').attr('group_key');
	adventure_id = parseInt($('div.playarea').attr('adventure_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	user_id = parseInt($('div.playarea').attr('user_id'));
	resources_key = $('div.playarea').attr('resources_key');
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('is_dm') == 'yes');
	fow_type = parseInt($('div.playarea').attr('fog_of_war'));
	fow_default_distance = parseInt($('div.playarea').attr('fow_distance'));
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host');
	var ws_port = $('div.playarea').attr('ws_port');

	write_sidebar('<img src="/images/cauldron.png" style="max-width:80px; display:block; margin:0 auto" />');
	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');
	write_sidebar('Type /help for command information.');
	write_sidebar('You are ' + my_name + '.');

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + ws_host + ':' + ws_port + '/websocket');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		if (dungeon_master) {
			var color = $('div.menu div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').css('background-color');
			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);

			var data = {
				action: 'draw_width',
				width: DRAW_DEFAULT_WIDTH
			};
			websocket_send(data);

			var data = {
				action: 'draw_clear'
			};
			websocket_send(data);
		}

		$('div.menu div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').trigger('click');

		write_sidebar('Connection established.');
		send_message(my_name + ' entered the session.', null, false);

		if (dungeon_master == false) {
			var data = {
				action: 'effect_request',
				map_id: map_id
			};
			websocket_send(data);
		}

		var parts = window.location.pathname.split('/');
		if (parts.length == 4) {
			var my_char_id = $('div.playarea').attr('my_char');
			if (my_char_id != undefined) {
				object_damage($('div#' + my_char_id), 0);
			}
		}

		/* Unhide character
		 */
		if (my_character != null) {
			if (my_character.attr('is_hidden') == 'yes') {
				object_show(my_character, true);
			}

			/* Request drawing update
			 */
			var data = {
				action: 'draw_request',
				user_id: user_id
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

		if (data.adventure_id != adventure_id) {
			return;
		} else if (data.from_user_id == user_id) {
			return;
		}

		if (typeof data.to_char_id !== 'undefined') {
			if (dungeon_master && (data.to_char_id != 0)) {
				return;
			} else if (my_character != null) {
				if (data.to_char_id != my_character.prop('id')) {
					return;
				}
			}
		}

		if (typeof data.to_user_id !== 'undefined') {
			if (data.to_user_id != user_id) {
				return;
			}
		}

		delete data.adventure_id;
		delete data.from_user_id;

		switch (data.action) {
			case 'alternate':
				var img_size = data.size * grid_cell_size;
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/characters/' + data.src);
				$('div#' + data.char_id).find('img').css('width', img_size + 'px');
				$('div#' + data.char_id).find('img').css('height', img_size + 'px');
				break;
			case 'armor':
				var obj = $('div#' + data.instance_id);
				obj.attr('armor_class', data.points);
				if (dungeon_master) {
					write_sidebar(obj.find('span.name').text() + '\'s armor class set to ' + data.points + '.');
				}
				break;
			case 'audio':
				var audio = new Audio(data.filename);
				audio.play();
				break;
			case 'condition':
				var obj = $('div#' + data.object_id);
				set_conditions(obj, data.condition);
				save_conditions(obj, data.condition);
				break;
			case 'create':
				var obj = '<div id="token' + data.instance_id + '" token_id="' + data.token_id +'" class="token" style="left:' + data.pos_x + 'px; top:' + data.pos_y + 'px; z-index:' + DEFAULT_Z_INDEX + '" type="' + data.type + '" is_hidden="no" rotation="0" armor_class="' + data.armor_class + '" hitpoints="' + data.hitpoints + '" damage="0" name="">' +
						  '<img src="' + data.url + '" style="width:' + data.width + 'px; height:' + data.height + 'px;" />' +
						  '</div>';
				$('div.playarea div.tokens').append(obj);
				$('div#token' + data.instance_id).contextmenu(object_contextmenu_player);
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
			case 'delete':
				var obj = $('div#' + data.instance_id);
				obj.remove();
				break;
			case 'done':
				combat_done();
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
			case 'draw_clear':
				drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);
				break
			case 'draw_color':
				drawing_ctx.beginPath();
				drawing_ctx.strokeStyle = data.color;
				break
			case 'draw_move':
				drawing_ctx.globalCompositeOperation = (data.erase == 'yes') ? 'destination-out' : 'source-over';
				drawing_ctx.lineWidth = data.width;
				drawing_ctx.beginPath();
				drawing_ctx.moveTo(data.draw_x, data.draw_y);
				break
			case 'draw_line':
				drawing_ctx.lineCap = data.linecap;
				drawing_ctx.lineTo(data.draw_x, data.draw_y);
				drawing_ctx.stroke();
				break
			case 'draw_request':
				if (dungeon_master == false) {
					break;
				}
				drawing_history.forEach(function(draw) {
					draw.to_user_id = data.user_id;
					websocket_send(draw);
				});
				break;
			case 'draw_width':
				drawing_ctx.beginPath();
				drawing_ctx.lineWidth = data.width;
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
			case 'effect_request':
				if (dungeon_master == false) {
					break;
				}
				if (data.map_id != map_id) {
					break;
				}
				$('div.effect').each(function() {
					var pos = object_position($(this));

					var data = {
						action: 'effect_create',
						map_id: map_id,
						instance_id: $(this).prop('id'),
						src: $(this).find('img').prop('src'),
						pos_x: pos.left,
						pos_y: pos.top,
						width: $(this).width() / grid_cell_size,
						height: $(this).height() / grid_cell_size
					};
					websocket_send(data);
				});
				break;
			case 'event':
				if (dungeon_master) {
					zone_run_script(data.zone, data.character, data.zone_event, data.pos_x, data.pos_y);
				}
				break;
			case 'fow_distance':
				if (my_character == null) {
					break;
				} else if (my_character.prop('id') != data.instance_id) {
					break;
				}

				var distance = parseInt(data.distance);
				if (isNaN(distance)) {
					break;
				}

				fog_of_war_set_distance(distance);
				fog_of_war_update(my_character);
				break;
			case 'handover':
				if (data.owner_id != my_character.prop('id')) {
					return;
				}

				if (data.instance_id.substring(0, 4) == 'zone') {
					var handle = null;
				} else {
					var handle = 'img';
				}

				$('div#' + data.instance_id).draggable({
					containment: 'div.playarea > div',
					handle: handle,
					stop: function(event, ui) {
						object_move($(this));
						if ($(this).prop('id') == stick_to) {
							object_move_to_sticked($(this));
						}
					}
				});

				if (data.instance_id.substring(0, 4) == 'zone') {
					return;
				} else if (data.instance_id.substring(0, 6) == 'effect') {
					return;
				}

				$('div#' + data.instance_id + ' img').off('contextmenu');
				$('div#' + data.instance_id + ' img').contextmenu(function(event) {
					var menu_entries = {
						'info': { name:'Get infomation', icon:'fa-info-circle' },
						'stick': { name:'Stick to / unstick', icon:'fa-lock' },
						'rotate': { name:'Rotate', icon:'fa-compass', items:{
							'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
							'rotate_ne': { name:'North East' },
							'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
							'rotate_se': { name:'South East' },
							'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
							'rotate_sw': { name:'South West' },
							'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
							'rotate_nw': { name:'North West' }
						}},
						'lower': { name:'Lower', icon:'fa-arrow-down' },
						'sep1': '-',
						'attack': { name:'Attack', icon:'fa-legal' },
						'damage': { name:'Damage', icon:'fa-warning' },
						'heal': { name:'Heal', icon:'fa-medkit' }
					};

					show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
					return false;
				});

				$('div#' + data.instance_id).css('cursor', 'grab');
				break;
			case 'hide':
				var obj = $('div#' + data.instance_id);
				object_hide(obj, false);
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
			case 'light_state':
				var light = $('div#light' + data.light_id);
				light_state(light, data.state);
				break;
			case 'lower':
				z_index--;
				$('div#' + data.instance_id).css('z-index', z_index);
				break;
			case 'map_image':
				var image = $('<img src="' + data.url + '" />');
				image.one('load', function() {
					$('div#map_background').css('background-image', 'url(' + data.url + ')');
					delete image;
				});
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'maxhp':
				var obj = $('div#' + data.instance_id);
				obj.attr('hitpoints', data.points);
				if (dungeon_master) {
					write_sidebar(obj.find('span.name').text() + '\'s maximum hit points set to ' + data.points + '.');
				}
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);

				if (obj.hasClass('light')) {
					obj.css('left', data.pos_x + 'px');
					obj.css('top', data.pos_y + 'px');

					fog_of_war_light(obj);
					if (my_character != null) {
						fog_of_war_update(my_character);
					}
					break;
				}

				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed, function() {
					if (obj.is(my_character)) {
						var pos = {
							left: data.pos_x,
							top: data.pos_y
						}
						zone_check_events(obj, pos);
					} else if (obj.hasClass('zone') && (my_character != null)) {
						var pos = object_position(my_character);
						if (zone_covers_position(obj, pos)) {
							if (zone_presence.includes(data.instance_id) == false) {
								zone_presence.push(data.instance_id);
							}
						} else {
							if (zone_presence.includes(data.instance_id)) {
								zone_presence = array_remove(zone_presence, data.instance_id);
							}
						}
					}

					if (keep_centered && obj.is(my_character)) {
						scroll_to_my_character(0);
					}

					if (data.instance_id == stick_to) {
						object_move_to_sticked(obj);
					}

					/* Fog of War
					 */
					if (obj.is(fow_obj) || ((fow_type != FOW_OFF) && obj.is(my_character))) {
						fog_of_war_update(obj);
					}

				});

				if (obj.hasClass('character') && dungeon_master && ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL))) {
					light_follow(obj, data.pos_x, data.pos_y);
					if (obj.is(fow_obj)) {
						fog_of_war_update(fow_obj);
					}
				}
				break;
			case 'ping':
				var data = {
					action: 'pong',
					name: my_name
				};
				websocket_send(data);
				break;
			case 'pong':
				if (dungeon_master) {
					write_sidebar('&nbsp;&nbsp;&nbsp;&nbsp;- ' + data.name);
				}
				break;
			case 'reload':
				document.location = '/adventure/' + adventure_id;
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate(obj, data.rotation, false, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.name, data.mesg);
				break;
			case 'shape':
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).find('img').css('width', grid_cell_size + 'px');
				$('div#' + data.char_id).find('img').css('height', grid_cell_size + 'px');
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show(obj, false);
				break;
			case 'takeback':
				$('div#' + data.instance_id).css('cursor', 'default');
				$('div#' + data.instance_id).find('img').css('cursor', 'default');
				$('div#' + data.instance_id).draggable('destroy');

				$('div#' + data.instance_id + ' img').off('contextmenu');
				$('div#' + data.instance_id + ' img').contextmenu(function(event) {
					var menu_entries = {
						'view': { name:'View', icon:'fa-search' },
						'stick': { name:'Stick to / unstick', icon:'fa-lock' },
						'attack': { name:'Attack', icon:'fa-legal' }
					};

					show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
					return false;
				});

				if (data.instance_id == stick_to) {
					stick_to = null;
				}
				break;
			case 'travel':
				if (data.instance_id == my_character.prop('id')) {
					document.location = '/adventure/' + adventure_id + '/' + data.map_id;
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height,
				                   data.color, data.opacity, data.group, data.altitude);
				break;
			case 'zone_opacity':
				var zone = $('div#' + data.instance_id);
				zone.css('opacity', data.opacity);
				break;
			case 'zone_delete':
				var zone = $('div#' + data.instance_id);
				var altitude = parseInt(zone.attr('altitude'));
				zone.remove();

				if (altitude > 0) {
					if ((fow_type != FOW_OFF) && (my_character != null)) {
						fog_of_war_update(my_character);
					} else if (fow_obj != null) {
						fog_of_war_update(fow_obj);
					}
				}
				break;
			case 'zone_group':
				if (data.zone_group != '') {
					$('div#' + data.zone_id).attr('group', data.zone_group);
				} else {
					$('div#' + data.zone_id).removeAttr('group');
				}
				break;
			default:
				write_sidebar('Unknown action: ' + data.action);
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

	/* Menu
	 */
	$('button.open_menu').on('click', function(event) {
		var skip = 1;
		$('div.menu').toggle();
		$('body').one('click', function() {
			$('div.menu').hide();
		});
		event.stopPropagation();
	});
	$('div.menu').on('click', function(event) {
		event.stopPropagation();
	});
	$('div.menu button').on('click', function(event) {
		$('div.menu').hide();
	});
	$('div.menu span').on('click', function(event) {
		$('div.menu').hide();
	});
	$('div.menu div.ui-slider-handle').on('mousedown', function(event) {
		$('body').one('mouseup', function() {
			$('div.menu').hide();
		});
	});
	$('div.menu').css('z-index', LAYER_MENU);
	$('div.menu div.draw-colors span').click(function() {
		var color = $(this).css('background-color');

		drawing_ctx.strokeStyle = color;

		var data = {
			action: 'draw_color',
			color: color
		};
		websocket_send(data);
		drawing_history.push(data);

		$('div.menu div.draw-colors span').css('box-shadow', '');
		$(this).css('box-shadow', '0 0 5px #0080ff');
	});

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		grid_init(grid_cell_size);
    }

	/* Drawing
	 */
	var map = $('div.playarea > div');
	var width = Math.round(map.width());
	var height = Math.round(map.height());

	$('div.drawing').prepend('<canvas id="drawing" width="' + width + '" height="' + height + '" />');
	drawing_canvas = document.getElementById('drawing');

	drawing_ctx = drawing_canvas.getContext('2d');
	drawing_ctx.lineWidth = DRAW_DEFAULT_WIDTH;
	drawing_ctx.strokeStyle = DRAW_DEFAULT_COLOR;

	drawing_ctx.lineJoin = 'bevel';

	if (dungeon_master) {	
		var handle = $('div#draw_width div');
		$('div#draw_width').slider({
			min: 1,
			max: grid_cell_size,
			create: function() {
				handle.text($(this).slider("value"));
			},
			slide: function(event, ui) {
				handle.text(ui.value);
			},
			stop: function(event, ui) {
				drawing_ctx.lineWidth = ui.value;

				var data = {
					action: 'draw_width',
					width: ui.value
				};
				websocket_send(data);
				drawing_history.push(data);
			}
		});

		$('canvas#drawing').on('mousedown', function(event) {
			var pos = $('div.playarea').position();
			var canvas_x = Math.round(pos.left) + 1;
			var canvas_y = Math.round(pos.top) + 1;

			if (shift_down) {
				drawing_ctx.globalCompositeOperation = 'destination-out';
				drawing_ctx.lineWidth = ctrl_down ? 50 : 15;
			} else if (ctrl_down) {
				drawing_ctx.globalCompositeOperation = 'source-over';
				drawing_ctx.lineWidth = parseInt($('div#draw_width div').text());
			} else {
				return;
			}

			var scr = screen_scroll();
			var draw_x = event.clientX - canvas_x + scr.left;
			var draw_y = event.clientY - canvas_y + scr.top;

			var half_grid = grid_cell_size >> 1;
			var draw_wide = drawing_ctx.lineWidth > half_grid;
			if (alt_down) {
				draw_x = coord_to_grid(draw_x, draw_wide == false);
				draw_y = coord_to_grid(draw_y, draw_wide == false);

				if (draw_wide) {
					draw_x += half_grid;
					draw_y += half_grid;
				}
			}

			var data = {
				action: 'draw_move',
				erase: shift_down ? 'yes' : 'no',
				width: drawing_ctx.lineWidth,
				draw_x: draw_x,
				draw_y: draw_y
			};
			websocket_send(data);
			drawing_history.push(data);

			drawing_ctx.beginPath();
			drawing_ctx.moveTo(draw_x, draw_y);

			var draw_prev_x = null;
			var draw_prev_y = null;

			var draw = function(event) {
				var scr = screen_scroll();

				var draw_x = event.clientX - canvas_x + scr.left;
				var draw_y = event.clientY - canvas_y + scr.top;

				if (alt_down) {
					draw_x = coord_to_grid(draw_x, draw_wide == false);
					draw_y = coord_to_grid(draw_y, draw_wide == false);

					if (draw_wide) {
						draw_x += half_grid;
						draw_y += half_grid;
					}
				}

				if ((draw_x == draw_prev_x) && (draw_y == draw_prev_y)) {
					return;
				}

				draw_prev_x = draw_x;
				draw_prev_y = draw_y;

				if ((drawing_ctx.lineWidth == grid_cell_size) && alt_down) {
					drawing_ctx.lineCap = 'square';
				} else {
					drawing_ctx.lineCap = 'round';
				}

				var data = {
					action: 'draw_line',
					draw_x: draw_x,
					draw_y: draw_y,
					linecap: drawing_ctx.lineCap
				};
				websocket_send(data);
				drawing_history.push(data);

				drawing_ctx.lineTo(draw_x, draw_y);
				drawing_ctx.stroke();
			}

			draw(event);
			$('canvas#drawing').on('mousemove', function(event) {
				draw(event);
			});

			$('canvas#drawing').on('mouseleave', function(event) {
				drawing_ctx.closePath();
			});

			$('canvas#drawing').on('mouseenter', function(event) {
				var scr = screen_scroll();
				var draw_x = event.clientX - canvas_x + scr.left;
				var draw_y = event.clientY - canvas_y + scr.top;

				drawing_ctx.beginPath();
				drawing_ctx.moveTo(draw_x, draw_y);
			});

			$('canvas#drawing').one('mouseup', function() {
				$('canvas#drawing').off('mousemove');
			});
		});

		$('button#draw_clear').click(function() {
			if (confirm('Clear all drawings?') == false) {
				return;
			}

			var data = {
				action: 'draw_clear'
			};
			websocket_send(data);

			drawing_history = [];

			var data = {
				action: 'draw_color',
				color: drawing_ctx.strokeStyle
			};
			drawing_history.push(data);

			var data = {
				action: 'draw_width',
				width: drawing_ctx.lineWidth
			};
			drawing_history.push(data);

			drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);
		});
	}

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});


	$('div.door').contextmenu(function(event) {
		var menu_entries = {};

		if ($(this).attr('state') == 'open') {
			menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
		} else {
			menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
		}

		if (dungeon_master) {
			if ($(this).attr('state') == 'locked') {
				menu_entries['door_unlock'] = { name:'Unlock', icon:'fa-unlock' };
			} else {
				menu_entries['door_lock'] = { name:'Lock', icon:'fa-lock' };
			}
		}

		show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	/* Lights
	 */
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		$('div.light').each(function() {
			fog_of_war_light($(this));
		});
	}

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	/* Objects
	 */
	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').on('play', function() {
			$('button.playvideo').remove();
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		object_hide($(this), false);
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate($(this), $(this).attr('rotation'), false, 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate($(this), $(this).attr('rotation'), false, 0);
	});

	if (dungeon_master) {
		/* Dungeon Master settings
		 */
		$('div.zone').draggable({
			containment: 'div.playarea > div',
			stop: function(event, ui) {
				object_move($(this));
			}
		});
		$('div.zone').filter(function() {
			return $(this).css('background-color') == 'rgb(0, 0, 0)';
		}).hover(function() {
			$(this).css('border', '1px solid #a0a000');
		}, function() {
			$(this).css('border', '');
		});

		$('div.token').draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.character').draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo(0, 0.5);
		});

		
		$('div.light').each(function() {
			var state = $(this).attr('state');
			$(this).append('<img src="/images/light_' + state + '.png" class="light" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" />');
		});

		$('div.light').draggable({
			containment: 'div.playarea > div',
			handler: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.light').contextmenu(function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'on') {
				menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
			} else {
				menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
			}

			menu_entries['light_attach'] = { name:'Attach to character', icon:'fa-compress' };
			menu_entries['light_delete'] = { name:'Delete', icon:'fa-trash' };

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu zones
		 */
		zone_menu = {
			'info': { name:'Get information', icon:'fa-info-circle' },
			'script': { name:'Edit event script', icon:'fa-edit' },
			'sep1': '-',
			'marker': { name:'Set marker', icon:'fa-map-marker' },
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Show coordinates', icon:'fa-flag' },
			'effect_create': { name:'Create effect', icon:'fa-fire' },
			'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
			'sep2': '-',
			'handover': { name:'Hand over', icon:'fa-hand-stop-o' },
			'takeback': { name:'Take back', icon:'fa-hand-grab-o' },
			'sep3': '-',
			'zone_delete': { name:'Delete', icon:'fa-trash' },
		};

		$('div.zone').contextmenu(function(event) {
			var menu_entries = zone_menu;

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu tokens
		 */
		$('div.token img').contextmenu(object_contextmenu_dm);

		/* Menu characters
		 */
		$('div.character img').contextmenu(function(event) {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' },
				'presence': { name:'Toggle presence', icon:'fa-low-vision' },
			}

			var label = $(this).parent().is(focus_obj) ? 'Unfocus' : 'Focus';
			menu_entries['focus'] = { name:label, icon:'fa-binoculars' };

			menu_entries['sep1'] = '-';
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
			menu_entries['sep2'] = '-';

			if (fow_type != FOW_OFF) {
				if ($(this).parent().is(fow_obj)) {
					menu_entries['fow_show'] = { name:'Remove Fog of War', icon:'fa-mixcloud' };
				} else {
					menu_entries['fow_show'] = { name:'Show its Fog of War', icon:'fa-cloud' };
				}
				menu_entries['fow_distance'] = { name:'Set Fog of War distance', icon:'fa-cloud-upload' };
				if (Object.values(fow_light_char).includes($(this).parent().prop('id'))) {
					menu_entries['light_detach'] = { name:'Detach light', icon:'fa-lightbulb-o' };
					menu_entries['light_remove'] = { name:'Remove light', icon:'fa-circle' };
				}
				menu_entries['sep3'] = '-';
			}

			menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };
			menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
			menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };

			var has = $(this).parent().find('span.conditions').text().split(',');
			var conditions = {};
			conditions['condition_0'] = { name: 'None' };
			conditions['sep0'] = '-';
			$('div.conditions div').each(function() {
				var con_id = $(this).attr('con_id');
				var name = $(this).text();
				var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
				conditions['condition_' + con_id] = { name: name, icon: icon};
			});

			menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions};

			var shapes = {};
			shapes['shape_0'] = { name: 'Default' };
			shapes['sep0'] = '-';
			$('div.shape_change div').each(function() {
				var shape_id = $(this).attr('shape_id');
				shapes['shape_' + shape_id] = { name: $(this).text()};
			});

			if (Object.keys(shapes).length > 2) {
				menu_entries['shapes'] = { name:'Change shape', icon:'fa-user-circle', items:shapes};
			}

			menu_entries['sep4'] = '-';
			menu_entries['zone_create'] = { name:'Create zone', icon:'fa-square-o' };

			var maps = {};
			$('select.map-selector option').each(function() {
				var m_id = $(this).attr('value');
				if (m_id != map_id) {
					var key = 'travel_' + m_id;
					maps[key] = { name: $(this).text()};
				}
			});

			if (Object.keys(maps).length > 0) {
				menu_entries['send'] = { name:'Send to map', icon:'fa-compass', items:maps};
			}

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').contextmenu(function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'coordinates': { name:'Get coordinates', icon:'fa-flag' },
				'sep1': '-',
				'effect_create': { name:'Create effect', icon:'fa-fire' },
				'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
				'zone_create': { name:'Create zone', icon:'fa-square-o' }
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div.characters').css('cursor', 'grab');
		$('div.effects').css('cursor', 'grab');
		$('div.lights').css('cursor', 'grab');
		$('div.tokens').css('cursor', 'grab');
		$('div.zones').css('cursor', 'grab');

		/* Fog of war
		 */
		if (fow_type != FOW_OFF) {
			$('div.character').each(function() {
				fow_char_distances[$(this).prop('id')] = fow_default_distance;
			});
		}

		/* Library
		 */
		$('div.library img.icon').draggable({
			helper: 'clone',
			appendTo: 'div.playarea',
			stop: function(event, ui) {
				object_create($(this), event.pageX, event.pageY);
			}
		});

		/* Start combat button
		 */
		$('button.start_combat').on('click', function() {
			combat_start();
		});

		/* Audio dialog
		 */
		var audio_dialog = '<div><p>Select an audio file to play it.</p><ul class="audio"></ul></div>'
		wf_play_audio = $(audio_dialog).windowframe({
			activator: 'button.play_audio',
			header: 'Audio files from Resources',
			open: function() {
				$.ajax('/adventure/audio').done(function(data) {
					var audio = '';
					$(data).find('audio sound').each(function() {
						audio += '<li>/' + $(this).text() + '</li>';
					});

					$('ul.audio').append(audio);

					$('ul.audio li').click(function() {
						wf_play_audio.close();

						$('div.input input').focus();

						var filename = $(this).text();
						filename = filename.substr(0, 11) + resources_key + filename.substr(10);

						var data = {
							action: 'audio',
							filename: filename
						};
						websocket_send(data);

						var audio = new Audio(filename);
						audio.play();
					});
				});
			},
			close: function() {
				$('ul.audio').empty();
			}
		});
	} else {
		/* Player settings
		 /*/
		var my_char = $('div.playarea').attr('my_char');
		if (my_char != undefined) {
			my_character = $('div#' + my_char);

			my_character.addClass('mine');

			if ($('div.playarea').attr('drag_character') == 'yes') {
				my_character.draggable({
					containment: 'div.playarea > div',
					handle: 'img',
					stop: function(event, ui) {
						stick_to = null;
						object_move($(this));
					}
				});
				my_character.css('cursor', 'grab');
			}

			my_character.css('z-index', LAYER_CHARACTER_OWN);

			/* Menu my character
			 */
			$('div#' + my_char + ' img').contextmenu(function(event) {
				var menu_entries = {
					'info': { name:'Get information', icon:'fa-info-circle' },
					'view': { name:'View', icon:'fa-search' },
					'distance': { name:'Measure distance', icon:'fa-map-signs' },
					'sep1': '-',
					'damage': { name:'Damage', icon:'fa-warning' },
					'heal': { name:'Heal', icon:'fa-medkit' },
					'temphp': { name:'Set temporary hit points', icon:'fa-heart-o' },
					'sep2': '-',
					'maxhp': { name:'Set maximum hit points', icon:'fa-heart' },
					'armor': { name:'Set armor class', icon:'fa-shield' },
					'sep3': '-'
				};

				var has = $(this).parent().find('span.conditions').text().split(',');
				var conditions = {};
				conditions['condition_0'] = { name: 'None' };
				conditions['sep0'] = '-';
				$('div.conditions div').each(function() {
					var con_id = $(this).attr('con_id');
					var name = $(this).text();
					var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
					conditions['condition_' + con_id] = { name: name, icon: icon};
				});

				menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions };

				var alternates = $('div.alternates div');
				if (alternates.length > 0) {
					var icons = {};
					icons['alternate_0'] = { name: 'Default' };
					icons['sep1'] = '-';

					alternates.each(function() {
						var icon_id = $(this).attr('icon_id');
						icons['alternate_' + icon_id] = { name: $(this).text()};
					});

					menu_entries['alternates'] = { name:'Change icon', icon:'fa-user-circle', items:icons };
				}

				show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
				return false;
			});

			/* Zone presence
			 */
			zone_init_presence();

			/* Fog of war
			 */
			if (fow_type != FOW_OFF) {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
					fog_of_war_set_distance(fow_default_distance);
				}
				fog_of_war_update(my_character);
			}
		}

		/* Menu tokens
		 */
		$('div.token img').contextmenu(object_contextmenu_player);

		/* Menu (other) characters
		 */
		$('div.character:not(.mine) img').contextmenu(function(event) {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' },
				'attack': { name:'Attack', icon:'fa-legal' },
				'sep': '-',
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').contextmenu(function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' }
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* No token library, so enlarge sidebar.
		 */
		$('div.sidebar').css('top', '40px');
	}

	/* Input field
	 */
	$('div.input input').focusout(function() {
		$('body').keyup(object_steer);
	});

	$('div.input input').focusin(function() {
		$('body').off('keyup');
	});

	$('div.input input').on('keyup', function (e) {
		if ((e.key === 'Enter') || (e.keyCode === 13)) {
			var input = $(this).val();
			$(this).val('');
			handle_input(input);

			input_history = jQuery.grep(input_history, function(value) {
				return value != input;
			});

			input_history.unshift(input);
			input_index = -1;

			localStorage.setItem('input_history', JSON.stringify(input_history));
		}

		if ((e.key === 'ArrowUp') || (e.keyCode === 38)) {
			if (input_index + 1 < input_history.length) {
				input_index++;
			}
			$(this).val(input_history[input_index]);
		}

		if ((e.key === 'ArrowDown') || (e.keyCode === 40)) {
			if (input_index >= 0) {
				input_index--;
				$(this).val(input_history[input_index]);
			} else {
				$(this).val('');
			}
		}
	});

	/* Windows
	 */
	wf_effect_create = $('div.effect_create').windowframe({
		width: 530,
		style: 'default',
		header: 'Create effect',
		footer: '<span class="effect_size">width: <input id="effect_width" type="number" value="1" min="1" /></span>' +
		        '<span class="effect_size">height: <input id="effect_height" type="number" value="1" min="1" /></span>'
	});

	$('div.effect_create img').click(function() {
		effect_create($(this));
	});

	wf_collectables = $('<div class="collectables"></div>').windowframe({
		activator: 'button.show_collectables',
		width: 500,
		style: 'success',
		header: 'Inventory',
		open: collectables_show
	});

	$('div.dm_notes').windowframe({
		activator: 'button.show_dm_notes',
		style: 'danger',
		header: 'DM notes'
	});

	wf_journal = $('div.journal').windowframe({
		activator: 'button.show_journal',
		width: 800,
		height: 400,
		style: 'info',
		header: 'Journal',
		open: journal_show
	});
	$('div.journal textarea').on('keyup', function(event) {
		event.stopPropagation();
	});

	wf_script_editor = $('div.script_editor').windowframe({
		width: 500,
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
		height: 1000,
		header: 'Script manual'
	});

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

	$('button.journal_write').click(function() {
		journal_write();
	});

	$('button.center_character').click(function() {
		center_character($(this));
	});

	$('button.interface_color').click(function() {
		interface_color($(this));
	});

	$('select.map-selector').on('change', function() {
		map_switch();
	});

	$('button.map_image').click(function() {
		map_image();
	});

	$('button.playvideo').click(function() {
		$('video').get(0).play();
	});

	/* Other stuff
	 */
	$('div.playarea').mousedown(function(event) {
		if (event.which == 3) {
			var scr = screen_scroll();
			mouse_x = event.clientX + scr.left - 16;
			mouse_y = event.clientY + scr.top - 41;
		}
	});

	if (dungeon_master) {
		combat_check_running();
	}

	$('div.filter input').on('keyup',function() {
		param = $(this).val().toLowerCase();

		$('div.library div.well').each(function() {
			var name = $(this).find('div.name').text().toLowerCase();
			if (name.includes(param) == false) {
				$(this).hide();
			} else {
				$(this).show();
			}
		});
	});

	var conditions = localStorage.getItem('conditions');
	if (conditions != undefined) {
		conditions = JSON.parse(conditions);
		for (var [key, value] of Object.entries(conditions)) {
			set_conditions($('div#' + key), value);
		}
	}

	var audio_file = $('div.playarea').attr('audio');
	if (audio_file != undefined) {
		var audio = new Audio(audio_file);
		audio.loop = true;
		audio.play();
	}

	input_history = localStorage.getItem('input_history');
	if (input_history != undefined) {
		input_history = JSON.parse(input_history);
	} else {
		input_history = [];
	}

	$('body').keyup(object_steer);

	scroll_to_my_character();

	$('body').keydown(key_down);
	$('body').keyup(key_up);

	$(window).focus(function() {
		ctrl_down = false;
		shift_down = false;
		alt_down = false;
		$('canvas#drawing').off('mousemove');
	});

	/* Interface color
	 */
	var color = localStorage.getItem('interface_color');
	if (color == 'dark') {
		interface_color($('button#itfcol'), false);
	}
});
