const DEFAULT_Z_INDEX = 10000;

var game_id = null;
var map_id = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.empty();
	sidebar.append('<p>' + message + '</p>');
}

/* Object interaction
 */
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

	$.post('/cms/map/arrange', {
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: (pos.left / grid_cell_size),
		pos_y: (pos.top / grid_cell_size)
	});
}

function object_info(obj) {
	info =
		'Hitpoints: ' + obj.attr('hitpoints') + '<br />' +
		'Damage: ' + obj.attr('damage') + '<br />' +
		'Instance: ' + obj.attr('id') + '<br />';

	var name = obj.attr('name');
	if (name == undefined) {
		name = obj.find('span').text();
	}
	if ((name != undefined) && (name != '')) {
		info = 'Name: ' + name + '<br />' + info;
	}

	write_sidebar(info);
}

function name_object(obj) {
	var name = $(obj).attr('name');
	if ((name = window.prompt('Name:', name)) == undefined) {
		return;
	}

	$(obj).attr('name', name);

	$.post('/cms/map/arrange', {
		action: 'name',
		instance_id: obj.prop('id'),
		name: name
	});
}

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

	$.post('/cms/map/arrange', {
		action: 'armor_class',
		instance_id: obj.prop('id'),
		armor_class: armor_class
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

	$.post('/cms/map/arrange', {
		action: 'hitpoints',
		instance_id: obj.prop('id'),
		hitpoints: hitpoints
	});
}

function rotate_object(obj, direction) {
	obj.find('img').css('transform', 'rotate(' + direction + 'deg)');

	$.post('/cms/map/arrange', {
		action: 'rotate',
		instance_id: obj.prop('id'),
		direction: direction
	});
}

function hide_object(obj) {
	var data = {
		action: 'hide',
		instance_id: obj.prop('id'),
	};

	$.post('/cms/map/arrange', {
		action: 'hide',
		instance_id: obj.prop('id'),
	});

	obj.fadeTo('fast', 0.5);
}

function show_object(obj) {
	var data = {
		action: 'show',
		instance_id: obj.prop('id'),
	};

	$.post('/cms/map/arrange', {
		action: 'show',
		instance_id: obj.prop('id'),
	});

	obj.fadeTo('fast', 1);
}

function create_object(icon, x, y) {
	var token_id = $(icon).attr('token_id');
	var width = parseInt($(icon).attr('obj_width')) * grid_cell_size;
	var height = parseInt($(icon).attr('obj_height')) * grid_cell_size;
	var url = $(icon).attr('src');

	x += $('div.playarea').scrollLeft();
	var delta = x % grid_cell_size;
	x -= delta;

	y += $('div.playarea').scrollTop();
	var delta = y % grid_cell_size;
 	y -= delta;

	$.post('/cms/map/arrange', {
		action: 'create',
		map_id: map_id,
		token_id: token_id,
		pos_x: x / grid_cell_size,
		pos_y: y / grid_cell_size
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		var obj = '<div id="token' + instance_id + '" class="token" style="left:' + x + 'px; top:' + y + 'px;" is_hidden="no" hitpoints="1" damage="0">' +
		          '<img src="' + url + '" style="width:' + width + 'px; height:' + height + 'px; transform:rotate(0deg);" />' +
		          '</div>';

		$('div.playarea > div').append(obj);

		$('div.playarea div#token' + instance_id).draggable({
			stop: function(event, ui) {
				move_object($(this));
			}
		});
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function delete_object(obj) {
	$.post('/cms/map/arrange', {
		action: 'delete',
		instance_id: obj.prop('id'),
	}).done(function() {
		obj.remove();
	});
}

/* Context menu handler
 */
function context_menu_handler(key, options) {
	var obj = $(this).parent();

	switch (key) {
		case 'armor_class':
			object_armor_class(obj);
			break;
		case 'delete':
			if (confirm('Delete object?')) {
				delete_object(obj);
			}
			break;
		case 'info':
			object_info(obj);
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
		case 'hitpoints':
			object_hitpoints(obj);
			break;
		case 'lower':
			obj.css('z-index', z_index);
            z_index--;
			break;
		case 'name':
			name_object(obj);
			break;
		case 'rot-n':
			rotate_object(obj, 0);
			break;
		case 'rot-ne':
			rotate_object(obj, 45);
			break;
		case 'rot-e':
			rotate_object(obj, 90);
			break;
		case 'rot-se':
			rotate_object(obj, 135);
			break;
		case 'rot-s':
			rotate_object(obj, 180);
			break;
		case 'rot-sw':
			rotate_object(obj, 225);
			break;
		case 'rot-w':
			rotate_object(obj, 270);
			break;
		case 'rot-nw':
			rotate_object(obj, 315);
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

	/* Character and token objects
	 */
	$('div.token[is_hidden=no]').each(function() {
		$(this).show();
	});

	$('div.token').css('z-index', DEFAULT_Z_INDEX + 1);
	$('div.character').css('z-index', DEFAULT_Z_INDEX + 2);
	$('div.token[rotation_point!=""] img').each(function() {
		$(this).css('transform-origin', $(this).parent().attr('rotation_point'));
	});

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

	$('div.character[is_hidden=yes]').each(function() {
		$(this).fadeTo('fast', 0.5);
	});

	$.contextMenu({
		selector: 'div.token img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Info', icon:'fa-info-circle'},
			'name': {name:'Name', icon:'fa-edit'},
			'rotate': {name:'Rotate', icon:'fa-compass', items:{
				'rot-n':  {name:'North', icon:'fa-arrow-circle-up'},
				'rot-ne': {name:'North East'},
				'rot-e':  {name:'East', icon:'fa-arrow-circle-right'},
				'rot-se': {name:'South East'},
				'rot-s':  {name:'South', icon:'fa-arrow-circle-down'},
				'rot-sw': {name:'South West'},
				'rot-w':  {name:'West', icon:'fa-arrow-circle-left'},
				'rot-nw': {name:'North West'},
			}},
			'presence': {name:'Presence', icon:'fa-low-vision'},
			'sep1': '-',
			'armor_class': {name:'Armor class', icon:'fa-shield'},
			'hitpoints': {name:'Hitpoints', icon:'fa-heartbeat'},
			'sep2': '-',
			'lower': {name:'Lower', icon:'fa-arrow-down'},
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: DEFAULT_Z_INDEX + 3
	});

	$.contextMenu({
		selector: 'div.character img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Info', icon:'fa-info-circle'},
			'presence': {name:'Presence', icon:'fa-low-vision'}
		},
		zIndex: DEFAULT_Z_INDEX + 3
	});

	/* Library
	 */
	$('div.library img.icon').draggable({
		helper: 'clone',
		appendTo: 'div.playarea',
		stop: function(event, ui) {
			create_object($(this), event.pageX, event.pageY);
		}
	});

});
