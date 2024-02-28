const ROLL_NORMAL = 0;
const ROLL_ADVANTAGE = 1;
const ROLL_DISADVANTAGE = 2;
const FOW_NONE = 0;
const FOW_DAY_CELL = 1;
const FOW_DAY_REAL = 2;
const FOW_NIGHT_CELL = 3;
const FOW_NIGHT_REAL = 4;
const FOW_REVEAL = 5;

const DEFAULT_Z_INDEX = 10000;
const LAYER_DRAWING = DEFAULT_Z_INDEX;
const LAYER_GRID = DEFAULT_Z_INDEX + 1;
const LAYER_ZONE = DEFAULT_Z_INDEX + 2;
const LAYER_EFFECT = DEFAULT_Z_INDEX + 3;
const LAYER_TOKEN = DEFAULT_Z_INDEX + 4;
const LAYER_CONSTRUCT = DEFAULT_Z_INDEX + 5;
const LAYER_LIGHT = DEFAULT_Z_INDEX + 6;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 7;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 8;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 9;
const LAYER_MARKER = DEFAULT_Z_INDEX + 10;
const LAYER_MENU = DEFAULT_Z_INDEX + 11;
const LAYER_VIEW = DEFAULT_Z_INDEX + 2000;

const DOOR_SECRET = '#a0a000';
const DOOR_OPEN = '#40c040';
const DOOR_OPACITY = '0.6';

const OBJECT_HIDDEN_FADE = 0.6;

const INPUT_HISTORY_SIZE = 20;

const DRAW_DEFAULT_COLOR = 1;
const DRAW_DEFAULT_WIDTH = 5;
const DRAW_ERASE_THIN = 25;
const DRAW_ERASE_THICK = 75;

const CHAR_POS_SAVE_DELAY = 2;

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
var character_name = null;
var character_steerable = true;
var my_character = null;
var wf_attack = null;
var wf_collectables = null;
var wf_dice_roll = null;
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
var night_level = 0;
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
var fullscreen = false
var fullscreen_backup = undefined;
var pause = false;
var ruler_distance = 0;
var ruler_previous = 0;
var key_to_direction = null;
var brushes = {};
var sea_submenu = null;
var mobile_device = false;

var char_pos_x = 0;
var char_pos_y = 0;
var char_pos_changed = false

/* Websocket
 */
function websocket_send(data) {
	if (websocket == null) {
		return;
	}

	data.adventure_id = adventure_id;
	data.map_id = map_id;
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

		$('ul.map_image li').on('click', function() {
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
	var pos_x = -($('div.playarea').width() >> 1);
	var pos_y = -($('div.playarea').height() >> 1);

	if (my_character != null) {
		var spot = my_character;
	} else if (focus_obj != null) {
		var spot = focus_obj;
	} else if ($('div.character').length > 0) {
		var spot = $('div.character').first();
	}

	if (typeof spot !== 'undefined') {
		var pos = object_position(spot);
	} else {
		var pos = {
			left: parseInt($('div.playarea').attr('start_x')) * grid_cell_size,
			top:  parseInt($('div.playarea').attr('start_y')) * grid_cell_size
		};
	}

	pos_x += pos.left + (grid_cell_size >> 1);
	pos_y += pos.top + (grid_cell_size >> 1);

	$('div.playarea').animate({
		scrollLeft: pos_x,
		scrollTop:  pos_y
	}, speed);
}

function toggle_fullscreen() {
	var playarea = $('div.playarea');

	if (fullscreen == false) {
		fullscreen_backup = playarea.css('bottom');
		playarea.css({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		});
		$('div.draw-tools').hide();

		fullscreen = true;
	} else {
		playarea.removeAttr('style');
		if (fullscreen_backup != undefined) {
			playarea.css('bottom', fullscreen_backup);
		}
		$('div.draw-tools').show();

		fullscreen = false;
		fullscreen_backup = undefined;
	}

	playarea.trigger('focus');
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	message = message.replace(/\n/g, '<br />');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function show_image(img) {
	if ($('div.image_overlay').length > 0) {
		return;
	}

	var image = '<div class="image_overlay" onClick="javascript:$(this).remove()"><img src="' + $(img).attr('src') + '" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); filter:drop-shadow(#000000 10px 10px 5px); max-width:80%; max-height:80%; cursor:pointer" /></div>';

	$('body').append(image);
	$('body div.image_overlay').show();
}

function message_to_sidebar(name, message) {
	if ((message.substring(0, 7) == 'http://') || (message.substring(0, 8) == 'https://')) {
		var parts = message.split('.');
		var extension = parts.pop();
		var images = ['gif', 'jpg', 'jpeg', 'png', 'webp'];

		if (images.includes(extension)) {
			message = '<img src="' + message + '" style="cursor:pointer;" onClick="javascript:show_image(this)" />';
		} else {
			message = '<a href="' + message + '" target="_blank">' + message + '</a>';
		}
	} else {
		message = message.replace(/</g, '&lt;').replace(/\n/g, '<br />');
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

function input_history_add(input) {
	input_history = jQuery.grep(input_history, function(value) {
		return value != input;
	});

	input_history.unshift(input);
	input_history = input_history.slice(0, INPUT_HISTORY_SIZE);
	input_index = -1;

	localStorage.setItem('input_history', JSON.stringify(input_history));
}

function dice_roll(dice, addition, callback) {
	if ((localStorage.getItem('dice_type') == 'animated') && (typeof dice_roll_3d == 'function')) {
		return dice_roll_3d(dice, addition, callback);
	} else {
		return dice_roll_quick(dice, addition, callback);
	}
}

function dice_roll_quick(dice, addition, callback) {
	var result = [];

	for (i = 0; i < dice.length; i++) {
		var parts = dice[i].split('d');
		var count = parseInt(parts[0]);
		var sides = parseInt(parts[1]);
		var roll = Math.floor(Math.random() * sides) + 1;

		result.push(roll);
	}

	callback(result, addition);
}

function roll_dice(dice_input, send_to_others = true) {
	if (dice == '') {
		wf_dice_roll.open();
		return true;
	}

	if (dice_input.indexOf('d') == -1) {
		return false;
	}

	dice_str = dice_input.replace(/ /g, '');
	dice_str = dice_str.replace(/\+-/g, '-');
	dice_str = dice_str.replace(/-/g, '+-');

	var valid_dice = [2, 4, 6, 8, 10, 12, 20, 100];
	var parts = dice_str.split('+');

	if (parts.length > 7) {
		return false;
	}

	var dice = [];
	var addition = 0;

	for (i = 0; i < parts.length; i++) {
		var roll = parts[i].split('d');
		if (roll.length > 2) {
			return false;
		} else if (roll.length == 2) {
			if (roll[0] == '') {
				parts[i] = '1' + parts[i];
			} else {
				var count = parseInt(roll[0]);
				if (isNaN(count)) {
					return false;
				}
			}

			var sides = parseInt(roll[1]);
			if (isNaN(sides)) {
				return false;
			}

			if (valid_dice.includes(sides) == false) {
				return false;
			}

			if (count > 25) {
				return false;
			}

			dice.push(parts[i]);
		} else {
			var value = parseInt(roll[0]);
			if (isNaN(value)) {
				return false
			}

			addition += value;
		}
	}

	dice_roll(dice, addition, function(result, addition) {
		var message = 'Dice roll: ' + dice_input + '\n';
		var total = addition;

		result.forEach(function(roll) {
			total += roll;
		});

		message += '[' + result.join('] + [') + ']';
		if (addition > 0) {
			message += ' + ' + addition;
		}
		message += ' = ' + total;

		if (send_to_others) {
			send_message(message, character_name);
		} else {
			write_sidebar(message);
		}
	});

	return true;
}

function roll_d20(bonus, type = ROLL_NORMAL) {
	if (bonus == '') {
		bonus = 0;
	} else {
		bonus = parseInt(bonus);
		if (isNaN(bonus)) {
			write_sidebar('Invalid roll bonus.');
			return false;
		}
	}

	dice = [ '1d20' ];

	if (type != ROLL_NORMAL) {
		dice.push('1d20');
	}

	dice_roll(dice, bonus, function(result, bonus) {
		var roll = result[0];

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

		message += 'ice roll: 1d20';
		if (bonus > 0) {
			message += ' + ' + bonus;
		} else if (bonus < 0) {
			message += bonus;
		}
		message += '\n';

		if (type != ROLL_NORMAL) {
			var extra = result[1];

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
				message += '+ ' + bonus + ' ';
			}
			message += '= ' + (roll + bonus);

			if (roll == 20) {
				message += ' CRIT!';
			}
		}

		if (dungeon_master == false) {
			send_message(message, character_name);
		} else {
			write_sidebar(message);
		}
	});

	return true;
}

function show_help() {
	var commands = {
		'clear':                 'Clear this sidebar.',
		'd20 [&lt;bonus&gt]':    'Roll d20 dice.',
		'd20a [&lt;bonus&gt]':   'Roll d20 dice with advantage.',
		'd20d [&lt;bonus&gt]':   'Roll d20 dice with disadvantage.',
		'history [clear]':       'Show or clear your input history.',
		'labels [hide|show]':    'Manage character name labels and health bars visibility.',
		'log &lt;message&gt;':   'Add message to journal.',
		'roll &lt;dice&gt;':     'Roll dice.'
	};

	var extra = dungeon_master ? {
		'add &lt;name&gt;':      'Add NPC to the combat and make it its turn.',
		'combat':                'Start a new combat.',
		'dmroll &lt;dice&gt;':   'Privately roll dice.',
		'done':                  'End the combat.',
		'next [&lt;name&gt;]':   'Next turn in combat.',
		'night [0-4]':           'Set map night mode.',
		'noscript':              'Disable all zone scripts.',
		'ping':                  'See who\'s online in the session.',
		'reload':                'Reload current page.',
		'remove &lt;name&gt;':   'Remove one from the combat.',
		'walls [hide|show]':     'Manage walls and windows visibility.'
	} : {
		'damage &lt;points&gt;': 'Damage your character.',
		'heal &lt;points&gt;':   'Heal your character.'
	};

	var help = [];
	Object.assign(commands, extra);
	for (const [key, value] of Object.entries(commands)) {
		help.push('<b>/' + key + '</b>: ' + value);
	}

	help.sort();

	help.push('<b>&lt;message&gt;</b>: Send text message.<br />');
	help.push('Right-click an icon or the map for a menu with options. Move a character via w, a, s and d and rotate via q and e.');

	write_sidebar(help.join('\n'));
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
		color = 'bright';
	}

	if (swap) {
		color = (color == 'bright') ? 'dark' : 'bright';
	}

	if (color == 'dark') {
		$('div.wrapper').addClass('dark');
		$(button).text('Bright interface');
		localStorage.setItem('interface_color', 'dark');
	} else {
		$('div.wrapper').removeClass('dark');
		$(button).text('Dark interface');
		localStorage.setItem('interface_color', 'bright');
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
	menu_entries['handover'] = { name:'Hand over', icon:'fa-hand-stop-o' };
	menu_entries['takeback'] = { name:'Take back', icon:'fa-hand-grab-o' };
	menu_entries['sep2'] = '-';
	menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
	menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
	menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
	menu_entries['zone_create'] = { name:'Zone', icon:'fa-square-o' };
	menu_entries['sep3'] = '-';
	menu_entries['sea'] = sea_submenu;
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
		'sep1': '-',
		'sea': sea_submenu,
		'attack': { name:'Attack', icon:'fa-legal' },
		'sep2': '-',
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

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token" style="left:' + x + 'px; top:' + y + 'px; z-index:' + LAYER_TOKEN + '" type="' + type + '" is_hidden="no" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="0" name="">' +
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
			object_rotate_command($('div#token' + instance_id), rotation, 0);
		}

		$('div.playarea div#token' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		if (mobile_device) {
			$('div#token' + instance_id + ' img').on('click', object_click_mobile);
			$('div#token' + instance_id + ' img').on('click', object_click_mobile);
		} else {
			$('div#token' + instance_id + ' img').on('click', object_click);
			$('div#token' + instance_id + ' img').on('dblclick', object_dblclick);
		}

		$('div#token' + instance_id + ' img').on('contextmenu', object_contextmenu_dm);
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_damage_command(obj, points) {
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

	var perc = Math.floor(100 * damage / hitpoints).toString() + '%';

	object_damage_action(obj, damage, perc);

	var data = {
		action: 'damage',
		instance_id: obj.prop('id'),
		damage: damage,
		perc: perc
	};
	websocket_send(data);

	$.post('/object/damage', {
		instance_id: obj.prop('id'),
		damage: damage
	});

	if (dungeon_master) {
		obj.attr('title', 'HP: ' + (hitpoints - damage));
	}
}

function object_damage_action(obj, damage, percentage) {
	obj.attr('damage', damage);
	obj.find('div.damage').css('width', percentage);

	if (percentage == '100%') {
		object_dead(obj);
	} else {
		object_alive(obj);
	}
}

function object_click(event) {
	if ($(this).parent().is(focus_obj)) {
		event.stopPropagation();
	}
}

function object_click_mobile(event) {
	event.type = 'contextmenu';
	$(this).trigger(event);
}

function object_dblclick(event) {
	event.stopPropagation();
	
	var obj = $(this).parent();

	if (ctrl_down) {
		if (obj.attr('is_hidden') == 'yes') {
			object_show_command(obj);
		} else {
			object_hide_command(obj);
		}
		return;
	}

	if (shift_down) {
		object_info(obj);
		object_view(obj);
		return;
	}

	if (focus_obj != null) {
		if (obj.is(focus_obj)) {
			return;
		}

		focus_obj.find('img').css('border', '');
	}

	focus_obj = obj;
	focus_obj.find('img').css('border', '1px solid #ffa000');

	zone_init_presence();

	if (keep_centered) {
		scroll_to_my_character(250);
	}
};

function object_dead(obj) {
	obj.css('background-color', '#c03010');
	obj.css('opacity', '0.7');
	obj.find('div.hitpoints').css('display', 'none');
}

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id')
	}).done(function() {
		if (obj.is(focus_obj)) {
			focus_obj = null;
		}

		obj.remove();

		var data = {
			action: 'delete',
			instance_id: obj.prop('id')
		};
		websocket_send(data);
	});
}

function object_hide_command(obj) {
	object_hide_action(obj);

	var data = {
		action: 'hide',
		instance_id: obj.prop('id')
	};
	websocket_send(data);

	$.post('/object/hide', {
		instance_id: obj.prop('id')
	});
}

function object_hide_action(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, OBJECT_HIDDEN_FADE);
	} else {
		obj.hide(100);
	}

	obj.attr('is_hidden', 'yes');
}

function object_info(obj) {
	if (obj.hasClass('light')) {
		write_sidebar('Light number: ' + obj.attr('id').substring(5) + '<br />');
		return;
	}

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

		var conditions = obj.find('span.conditions');
		if (conditions.length > 0) {
			conditions = conditions.html().replace(/>/g, '>- ');
			info += 'Conditions:<br />- ' + conditions;
		}
	} else {
		script = obj.find('div.script');
		if (script.length > 0) {
			var dashes = '&mdash;&mdash;&mdash;';
			info += '<b>' + dashes + '[ script ]' + dashes + dashes + '</b>\n';
			info += script.text() + '\n';
			info += '<b>' + dashes + dashes + dashes + dashes + '&mdash;&mdash;</b>\n';
		}
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

	if (obj.is(my_character)) {
		char_pos_x = Math.round(pos.left / grid_cell_size);
		char_pos_y =  Math.round(pos.top / grid_cell_size);
		char_pos_changed = true;
	} else if (obj.hasClass('effect') == false) {
		$.post('/object/move', {
			instance_id: obj.prop('id'),
			pos_x: Math.round(pos.left / grid_cell_size),
			pos_y: Math.round(pos.top / grid_cell_size)
		});
	}

	/* Fog of War
	 */
	if (obj.is(fow_obj) || obj.is(my_character)) {
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

function object_rotate_command(obj, rotation, speed = 500) {
	object_rotate_action(obj, rotation, speed);

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

function object_rotate_action(obj, rotation, speed = 500) {
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

function object_show_command(obj) {
	object_show_action(obj);

	var data = {
		action: 'show',
		instance_id: obj.prop('id')
	};
	websocket_send(data);

	$.post('/object/show', {
		instance_id: obj.prop('id')
	});
}

function object_show_action(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, 1);
	} else {
		obj.show(100);
	}

	obj.attr('is_hidden', 'no');
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

	zone_check_events(obj, pos);

	if (stick_to != null) {
		stick_to_x += x;
		stick_to_y += y;
	}

	if (keep_centered) {
		scroll_to_my_character(0);
	}
}

function object_steer(event) {
	if ((dungeon_master == false) && pause) {
		return;
	}

	if (character_steerable == false) {
		return;
	}

	if ($('div.input input:focus').length > 0) {
		return;
	}

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

	if ((obj.attr('token_type') == 'topdown') || obj.hasClass('token')) {
		switch (event.which) {
			case KB_ROTATE_LEFT:
				object_turn(obj, -45);
				return;
			case KB_ROTATE_RIGHT:
				object_turn(obj, 45);
				return;
		}
	}

	if (key_to_direction == null) {
		var keys = [ KB_MOVE_UP, KB_MOVE_RIGHT, KB_MOVE_DOWN, KB_MOVE_LEFT ];
		var degrees = [ 0, 90, 180, 270 ];

		key_to_direction = {};
		for (var i = 0; i < keys.length; i++) {
			key_to_direction[keys[i]] = degrees[i];
		}

		if (obj.attr('token_type') == 'portrait') {
			keys = [ KB_MOVE_UP_RIGHT, KB_MOVE_DOWN_RIGHT, KB_MOVE_DOWN_ALT, KB_MOVE_DOWN_LEFT, KB_MOVE_UP_LEFT ];
			degrees = [ 45, 135, 180, 225, 315 ];

			for (var i = 0; i < keys.length; i++) {
				key_to_direction[keys[i]] = degrees[i];
			}
		}
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

	var direction = key_to_direction[event.which];
	if (direction == undefined) {
		return;
	}
	var rotation = parseInt(obj.attr('rotation'));
	direction = (rotation + direction) % 360;
	direction = directions[direction];
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

	object_rotate_command(obj, rotation, 100);
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

	var src = obj.find('img').prop('src');
	if (collectable_id != undefined) {
		var container_src = src;
		var src = '/resources/' + resources_key + '/collectables/' + obj.attr('c_src');
	}

	var color = localStorage.getItem('interface_color');
	var bgcolor = (color == 'dark') ? '64, 64, 64' : '160, 160, 160';

	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; z-index:' + LAYER_VIEW + '; top:0; left:0; right:0; bottom:0; background-color:rgba(' + bgcolor + ', 0.8);';
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px; margin:0 auto;';
	var container_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px; position:absolute; top:100px; left:100px;';
	var description = obj.find('img').attr('description');
	var name = obj.find('span.name').text();

	var transform = obj.find('img').css('transform');
	if ((transform != 'none') && (collectable_id == undefined)) {
		img_style += ' transform:' + transform + ';';
	}

	if (((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) || (collectable_id != undefined)) {
		span_style += ' border:1px solid #000000; background-color:#ffffff;';
	}

	var view = '<div id="view" style="' + div_style + '" onClick="' + onclick +'">';
	if (container_src != undefined) {
		view += '<img src="' + container_src + '" style="' + container_style + '" />';
	}
	view += '<span style="' + span_style + '"><img src="' + src + '" style="' + img_style + '" />';
	if (name != '') {
		view += '<div style="margin-top:30px; border:1px solid #000000; background-color:#ffffff; padding:3px; text-align:center;">' + name + '</div>';
	}
	if ((description != undefined) && (description != '')) {
		description = description.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
		view += '<div style="padding:15px; min-width:500px; max-height:200px; overflow:auto">' + description + '</div>';
	}
	view += '</span></div>';
	$('body').append(view);
	$('div#view div').css('width', $('div#view img').width() + 'px');

	if ((collectable_id != undefined) && (dungeon_master == false)) {
		$('div#view span').append('<div class="btn-group" style="width:100%"><button class="btn btn-default" style="width:100%">Take item</button></div>');
		$('div#view span button').on('click', function() {
			obj.attr('c_id', null);

			$.post('/object/collectable/found', {
				collectable_id: collectable_id
			});

			send_message(character_name + ' has found an item! Check the inventory.', character_name, false);

			if (obj.attr('c_hide') == 'yes') {
				object_hide_command(obj);
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

	$('div#' + effect_id).on('contextmenu', function(event) {
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
	$('div.ruler').remove();
	$('p.measure').removeClass('measure');
}

/* Door functions
 */
function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(door.attr('pos_y')) * grid_cell_size;
	var length = parseInt(door.attr('length')) * grid_cell_size;
	var direction = door.attr('direction');

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

	if (door.attr('secret') == 'yes') {
		if (dungeon_master) {
			door.css('background-color', DOOR_SECRET);
		} else {
			door.hide();
		}
	}

	if (door.attr('state') == 'open') {
		door_show_open(door);
	}

	if (door.attr('bars') == 'yes') {
		if (direction == 'horizontal') {
			door.css('background-image', 'repeating-linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		} else {
			door.css('background-image', 'repeating-linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		}
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

function door_make_closed(door) {
	if (door.attr('state') != 'open') {
		return;
	}

	door_show_closed(door);
	door_send_state(door);
}

function door_make_open(door) {
	if (door.attr('state') == 'open') {
		return;
	}

	door_show_open(door);
	door_send_state(door);
}

function door_show_closed(door) {
	door.attr('state', 'closed');

	door.css('opacity', '1');
	if (dungeon_master) {
		door.css('background-color', door.attr('secret') == 'yes' ? DOOR_SECRET : '');
	} else if (door.attr('secret') == 'no') {
		door.show();
	}
	door.css('opacity', DOOR_OPACITY);

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function door_show_open(door) {
	door.attr('state', 'open');

	if (dungeon_master) {
		door.css('background-color', DOOR_OPEN);
		door.css('opacity', DOOR_OPACITY);
	} else {
		door.hide();
	}

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

/* Light functions
 */
function light_create_object(instance_id, pos_x, pos_y, radius) {
	var light = '<div id="light' + instance_id + '" src="/images/light_on.png" class="light" radius="' + radius + '" state="on" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; z-index:' + LAYER_LIGHT + '">';
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

	if (my_character != null) {
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

		$('div#light' + instance_id).on('dblclick', function(event) {
			light_toggle($(this));
			event.stopPropagation();
		});

		$('div#light' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {};

			menu_entries['light_info'] = { name:'Get information', icon:'fa-info-circle' };

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
	}).fail(function(data) {
		cauldron_alert('Light create error');
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

	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_toggle(light) {
	var toggle = { on:'off', off:'on' };
	var state = toggle[light.attr('state')];

	light_state(light, state);

	var light_id = light.prop('id').substring(5);

	$.post('/object/light_state', {
		light_id: light_id,
		state: state
	});

	var data = {
		action: 'light_state',
		light_id: light_id,
		state: state
	};
	websocket_send(data);
}

function light_delete(obj) {
	delete fow_light_char[obj.prop('id')];

	obj.attr('state', 'delete');
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		fog_of_war_light(obj);
	}

	if (my_character != null) {
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

/* Window functions
 */
function window_make_closed(wind) {
	if (wind.attr('transparent') != 'yes') {
		return;
	}

	window_show_closed(wind);
	window_send_state(wind);
}

function window_show_closed(wind) {
	wind.attr('transparent', 'no');

	wind.css('background-color', '#0000a0');

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function window_make_open(wind) {
	if (wind.attr('transparent') != 'no') {
		return;
	}

	window_show_open(wind);
	window_send_state(wind);
}

function window_show_open(wind) {
	wind.attr('transparent', 'yes');

	wind.css('background-color', '');

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function window_send_state(wind) {
	var data = {
		action: 'window_state',
		window_id: wind.prop('id'),
		transparent: wind.attr('transparent')
	};
	websocket_send(data);
}

/* Blinder functions
 */
function points_angle(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	var angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
	if (angle < 0) {
		angle += 360;
	}

	return angle;
}

function points_distance(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	return Math.round(Math.sqrt(dx * dx + dy * dy));
}

function blinder_position(blinder) {
	var pos1_x = parseInt(blinder.attr('pos1_x'));
	var pos1_y = parseInt(blinder.attr('pos1_y')) - 2;
	var pos2_x = parseInt(blinder.attr('pos2_x'));
	var pos2_y = parseInt(blinder.attr('pos2_y')) - 2;
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
			zone_run_script(zone_id, obj.prop('id'), event_type, pos.left, pos.top);
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

	var zone = $('<div id="' + id + '" class="zone" altitude="' + altitude + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + '; z-index:' + LAYER_ZONE + '" />');

	if (group != '') {
		zone.attr('group', group);
	}

	$('div.playarea div.zones').append(zone);

	if (dungeon_master) {
		$('div#' + id).append('<div class="script"></div>');
	}

	if (altitude > 0) {
		if (my_character != null) {
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

		$('div#zone' + instance_id).on('contextmenu', function(event) {
			var menu_entries = zone_menu;

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		cauldron_alert('Zone create error');
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

		obj.off('DOMNodeRemoved');
		obj.remove();
	});
}

function zone_init_presence() {
	if (my_character != null) {
		var my_pos = object_position(my_character);
	} else if (focus_obj) {
		var my_pos = object_position(focus_obj);
	} else {
		return;
	}

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
	window.setTimeout(function() {
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
				var description = $(this).find('description').text();
				description = description.replace(/"/g, '&quot;');

				var collectable = '<div class="col-sm-4" style="width:115px; height:115px;" onClick="javascript:object_view($(this), 1000);"><img src="/resources/' + resources_key + '/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" description="' + description + '" /></div>';
				row.append(collectable);
			});
		}

		if (dungeon_master) {
			$.post('/object/collectables/all', {
				adventure_id: adventure_id,
			}).done(function(data) {
				var collectables = '<div class="all"><table class="table table-condensed"><thead><th>Collectable</th><th>Found</th><th>Explained</th></tr></thead><tbody>';
				$(data).find('collectable').each(function() {
					var col_id = $(this).attr('id');
					var name = $(this).find('name').text();
					var found = $(this).find('found').text();
					var explain = $(this).find('explain').text();
					collectables += '<tr col_id="' + col_id + '"><td>' + name + '</td>' +
						'<td><input name="found" type="checkbox" ' + (found == 'yes' ? 'checked="checked" ' : '') + '/></td>' +
						'<td><input name="explain" type="checkbox" ' + (explain == 'yes' ? 'checked="checked" ' : '') + '/></td></tr>';
				});
				collectables += '</tbody></table></div>';

				body.append(collectables);

				body.find('input').on('click', function() {
					$.post('/object/collectable/state', {
						id: $(this).parent().parent().attr('col_id'),
						field: $(this).attr('name'),
						state: $(this).is(':checked')
					});
				});
			});
		}
	});
}

/* Journal functions
 */
function journal_add_entry(name, content) {
	content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	content = content.replace(/(http(s?):\/\/([^ ]+)\.(gif|jpg|png|webp))/, '<img src="$1" />');

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
	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));

	$('div.journal textarea').focus();
}

function journal_write() {
	var textarea = $('div.journal textarea');
	var content = textarea.val().trim();
	textarea.val('');

	if (content == '') {
		return;
	}

	journal_add_entry(character_name, content);
	journal_save_entry(character_name, content);
	textarea.focus();
}

function journal_filter_reset() {
	$('div.journal div.entry').show();
	$('div.journal').unmark();
}

function journal_filter_adjust() {
	journal_filter_reset();

	var filter = $('div.journal input[type="text"]').val().toLowerCase();
	if (filter == '') {
		return;
	}

	var mark_options = { separateWordSearch: false };

	$('div.journal div.entry').each(function() {
		if ($(this).text().toLowerCase().indexOf(filter) == -1) {
			$(this).hide();
		} else {
			$(this).mark(filter, mark_options);
		}
	});
}

function journal_filter_clear() {
	$('div.journal input[type="text"]').val('');

	journal_filter_reset();
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
		send_message(input, character_name);
		input_history_add(input);
		return;
	}

	var parts = input.split(' ', 1);
	var command = parts[0].substring(1);
	var param = input.substring(parts[0].length + 1).trim();

	switch (command) {
		case 'add':
			if (dungeon_master == false) {
				return;
			}

			if (param.trim() == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
				return;
			} else {
				combat_add(param);
			}
			break;
		case 'audio':
			wf_play_audio.open();
			break;
		case 'cauldron':
			write_sidebar('<img src="/images/cauldron.png" draggable="false" />');
			break;
		case 'clear':
			$('div.sidebar').empty();
			break;
		case 'combat':
			if (dungeon_master == false) {
				return;
			}

			combat_start();
			break;
		case 'd20':
			if (roll_d20(param) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'd20a':
			if (roll_d20(param, ROLL_ADVANTAGE) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'd20d':
			if (roll_d20(param, ROLL_DISADVANTAGE) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'damage':
			if (my_character == null) {
				return;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				$('div.input input').val(input);
				return;
			}

			object_damage_command(my_character, points);
			break;
		case 'dmroll':
			if (dungeon_master == false) {
				break;
			}

			if (roll_dice(param, false) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
				return;
			}
			break;
		case 'done':
			if (dungeon_master == false) {
				return;
			}

			combat_stop();
			break;
		case 'heal':
			if (my_character == null) {
				return;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points');
				return;
			}

			object_damage_command(my_character, -points);
			break;
		case 'help':
			show_help();
			break;
		case 'history':
			if (param == 'clear') {
				input_history = [];
				input_index = -1;
				localStorage.removeItem('input_history');
				write_sidebar('History cleared.');
				return;
			}

			var history = 'Input history:\n';
			input_history.forEach(function(value) {
				history += '<span class="history" style="display:block">' + value + '</span>';
			});
			write_sidebar(history);
			$('div.sidebar span.history').off('click').on('click', function() {
				handle_input($(this).text());
			});
			break;
		case 'inventory':
			wf_collectables.open();
			break;
		case 'journal':
			wf_journal.open();
			break;
		case 'labels':
			if ((param == 'off') || (param == 'hide')) {
				$('div.character div.hitpoints, div.token div.hitpoints').css('display', 'none');
				$('div.character span, div.token span').css('display', 'none');

				$('div.character, div.token').hover(function() {
					$(this).find('div.hitpoints').css('display', 'block');
					$(this).find('span').css('display', 'block');
				}, function() {
					$(this).find('div.hitpoints').css('display', 'none');
					$(this).find('span').css('display', 'none');
				});
			} else if ((param == 'on') || (param == 'show')) {
				$('div.character div.hitpoints, div.token div.hitpoints').css('display', 'block');
				$('div.character span, div.token span').css('display', 'block');

				$('div.character, div.token').off('mouseenter mouseleave');
			}
			break;
		case 'log':
			if (param == '') {
				return;
			}
			journal_add_entry(character_name, param);
			journal_save_entry(character_name, param);
			write_sidebar('Journal entry added.');
			return;
		case 'next':
			if (dungeon_master == false) {
				return;
			}

			combat_next(param);
			break;
		case 'night':
			if (dungeon_master == false) {
				return;
			}

			param = parseInt(param);
			if (isNaN(param)) {
				write_sidebar('Invalid level.');
				return;
			}

			if ((param < 0) || (param > 4)) {
				write_sidebar('Level out of range.');
				return;
			}

			var levels = {
				0: 0,
				1: 0.3,
				2: 0.5,
				3: 0.65,
				4: 0.8
			};

			night_level = levels[param];

			$('div.night').css('background-color', 'rgba(0, 0, 0, ' + night_level + ')');

			var data = {
				action: 'night',
				level: night_level
			};
			websocket_send(data);
			break;
		case 'noscript':
			if (dungeon_master) {
				var data = {
					action: 'noscript'
				};
				websocket_send(data);

				script_disable_all();

				write_sidebar('All zone scripts have been disabled.');
			}
			break;
		case 'ping':
			if (dungeon_master == false) {
				return;
			}

			write_sidebar('Present in this session:');

			var data = {
				action: 'ping'
			};
			websocket_send(data);
			break;
		case 'reload':
			if (dungeon_master == false) {
				return;
			}

			var data = {
				action: 'reload'
			};
			websocket_send(data);

			location.reload();
			break;
		case 'remove':
			if (dungeon_master == false) {
				return;
			}

			if (param == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
				return;
			}

			combat_remove(param);
			break;
		case 'roll':
			if (roll_dice(param) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
				return;
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
			return;
	}

	input_history_add(input);
}

function context_menu_handler(key) {
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
			my_character.css('width', img_size + 'px');
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

			if (my_character != null) {
				fog_of_war_update(my_character);
			}
			break;
		case 'armor':
			if (my_character == null) {
				return;
			}

			var armor_class = my_character.attr('armor_class');
			cauldron_prompt('Armor class:', armor_class, function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid armor class.');
					return;
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
			});
			break;
		case 'attack':
			wf_attack.find('select').val('Normal');
			wf_attack.open(obj);
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
			var max_hp = obj.attr('hitpoints');
			var hp_left = (parseInt(max_hp) - parseInt(obj.attr('damage'))).toString();

			cauldron_prompt('Points (max HP=' + max_hp + ', HP left=' + hp_left + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid damage points.');
					return;
				}

				object_damage_command(obj, points);
			});
			break;
		case 'delete':
			cauldron_confirm('Delete object?', function() {
				object_delete(obj);
			});
			break;
		case 'distance':
			measuring_stop();

			var ruler_x = coord_to_grid(mouse_x, false);
			var ruler_y = coord_to_grid(mouse_y, false);
			ruler_previous = 0;

			var ruler_position = function(to_x, to_y) {
				var angle = points_angle(ruler_x, ruler_y, to_x, to_y);
				var distance = points_distance(ruler_x, ruler_y, to_x, to_y);

				var ruler = $('div.ruler.current');
				ruler.css('width', distance + 'px');
				ruler.css('height', '4px');
				ruler.css('transform', 'rotate(' + angle + 'deg)');

				measure_diff_x = Math.round(Math.abs(to_x - ruler_x) / grid_cell_size);
				measure_diff_y = Math.round(Math.abs(to_y - ruler_y) / grid_cell_size);

				ruler_distance = (measure_diff_x > measure_diff_y) ? measure_diff_x : measure_diff_y;
				ruler_distance += ruler_previous;

				var text = ruler_distance + ' / ' + (ruler_distance * 5) + 'ft';
				if (ruler_previous == 0) {
					text += '/ ' + (measure_diff_x + 1) + 'x' + (measure_diff_y + 1);
				}
				$('p.measure').text(text);
			}

			var sidebar = $('div.sidebar');
			sidebar.append('<p class="measure">&nbsp;</p>');
			sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));

			$('div.playarea div.markers').append('<div class="ruler current" />');
			var ruler = $('div.ruler');
			ruler.css('left', (ruler_x + (grid_cell_size >> 1)) + 'px');
			ruler.css('top', (ruler_y + (grid_cell_size >> 1)) + 'px');
			ruler_position(ruler_x, ruler_y);

			$('div.playarea').mousemove(function(event) {
				var scr = screen_scroll();
				var to_x = event.clientX + scr.left - 16;
				to_x = coord_to_grid(to_x, false);
				var to_y = event.clientY + scr.top - 41;
				to_y = coord_to_grid(to_y, false);

				ruler_position(to_x, to_y);
			});

			$('div.playarea').on('click', function(event) {
				if (ctrl_down == false) {
					measuring_stop();
					return;
				}

				ruler_previous = ruler_distance;

				var scr = screen_scroll();
				ruler_x = event.clientX + scr.left - 16;
				ruler_x = coord_to_grid(ruler_x, false);
				ruler_y = event.clientY + scr.top - 41;
				ruler_y = coord_to_grid(ruler_y, false);

				$('div.ruler.current').removeClass('current');
				$('div.playarea div.markers').append('<div class="ruler current" />');
				var ruler = $('div.ruler.current');
				ruler.css('left', (ruler_x + (grid_cell_size >> 1)) + 'px');
				ruler.css('top', (ruler_y + (grid_cell_size >> 1)) + 'px');
				ruler_position(ruler_x, ruler_y);
			});
			break;
		case 'door_close':
			door_make_closed(obj);
			break;
		case 'door_open':
			door_make_open(obj);
			break;
		case 'effect_create':
			effect_x = coord_to_grid(mouse_x, false);
			effect_y = coord_to_grid(mouse_y, false);
			wf_effect_create.open();
			break;
		case 'effect_duplicate':
			var pos = object_position($(this));
			effect_x = pos.left + $(this).width();
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
		case 'fill_texture':
			var src = obj.css('background-image');
			src = src.substring(5, src.length - 2);

			var image = new Image();
			image.src = src;
			var pattern = drawing_ctx.createPattern(image, 'repeat');
			drawing_ctx.fillStyle = pattern;
			drawing_ctx.fillRect(0, 0, drawing_canvas.width, drawing_canvas.height);

			var data = {
				action: 'fill_texture',
				src: src
			};
			websocket_send(data);

			drawing_history.push(data);
			break;
		case 'fow_show':
			if (fow_obj == null) {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
					var distance = fow_char_distances[obj.prop('id')];
					if (distance != undefined) {
						fog_of_war_set_distance(distance);
					}
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
			var distance = fow_char_distances[obj.prop('id')].toString();
			cauldron_prompt('Distance:', distance, function(distance) {
				distance = parseInt(distance);
				if (isNaN(distance)) {
					write_sidebar('Invalid distance.');
					return;
				} else if (distance < 0) {
					write_sidebar('Invalid distance.');
					return;
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
			});
			break;
		case 'handover':
			if (focus_obj == null) {
				write_sidebar('Focus on a character first by double clicking it.');
				return;
			}

			if (focus_obj.hasClass('character') == false) {
				write_sidebar('Focus on a character first by double clicking it.');
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
			var max_hp = obj.attr('hitpoints');
			var damage = obj.attr('damage');

			cauldron_prompt('Points (max HP=' + max_hp + ', damage=' + damage + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid healing points.');
					return;
				}

				object_damage_command(obj, -points);
			});
			break;
		case 'info':
			object_info(obj);
			break;
		case 'light_create':
			var pos_x = coord_to_grid(mouse_x, false);
			var pos_y = coord_to_grid(mouse_y, false);

			wf_light_create = $('<div><label for="light_new">Light radius:</label><input id="light_new" type="text" value="3" class="form-control" /></div>').windowframe({
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
			cauldron_confirm('Delete light?', function() {
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
			});
			break;
		case 'light_attach':
			if (focus_obj == null) {
				write_sidebar('Focus on a character first by double clicking it.');
				break;
			}

			if (focus_obj.hasClass('character') == false) {
				write_sidebar('Focus on a character first by double clicking it.');
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
		case 'light_info':
			object_info(obj);
			break;
		case 'light_remove':
			cauldron_confirm('Remove light?', function() {
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
			});
			break;
		case 'light_toggle':
			light_toggle(obj);
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
				name: character_name,
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
			cauldron_prompt('Maximum hit points:', max_hp, function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
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
				object_damage_command(my_character, points - max_hp);
			});
			break;
		case 'presence':
			if (obj.attr('is_hidden') == 'yes') {
				object_show_command(obj);
			} else {
				object_hide_command(obj);
			}
			break;
		case 'rotate':
			var compass = { 'n':   0, 'ne':  45, 'e':  90, 'se': 135,
			                's': 180, 'sw': 225, 'w': 270, 'nw': 315 };
			if ((direction = compass[direction]) != undefined) {
				object_rotate_command(obj, direction);
			}
			break;
		case 'sea_cone':
			spell_effect_area_cone(mouse_x, mouse_y);
			break;
		case 'sea_cone_angle':
			spell_effect_area_change_cone_angle();
			break;
		case 'sea_circle':
			spell_effect_area_circle(mouse_x, mouse_y);
			break;
		case 'sea_square':
			spell_effect_area_square(mouse_x, mouse_y);
			break;
		case 'shape':
			if (shape_change_id == 0) {
				var filename = obj.find('img').attr('orig_src');
				var size = 1;
			} else {
				var shape = $('div.shape_change div[shape_id=' + shape_change_id + ']');
				var filename = 'tokens/' + shape_change_id.toString() + '.' + shape.attr('extension');
				var size = $('div.shape_change div[shape_id=' + shape_change_id + ']').attr('size');
			}

			obj.find('img').attr('src', '/resources/' + resources_key + '/' + filename);
			obj.css('width', (grid_cell_size * size) + 'px');
			obj.find('img').css('height', (grid_cell_size * size) + 'px');

			var data = {
				action: 'shape',
				char_id: obj.attr('id'),
				src: filename,
				size: size
			};
			websocket_send(data);

			$.post('/object/shape', {
				adventure_id: adventure_id,
				char_id: obj.attr('char_id'),
				token_id: shape_change_id
			});
			break;
		case 'sheet':
			var char_id = obj.attr('char_id');
			var sheet_url = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			window.open(sheet_url, '_blank');
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
			cauldron_prompt('Temporary hit points:', temporary_hitpoints.toString(), function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
				}

				temporary_hitpoints = points;
			});
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

			object_hide_command(obj);
			break;
		case 'view':
			object_view(obj);
			break;
		case 'window_open':
			window_make_open(obj);
			break;
		case 'window_close':
			window_make_closed(obj);
			break;
		case 'zone_create':
			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			$('div.zone_create input#width').val(3);
			$('div.zone_create input#height').val(3);
			wf_zone_create.open();
			$('div.zone_create div.panel-body').prop('scrollTop', 0);
			break;
		case 'zone_delete':
			cauldron_confirm('Delete zone?', function() {
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
			});
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

function key_down(event) {
	if ((dungeon_master == false) && pause) {
		return;
	}

	if ($('div.input input:focus').length > 0) {
		return;
	}

	var open_windows = $('div.windowframe_overlay > div:visible');

	switch (event.which) {
		case 9:
			// TAB
			if (open_windows.length == 0) {
				toggle_fullscreen();
			}
			break;
		case 16:
			// Shift
			shift_down = true;
			break;
		case 17:
			// CTRL
			ctrl_down = true;
			break;
		case 18:
			// ALT
			alt_down = true;
			break;
		case 19:
			// Pauze / break
			if (dungeon_master) {
				$('div.menu button.pause').trigger('click');
			}
			break;
		case 27:
			// Escape
			$('p.measure').remove();
			measuring_stop();
			open_windows.close();
			$('body div.context_menu').remove();
			$('div.menu').hide();
			spell_effect_area_stop();
			break;
		case 192:
			// r
			if ($('div.diceroll:visible').length > 0) {
				wf_dice_roll.close();
			} else if (open_windows.length == 0) {
				wf_dice_roll.open();
			}
			break;
	}
}

function key_up(event) {
	switch (event.which) {
		case 16:
			// Shift
			shift_down = false;
			$('canvas#drawing').off('mousemove');
			break;
		case 17:
			// CTRL
			ctrl_down = false;
			if (shift_down == false) {
				$('canvas#drawing').off('mousemove');
			}
			break;
		case 18:
			// ALT
			alt_down = false;
			break;
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
	my_name = $('div.sidebar').attr('name');
	character_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('is_dm') == 'yes');
	fow_type = parseInt($('div.playarea').attr('fog_of_war'));
	fow_default_distance = parseInt($('div.playarea').attr('fow_distance'));
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host');
	var ws_port = $('div.playarea').attr('ws_port');
	
	if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
		mobile_device = true;
	}

	write_sidebar('<img src="/images/cauldron.png" style="max-width:80px; display:block; margin:0 auto" draggable="false" />');
	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');
	write_sidebar('Type /help for command information.');
	write_sidebar('You are ' + character_name + '.');

	if (dungeon_master) {
		/* Pauze button
		 */
		$('div.menu button.pause').on('click', function() {
			pause = (pause == false);

			if (pause) {
				$(this).addClass('btn-primary');
				$(this).removeClass('btn-default');
				write_sidebar('The game is paused.');
			} else {
				$(this).addClass('btn-default');
				$(this).removeClass('btn-primary');
				write_sidebar('The game is continued.');
			}

			var data = {
				action: 'pause',
				pause: pause
			};
			websocket_send(data);

			localStorage.setItem('pause', pause);
		});
	}

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + ws_host + ':' + ws_port + '/websocket');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		if (dungeon_master) {
			if (localStorage.getItem('pause') == 'true') {
				$('div.menu button.pause').trigger('click');
			}

			var color = $('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').css('background-color');
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

		$('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').trigger('click');

		write_sidebar('Connection established.');
		var role = (dungeon_master) ? 'being the' : 'playing';
		send_message(my_name + ' entered the session, ' + role + ' ' + character_name + '.', null, false);

		var parts = window.location.pathname.split('/');
		if (parts.length == 4) {
			var my_char_id = $('div.playarea').attr('my_char');
			if (my_char_id != undefined) {
				object_damage_command($('div#' + my_char_id), 0);
			}
		}

		if (my_character != null) {
			/* Unhide character
			 */
			if (my_character.attr('is_hidden') == 'yes') {
				object_show_command(my_character);
			}

			/* Request map status from DM
			 */
			var data = {
				action: 'request_init',
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
		} else if (data.map_id != map_id) {
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
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', img_size + 'px');
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
				$('div#token' + data.instance_id).on('contextmenu', object_contextmenu_player);
				break;
			case 'damage':
				var obj = $('div#' + data.instance_id);
				object_damage_action(obj, data.damage, data.perc);
				break;
			case 'delete':
				var obj = $('div#' + data.instance_id);
				obj.remove();
				break;
			case 'done':
				combat_stop();
				break;
			case 'door_state':
				var obj = $('div#' + data.door_id);
				switch (data.state) {
					case 'closed': door_show_closed(obj); break;
					case 'open': door_show_open(obj); break;
				}
				break;
			case 'draw_brush':
				drawing_ctx.beginPath();
				var pattern = drawing_ctx.createPattern(brushes[data.brush], 'repeat');
				drawing_ctx.strokeStyle = pattern;
				break
			case 'draw_clear':
				drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);

				if (fow_type == FOW_REVEAL) {
					fog_of_war_reset(false);
				}
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
			case 'fill_texture':
				var image = new Image();
				image.src = data.src;
				$(image).on('load', function() {
					var pattern = drawing_ctx.createPattern(image, 'repeat');
					drawing_ctx.fillStyle = pattern;
					drawing_ctx.fillRect(0, 0, drawing_canvas.width, drawing_canvas.height);
				});
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
				$('div#' + data.instance_id + ' img').on('contextmenu', function(event) {
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
				object_hide_action(obj);
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

						zone_init_presence();
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
					if (obj.is(fow_obj) || obj.is(my_character)) {
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
			case 'night':
				$('div.night').css('background-color', 'rgba(0, 0, 0, ' + data.level + ')');
				break;
			case 'noscript':
				script_disable_all();
				break;
			case 'pause':
				pause = data.pause;

				if (data.pause) {
					$('div.pause').show();
					$('div.input input').trigger('blur');
				} else {
					$('div.pause').hide();
				}
				break;
			case 'ping':
				var data = {
					action: 'pong',
					user_id: 0,
					name: my_name + ' (' + character_name + ')'
				};
				websocket_send(data);
				break;
			case 'pong':
				if (dungeon_master) {
					write_sidebar('&ndash; ' + data.name);
				}
				break;
			case 'reload':
				document.location = '/adventure/' + adventure_id;
				break;
			case 'request_init':
				if (dungeon_master == false) {
					break;
				} else if (data.map_id != map_id) {
					break;
				}

				var to_user_id = data.user_id;

				if (pause) {
					var data = {
						action: 'pause',
						pause: true
					};
					websocket_send(data);
				}

				drawing_history.forEach(function(draw) {
					draw.to_user_id = to_user_id;
					websocket_send(draw);
				});

				$('div.effect').each(function() {
					var pos = object_position($(this));

					var data = {
						action: 'effect_create',
						to_user_id: to_user_id,
						instance_id: $(this).prop('id'),
						src: $(this).find('img').prop('src'),
						pos_x: pos.left,
						pos_y: pos.top,
						width: $(this).width() / grid_cell_size,
						height: $(this).height() / grid_cell_size
					};
					websocket_send(data);
				});

				var data = {
					action: 'night',
					to_user_id: to_user_id,
					level: night_level
				};
				websocket_send(data);

				$('div.window[transparent=no]').each(function() {
					window_send_state($(this));
				});
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate_action(obj, data.rotation, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.name, data.mesg);
				break;
			case 'sea_circle':
				spell_effect_area_draw_circle(data.center_x, data.center_y, data.radius);
				break;
			case 'sea_cone':
				spell_effect_area_draw_cone(data.origin_x, data.origin_y, data.radius, data.angle, data.cone_angle);
				break;
			case 'sea_square':
				spell_effect_area_draw_square(data.pos_x, data.pos_y, data.range);
				break;
			case 'sea_clear':
				spell_effect_area_clear();
				break;
			case 'shape':
				var size = parseInt(data.size)
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', (grid_cell_size * size) + 'px');
				$('div#' + data.char_id).find('img').css('height', (grid_cell_size * size) + 'px');
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show_action(obj);
				break;
			case 'takeback':
				$('div#' + data.instance_id).css('cursor', 'default');
				$('div#' + data.instance_id).find('img').css('cursor', 'default');
				$('div#' + data.instance_id).draggable('destroy');

				$('div#' + data.instance_id + ' img').off('contextmenu');
				$('div#' + data.instance_id + ' img').on('contextmenu', function(event) {
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
			case 'turn':
				if (my_character == null) {
					break;
				}

				if (my_character.attr('char_id') == data.char_id) {
					zone_check_presence_for_turn(my_character);
				}
				break;
			case 'window_state':
				var obj = $('div#' + data.window_id);
				switch (data.transparent) {
					case 'no': window_show_closed(obj); break;
					case 'yes': window_show_open(obj); break;
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height,
				                   data.color, data.opacity, data.group, data.altitude);
				break;
			case 'zone_delete':
				var zone = $('div#' + data.instance_id);
				var altitude = parseInt(zone.attr('altitude'));
				zone.remove();

				if (altitude > 0) {
					if (my_character != null) {
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
		window.setTimeout(function() {
			cauldron_alert('The connection to the server was lost. Refresh the page to reconnect.');
		}, 1000);
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

	$('div.menu').css('z-index', LAYER_MENU);

	var map = $('div.playarea > div');
	var width = Math.round(map.width());
	var height = Math.round(map.height());

	/* Night mode
	 */
	$('div.night').css({
		width:width,
		height:height
	});

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		grid_init(grid_cell_size);
		$('div.grid canvas').css('z-index', LAYER_GRID);
	}

	/* Spell effect area
	 */
	spell_effect_area_init(grid_cell_size);

	sea_submenu = { name:'Spell effect area', icon:'fa-magic', items:{
		'sea_circle': { name:'Circle', icon:'fa-circle' },
		'sea_cone': { name:'Cone', icon:'fa-play' },
		'sea_square': { name:'Square', icon:'fa-stop' },
		'sep': '-',
		'sea_cone_angle': { name:'Change cone angle', icon:'fa-edit' }
	}};

	/* Map offset
	 */
	var map_offset_x = parseInt($('div.playarea').attr('offset_x'));
	var map_offset_y = parseInt($('div.playarea').attr('offset_y'));

	if ((map_offset_x > 0) || (map_offset_y > 0)) {
		var map = $('div.playarea div:first video');
		if (map.length == 0) {
			map = $('div.playarea div#map_background');
			map.css('background-position', '-' + map_offset_x + 'px -' + map_offset_y + 'px');
		} else {
			map.css('margin-left', '-' + map_offset_x + 'px');
			map.css('margin-top', '-' + map_offset_y + 'px');
		}
	}

	/* Drawing
	 */
	$('div.drawing').prepend('<canvas id="drawing" width="' + width + '" height="' + height + '" />');
	$('div.drawing canvas').css('z-index', LAYER_DRAWING);
	drawing_canvas = document.getElementById('drawing');

	drawing_ctx = drawing_canvas.getContext('2d');
	drawing_ctx.lineWidth = DRAW_DEFAULT_WIDTH;
	drawing_ctx.strokeStyle = DRAW_DEFAULT_COLOR;

	drawing_ctx.lineJoin = 'bevel';

	if (dungeon_master) {	
		var handle = $('div#draw_width div');
		$('div#draw_width').slider({
			value: DRAW_DEFAULT_WIDTH,
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
			if (event.button != 0) {
				return;
			}

			var pos = $('div.playarea').position();
			var canvas_x = Math.round(pos.left) + 1;
			var canvas_y = Math.round(pos.top) + 1;

			if (shift_down) {
				drawing_ctx.globalCompositeOperation = 'destination-out';
				if (ctrl_down == false) {
					drawing_ctx.lineWidth = DRAW_ERASE_THIN;
				} else if (alt_down) {
					drawing_ctx.lineWidth = grid_cell_size;
				} else {
					drawing_ctx.lineWidth = DRAW_ERASE_THICK;
				}
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

		$('div.draw-tools div.draw-colors span').on('click', function() {
			var color = $(this).css('background-color');

			drawing_ctx.strokeStyle = color;

			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('click', function() {
			var img = new Image();
			img.src = $(this).attr('brush');
			img.onload = function() {
				var pattern = drawing_ctx.createPattern(img, 'repeat');
				drawing_ctx.strokeStyle = pattern;
			};

			var data = {
				action: 'draw_brush',
				brush: $(this).attr('brush')
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('contextmenu', function(event) {
			menu_entries = {
				'fill_texture': { name:'Fill map with textture', icon:'fa-square' }
			};

			var menu_settings = {
				root: 'body',
				z_index: LAYER_MENU
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_settings);
			return false;
			
		});

		$('button.draw_clear').on('click', function() {
			var image = $('div#map_background').css('background-image');
			image = image.substring(image.length - 15, image.length - 2);

			var clear_dialog = '<div class="clear"><p>Remove drawings?</p>';
			if (image == 'empty_map.png') {
				clear_dialog +=
					'<div><input type="checkbox" checked="checked" class="remove_effects"> Remove effects.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_tokens"> Remove tokens.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_zones"> Remove zones.</div>';
			}
			clear_dialog += '</div>';

			var clear_window = $(clear_dialog).windowframe({
				header: 'Remove map items',
				buttons: {
					'Remove': function() {
						/* Drawings
						 */
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

						if (fow_type == FOW_REVEAL) {
							fog_of_war_reset(true);
						}

						/* Effects
						 */
						if (clear_window.find('input.remove_effects').prop('checked')) {
							$('div.effect').each(function() {
								var data = {
									action: 'effect_delete',
									instance_id: $(this).prop('id')
								};
								websocket_send(data);

								$(this).remove();
							});
						}

						/* Tokens
						 */
						if (clear_window.find('input.remove_tokens').prop('checked')) {
							$('div.token').each(function() {
								object_delete($(this));
							});
						}

						/* Zones
						 */
						if (clear_window.find('input.remove_zones').prop('checked')) {
							$('div.zone').each(function() {
								zone_delete($(this));
							});
						}
						
						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					}
				}
					
			});

			clear_window.open();
		});
	}

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	$('div.door').css('z-index', LAYER_CONSTRUCT);

	if (dungeon_master) {
		$('div.door').on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'open') {
				menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
			} else {
				menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
			}

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	$('div.wall').css('z-index', LAYER_CONSTRUCT);

	$('div.wall[transparent=yes]').on('contextmenu', function(event) {
		var menu_entries = {};

		if ($(this).attr('transparent') == 'yes') {
			menu_entries['window_close'] = { name:'Close', icon:'fa-toggle-off' };
		} else {
			menu_entries['window_open'] = { name:'Open', icon:'fa-toggle-on' };
		}

		show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Lights
	 */
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		$('div.light').each(function() {
			fog_of_war_light($(this));
		});

		$('div.light').css('z-index', LAYER_LIGHT);
	}

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	$('div.blinder').css('z-index', LAYER_CONSTRUCT);

	/* Zones
	 */
	$('div.zone').css('z-index', LAYER_ZONE);

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
		object_hide_action($(this));
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate_action($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate_action($(this), $(this).attr('rotation'), 0);
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

		if ($('div.character').length == 0) {
			write_sidebar('<hr class="top" />');
			write_sidebar('There are no player characters in your adenture. Invite players via the invitation code as set in the <a href="/vault/invite">Invite</a> section in the Dungeon Master\'s Vault. After that, add their characters via the <a href="/vault/players">Players</a> section.');
			write_sidebar('<hr class="bottom" />');
		};

		$('div.character, div.token').each(function() {
			var hitpoints = parseInt($(this).attr('hitpoints')) - parseInt($(this).attr('damage'));
			$(this).attr('title', 'HP: ' + hitpoints);
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

		if (mobile_device == false) {
			$('div.characters div.character img').on('click', object_click);
			$('div.characters div.character img').on('dblclick', object_dblclick);
			$('div.tokens div.token img').on('click', object_click);
			$('div.tokens div.token img').on('dblclick', object_dblclick);
		}

		$('div.playarea').on('click', function() {
			if (focus_obj != null) {
				focus_obj.find('img').css('border', '');
				focus_obj = null;
			}
		});

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo(0, OBJECT_HIDDEN_FADE);
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

		$('div.light').on('dblclick', function(event) {
			light_toggle($(this));
			event.stopPropagation();
		});

		$('div.light').on('contextmenu', function(event) {
			var menu_entries = {};

			menu_entries['light_info'] = { name:'Get information', icon:'fa-info-circle' };

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
			'sep1': '-',
			'marker': { name:'Set marker', icon:'fa-map-marker' },
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Show coordinates', icon:'fa-flag' },
			'effect_create': { name:'Create effect', icon:'fa-fire' },
			'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
			'sep2': '-',
			'sea': sea_submenu,
			'sep3': '-',
			'handover': { name:'Hand over', icon:'fa-hand-stop-o' },
			'takeback': { name:'Take back', icon:'fa-hand-grab-o' },
			'sep4': '-',
			'zone_delete': { name:'Delete', icon:'fa-trash' },
		};

		if ((fow_type != FOW_NIGHT_CELL) && (fow_type != FOW_NIGHT_REAL)) {
			delete zone_menu['light_create'];
		}

		$('div.zone').on('contextmenu', function(event) {
			var menu_entries = zone_menu;

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu tokens
		 */
		$('div.tokens div.token img').on('contextmenu', object_contextmenu_dm);

		/* Menu characters
		 */
		$('div.character img').on('contextmenu', function(event) {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' }
			};

			var char_id = $(this).parent().attr('char_id');
			var sheet = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			if (sheet != '') {
				menu_entries['sheet'] = { name:'View character sheet', icon:'fa-file-text-o' };
			}

			menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };

			menu_entries['sep1'] = '-';
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
			menu_entries['sep2'] = '-';

			if ((fow_type != FOW_NONE) && (fow_type != FOW_REVEAL)) {
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

			menu_entries['sea'] = sea_submenu;
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
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'coordinates': { name:'Get coordinates', icon:'fa-flag' },
				'sep1': '-',
				'sea': sea_submenu,
				'sep2': '-',
				'effect_create': { name:'Create effect', icon:'fa-fire' },
				'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
				'zone_create': { name:'Create zone', icon:'fa-square-o' }
			};

			if ((fow_type != FOW_NIGHT_CELL) && (fow_type != FOW_NIGHT_REAL)) {
				delete menu_entries['light_create'];
			}

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
		$('div.character').each(function() {
			fow_char_distances[$(this).prop('id')] = fow_default_distance;
		});

		/* Library
		 */
		$('div.library img.icon').draggable({
			helper: 'clone',
			appendTo: 'div.content',
			scroll: false,
			start: function(event, ui) {
				var width = parseInt($(this).attr('obj_width')) * grid_cell_size;
				var height = parseInt($(this).attr('obj_height')) * grid_cell_size;
				ui.helper.css('width', width + 'px');
				ui.helper.css('max-width', width + 'px');
				ui.helper.css('height', height + 'px');
				ui.helper.css('max-height', height + 'px');
				ui.helper.css('z-index', '1');
			},
			stop: function(event, ui) {
				var x = (event.pageX > 0) ? event.pageX : 0;
				var y = (event.pageY > 0) ? event.pageY : 0;
				object_create($(this), x, y);
			}
		});

		/* Start combat button
		 */
		$('button.start_combat').on('click', function() {
			combat_start();
		});

		/* Audio dialog
		 */
		var audio_dialog = '<div></div>'
		wf_play_audio = $(audio_dialog).windowframe({
			activator: 'button.play_audio',
			header: 'Audio files from Resources',
			open: function() {
				$.ajax('/adventure/audio').done(function(data) {
					var files = $(data).find('audio sound');

					if (files.length > 0) {
						var audio = '<p>Select an audio file to play it.</p><ul class="audio">';
						files.each(function() {
							audio += '<li>/' + $(this).text() + '</li>';
						});
						audio += '</ul>';

						wf_play_audio.append(audio);

						$('ul.audio li').on('click', function() {
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
					} else {
						wf_play_audio.append('<p>You have no audio files. Upload them to the \'audio\' directory in the DM\'s Vault Resources section.</p>');
					}
				});
			},
			close: function() {
				$('ul.audio').empty();
			}
		});

		if (fow_type == FOW_REVEAL) {
			fog_of_war_init(LAYER_FOG_OF_WAR, true);
		}

		/* Draw tools
		 */
		$('div.playarea').css('bottom', '90px');
	} else {
		/* Player settings
		 */
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
			$('div#' + my_char + ' img').on('contextmenu', function(event) {
				var menu_entries = {
					'info': { name:'Get information', icon:'fa-info-circle' },
					'view': { name:'View', icon:'fa-search' },
					'distance': { name:'Measure distance', icon:'fa-map-signs' },
					'sep1': '-',
					'sea': sea_submenu,
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
			if (fow_type == FOW_REVEAL) {
				fog_of_war_init(LAYER_FOG_OF_WAR, false);
			} else {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
					fog_of_war_set_distance(fow_default_distance);
				}
				fog_of_war_update(my_character);
			}

			/* Anti-cheat
			 */
			var layer_removed_triggered = false;

			var layer_removed = function(layer) {
				if (layer_removed_triggered) {
					return;
				}
				layer_removed_triggered = true;

				$('div#map_background').remove();
				send_message('Player ' + character_name + ' removed the ' + layer + ' layer.', 'Anti-Cheat');

			};

			$('div.walls').on('DOMNodeRemoved', function() {
				layer_removed('walls');
			});
			$('div.wall').on('DOMNodeRemoved', function() {
				layer_removed('walls');
			});

			$('div.doors').on('DOMNodeRemoved', function() {
				layer_removed('doors');
			});
			$('div.door').on('DOMNodeRemoved', function() {
				layer_removed('doors');
			});

			$('div.blinders').on('DOMNodeRemoved', function() {
				layer_removed('blinders');
			});
			$('div.blinder').on('DOMNodeRemoved', function() {
				layer_removed('blinders');
			});

			$('div.fog_of_war').on('DOMNodeRemoved', function() {
				layer_removed('fog of war');
			});
			$('div.fog_of_war canvas').on('DOMNodeRemoved', function() {
				layer_removed('fog of war');
			});

			$('div.pause').on('DOMNodeRemoved', function() {
				layer_removed('pause');
			});
		}

		/* Menu tokens
		 */
		$('div.tokens div.token').on('contextmenu', object_contextmenu_player);

		/* Menu (other) characters
		 */
		$('div.character:not(.mine) img').on('contextmenu', function(event) {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' },
				'sep1': '-',
				'sea': sea_submenu,
				'attack': { name:'Attack', icon:'fa-legal' },
				'sep2': '-',
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'sea': sea_submenu
			};

			show_context_menu($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Update character position
		 */
		window.setInterval(function() {
			if (char_pos_changed == false) {
				return;
			}

			$.post('/object/move', {
				instance_id: my_character.prop('id'),
				pos_x: char_pos_x,
				pos_y: char_pos_y
			});

			char_pos_changed = false;
		}, CHAR_POS_SAVE_DELAY * 1000);

		/* Pre-load brushes
		 */
		$('div.brushes img').each(function() {
			var src = $(this).attr('src');

			var image = new Image;
			image.src = src;
			brushes[src] = image;
		});
	}

	/* Input field
	 */

	$('div.input input').on('keyup', function (e) {
		if ((e.key === 'Enter') || (e.keyCode === 13)) {
			var input = $(this).val();
			$(this).val('');
			handle_input(input);
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

	$('div.effect_create img').on('click', function() {
		effect_create($(this));
	});

	wf_collectables = $('<div class="collectables"></div>').windowframe({
		activator: 'button.show_collectables',
		width: 700,
		top: 150,
		style: 'success',
		header: 'Inventory',
		open: collectables_show
	});

	wf_dm_notes = $('div.dm_notes').windowframe({
		activator: 'button.show_dm_notes',
		style: 'danger',
		header: 'DM notes'
	});

	wf_attack = $('div.attack').windowframe({
		width: 500,
		header: 'Attack',
		open: function() {
			wf_attack.find('input').focus();
		},
		buttons: {
			'Ok': function() {
				var bonus = parseInt(wf_attack.find('input').val());
				wf_attack.close();

				if (isNaN(bonus)) {
					write_sidebar('Invalid attack bonus.');
					return;
				}

				var obj = wf_attack.parent().parent().data('param');
				var armor_class = parseInt(obj.attr('armor_class'));

				var message = '';
				var name = obj.find('span.name').text();
				if (name != '') {
					message += 'Target: ' + name + '\n';
				} else if (obj.attr('type') != undefined) {
					message += 'Target: ' + obj.attr('type') + '\n';
				} else {
					message += 'Target: ' + obj.prop('id') + '\n';
				}

				var type = wf_attack.find('select').val();

				dice = [ '1d20' ];
				if (type != 'Normal') {
					dice.push('1d20');
				}

				dice_roll(dice, bonus, function(result, extra) {
					var roll = result[0];

					if (type == 'Advantage') {
						if (result[1] > roll) {
							roll = result[1];
						}
					} else if (type == 'Disadvantage') {
						if (result[1] < roll) {
							roll = result[1];
						}
					}

					var details = '';
					if (type != 'Normal') {
						details += type + ': [' + result[0] + '] [' + result[1] + '] > [' + roll + ']\n';
					}
					details += 'Attack roll: [' + roll + ']';
					if (bonus > 0) {
						details += ' + ' + bonus + ' = ' + (roll + bonus);
					}
					details += '\n';

					if (dungeon_master == false) {
						message += details;
					}

					message += 'Result: ';

					if (roll == 20) {
						message += 'CRIT!';
					} else if (((roll + bonus) >= armor_class) && (roll > 1)) {
						message += 'hit!';
					} else {
						message += 'miss';
					}

					send_message(message, character_name);

					if (dungeon_master) {
						message = details;
						if (obj.attr('armor_class') != undefined) {
							message += 'Armor class: ' + obj.attr('armor_class');
						}
						write_sidebar(message);
					}
				});
			},
			'Cancel': function() {
				wf_attack.close();
			}
		}
	});

	wf_journal = $('div.journal').windowframe({
		activator: 'button.show_journal',
		width: 1000,
		height: 500,
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
			'Create': function() {
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
				if (zone_x < 0) {
					zone_x = 0;
				}

				zone_y -= Math.floor((height - 1) / 2) * grid_cell_size;
				if (zone_y < 0) {
					zone_y = 0;
				}

				zone_create(width, height, color, opacity, group, altitude);

				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			}
		}
	});

	$('button.journal_write').on('click', function() {
		journal_write();
	});

	$('button.center_character').on('click', function() {
		center_character($(this));
	});

	$('button.interface_color').on('click', function() {
		interface_color($(this));
	});

	$('button.fullscreen').on('click', function() {
		toggle_fullscreen();
	});

	$('select.map-selector').on('change', function() {
		map_switch();
	});

	$('button.map_image').on('click', function() {
		map_image();
	});

	$('button.playvideo').on('click', function() {
		$('video').get(0).play();
	});

	/* Dice roll window
	 */
	var dice_window = '<div><div class="dicerolls_defined"></div><div class="diceroll">';
	[ 4, 6, 8, 10, 12, 20 ].forEach(function(dice) {
		dice = dice.toString();
		dice_window += '<div class="dice"><img src="/images/d' + dice + '.png" title="d' + dice + '" /><select sides="' + dice + '" class="form-control">';
		for (let d = 0; d <= 10; d++) {
			dice_window += '<option>' + d.toString() + '</option>';
		}
		dice_window += '</select></div>';
	});
	dice_window += '<div class="dice"><img src="/images/plus.png" /><input type="text" class="form-control" /></div>'
	dice_window += '</div>';

	dice_roll_get = function() {
		var roll = '';
		$('div.diceroll select').each(function() {
			var value = parseInt($(this).val());
			if (value != 0) {
				if (roll != '') {
					roll += ' + ';
				}
				roll += value + 'd' + $(this).attr('sides');
			}
		});

		if (roll == '') {
			cauldron_alert('Select at least one dice.');
			return false;
		}

		var plus = $('div.diceroll input').val();
		if (isNaN(parseInt(plus))) {
			cauldron_alert('Enter a number in the plus input field.');
			return false;
		}

		if (plus.substr(0, 1) == '-') {
			roll += plus;
		} else if (plus != '0') {
			roll += ' + ' + plus;
		}

		return roll;
	}

	dice_roll_init = function() {
		if (typeof dice_roll_3d == 'undefined') {
			wf_dice_roll.parent().find('select.dice-type').remove();
		}

		$('div.diceroll select').each(function() {
			$(this).val('0');
		});
		$('div.diceroll input').val('0');

		var defined = $('div.dicerolls_defined');
		defined.empty();
		var rolls = localStorage.getItem('dicerolls');
		if (rolls == undefined) {
			rolls = [];
		} else {
			rolls = JSON.parse(rolls);
		}

		for ([key, value] of Object.entries(rolls)) {
			rolls[key] = {
				roll: value,
				global: true
			};
		};

		$('div.weapons div').each(function() {
			rolls[$(this).text()] = {
				roll: $(this).attr('roll'),
				global: false
			};
		});

		rolls = Object.keys(rolls).sort().reduce((accumulator, key) => {
			accumulator[key] = rolls[key];
			return accumulator;
		}, {});

		for ([key, value] of Object.entries(rolls)) {
			var roll = value['roll'];
			var global = value['global'];

			key = key.replace('"', '&quot;');

			if (global) {
				var button = $('<div class="btn-group"><input type="button" value="' + key + '" title="' + roll + '" class="btn btn-default roll" /><input type="button" value="X" class="btn btn-default remove" /></div>');
			} else {
				var button = $('<div class="btn-group"><input type="button" value="' + key + '" title="' + roll + '" class="btn btn-primary roll" /></div>');
			}

			button.find('input.roll').on('click', function() {
				wf_dice_roll.close();

				var dice = $(this).attr('title');
				roll_dice(dice, dungeon_master == false);
				input_history_add('/roll ' + dice);
			});
			button.find('input.remove').on('click', function() {
				if (confirm('Delete dice?')) {
					var key = $(this).parent().find('input.roll').attr('value');
					var rolls = localStorage.getItem('dicerolls');
					rolls = JSON.parse(rolls);
					delete rolls[key];
					localStorage.setItem('dicerolls', JSON.stringify(rolls));

					dice_roll_init();
				}
			});
			defined.append(button);
		};
	}

	wf_dice_roll = $(dice_window).windowframe({
		activator: 'button.show_dice',
		header: 'Roll dice',
		width: 665,
		open: function() {
			dice_roll_init();
		},
		buttons: {
			'Roll': function() {
				$(this).close();

				var roll = dice_roll_get();
				if (roll === false) {
					return;
				}
				roll_dice(roll, dungeon_master == false);
				input_history_add('/roll ' + roll);
			},
			'Save': function() {
				var roll = dice_roll_get();
				if (roll === false) {
					return;
				}

				var name = prompt('Name this dice roll:');
				if (name == null) {
					return;
				}

				if (name.trim() == '') {
					return;
				}

				var rolls = localStorage.getItem('dicerolls');
				if (rolls == undefined) {
					rolls = {};
				} else {
					rolls = JSON.parse(rolls);
				}

				rolls[name] = roll;

				localStorage.setItem('dicerolls', JSON.stringify(rolls));

				dice_roll_init();
			}
		}
	});

	if (localStorage.getItem('dice_type') == undefined) {
		localStorage.setItem('dice_type', 'animated');
	}

	var dice_type_selector = $('<select style="float:right; width:110px; margin-top:15px" class="form-control dice-type"><option value="quick">Quick</option><option value="animated">Animated</option></select>');
	if (localStorage.getItem('dice_type') == 'animated') {
		dice_type_selector.find('option:last-child').attr('selected', 'selected');
	}
	dice_type_selector.on('change', function() {
		localStorage.setItem('dice_type', $(this).val());
	});
	wf_dice_roll.parent().find('div.btn-group').before(dice_type_selector);

	wf_dice_roll.find('div.dice img').on('dblclick', function() {
		var dice = $(this).attr('title');
		if (dice == undefined) {
			return;
		}

		wf_dice_roll.close();

		roll_dice('1' + dice, dungeon_master == false);
	});

	/* Other stuff
	 */
	$('div.playarea').mousedown(function(event) {
		var mac = (window.navigator.platform == 'MacIntel');
		if ((event.which == 3) || (mac && (event.which == 1) && (ctrl_down))) {
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

	scroll_to_my_character();

	$('body').keydown(key_down);
	$('body').keyup(key_up);
	$('body').keyup(object_steer);

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

	/* Touchscreens
	 */
	if (mobile_device) {
		$('div.characters div.character img').on('click', object_click_mobile);
		$('div.tokens div.token img').on('click', object_click_mobile);
	}
});

$(window).on('load', function() {
	$('div.loading').remove();
});
