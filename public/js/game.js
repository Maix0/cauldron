const WS_HOST = 'tabletop.leisink.net';
const WS_PORT = '2000';
const DEFAULT_Z_INDEX = 10000;

var websocket;
var game_id = null;
var map_id = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var dungeon_master = null;
var my_name = null;
var my_character = null;
var temporary_hitpoints = 0;
var battle_order = [];
var focus_obj = null;
var input_history = [];
var input_index = -1;
var effect_id = 1;
var effect_pos_x = null;
var effect_pos_y = null;
var stick_to = null;
var stick_to_x = 0;
var stick_to_y = 0;

function change_map() {
	$.post('/object/change_map', {
		game_id: game_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		var data = {
			game_id: game_id,
			action: 'reload'
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
	var dices = [4, 6, 8, 10, 12, 20];
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
			var count = parseInt(roll[0]);
			var sides = parseInt(roll[1]);

			if (dices.includes(sides) == false) {
				return false;
			}

			if (count > 10) {
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

	var message = 'Dice roll ' + dice + ':\n' + output + ' > ' + result;
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
		'<b>/damage &lt;points&gt;</b>: damage your character.<br />') +
		(dungeon_master ?
		'<b>/dmroll &lt;dice&gt;</b>: Privately roll dice.<br />' : '') +
		(dungeon_master ? '' :
		'<b>/heal &lt;points&gt;</b>: Heal your character.<br />') +
		(dungeon_master ?
		'<b>/init</b>: Roll for initiative.<br />' +
		'<b>/reload</b>: Reload current page.<br />' : '') +
		'<b>/roll &lt;dice&gt;</b>: Roll dice.<br />' +
		(dungeon_master ?
		'<b>/next [&lt;name&gt;]</b>: Next character\'s turn in battle.<br />' +
		'<b>/ping</b>: See who\'s online in the game.<br />' : '') +
		'<b>&lt;message&gt;</b>: Send text message.<br />' +
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
	obj.css('opacity', '1');
	obj.find('div.hitpoints').css('display', 'block');
}

function object_damage(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));

	if (hitpoints == 0) {
		return;
	}

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

function object_handover(obj) {
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
		owner_id: focus_obj.prop('id')
	};
	websocket.send(JSON.stringify(data));
}

function object_hide(obj) {
	obj.attr('is_hidden', 'yes');

	var data = {
		game_id: game_id,
		action: 'hide',
		instance_id: obj.prop('id')
	};
	websocket.send(JSON.stringify(data));

	$.post('/object/hide', {
		instance_id: obj.prop('id')
	});

	obj.fadeTo('fast', 0.5);
}

function object_info(obj) {
	var info = '';

	var name = obj.find('span');
	if (name.length > 0) {
		info += 'Name: ' + name.text() + '<br />';
	}

	if (dungeon_master || obj.is(my_character)) {
		if (obj.attr('id').substr(0, 5) == 'token') {
			info += 'Type: ' + obj.attr('type') + '<br />';
		}
		info += 'Armor class: ' + obj.attr('armor_class') + '<br />';
	}

	info += 'Max hitpoints: ' + obj.attr('hitpoints') + '<br />';

	var remaining = parseInt(obj.attr('hitpoints')) - parseInt(obj.attr('damage'));
	info +=
		'Damage: ' + obj.attr('damage') + '<br />' +
		'Hitpoints: ' + remaining.toString() + '<br />';

	if (obj.is(my_character)) {
		info += 'Temp, hitpoints: ' + temporary_hitpoints.toString() + '<br />';
	}

	if (dungeon_master) {
		info += 'Instance: ' + obj.attr('id') + '<br />';
	}

	write_sidebar(info);
}

function object_move(obj) {
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
		game_id: game_id,
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: obj.css('left'),
		pos_y: obj.css('top')
	};
	websocket.send(JSON.stringify(data));

	$.post('/object/move', {
		instance_id: obj.prop('id'),
		pos_x: Math.round(pos.left / grid_cell_size),
		pos_y: Math.round(pos.top / grid_cell_size)
	});

	$('div.input input').focus();
}

function object_move_to_sticked(obj) {
	var obj_pos = obj.position();
	var obj_x = Math.floor((obj_pos.left + $('div.playarea').scrollLeft()) / grid_cell_size);
	var obj_y = Math.floor((obj_pos.top + $('div.playarea').scrollTop()) / grid_cell_size);
	var new_x = ((obj_x + stick_to_x) * grid_cell_size).toString();
	var new_y = ((obj_y + stick_to_y) * grid_cell_size).toString();
	my_character.css('left', new_x + 'px');
	my_character.css('top', new_y + 'px');
	object_move(my_character);
}

function object_rotate(obj, rotation, send = true) {
	var img = obj.find('img');
	var width = obj.width() / grid_cell_size;
	var height = obj.height() / grid_cell_size;

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

	if (send) {
		var data = {
			game_id: game_id,
			action: 'rotate',
			instance_id: obj.prop('id'),
			rotation: rotation
		};
		websocket.send(JSON.stringify(data));

		$.post('/object/rotate', {
			instance_id: obj.prop('id'),
			rotation: rotation
		});
	}
}

function object_show(obj) {
	obj.attr('is_hidden', 'no');

	var data = {
		game_id: game_id,
		action: 'show',
		instance_id: obj.prop('id')
	};
	websocket.send(JSON.stringify(data));

	$.post('/object/show', {
		instance_id: obj.prop('id')
	});

	obj.fadeTo('fast', 1);
}

function object_view(obj, max_size = 300) {
	var collectable_id = obj.attr('c_id');

	if (my_character != null) {
		var char_pos = my_character.position();
		var obj_pos = obj.position();
		var diff_x = Math.abs(char_pos.left - obj_pos.left) / grid_cell_size;
		var diff_y = Math.abs(char_pos.top - obj_pos.top) / grid_cell_size;

		if ((diff_x > 2) || (diff_y > 2)) {
			collectable_id = undefined;
		}
	}

	if (collectable_id == undefined) {
		var src = obj.find('img').prop('src');
	} else {
		var src = '/files/collectables/' + obj.attr('c_src');
	}
	var transform = obj.find('img').css('transform');

	var div_style = 'position:absolute; top:0; left:0; right:0; bottom:0; background-color:rgba(255, 255, 255, 0.8); z-index:' + (DEFAULT_Z_INDEX + 5);
	var img_style = 'position:fixed; top:50%; left:50%; display:block; max-width:' + max_size + 'px; height:' + max_size + 'px; transform:translate(-50%, -50%)';
	if ((transform != 'none') && (collectable_id == undefined)) {
		img_style += ' ' + transform + ';';
	} else {
		img_style += ';';
	}
	if (collectable_id != undefined) {
		img_style += 'border:1px solid #000000;';
	}
	var onclick = 'javascript:$(this).remove();';

	var view = $('<div id="view" style="' + div_style + '" onClick="' + onclick +'"><img src="' + src + '" style="' + img_style + '" /></div>');
	$('body').append(view);

	if ((collectable_id != undefined) && (dungeon_master == false)) {
		obj.attr('c_id', null);
		$('div#view').prepend('<h1 style="font-size:50px; text-align:center; margin-top:50px;">Item found!</h1>');

		$.post('/object/collectable/found', {
			collectable_id: collectable_id
		});

		send_message('Item found!');

		if (obj.attr('c_hide') == 'yes') {
			object_hide(obj);
			obj.hide();
		}
	}
}


/* Effects
 */
function effect_create_object(id, src, pos_x, pos_y, width, height) {
	id = 'effect' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	var effect = $('<div id="' + id +'" class="effect" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + width + 'px; height:' + height + 'px; z-index:4;"><img src="' + src + '" style="width:100%; height:100%;" /></div>');

	$('div.playarea > div').append(effect);
}

function effect_create(template) {
	$('div.effects').hide();

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

	effect_create_object(effect_id, src, effect_pos_x, effect_pos_y, width, height);

	effect_create_final(src, width, height);
}

function effect_create_final(src, width, height) {
	var data = {
		game_id: game_id,
		map_id: map_id,
		action: 'effect_create',
		instance_id: effect_id,
		src: src,
		pos_x: effect_pos_x,
		pos_y: effect_pos_y,
		width: width,
		height: height
	};
	websocket.send(JSON.stringify(data));

	$('div#effect' + effect_id).draggable({
		create: function(event, ui) {
			$(this).css('cursor', 'grab');
		},
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$.contextMenu({
		selector: 'div#effect' + effect_id,
		callback: context_menu_handler,
		items: {
			'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
			'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
			'sep1': '-',
			'effect_duplicate': {name:'Duplicate', icon:'fa-copy'},
			'effect_delete': {name:'Delete', icon:'fa-trash'},
		},
		zIndex: DEFAULT_Z_INDEX + 4
	});

	effect_id++;
}

/* Zone functions
 */
function zone_create_object(id, pos_x, pos_y, width, height, color, opacity) {
	var id = 'zone' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	if (dungeon_master && (opacity > 0.9)) {
		opacity = 0.9;
	}

	var zone = '<div id="' + id + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + '; z-index:3;" />';

	$('div.playarea > div').prepend(zone);
}

function zone_create(obj, pos_x, pos_y, width, height, color, opacity) {
	$.post('/object/create_zone', {
		map_id: map_id,
		pos_x: pos_x / grid_cell_size,
		pos_y: pos_y / grid_cell_size,
		width: width,
		height: height,
		color: color,
		opacity: opacity
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		zone_create_object(instance_id, pos_x, pos_y, width, height, color, opacity);

		$('div#zone' + instance_id).draggable({
			create: function(event, ui) {
				$(this).css('cursor', 'grab');
			},
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		var data = {
			game_id: game_id,
			action: 'zone_create',
			instance_id: instance_id,
			pos_x: pos_x,
			pos_y: pos_y,
			width: width,
			height: height,
			color: color,
			opacity: opacity
		};
		websocket.send(JSON.stringify(data));

		$.contextMenu({
			selector: 'div#zone' + instance_id,
			callback: context_menu_handler,
			items: {
				'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
				'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
				'sep1': '-',
				'zone_delete': {name:'Delete', icon:'fa-trash'},
			},
			zIndex: DEFAULT_Z_INDEX + 3
		});
	}).fail(function(data) {
		alert('Zone create error');
	});
}

/* Marker functions
*/
function marker_create(pos_x, pos_y) {
	var marker = '<img class="marker" src="/images/marker.png" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" />';

	$('div.playarea > div').append(marker);
	setTimeout(function() { $('img.marker').first().remove(); }, 3000);
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
			var spider = '<img src="/images/spider_web.png" style="float:right; height:100px; margin-bottom:100px;" />';
			body.append(spider);
		} else {
			body.append('<div class="row"></div>');
			var row = body.find('div');

			$(data).find('collectable').each(function() {
				var image = $(this).find('image').text();
				var collectable = '<div class="col-sm-4" onClick="javascript:object_view($(this), 600);"><img src="/files/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" /></div>';
				row.append(collectable);
			});
		}

		$('div.collectables').show();
	});
}

/* Input functions
 */
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
	var command = parts[0].substr(1);
	var param = input.substr(parts[0].length + 1).trim();

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
				write_sidebar('Invalid damage points.');
				break;
			}

			object_damage(my_character, points);
			break;
		case 'dmroll':
			if (dungeon_master == false) {
				return;
			}

			if (roll_dice(param, false) == fase) {
				write_sidebar('Invalid dice roll.');
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

			object_damage(my_character, -points);
			break;
		case 'help':
			show_help();
			break;
		case 'init':
			if (dungeon_master == false) {
				break;
			}

			battle_order = [];

			do {
				var enemy = prompt('Enemy: name[,initiative bonus]\nUse empty input to start battle.');
				if (enemy == undefined) {
					return;
				}

				if (enemy != '') {
					var parts = enemy.split(',');

					var present = false;
					battle_order.forEach(function(value, key) {
						if (value.name == parts[0]) {
							present = true;
						}
					});
					if (present) {
						write_sidebar("Already in battle order.");
						continue;
					}

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

			var turn = null;
			if (param != '') {
				battle_order.forEach(function(value, key) {
					if (value.name.substr(0, param.length) == param) {
						turn = key;
					}
				});

				if (turn == null) {
					write_sidebar(param + ' not in battle order.');
					$('div.input input').val(input);
					break;
				}

				if (turn == 0) {
					write_sidebar('Already its turn.');
					break;
				}

				turn -= 1;
			}

			var item = battle_order.shift();
			battle_order.push(item);

			if (turn != null) {
				var item = battle_order[turn];
				battle_order.splice(turn, 1);
				battle_order.unshift(item);
			}

			show_battle_order();
			break;
		case 'ping':
			if (dungeon_master == false) {
				return;
			}

			var data = {
				game_id: game_id,
				action: 'ping'
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'reload':
			if (dungeon_master == false) {
				break;
			}

			var data = {
				game_id: game_id,
				action: 'reload'
			};
			websocket.send(JSON.stringify(data));

			location.reload();
			break;
		case 'roll':
			if (roll_dice(param) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
			}
			break;
		default:
			write_sidebar("Unknown command.");
			$('div.input input').val(input);
	}
}

function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.prop('tagName') == 'IMG') {
		obj = obj.parent();
	}

	var parts = key.split('_');
	var travel_map_id = 0;
	if (parts[0] == 'travel') {
		key = parts[0];
		var travel_map_id = parts[1];
	} else if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
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

			var message = '';
			var name = obj.find('span').text();
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
			message += (roll == 20) ? 'CRIT!' :

			send_message(message);

			if (dungeon_master) {
				write_sidebar('&nbsp;&nbsp;&nbsp;&nbsp;Attack roll: ' + roll);
			}
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

			object_damage(obj, points);
			break;
		case 'effect_create':
			var menu = $('div#context-menu-layer + ul.context-menu-root');
			var pos_menu = menu.position();

			if (pos_menu == undefined) {
				menu = $('ul.context-menu-root + div#context-menu-layer').prev();
				pos_menu = menu.position();

				if (pos_menu == undefined) {
					break;
				}
			}

			effect_pos_x = Math.floor(pos_menu.left) + $('div.playarea').scrollLeft() - 16;
			effect_pos_x = coord_to_grid(effect_pos_x, false);
			effect_pos_y = Math.floor(pos_menu.top) + $('div.playarea').scrollTop() - 41;
			effect_pos_y = coord_to_grid(effect_pos_y, false);

			$('div.effects').show();

			break;
		case 'effect_duplicate':
			var pos = $(this).position();
			effect_pos_x = pos.left + $('div.playarea').scrollLeft() + grid_cell_size;
			effect_pos_y = pos.top + $('div.playarea').scrollTop();

			var src = $(this).find('img').prop('src');
			var width = parseInt($(this).width()) / grid_cell_size;
			var height = parseInt($(this).height()) / grid_cell_size;

			effect_create_object(effect_id, src, effect_pos_x, effect_pos_y, width, height);
			effect_create_final(src, width, height);
			break;
		case 'effect_delete':
			var data = {
				game_id: game_id,
				action: 'effect_delete',
				instance_id: obj.prop('id')
			};
			websocket.send(JSON.stringify(data));

			obj.remove();
			break;
		case 'focus':
			focus_obj = obj;
			$('div.character').find('img').css('border', '');
			$('div.token').find('img').css('border', '');
			obj.find('img').css('border', '1px solid #ffa000');
			break;
		case 'handover':
			object_handover(obj);
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

			object_damage(obj, -points);
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
				instance_id: obj.prop('id')
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

			marker_create(pos_x, pos_y);

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
				object_show(obj);
			} else {
				object_hide(obj);
			}
			break;
		case 'stick':
			var obj_pos = obj.position();
			var obj_x = Math.floor((obj_pos.left + $('div.playarea').scrollLeft()) / grid_cell_size);
			var obj_y = Math.floor((obj_pos.top + $('div.playarea').scrollTop()) / grid_cell_size);

			var my_pos = my_character.position();
			var my_x = Math.floor((my_pos.left + $('div.playarea').scrollLeft()) / grid_cell_size);
			var my_y = Math.floor((my_pos.top + $('div.playarea').scrollTop()) / grid_cell_size);

			stick_to_x = my_x - obj_x;
			stick_to_y = my_y - obj_y;

			if ((Math.abs(stick_to_x) <= 3) && (Math.abs(stick_to_y) <= 3)) {
				stick_to = obj.prop('id');
			} else {
				stick_to = null;
				write_sidebar('Object too far.');
			}
			break;
		case 'rotate':
			var compass = { 'n':   0, 'ne':  45, 'e':  90, 'se': 135,
			                's': 180, 'sw': 225, 'w': 270, 'nw': 315 };
			if ((direction = compass[direction]) != undefined) {
				object_rotate(obj, direction);
			}
			break;
		case 'takeback':
			var data = {
				game_id: game_id,
				action: 'takeback',
				instance_id: obj.prop('id')
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

			object_hide(obj);
			break;
		case 'unstick':
			stick_to = null;
			break;
		case 'view':
			object_view(obj);
			break;
		case 'zone_create':
			var menu = $('div#context-menu-layer + ul.context-menu-root');
			var pos_menu = menu.position();

			if (pos_menu == undefined) {
				menu = $('ul.context-menu-root + div#context-menu-layer').prev();
				pos_menu = menu.position();

				if (pos_menu == undefined) {
					break;
				}
			}

			var pos_x = Math.floor(pos_menu.left) + $('div.playarea').scrollLeft() - 16;
			pos_x = coord_to_grid(pos_x, false);
			var pos_y = Math.floor(pos_menu.top) + $('div.playarea').scrollTop() - 41;
			pos_y = coord_to_grid(pos_y, false);

			var info;
			if ((info = window.prompt('Zone width[,height[,#rgb[,opacity]]]:')) == undefined) {
				break;
			}

			var parts = info.split(',');
			var width = parseInt(parts[0]);
			var height = (parts.length > 1) ? parseInt(parts[1]) : width;
			var color = (parts.length > 2) ? parts[2] : '#f00';
			var opacity = (parts.length > 3) ? parts[3] : '0.2';

			if (opacity < 0.2) {
				opacity = 0.2;
			}

			pos_x -= Math.floor((width - 1) / 2) * grid_cell_size;
			pos_y -= Math.floor((height - 1) / 2) * grid_cell_size;

			if (isNaN(width)) {
				write_sidebar('Invalid width.');
				break;
			} else if (isNaN(height)) {
				write_sidebar('Invalid height.');
				break;
			}

			zone_create(obj, pos_x, pos_y, width, height, color, opacity);
			break;
		case 'zone_delete':
			if (confirm('Delete zone?')) {
				$.post('/object/delete', {
					instance_id:obj.prop('id')
				}).done(function() {
					var data = {
						game_id: game_id,
						action: 'zone_delete',
						instance_id: obj.prop('id')
					};
					websocket.send(JSON.stringify(data));

					obj.remove();
				});
			}
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
	game_id = parseInt($('div.playarea').attr('game_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('dm') == 'yes');

	write_sidebar('<b>Welcome to TableTop!</b>');
	write_sidebar('Type /help for command information.');
	write_sidebar("Welcome " + my_name + '.');

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + WS_HOST + ':' + WS_PORT + '/');

	websocket.onopen = function(event) {
		write_sidebar('Connection established.');
		send_message('Entered the game.', false);

		var data = {
			game_id: game_id,
			action: 'effect_request'
		};
		websocket.send(JSON.stringify(data));

		var parts = window.location.pathname.split('/');
		if (parts.length == 4) {
			var my_char_id = $('div.playarea').attr('my_char');
			if (my_char_id != undefined) {
				object_damage($('div#' + my_char_id), 0);
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
				if (data.perc == '100%') {
					object_dead(obj);
				} else {
					object_alive(obj);
				}
				break;
			case 'effect_create':
				if (data.map_id == map_id) {
					if ($('div#' + data.instance_id).length == 0) {
						effect_create_object(data.instance_id, data.src, data.pos_x, data.pos_y, data.width, data.height);
					}
				}
				break;
			case 'effect_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'effect_request':
				if (dungeon_master == false) {
					break;
				}
				$('div.effect').each(function() {
					var pos = $(this).position();

					var data = {
						game_id: game_id,
						map_id: map_id,
						action: 'effect_create',
						instance_id: $(this).prop('id').substr(6),
						src: $(this).find('img').prop('src'),
						pos_x: pos.left + $('div.playarea').scrollLeft(),
						pos_y: pos.top + $('div.playarea').scrollTop(),
						width: $(this).width() / grid_cell_size,
						height: $(this).height() / grid_cell_size
					};
					websocket.send(JSON.stringify(data));
				});
				break;
			case 'handover':
				if (data.owner_id != my_character.prop('id')) {
					return;
				}

				if (data.instance_id.substr(0, 4) == 'zone') {
					var handle = null;
				} else {
					var handle = 'img';
				}

				$('div#' + data.instance_id).draggable({
					create: function(event, ui) {
						$(this).css('cursor', 'grab');
					},
					handle: handle,
					stop: function(event, ui) {
						object_move($(this));
						if ($(this).prop('id') == stick_to) {
							object_move_to_sticked($(this));
						}
					}
				});

				$('div#' + data.instance_id + ' img').contextMenu('destroy');

				$.contextMenu({
					selector: 'div#' + data.instance_id + ' img',
					callback: context_menu_handler,
					items: {
						'info': {name:'Info', icon:'fa-info-circle'},
						'stick': {name:'Stick to', icon:'fa-lock'},
						'rotate': {name:'Rotate', icon:'fa-compass', items:{
							'rotate_n':  {name:'North', icon:'fa-arrow-circle-up'},
							'rotate_ne': {name:'North East'},
							'rotate_e':  {name:'East', icon:'fa-arrow-circle-right'},
							'rotate_se': {name:'South East'},
							'rotate_s':  {name:'South', icon:'fa-arrow-circle-down'},
							'rotate_sw': {name:'South West'},
							'rotate_w':  {name:'West', icon:'fa-arrow-circle-left'},
							'rotate_nw': {name:'North West'}
						}},
						'lower': {name:'Lower', icon:'fa-arrow-down'},
						'sep1': '-',
						'attack': {name:'Attack', icon:'fa-shield'},
						'damage': {name:'Damage', icon:'fa-warning'},
						'heal': {name:'Heal', icon:'fa-medkit'}
					},
					zIndex: DEFAULT_Z_INDEX + 4
				});
				break;
			case 'hide':
				if (dungeon_master == false) {
					$('div#' + data.instance_id).hide();
				} else {
					$('div#' + data.instance_id).fadeTo('fast', 0.5);
					$('div#' + data.instance_id).attr('is_hidden', 'yes');
				}
				break;
			case 'lower':
				$('div#' + data.instance_id).css('z-index', z_index);
				z_index--;
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y);
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, 'fast', function() {
					if (data.instance_id == stick_to) {
						object_move_to_sticked(obj);
					}
				});
				break;
			case 'ping':
				send_message("Pong", false);
				break;
			case 'reload':
				document.location = '/game/' + game_id;
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate(obj, data.rotation, false);
				break;
			case 'say':
				write_sidebar(data.mesg);
				break;
			case 'show':
				$('div#' + data.instance_id).show();
				break;
			case 'takeback':
				$('div#' + data.instance_id).css('cursor', 'default');
				$('div#' + data.instance_id).find('img').css('cursor', 'default');
				$('div#' + data.instance_id).draggable('destroy');

				$('div#' + data.instance_id + ' img').contextMenu('destroy');
				$.contextMenu({
					selector: 'div#' + data.instance_id + ' img',
					callback: context_menu_handler,
					items: {
						'view': {name:'View', icon:'fa-search'},
						'stick': {name:'Stick to', icon:'fa-lock'},
						'attack': {name:'Attack', icon:'fa-shield'}
					},
					zIndex: DEFAULT_Z_INDEX + 4
				});

				if (data.instance_id == stick_to) {
					stick_to = null;
				}
				break;
			case 'travel':
				if (data.instance_id == my_character.prop('id')) {
					document.location = '/game/' + game_id + '/' + data.map_id;
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height, data.color, data.opacity);
				break;
			case 'zone_delete':
				$('div#' + data.instance_id).remove();
				break;
			default:
				alert('Unknown action: ' + data.action);
		}
	};

	websocket.onerror = function(event) {
		write_sidebar('Connection error. Does your firewall allow outgoing traffic via port ' + WS_PORT + '?');
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

	/* Objects
	 */
	$('div.zone').css('z-index', 3);

	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		if (dungeon_master) {
			$(this).fadeTo('fast', 0.5);
		} else {
			$(this).hide();
		}
	});

	$('div.token').each(function() {
		$(this).css('z-index', DEFAULT_Z_INDEX + 1);
		object_rotate($(this), $(this).attr('rotation'), false);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').css('z-index', DEFAULT_Z_INDEX + 3);

	if (dungeon_master) {
		/* Dungeon Master settings
		 */
		$('div.zone').draggable({
			create: function(event, ui) {
				$(this).css('cursor', 'grab');
			},
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.token').draggable({
			create: function(event, ui) {
				$(this).css('cursor', 'grab');
			},
			handle: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.character').draggable({
			create: function(event, ui) {
				$(this).css('cursor', 'grab');
			},
			handle: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo('fast', 0.5);
		});

		$.contextMenu({
			selector: 'div.zone',
			callback: context_menu_handler,
			items: {
				'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
				'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
				'sep1': '-',
				'zone_delete': {name:'Delete', icon:'fa-trash'},
			},
			zIndex: DEFAULT_Z_INDEX + 3
		});

		$.contextMenu({
			selector: 'div.token img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'view': {name:'View', icon:'fa-search'},
				'rotate': {name:'Rotate', icon:'fa-compass', items:{
					'rotate_n':  {name:'North', icon:'fa-arrow-circle-up'},
					'rotate_ne': {name:'North East'},
					'rotate_e':  {name:'East', icon:'fa-arrow-circle-right'},
					'rotate_se': {name:'South East'},
					'rotate_s':  {name:'South', icon:'fa-arrow-circle-down'},
					'rotate_sw': {name:'South West'},
					'rotate_w':  {name:'West', icon:'fa-arrow-circle-left'},
					'rotate_nw': {name:'North West'}
				}},
				'presence': {name:'Presence', icon:'fa-low-vision'},
				'lower': {name:'Lower', icon:'fa-arrow-down'},
				'sep1': '-',
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
				'view': {name:'View', icon:'fa-search'},
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
				'effect_create': {name:'Effect', icon:'fa-fire'},
				'marker': {name:'Marker', icon:'fa-map-marker'},
				'zone_create': {name:'Zone', icon:'fa-square-o'}
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
				create: function(event, ui) {
					$(this).css('cursor', 'grab');
				},
				handle: 'img',
				stop: function(event, ui) {
					stick_to = null;
					object_move($(this));
				}
			});

			my_character.css('z-index', DEFAULT_Z_INDEX + 2);

			$.contextMenu({
				selector: 'div#' + my_char + ' img',
				callback: context_menu_handler,
				items: {
					'info': {name:'Info', icon:'fa-info-circle'},
					'view': {name:'View', icon:'fa-search'},
					//'unstick': {name:'Unstick', icon:'fa-unlock-alt'},
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
					'view': {name:'View', icon:'fa-search'},
					'stick': {name:'Stick to', icon:'fa-lock'},
					'attack': {name:'Attack', icon:'fa-shield'}
				},
				zIndex: DEFAULT_Z_INDEX + 4
			});
		}

		$.contextMenu({
			selector: 'div.character img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'view': {name:'View', icon:'fa-search'}
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

	$('body').click(function() {
		focus_on_input();
	});

	$('select.map-selector').click(function(e) {
		e.stopPropagation();
	});

	focus_on_input();
});
