const WS_HOST = 'tabletop.leisink.net';
const WS_PORT = '2000';
const DEFAULT_Z_INDEX = 10000;

var websocket;
var game_id = null;
var map_id = null;
var grid_cell_size = null;
var my_name = null;
var dungeon_master = null;
var my_character = null;
var focus_obj = null;
var zone_id = 1;
var input_history = [];
var input_index = -1;
var z_index = DEFAULT_Z_INDEX;
var battle_order = [];
var temporary_hitpoints = 0;

function change_map() {
    $.post('/game', {
        action: 'change_map',
        game_id: game_id,
        map_id: $('select.map-selector').val()
    }).done(function() {
		var data = {
			game_id: game_id,
			action: 'reload',
		};
		websocket.send(JSON.stringify(data));

		document.location = '/game/' + game_id;
    });
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function send_message(message, write_to_sidebar = true) {
	if (websocket == null) {
		return;
	}

	message = message.replace(/</g, '&lt;');
	message = message.replace(/\n/g, '<br />');
	message = '<b>' + my_name + ':</b><span style="display:block; margin-left:15px;">' + message + '</span>';
	var data = {
		game_id: game_id,
		action: 'say',
		mesg  : message
	};
	websocket.send(JSON.stringify(data));

	if (write_to_sidebar) {
		write_sidebar(message);
	}
}

function roll_dice(dice, send_to_others = true) {
	var parts = dice.split('+');
	var output = '';
	var result = 0;

	for (i = 0; i < parts.length; i++) {
		var roll = parts[i].trim().split('d');
		if (roll.length > 2) {
			return false;
		} else if (roll.length == 2) {
			var count = parseInt(roll[0]);
			var sides = parseInt(roll[1]);

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

	var message = 'Dice roll ' + dice + ':\n' + output + ' -> ' + result;
	if (send_to_others) {
		send_message(message);
	} else {
		write_sidebar(message);
	}

	return true;
}

function show_help() {
	var help =
		'<b>/clear</b>: clear this sidebar.<br />' +
		(dungeon_master ? '' :
		'<b>/damage [points]</b>: damage your character.<br />') +
		(dungeon_master ?
		'<b>/dmroll [dice]</b>: Privately roll dice.<br />' : '') +
		(dungeon_master ? '' :
		'<b>/heal [points]</b>: Heal your character.<br />') +
		(dungeon_master ?
		'<b>/initiative</b>: Roll for initiative.<br />' : '') +
		'<b>/roll [dice]</b>: Roll dice.<br />' +
		(dungeon_master ?
		'<b>/next</b>: Next character\'s turn in battle.<br />' +
		'<b>/ping</b>: See who\'s online in the game.<br />' : '') +
		'<b>[message]</b>: Send text message.<br />' +
		'Right-click ' + (dungeon_master ? 'any' : 'your character') + ' icon or the map for more options.';
	
	write_sidebar(help);
}

function show_battle_order() {
	var message = 'Battle order:\n';
	var bullet = '->';
	battle_order.forEach(function(value, key) {
		message += bullet + ' ' + value.name + '\n';
		bullet = '-';
	});

	send_message(message);
}

function handle_input(input) {
	input = input.trim();

	if (input == '') {
		return;
	}

	if (input.substr(0, 1) != '/') {
		if (input.substr(0, 4).toLowerCase() == "dice") {
			return;
		}
		send_message(input);
		return;
	}

	var parts = input.split(' ');

	command = parts[0].substr(1);
	param = input.substr(parts[0].length + 1).trim();

	switch (command) {
		case 'clear':
			$('div.sidebar *').remove();
			break;
		case 'damage':
		case 'dmg':
			if (my_character == null) {
				write_sidebar('You have no character.');
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points');
				break;
			}

			damage_object(my_character, points);
			break;
		case 'dmroll':
			if (roll_dice(param, false) == fase) {
				write_sidebar('Incorrect roll');
				$('div.input input').val(input);
			}
			break;
		case 'heal':
			if (my_character == null) {
				write_sidebar('You have no character.');
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points');
				break;
			}

			damage_object(my_character, -points);
			break;
		case 'help':
			show_help();
			break;
		case 'initiative':
		case 'init':
			if (dungeon_master == false) {
				break;
			}

			battle_order = [];

			do {
				var enemy = prompt('Enemy: name[,initiative bonus]');
				if (enemy == undefined) {
					return;
				}

				if (enemy != '') {
					var parts = enemy.split(',');

					var initiative = 0;
					if (parts.length > 1) {
						initiative = parseInt(parts[1]);
						if (initiative == undefined) {
							write_sidebar("Invalid initiative value.");
							continue;
						}
					}
					var roll = Math.floor(Math.random() * 20) + 1 + initiative;
					roll = roll.toString();
					while (roll.length < 2) {
						roll = '0' + roll;
					}

					var item = {
						key: roll + '-enemy',
						name: parts[0]
					}
					battle_order.push(item);

					write_sidebar(parts[0] + ' added.');
				}
			} while (enemy != '');

			$('div.character').each(function() {
				var initiative = parseInt($(this).attr('initiative'));
				var roll = Math.floor(Math.random() * 20) + 1 + initiative;
				roll = roll.toString();
				while (roll.length < 2) {
					roll = '0' + roll;
				}
				var item = {
					key: roll + '-' + $(this).attr('id'),
					name: $(this).find('span').text()
				};
				battle_order.push(item);
			});

			battle_order.sort((a, b) => b.key.localeCompare(a.key));

			show_battle_order();
			break;
		case 'next':
			if (dungeon_master == false) {
				break;
			}

			if (battle_order.length == 0) {
				write_sidebar('Roll for initiative first.'); 
				break;
			}

			var item = battle_order.shift();
			battle_order.push(item);

			show_battle_order();
			break;
		case 'ping':
			if (dungeon_master) {
				var data = {
					game_id: game_id,
					action: 'ping',
				};
				websocket.send(JSON.stringify(data));
			}
			break;
		case 'roll':
			if (roll_dice(param) == false) {
				write_sidebar('Incorrect roll');
				$('div.input input').val(input);
			}
			break;
	}
}

/* Object interaction
 */
function object_info(obj) {
	info = 'Hitpoints: ' + obj.attr('hitpoints') + '<br />';

	if (obj.is(my_character)) {
		info += 'Temporary hitpoints: ' + temporary_hitpoints.toString() + '<br />';
	}

	var remaining = parseInt(obj.attr('hitpoints')) - parseInt(obj.attr('damage'));
	info +=
		'Damage: ' + obj.attr('damage') + '<br />' +
		'Remaining hitpoints: ' + remaining.toString() + '<br />';

	var name = obj.find('span');
	if (name.length > 0) {	
		info = 'Name: ' + name.text() + '<br />' + info;
	}

	if (dungeon_master || obj.is(my_character)) {
		info += 'Armor class: ' + obj.attr('armor_class') + '<br />';
	}

	if (dungeon_master) {
		info += 'Instance: ' + obj.attr('id') + '<br />';
	}

	write_sidebar(info);
}

function handover_object(obj) {
	if (focus_obj == null) {
		write_sidebar('Focus on a character first.');
		return;
	}

	if (focus_obj.is('.character') == false) {
		write_sidebar('Focus on a character first.');
		return;
	}

	var data = {
		game_id: game_id,
		action: 'handover',
		instance_id: obj.prop('id'),
		owner_id: focus_obj.prop('id'),
	};
	websocket.send(JSON.stringify(data));
}

function hide_object(obj) {
	var data = {
		game_id: game_id,
		action: 'hide',
		instance_id: obj.prop('id'),
	};
	websocket.send(JSON.stringify(data));

	$.post('/game', {
		action: 'hide',
		instance_id: obj.prop('id'),
	});

	obj.fadeTo('fast', 0.5);
}

function show_object(obj) {
	var data = {
		game_id: game_id,
		action: 'show',
		instance_id: obj.prop('id'),
	};
	websocket.send(JSON.stringify(data));

	$.post('/game', {
		action: 'show',
		instance_id: obj.prop('id'),
	});

	obj.fadeTo('fast', 1);
}

function move_object(obj) {
	var pos = obj.position();
	var map = $('div.playarea div');

	var max_x = map.width() - obj.width();
	var max_y = map.height() - obj.height();

	pos.left += $('div.playarea').scrollLeft();
	pos.top += $('div.playarea').scrollTop();

	if (pos.left < 0) {
		pos.left = 0;
	} else if (pos.left > max_x) {
		pos.left = max_x;
	}

	var delta = pos.left % grid_cell_size;
	pos.left -= delta;
	if (delta > (grid_cell_size >> 1)) {
		pos.left += grid_cell_size;
	}

	if (pos.top < 0) {
		pos.top = 0;
	} else if (pos.top > max_y) {
		pos.top = max_y;
	}

	var delta = pos.top % grid_cell_size;
	pos.top -= delta;
	if (delta > (grid_cell_size >> 1)) {
		pos.top += grid_cell_size;
	}

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	if (websocket == null) {
		return;
	}

	var data = {
		game_id: game_id,
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: obj.css('left'),
		pos_y: obj.css('top')
	};
	websocket.send(JSON.stringify(data));

	$.post('/game', {
		game_id: game_id,
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: (pos.left / grid_cell_size),
		pos_y: (pos.top / grid_cell_size)
	});

	$('div.input input').focus();
}

function object_dead(obj) {
	obj.css('background-color', '#c03010');
	obj.css('opacity', '0.7');
	obj.find('div.hitpoints').css('display', 'none');
}

function object_alive(obj) {
	obj.css('background-color', '');
	obj.css('opacity', '1');
	obj.find('div.hitpoints').css('display', 'block');
}

function damage_object(obj, points) {
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
		game_id: game_id,
		action: 'damage',
		instance_id: obj.prop('id'),
		perc: dmg.css('width')
	};
	websocket.send(JSON.stringify(data));

	$.post('/game', {
		action: 'damage',
		instance_id: obj.prop('id'),
		damage: damage
	});
}

function create_zone_object(id, pos_x, pos_y, width, height, color) {
	var id = 'zone' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	var zone = '<div id="' + id + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:0.2;" />';

	$('div.playarea > div').prepend(zone);
	$('div#' + id).draggable({
		stop: function(event, ui) {
			move_object($(this));
		}
	});
}

function create_zone(obj, width, height, color) {
	var playarea = $('div.playarea');
	var pos_x = playarea.width() / 2 + playarea.scrollLeft();
	var pos_y = playarea.height() / 2 + playarea.scrollTop();

	pos_x -= Math.floor(width / 2) * grid_cell_size;
	pos_y -= Math.floor(height / 2) * grid_cell_size;

	create_zone_object(zone_id, pos_x, pos_y, width, height, color);

	var data = {
		game_id: game_id,
		action: 'zone_create',
		instance_id: zone_id,
		pos_x: pos_x,
		pos_y: pos_y,
		width: width,
		height: height,
		color: color
	};
	websocket.send(JSON.stringify(data));

	$.contextMenu({
		selector: 'div#zone' + zone_id,
		callback: context_menu_handler,
		items: {
			'zone_delete': {name:'Delete', icon:'fa-trash'},
		},
		zIndex: DEFAULT_Z_INDEX + 4
	});

	zone_id++;
}

function create_marker(pos_x, pos_y) {
	var marker = '<img class="marker" src="/images/marker.png" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" />';

	$('div.playarea > div').append(marker);
	setTimeout(function() { $('img.marker').first().remove(); }, 2000);
}

/* Context menu handler
 */
function context_menu_handler(key, options) {
	var obj = $(this);

	if (obj.prop('tagName') == 'IMG') {
		obj = obj.parent();
	}

	var parts = key.split('_');
	var travel_map_id = 0;
	if (parts[0] == 'travel') {
		key = parts[0];
		travel_map_id = parts[1];
	}

	switch (key) {
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

			var roll = Math.floor(Math.random() * 20) + 1 + bonus;

			var message = '';
			var name = obj.find('span').text();
			if (name != '') {
				message += 'Target: ' + name + '\n';
			}
			message += 'Attack roll: ' + roll + '\nResult: ';
			message += (roll == 20) ? 'CRIT!' : (roll >= armor_class) ? 'hit!' : 'miss';

			send_message(message);
			break;
		case 'damage':
			var points;
			if ((points = window.prompt('Points:')) == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				break;
			}

			damage_object(obj, points);
			break;
		case 'focus':
			focus_obj = obj;
			$('div.character').find('img').css('border', '');
			$('div.token').find('img').css('border', '');
			obj.find('img').css('border', '1px solid #ffa000');
			break;
		case 'handover':
			handover_object(obj);
			break;
		case 'heal':
			var points;
			if ((points = window.prompt('Points:')) == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points.');
				break;
			}

			damage_object(obj, -points);
			break;
		case 'info':
			object_info(obj);
			break;
		case 'lower':
			obj.css('z-index', z_index);
			z_index--;
			var data = {
				game_id: game_id,
				action: 'lower',
				instance_id: obj.prop('id'),
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'marker':
			var menu = $('div#context-menu-layer + ul.context-menu-root');
			var pos_menu = menu.position();

			if (pos_menu == undefined) {
				menu = $('ul.context-menu-root + div#context-menu-layer').prev();
				pos_menu = menu.position();

				if (pos_menu == undefined) {
					break;
				}
			}

			var pos_x = Math.floor(pos_menu.left) + $('div.playarea').scrollLeft() - 41;
			var pos_y = Math.floor(pos_menu.top) + $('div.playarea').scrollTop() - 90;

			create_marker(pos_x, pos_y);

			var data = {
				game_id: game_id,
				action: 'marker',
				pos_x: pos_x,
				pos_y: pos_y
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'presence':
			if (obj.attr('is_hidden') == 'yes') {
				show_object(obj);
				obj.attr('is_hidden', 'no');
			} else {
				hide_object(obj);
				obj.attr('is_hidden', 'yes');
			}
			break;
		case 'takeback':
			var data = {
				game_id: game_id,
				action: 'takeback',
				instance_id: obj.prop('id'),
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'temphp':
			var points;
			if ((points = window.prompt('Temporary hitpoints:', temporary_hitpoints)) == undefined) {
				break;
			}

			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points.');
				break;
			}

			temporary_hitpoints = points;
			break;
		case 'travel':
			var data = {
				game_id: game_id,
				action: 'travel',
				instance_id: obj.prop('id'),
				char_id: obj.attr('char_id'),
				hitpoints: obj.attr('hitpoints'),
				map_id: travel_map_id
			};
			websocket.send(JSON.stringify(data));

			var parts = window.location.pathname.split('/');
			if (parts.length == 3) {
				window.open('/game/' + game_id + '/' + travel_map_id);
			}

			hide_object(obj);
			obj.attr('is_hidden', 'yes');
			break;
		case 'zone_create':
			var info;
			if ((info = window.prompt('Zone width[,height[,#rgb]]:')) == undefined) {
				break;
			}

			var parts = info.split(',');
			var width = parseInt(parts[0]);
			var height = (parts.length > 1) ? parseInt(parts[1]) : width;
			var color = (parts.length > 2) ? parts[2] : '#f00';

			if (isNaN(width)) {
				write_sidebar('Invalid width.');
				break;
			} else if (isNaN(height)) {
				write_sidebar('Invalid height.');
				break;
			}

			create_zone(obj, width, height, color);
			break;
		case 'zone_delete':
			var data = {
				game_id: game_id,
				action: 'zone_delete',
				instance_id: obj.prop('id'),
			};
			websocket.send(JSON.stringify(data));

			obj.remove();
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}

	focus_on_input();
}

function focus_on_input() {
	$('div.input input').focus();
}

/* Main
 */
$(document).ready(function() {
	write_sidebar('<b>Welkom to TableTop!</b>');
	write_sidebar('Type /help for command information.');

	game_id = parseInt($('div.playarea').attr('game_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('dm') == 'yes');

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + WS_HOST + ':' + WS_PORT + '/');

	websocket.onopen = function(event) { 
		write_sidebar('Connection established.');
		send_message('Entered the game.', false);

		var parts = window.location.pathname.split('/');
		if (parts.length == 4) {
			var my_char_id = $('div.playarea').attr('my_char');
			if (my_char_id != undefined) {
				damage_object($('div#' + my_char_id), 0);
			}
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

		switch (data.action) {
			case 'damage':
				var obj = $('div#' + data.instance_id);
				obj.find('div.damage').css('width', data.perc);
				if (data.perc == 0) {
					object_dead(obj);
				} else {
					object_alive(obj);
				}
				break;
			case 'handover':
				if (data.owner_id == my_character.prop('id')) {
					$('div#' + data.instance_id).draggable({
						handle: 'img',
						stop: function(event, ui) {
							move_object($(this));
						}
					});
				}
				break;
			case 'hide':
				$('div#' + data.instance_id).hide();
				break;
			case 'lower':
				$('div#' + data.instance_id).css('z-index', z_index);
				z_index--;
				break;
			case 'marker':
				create_marker(data.pos_x, data.pos_y);
				break;
			case 'move':
				$('div#' + data.instance_id).animate({
					left: data.pos_x,
					top: data.pos_y
				}, 'fast');
				break;
			case 'ping':
				send_message("Pong", false);
				break;
			case 'reload':
				document.location = '/game/' + game_id;
				break;
			case 'say':
				write_sidebar(data.mesg);
				break;
			case 'show':
				$('div#' + data.instance_id).show();
				break;
			case 'takeback':
				$('div#' + data.instance_id).draggable('destroy');
				break;
			case 'travel':
				if (data.instance_id == my_character.prop('id')) {
					document.location = '/game/' + game_id + '/' + data.map_id;
				}
				break;
			case 'zone_create':
				create_zone_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height, data.color);
				break;
			case 'zone_delete':
				$('div#' + data.instance_id).remove();
				break;
			default:
				alert('Unknown action: ' + data.action);
		}
	};
	
	websocket.onerror = function(event) {
		write_sidebar('Connection error.');
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
			$('div.playarea > div').append(cell);
		}
	}

	/* Character and token objects
	 */
	$('div.token[is_hidden=no]').each(function() {
		$(this).show();
	});

	$('div.character[is_hidden=yes]').each(function() {
		if (dungeon_master) {
			$(this).fadeTo('fast', 0.5);
		} else {
			$(this).hide();
		}
	});

	$('div.token').css('z-index', DEFAULT_Z_INDEX + 1);
	$('div.character').css('z-index', DEFAULT_Z_INDEX + 3);
    $('div.token[rotation_point!=""] img').each(function() {
		$(this).css('transform-origin', $(this).parent().attr('rotation_point'));
	});

    $('div.token').each(function() {
		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	if (dungeon_master) {
		/* Dungeon Master settings
		 */
		$('div.token').draggable({
			handle: 'img',
			stop: function(event, ui) {
				move_object($(this));
			}
		});

		$('div.character').draggable({
			handle: 'img',
			stop: function(event, ui) {
				move_object($(this));
			}
		});

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo('fast', 0.5);
		});

		$.contextMenu({
			selector: 'div.token img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'presence': {name:'Presence', icon:'fa-low-vision'},
				'lower': {name:'Lower', icon:'fa-arrow-down'},
				'sep1': '-',
				'focus': {name:'Focus', icon:'fa-binoculars'},
				'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
				'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
				'sep2': '-',
				'attack': {name:'Attack', icon:'fa-shield'},
				'damage': {name:'Damage', icon:'fa-warning'},
				'heal': {name:'Heal', icon:'fa-medkit'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});

		var maps = {};
		$('select.map-selector option').each(function() {	
			var m_id = $(this).attr('value');
			if (m_id != map_id) {
				var key = 'travel_' + m_id;
				maps[key] = {name: $(this).text()};
			}
		});

		$.contextMenu({
			selector: 'div.character img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'presence': {name:'Presence', icon:'fa-low-vision'},
				'focus': {name:'Focus', icon:'fa-binoculars'},
				'sep1': '-',
				'attack': {name:'Attack', icon:'fa-shield'},
				'damage': {name:'Damage', icon:'fa-warning'},
				'heal': {name:'Heal', icon:'fa-medkit'},
				'sep2': '-',
				'send': {name:'Send to', icon:'fa-compass', items:maps}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});

		$.contextMenu({
			selector: 'div.playarea > div',
			callback: context_menu_handler,
			items: {
				'zone_create': {name:'Zone', icon:'fa-square-o'},
				'marker': {name:'Marker', icon:'fa-map-marker'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});
	} else {
		/* Player settings
		 /*/
		var my_char = $('div.playarea').attr('my_char');
		if (my_char != undefined) {
			my_character = $('div#' + my_char);

			my_character.draggable({
				handle: 'img',
				stop: function(event, ui) {
					move_object($(this));
				}
			});

			my_character.css('z-index', DEFAULT_Z_INDEX + 2);

			$.contextMenu({
				selector: 'div#' + my_char + ' img',
				callback: context_menu_handler,
				items: {
					'info': {name:'Info', icon:'fa-info-circle'},
					'sep1': '-',
					'damage': {name:'Damage', icon:'fa-warning'},
					'heal': {name:'Heal', icon:'fa-medkit'},
					'temphp': {name:'Temporary hitpoints', icon:'fa-heart-o'}
				},
				zIndex: DEFAULT_Z_INDEX + 4
			});

			$.contextMenu({
				selector: 'div.token img',
				callback: context_menu_handler,
				items: {
					'attack': {name:'Attack', icon:'fa-shield'}
				},
				zIndex: DEFAULT_Z_INDEX + 4
			});
		}

		$.contextMenu({
			selector: 'div.character img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});

		$.contextMenu({
			selector: 'div.playarea > div',
			callback: context_menu_handler,
			items: {
				'marker': {name:'Marker', icon:'fa-map-marker'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});
	}

	/* Input field
	 */
	$("div.input input").on('keyup', function (e) {
		if ((e.key === 'Enter') || (e.keyCode === 13)) {
			var input = $(this).val();
			$(this).val('');
			handle_input(input);

			input_history = jQuery.grep(input_history, function(value) {
				return value != input;
			});

			input_history.unshift(input);
			input_index = -1;
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

	focus_on_input();

	$('div.playarea').click(function() {
		focus_on_input();
	});

	$('div.sidebar').click(function() {
		focus_on_input();
	});
});
