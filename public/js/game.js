const WS_HOST = 'tabletop.leisink.net';
const WS_PORT = '2000';
const DEFAULT_Z_INDEX = 10000;
const ROLL_NORMAL = 0;
const ROLL_ADVANTAGE = 1;
const ROLL_DISADVANTAGE = 2;

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
var mouse_x = 0;
var mouse_y = 0;
var measuring = false;
var effect_id = 1;
var effect_x = 0;
var effect_y = 0;
var stick_to = null;
var stick_to_x = 0;
var stick_to_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var zone_menu = null;

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

function scroll_to_my_character() {
	if (my_character != null) {
		var spot = my_character;
	} else if (focus_obj != null) {
		var spot = focus_obj;
	} else {
		var spot = $('div.character').first();
		if (spot.length == 0) {
			write_sidebar("No characters on this map!");
			return;
		}
	}

	var pos_x = -($('div.playarea').width() >> 1);
	var pos_y = -($('div.playarea').height() >> 1);

	var pos = spot.position();
	pos.left += $('div.playarea').scrollLeft();
    pos.top += $('div.playarea').scrollTop();

	pos_x += pos.left + (grid_cell_size >> 1);
	pos_y += pos.top + (grid_cell_size >> 1);

	$('div.playarea').animate({
		scrollLeft: pos_x,
		scrollTop:  pos_y
	}, 1000);
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

	message = '<b>' + name + ':</b><span style="display:block; margin-left:15px;">' + message + '</span>';

	write_sidebar(message);
}

function send_message(message, name, write_to_sidebar = true) {
	var data = {
		game_id: game_id,
		action: 'say',
		name: name,
		mesg: message
	};
	websocket.send(JSON.stringify(data));

	if (write_to_sidebar) {
		message_to_sidebar(name, message);
	}
}

function roll_dice(dice, send_to_others = true) {
	var dice_str = dice.replace(/ /g, '');
	dice = dice_str.replace(/\+-/g, '-');
	dice = dice.replace(/-/g, '+-');

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

	var message;
	switch (type) {
		case ROLL_ADVANTAGE:
			message = 'Advantage d';
			break;
		case ROLL_DISADVANTAGE:
			message = 'Disdvantage d';
			break;
		default:
			message = 'D';
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
		'<b>/clear</b>: Clear this sidebar.<br />' +
		'<b>/d20 [&lt;bonus&gt]</b>: Roll d20 dice.<br />' +
		'<b>/d20a [&lt;bonus&gt]</b>: Roll d20 dice with advantage.<br />' +
		'<b>/d20d [&lt;bonus&gt]</b>: Roll d20 dice with disadvantage.<br />' +
		(dungeon_master ? '' :
		'<b>/damage &lt;points&gt;</b>: Damage your character.<br />') +
		(dungeon_master ?
		'<b>/dmroll &lt;dice&gt;</b>: Privately roll dice.<br />' +
		'<b>/done</b>: End the battle and remove conditions.<br />' : '') +
		(dungeon_master ? '' :
		'<b>/heal &lt;points&gt;</b>: Heal your character.<br />') +
		(dungeon_master ?
		'<b>/init</b>: Roll for initiative.<br />' : '') +
		'<b>/log &lt;message&gt;</b>: Add message to journal.<br />' +
		(dungeon_master ?
		'<b>/next [&lt;name&gt;]</b>: Next turn in battle.<br />' +
		'<b>/ping</b>: See who\'s online in the game.<br />' +
		'<b>/play [&lt;nr&gt;]:</b> Play audio file.<br />' +
		'<b>/reload</b>: Reload current page.<br />' +
		'<b>/remove &lt;name&gt;</b>: Remove one from battle.<br />' : '') +
		'<b>/roll &lt;dice&gt;</b>: Roll dice.<br />' +
		'<b>&lt;message&gt;</b>: Send text message.<br />' +
		'<br />Right-click an icon or the map for more options.';

	write_sidebar(help);
}

function show_battle_order(first_round = false, send = true) {
	var message = '';

	if (first_round) {
		message += 'Prepare for battle!\n\n';
	}

	message += 'Battle order:\n';
	var bullet = '&Rightarrow;';
	battle_order.forEach(function(value, key) {
		message += bullet + ' ' + value.name + '\n';
		bullet = '&boxh;';
	});

	if (send) {
		send_message(message, 'Battle status');
	} else {
		message_to_sidebar('Active battle', message);
	}
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
		damage: damage,
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

function object_hide(obj, send = true) {
	if (dungeon_master) {
		obj.fadeTo(0, 0.5);
	} else {
		obj.hide(100);
	}
	obj.attr('is_hidden', 'yes');

	if (send) {
		var data = {
			game_id: game_id,
			action: 'hide',
			instance_id: obj.prop('id')
		};
		websocket.send(JSON.stringify(data));

		$.post('/object/hide', {
			instance_id: obj.prop('id')
		});
	}
}

function object_info(obj) {
	var info = '';

    if (obj.attr('id').substr(0, 4) != 'zone') {
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

		info += 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

		var remaining = parseInt(obj.attr('hitpoints')) - parseInt(obj.attr('damage'));
		info +=
			'Damage: ' + obj.attr('damage') + '<br />' +
			'Hit points: ' + remaining.toString() + '<br />';

		if (obj.is(my_character)) {
			info += 'Temp, hit points: ' + temporary_hitpoints.toString() + '<br />';
		}
	}

	if (dungeon_master) {
		info += 'Object ID: ' + obj.attr('id') + '<br />';
	}

	write_sidebar(info);
}

function object_move(obj, speed = 200) {
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
		pos_x: pos.left,
		pos_y: pos.top,
		speed: speed
	};
	websocket.send(JSON.stringify(data));

	$.post('/object/move', {
		instance_id: obj.prop('id'),
		pos_x: Math.round(pos.left / grid_cell_size),
		pos_y: Math.round(pos.top / grid_cell_size)
	});

	if (obj.is(my_character) == false) {
		return;
	}

	var zone_events = {
		leave: [],
		move:  [],
		enter: []
	}

	$('div.zone').each(function() {
		var zone_pos = $(this).position();
		zone_pos.left += $('div.playarea').scrollLeft();
		zone_pos.top += $('div.playarea').scrollTop();

		var in_zone = true;
		if (pos.left < zone_pos.left) {
			in_zone = false;
		} else if (pos.top < zone_pos.top) {
			in_zone = false;
		} else if (pos.left >= zone_pos.left + $(this).width()) {
			in_zone = false;
		} else if (pos.top >= zone_pos.top + $(this).height()) {
			in_zone = false;
		}

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
				game_id: game_id,
				action: 'event',
				zone: zone_id,
				character: my_character.prop('id'),
				zone_event: event_type,
				pos_x: pos.left,
				pos_y: pos.top
			};
			websocket.send(JSON.stringify(data));
		});
	}
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

function getRotationDegrees(obj) {
    var matrix = obj.css("-webkit-transform") ||
    obj.css("-moz-transform")    ||
    obj.css("-ms-transform")     ||
    obj.css("-o-transform")      ||
    obj.css("transform");
    if(matrix !== 'none') {
        var values = matrix.split('(')[1].split(')')[0].split(',');
        var a = values[0];
        var b = values[1];
        var angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
    } else { var angle = 0; }
    return (angle < 0) ? angle + 360 : angle;
}

function object_rotate(obj, rotation, send = true, speed = 500) {
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

	if (send) {
		var data = {
			game_id: game_id,
			action: 'rotate',
			instance_id: obj.prop('id'),
			rotation: rotation,
			speed: speed
		};
		websocket.send(JSON.stringify(data));

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
			game_id: game_id,
			action: 'show',
			instance_id: obj.prop('id')
		};
		websocket.send(JSON.stringify(data));

		$.post('/object/show', {
			instance_id: obj.prop('id')
		});
	}
}

function object_step(x, y) {
	if (my_character != null) {
		var obj = my_character;
	} else if (focus_obj != null) {
		var obj = focus_obj;
	} else {
		return;
	}

	var pos = obj.position();
	pos.left += $('div.playarea').scrollLeft();
	pos.left += (x * grid_cell_size);
	pos.top += $('div.playarea').scrollTop();
	pos.top += (y * grid_cell_size);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	object_move(obj, 50);

	if (stick_to != null) {
		stick_to_x += x;
		stick_to_y += y;
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

	switch (event.which) {
		case 81:
			object_step(-1, -1);
			break;
		case 87:
			object_step(0, -1);
			break;
		case 69:
			object_step(1, -1);
			break;
		case 65:
			object_step(-1, 0);
			break;
		case 68:
			object_step(1, 0);
			break;
		case 90:
			object_step(-1, 1);
			break;
		case 83:
			object_step(0, 1);
			break;
		case 67:
			object_step(1, 1);
			break;
		case 188:
			object_turn(-45);
			break;
		case 190:
			object_turn(45);
			break;
	}
}

function object_turn(direction) {
	if (focus_obj == null) {
		return;
	}

	if (focus_obj.prop('id').substr(0, 5) != 'token') {
		return;
	}

	var rotation = parseInt(focus_obj.attr('rotation')) + direction;
	if (direction < 0) {
		direction += 360;
	} else if (rotation >= 360) {
		rotation -= 360;
	}

	object_rotate(focus_obj, rotation, true, 100);
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

	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; top:0; left:0; right:0; bottom:0; background-color:rgba(255, 255, 255, 0.8); z-index:' + (DEFAULT_Z_INDEX + 5);
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%)';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px;';

	var transform = obj.find('img').css('transform');
	if ((transform != 'none') && (collectable_id == undefined)) {
		img_style += ' transform:' + transform + ';';
	}

	if (((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) || (collectable_id != undefined)) {
		img_style += 'border:1px solid #000000;';
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

	effect_create_object(effect_id, src, effect_x, effect_y, width, height);

	effect_create_final(src, width, height);
}

function effect_create_final(src, width, height) {
	var data = {
		game_id: game_id,
		map_id: map_id,
		action: 'effect_create',
		instance_id: effect_id,
		src: src,
		pos_x: effect_x,
		pos_y: effect_y,
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

	if (dungeon_master) {
		if (opacity < 0.2) {
			opacity = 0.2;
		} else if (opacity > 0.8) {
			opacity = 0.8;
		}
	}

	var zone = '<div id="' + id + '" class="zone" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + '; z-index:3;" />';

	$('div.playarea > div').prepend(zone);

	if (dungeon_master) {
		$('div#' + id).append('<div class="script"></div>');
	}
}

function zone_create(width, height, color, opacity) {
	$.post('/object/create_zone', {
		map_id: map_id,
		pos_x: zone_x / grid_cell_size,
		pos_y: zone_y / grid_cell_size,
		width: width,
		height: height,
		color: color,
		opacity: opacity
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		zone_create_object(instance_id, zone_x, zone_y, width, height, color, opacity);

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
			pos_x: zone_x,
			pos_y: zone_y,
			width: width,
			height: height,
			color: color,
			opacity: opacity
		};
		websocket.send(JSON.stringify(data));

		$.contextMenu({
			selector: 'div#zone' + instance_id,
			callback: context_menu_handler,
			items: zone_menu,
			zIndex: DEFAULT_Z_INDEX + 4
		});
	}).fail(function(data) {
		alert('Zone create error');
	});
}

function zone_delete(obj) {
	var zone_id = obj.prop('id');
	if (zone_id.substr(0, 4) != 'zone') {
		return;
	}

	$.post('/object/delete', {
		instance_id:zone_id
	}).done(function() {
		var data = {
			game_id: game_id,
			action: 'zone_delete',
			instance_id: zone_id
		};
		websocket.send(JSON.stringify(data));

		obj.remove();
	});
}

function zone_init_presence() {
	zone_presence = [];

	$('div.zone').each(function() {
		var my_pos = my_character.position();
		var zone_pos = $(this).position();

		if (my_pos.left < zone_pos.left) {
			return;
		} else if (my_pos.top < zone_pos.top) {
			return;
		} else if (my_pos.left >= zone_pos.left + $(this).width()) {
			return;
		} else if (my_pos.top >= zone_pos.top + $(this).height()) {
			return;
		}

		zone_presence.push($(this).prop('id'));
	});
}

function zone_check_presence_for_turn(character) {
	var char_id = character.prop('id');

	$('div.zone').each(function() {
		var my_pos = character.position();
		my_pos.left += $('div.playarea').scrollLeft();
		my_pos.top += $('div.playarea').scrollTop();

		var zone_pos = $(this).position();
		zone_pos.left += $('div.playarea').scrollLeft();
		zone_pos.top += $('div.playarea').scrollTop();

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

function zone_announce_group_id(zone_id, zone_group) {
	var data = {
		game_id: game_id,
		action: 'zone_group',
		zone_id: zone_id,
		zone_group: zone_group
	};
	websocket.send(JSON.stringify(data));
}

/* Marker functions
*/
function marker_create(pos_x, pos_y, name = null) {
	var marker = $('<div class="marker" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px;"><img src="/images/marker.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" /></div>');

	if (name != null) {
		marker.prepend('<span style="margin-bottom:3px">' + name + '</span>');
	}

	$('div.playarea > div').append(marker);
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
				var collectable = '<div class="col-sm-4" style="width:115px; height:115px;" onClick="javascript:object_view($(this), 600);"><img src="/files/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" /></div>';
				row.append(collectable);
			});
		}

		$('div.collectables').show();
	});
}

/* Journal functions
 */
function journal_show() {
	$('div.journal').show()

	var panel = $('div.journal div.panel-body');
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_add_entry(name, content) {
	var entry = '<div class="entry"><span class="writer">' + name + '</span><span class="content">' + content + '</span></div>';
	$('div.journal div.entries').append(entry);

	var panel = $('div.journal div.panel-body');
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_save_entry(name, content) {
	var data = {
		game_id: game_id,
		action: 'journal',
		name: name,
		content: content
	};
	websocket.send(JSON.stringify(data));

	$.post('/object/journal', {
		game_id: game_id,
		content: content
	});
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

/* Battle functions
 */
function battle_done() {
	if (dungeon_master) {
		battle_order = [];
		localStorage.removeItem('battle_order');
	}

	$('span.conditions').remove();
	localStorage.removeItem('conditions');

	temporary_hitpoints = 0;

	write_sidebar('The battle is over!');
}

/* Condition functions
 */
function set_condition(obj, condition) {
	obj.find('span.conditions').remove();

	if (condition != '') {
		obj.append('<span class="conditions">' + condition + '</span>');
	}
}

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
		send_message(input, my_name);
		return;
	}

	var parts = input.split(' ', 1);
	var command = parts[0].substr(1);
	var param = input.substr(parts[0].length + 1).trim();

	switch (command) {
		case 'clear':
			$('div.sidebar').empty();
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
				break;
			}

			object_damage(my_character, points);
			break;
		case 'dmroll':
			if (dungeon_master == false) {
				break;
			}

			if (roll_dice(param, false) == fase) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
			}
			break;
		case 'done':
			if (dungeon_master == false) {
				break;
			}

			battle_done();

			var data = {
				game_id: game_id,
				action: 'done'
			};
			websocket.send(JSON.stringify(data));
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
				var enemy = prompt('Enemy: <name>[, <initiative bonus=0>]\nUse empty input to start battle.');
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
						name: parts[0],
						char_id: null
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
					name: $(this).find('span.name').text(),
					char_id: $(this).prop('id')
				};
				battle_order.push(item);
			});

			battle_order.sort((a, b) => b.key.localeCompare(a.key));

			show_battle_order(true);

			$('div.character').each(function() {
				if ($(this).prop('id') == battle_order[0].char_id) {
					zone_check_presence_for_turn($(this));
				}
			});

			localStorage.setItem('battle_order', JSON.stringify(battle_order));
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

			$('div.character').each(function() {
				if ($(this).prop('id') == battle_order[0].char_id) {
					zone_check_presence_for_turn($(this));
				}
			});

			localStorage.setItem('battle_order', JSON.stringify(battle_order));
			break;
		case 'ping':
			if (dungeon_master == false) {
				break;
			}

			write_sidebar('Present in game:');

			var data = {
				game_id: game_id,
				action: 'ping'
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'play':
			$.post('/object/audio', {
				game_id: game_id,
			}).done(function(data) {
				if (param == '') {
					var audio_files = $(data).find('audio file');
					if (audio_files.length == 0) {
						write_sidebar('Directory audio/' + game_id + ' is empty.');
					} else {
						var nr = 1;
						audio_files.each(function() {
							write_sidebar(nr + ': ' + $(this).text());
							nr++;
						});
					}
				} else {
					var file = $(data).find('audio file').eq(param - 1).text();
					write_sidebar('Playing ' + file + '.');

					var filename = '/files/audio/' + game_id + '/' + file;

					var data = {
						game_id: game_id,
						action: 'audio',
						filename: filename
					};
					websocket.send(JSON.stringify(data));

					var audio = new Audio(filename);
					audio.play();
				}
			}).fail(function() {
				write_sidebar('Directory audio/' + game_id + ' not found. Create it via File Administration in the CMS and upload some audio files.');
			});
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
		case 'remove':
			if (dungeon_master == false) {
				break;
			}

			if (battle_order.length == 0) {
				write_sidebar('Roll for initiative first.');
				break;
			}

			var turn = null;
			if (param == '') {
				write_sidebar('Specify a name');
				break;
			}

			var remove = null;
			battle_order.forEach(function(value, key) {
				if (value.name.substr(0, param.length) == param) {
					remove = key;
				}
			});

			if (remove == null) {
				write_sidebar(param + ' not in battle order.');
				$('div.input input').val(input);
				break;
			}

			write_sidebar(battle_order[remove].name + ' removed from battle.');
			battle_order.splice(remove, 1);
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
		case 'alternate':
			if (alternate_id == 0) {
				var filename = my_character.find('img').attr('orig_src');
				var size = 1;
			} else {
				var filename = $('div.alternates div[icon_id=' + alternate_id + ']').attr('filename');
				var size = $('div.alternates div[icon_id=' + alternate_id + ']').attr('size');
			}
			size *= grid_cell_size;

			my_character.find('img').attr('src', '/files/portraits/' + filename);
			my_character.find('img').css('width', size + 'px');
			my_character.find('img').css('height', size + 'px');

			var data = {
				game_id: game_id,
				action: 'alternate',
				char_id: my_character.attr('id'),
				size: size,
				src: filename
			};
			websocket.send(JSON.stringify(data));

			$.post('/object/alternate', {
				game_id: game_id,
				char_id: my_character.attr('char_id'),
				alternate_id: alternate_id
			});
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

			send_message(message, my_name);

			if (dungeon_master) {
				write_sidebar('&nbsp;&nbsp;&nbsp;&nbsp;Attack roll: ' + roll);
			}
			break;
		case 'condition':
			var key = obj.prop('id');

			if (condition_id > 0) {
				var condition = $('div.conditions div[con_id=' + condition_id + ']').text();

				var conditions = $('div#' + key).find('span.conditions').text();
				if (conditions == '') {
					conditions = [];
				} else {
					conditions = conditions.replace('<br />', '');
					conditions = conditions.split(',');
				}

				if (conditions.includes(condition)) {
					conditions = array_remove(conditions, condition);
				} else {
					conditions.push(condition);
					conditions.sort();
				}
			} else {
				var conditions = [];
			}

			conditions = conditions.join(',<br />');
			set_condition(obj, conditions);
			save_condition(obj, conditions);

			var data = {
				game_id: game_id,
				action: 'condition',
				object_id: key,
				condition: conditions
			};
			websocket.send(JSON.stringify(data));
			break;
		case 'coordinates':
			var pos_x = coord_to_grid(mouse_x, false) / grid_cell_size;
			var pos_y = coord_to_grid(mouse_y, false) / grid_cell_size;
			write_sidebar('Coordinates: ' + pos_x + ', ' + pos_y);
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
		case 'distance':
			var pos_x = coord_to_grid(mouse_x, false) + (grid_cell_size >> 1) - 12;
			var pos_y = coord_to_grid(mouse_y, false) - (grid_cell_size >> 1) + 7;
			var marker = '<img src="/images/pin.png" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; z-index:' + (DEFAULT_Z_INDEX + 4) + '" class="pin" />';
			$('div.playarea > div').append(marker);

			$('div.playarea').mousemove(function(event) {
				var from_x = coord_to_grid(mouse_x, false);
				var from_y = coord_to_grid(mouse_y, false);

				var to_x = event.clientX + $('div.playarea').scrollLeft() - 16;
				to_x = coord_to_grid(to_x, false);
	            var to_y = event.clientY + $('div.playarea').scrollTop() - 41;
				to_y = coord_to_grid(to_y, false);

				var diff_x = Math.round(Math.abs(to_x - from_x) / grid_cell_size);
				var diff_y = Math.round(Math.abs(to_y - from_y) / grid_cell_size);
				
				var distance = (diff_x > diff_y) ? diff_x : diff_y;

				$('span#infobar').text(distance + ' / ' + (distance * 5) + 'ft');
			});

			measuring = true;
			break;
		case 'effect_create':
			effect_x = coord_to_grid(mouse_x, false);
			effect_y = coord_to_grid(mouse_y, false);
			$('div.effects').show();
			break;
		case 'effect_duplicate':
			var pos = $(this).position();
			effect_x = pos.left + $('div.playarea').scrollLeft() + grid_cell_size;
			effect_y = pos.top + $('div.playarea').scrollTop();

			var src = $(this).find('img').prop('src');
			var width = parseInt($(this).width()) / grid_cell_size;
			var height = parseInt($(this).height()) / grid_cell_size;

			effect_create_object(effect_id, src, effect_x, effect_y, width, height);
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
			marker_create(mouse_x - 25, mouse_y - 50);

			var data = {
				game_id: game_id,
				action: 'marker',
				name: my_name,
				pos_x: mouse_x - 25,
				pos_y: mouse_y - 69
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
		case 'script':
			$('div.script_editor input#zone_id').val($(this).prop('id'));
			$('div.script_editor input#zone_group').val($(this).attr('group'));
			$('div.script_editor textarea').val($(this).find('div.script').text());
			$('div.script_editor').show();
			$('div.script_editor textarea').focus();
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
			if ((points = window.prompt('Temporary hit points:', temporary_hitpoints)) == undefined) {
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
		case 'view':
			object_view(obj);
			break;
		case 'zone_create':
			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			$('div.zone_create input#width').val(3);
			$('div.zone_create input#height').val(3);
			$('div.zone_create').show();
			break;
		case 'zone_delete':
			if (confirm('Delete zone?')) {
				zone_delete(obj);
			}
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
		send_message('Entered the game.', my_name, false);

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
			case 'alternate':
				$('div#' + data.char_id).find('img').attr('src', '/files/portraits/' + data.src);
				$('div#' + data.char_id).find('img').css('width', data.size + 'px');
				$('div#' + data.char_id).find('img').css('height', data.size + 'px');
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
			case 'event':
				if (dungeon_master) {
					zone_run_script(data.zone, data.character, data.zone_event, data.pos_x, data.pos_y);
				}
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
				var obj = $('div#' + data.instance_id);
				object_hide(obj, false);
				break;
			case 'journal':
				journal_add_entry(data.name, data.content);
				write_sidebar(data.name + ' added a journal entry.');
				break;
			case 'lower':
				$('div#' + data.instance_id).css('z-index', z_index);
				z_index--;
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);
				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed, function() {
					if (obj.hasClass('zone') || obj.is(my_character)) {
						zone_init_presence();
					}

					if (data.instance_id == stick_to) {
						object_move_to_sticked(obj);
					}
				});
				break;
			case 'ping':
				var data = {
					game_id: game_id,
					action: 'pong',
					name: my_name
				};
				websocket.send(JSON.stringify(data));
				break;
			case 'pong':
				if (dungeon_master) {
					write_sidebar('&nbsp;&nbsp;&nbsp;&nbsp;- ' + data.name);
				}
				break;
			case 'reload':
				document.location = '/game/' + game_id;
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate(obj, data.rotation, false, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.name, data.mesg);
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show(obj, false);
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
			case 'whisper':
				if (data.to == my_character.prop('id')) {
					message_to_sidebar(data.name, data.mesg);
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height, data.color, data.opacity);
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

	/* Zones
	 */
	$('div.zone').css('z-index', 3);

	$('div.zone_create div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.zone_create button').on('click', function() {
		var width = parseInt($('input#width').val());
		var height = parseInt($('input#height').val());
		var color = $('input#color').val();
		var opacity = parseFloat($('input#opacity').val());

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

		zone_create(width, height, color, opacity);

		$('div.zone_create').hide();
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
		object_hide($(this), false);
	});

	$('div.token').each(function() {
		$(this).css('z-index', DEFAULT_Z_INDEX + 1);
		object_rotate($(this), $(this).attr('rotation'), false, 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').css('z-index', DEFAULT_Z_INDEX + 2);

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
		$('div.zone').filter(function() {
			return $(this).css('background-color') == 'rgb(0, 0, 0)';
		}).hover(function() {
			$(this).css('border', '1px solid #a0a000');
		}, function() {
			$(this).css('border', '');
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
			$(this).fadeTo(0, 0.5);
		});

		/* Menu zones
		 */
		zone_menu = {
			'info': {name:'Info', icon:'fa-info-circle'},
			'script': {name:'Event script', icon:'fa-edit'},
			'sep1': '-',
			'marker': {name:'Marker', icon:'fa-map-marker'},
			'distance': {name:'Distance', icon:'fa-map-signs'},
			'coordinates': {name:'Coordinates', icon:'fa-flag'},
			'effect_create': {name:'Effect', icon:'fa-fire'},
			'sep2': '-',
			'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
			'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
			'sep3': '-',
			'zone_delete': {name:'Delete', icon:'fa-trash'},
		};

		$.contextMenu({
			selector: 'div.zone',
			callback: context_menu_handler,
			items: zone_menu,
			zIndex: DEFAULT_Z_INDEX + 4
		});

		/* Menu tokens
		 */
		items = {
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
			'focus': {name:'Focus', icon:'fa-binoculars'},
			'handover': {name:'Hand over', icon:'fa-hand-stop-o'},
			'takeback': {name:'Take back', icon:'fa-hand-grab-o'},
			'sep2': '-',
			'marker': {name:'Marker', icon:'fa-map-marker'},
			'distance': {name:'Distance', icon:'fa-map-signs'},
			'coordinates': {name:'Coordinates', icon:'fa-flag'},
			'zone_create': {name:'Zone', icon:'fa-square-o'},
			'sep3': '-',
			'attack': {name:'Attack', icon:'fa-shield'},
			'damage': {name:'Damage', icon:'fa-warning'},
			'heal': {name:'Heal', icon:'fa-medkit'}
		};

		var conditions = {};
		conditions['condition_0'] = {name: 'None'};
		conditions['sep0'] = '-';
		$('div.conditions div').each(function() {
			var con_id = $(this).attr('con_id');
			conditions['condition_' + con_id] = {name: $(this).text()};
		});

		items['sep2'] = '-';
		items['conditions'] = {name:'Conditions', icon:'fa-heartbeat', items:conditions};

		$.contextMenu({
			selector: 'div.token img',
			callback: context_menu_handler,
			items: items,
			zIndex: DEFAULT_Z_INDEX + 4
		});

		/* Menu characters
		 */
		var maps = {};
		$('select.map-selector option').each(function() {
			var m_id = $(this).attr('value');
			if (m_id != map_id) {
				var key = 'travel_' + m_id;
				maps[key] = {name: $(this).text()};
			}
		});

		var items = {
			'info': {name:'Info', icon:'fa-info-circle'},
			'view': {name:'View', icon:'fa-search'},
			'presence': {name:'Presence', icon:'fa-low-vision'},
			'sep1': '-',
			'focus': {name:'Focus', icon:'fa-binoculars'},
			'distance': {name:'Distance', icon:'fa-map-signs'},
			'coordinates': {name:'Coordinates', icon:'fa-flag'},
			'sep2': '-',
			'attack': {name:'Attack', icon:'fa-shield'},
			'damage': {name:'Damage', icon:'fa-warning'},
			'heal': {name:'Heal', icon:'fa-medkit'},
			'sep3': '-',
			'zone_create': {name:'Zone', icon:'fa-square-o'}
		};

		if (Object.keys(maps).length > 0) {
			items['send'] = {name:'Send to', icon:'fa-compass', items:maps};
		}

		$.contextMenu({
			selector: 'div.character img',
			callback: context_menu_handler,
			items: items,
			zIndex: DEFAULT_Z_INDEX + 4
		});

		/* Menu map
		 */
		$.contextMenu({
			selector: 'div.playarea > div',
			callback: context_menu_handler,
			items: {
				'marker': {name:'Marker', icon:'fa-map-marker'},
				'distance': {name:'Distance', icon:'fa-map-signs'},
				'coordinates': {name:'Coordinates', icon:'fa-flag'},
				'sep1': '-',
				'effect_create': {name:'Effect', icon:'fa-fire'},
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

			my_character.css('z-index', DEFAULT_Z_INDEX + 3);

			/* Menu my character
			 */
			var items = {
				'info': {name:'Info', icon:'fa-info-circle'},
				'view': {name:'View', icon:'fa-search'},
				'sep1': '-',
				'damage': {name:'Damage', icon:'fa-warning'},
				'heal': {name:'Heal', icon:'fa-medkit'},
				'temphp': {name:'Temporary hit points', icon:'fa-heart-o'}
			};

			var conditions = {};
			conditions['condition_0'] = {name: 'None'};
			conditions['sep0'] = '-';
			$('div.conditions div').each(function() {
				var con_id = $(this).attr('con_id');
				conditions['condition_' + con_id] = {name: $(this).text()};
			});

			items['sep2'] = '-';
			items['conditions'] = {name:'Conditions', icon:'fa-heartbeat', items:conditions};

			var alternates = $('div.alternates div');
			if (alternates.length > 0) {
				var icons = {};
				icons['alternate_0'] = {name: 'Default'};
				icons['sep1'] = '-';

				alternates.each(function() {
					var icon_id = $(this).attr('icon_id');
					icons['alternate_' + icon_id] = {name: $(this).text()};
				});

				items['alternates'] = {name:'Icons', icon:'fa-smile-o', items:icons};
			}

			$.contextMenu({
				selector: 'div#' + my_char + ' img',
				callback: context_menu_handler,
				items: items,
				zIndex: DEFAULT_Z_INDEX + 4
			});

			/* Zone presence
			 */
			zone_init_presence();
		}

		/* Menu tokens
		 */
		$.contextMenu({
			selector: 'div.token img',
			callback: context_menu_handler,
			items: {
				'view': {name:'View', icon:'fa-search'},
				'marker': {name:'Marker', icon:'fa-map-marker'},
				'distance': {name:'Distance', icon:'fa-map-signs'},
				'stick': {name:'Stick to', icon:'fa-lock'},
				'attack': {name:'Attack', icon:'fa-shield'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});

		/* Menu (other) characters
		 */
		$.contextMenu({
			selector: 'div.character img',
			callback: context_menu_handler,
			items: {
				'info': {name:'Info', icon:'fa-info-circle'},
				'view': {name:'View', icon:'fa-search'},
				'marker': {name:'Marker', icon:'fa-map-marker'},
				'distance': {name:'Distance', icon:'fa-map-signs'},
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});

		/* Menu map
		 */
		$.contextMenu({
			selector: 'div.playarea > div',
			callback: context_menu_handler,
			items: {
				'marker': {name:'Marker', icon:'fa-map-marker'},
				'distance': {name:'Distance', icon:'fa-map-signs'}
			},
			zIndex: DEFAULT_Z_INDEX + 4
		});
	}

	/* Input field
	 */
	$('div.input input').focusout(function() {
		$('body').keydown(object_steer);
	});

	$('div.input input').focusin(function() {
		$('body').off('keydown');
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

	$('div.playarea').mousedown(function(event) {
		if (event.which == 3) {
			mouse_x = event.clientX + $('div.playarea').scrollLeft() - 16;
			mouse_y = event.clientY + $('div.playarea').scrollTop() - 41;
		}

		if (measuring) {
			$('div.playarea').off('mousemove');
			$('span#infobar').text('');
			$('img.pin').remove();
			measuring = false;
		}
	});

	$('div.effects div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.collectables div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.notes div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.journal div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('select.map-selector').click(function(e) {
		e.stopPropagation();
	});

	if (dungeon_master) {
		var bo = localStorage.getItem('battle_order');
		if (bo != undefined) {
			battle_order = JSON.parse(bo);
			show_battle_order(false, false);
		}
	}

	var conditions = localStorage.getItem('conditions');
	if (conditions != undefined) {
		conditions = JSON.parse(conditions);
		for (var [key, value] of Object.entries(conditions)) {
			set_condition($('div#' + key), value);
		}
	}

	$('div.input input').focus();

	scroll_to_my_character();
});
