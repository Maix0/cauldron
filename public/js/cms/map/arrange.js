const DEFAULT_Z_INDEX = 10000;

var game_id = null;
var map_id = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var mouse_x = 0;
var mouse_y = 0;

function filter_library() {
	var filter = $('input#filter').val().toLowerCase();

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
	sidebar.empty();
	sidebar.append('<p>' + message + '</p>');
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
		var armor_class = 10;
		var hitpoints = 0;
		var type = $(icon).parent().find('div.name').text();
		var rotation = 0;
		var hidden = 'no';
		x -= 30;
		y -= 40;
	} else {
		// Cloned token
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

	x += $('div.playarea').scrollLeft();
	x = coord_to_grid(x, false);

	y += $('div.playarea').scrollTop();
	y = coord_to_grid(y, false);

	$.post('/object/create_token', {
		map_id: map_id,
		token_id: token_id,
		pos_x: x / grid_cell_size,
		pos_y: y / grid_cell_size,
	}).done(function(data) {
		var instance_id = $(data).find('instance_id').text();

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token" style="left:' + x + 'px; top:' + y + 'px; z-index:' + (DEFAULT_Z_INDEX + 1) + '" type="' + type + '" is_hidden="no" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="0" name="">' +
		          '<img src="' + url + '" style="width:' + width + 'px; height:' + height + 'px;" />' +
		          '</div>';

		$('div.playarea > div').append(obj);

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
			}
		});
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id'),
	}).done(function() {
		obj.remove();
	});
}

function object_hide(obj) {
	obj.fadeTo('fast', 0.5);
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

	info +=
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

	$.post('/object/move', {
		instance_id: obj.prop('id'),
		pos_x: (pos.left / grid_cell_size),
		pos_y: (pos.top / grid_cell_size)
	});
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
	obj.fadeTo('fast', 1);
	obj.attr('is_hidden', 'no');

	var data = {
		action: 'show',
		instance_id: obj.prop('id'),
	};

	$.post('/object/show', {
		instance_id: obj.prop('id'),
	});
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

		width *= grid_cell_size;
		height *= grid_cell_size;

		if (opacity > 0.8) {
			opacity = 0.8;
		}

		var zone = '<div id="zone' + instance_id + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + '; z-index:3;" />';

		$('div.playarea > div').prepend(zone);

		$('div#zone' + instance_id).draggable({
            create: function(event, ui) {
                $(this).css('cursor', 'grab');
            },
            stop: function(event, ui) {
                object_move($(this));
            }
        });

		$.contextMenu({
			selector: 'div#zone' + instance_id,
			callback: context_menu_handler,
			items: {
				'delete': {name:'Delete', icon:'fa-trash'},
			},
			zIndex: DEFAULT_Z_INDEX + 3
		});
	}).fail(function(data) {
		alert('Zone create error');
	});
}

/* Collectable functions
 */
function collectables_select(obj) {
	var instance_id = obj.prop('id').substr(5);
	$.post('/object/collectables/unused', {
		game_id: game_id,
		instance_id: instance_id
	}).done(function(data) {
		var body = $('div.collectables div.panel-body');
		body.empty();
		body.append('<select id="collectable" class="form-control" ><option value="0">-</option></select>');

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

		body.append('<div class="btn-group"><input type="button" value="Save" class="btn btn-default save" /><input type="button" value="Cancel" class="btn btn-default cancel" /></div>');

		$('div.collectables input.save').click(function() {
			var collectable_id = body.find('select').val();
			$.post('/object/collectable/place', {
				collectable_id: collectable_id,
				instance_id: instance_id
			}).done(function() {
				$('div.collectables').hide();
			});
		});

		$('div.collectables input.cancel').click(function() {
			$('div.collectables').hide();
		});

		$('div.collectables').show();
	});
}

/* Input functions
 */
function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.prop('tagName') == 'IMG') {
		var obj = $(this).parent();
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
		case 'clone':
			var pos = obj.position();
			object_create($(this), pos.left + grid_cell_size, pos.top);
			break;
		case 'collectable':
			collectables_select(obj);
			break;
		case 'delete':
			if (confirm('Delete object?')) {
				object_delete(obj);
			}
			break;
		case 'info':
			object_info(obj);
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
			obj.css('z-index', z_index);
			z_index--;
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
		case 'zone_create':
			var pos_x = coord_to_grid(mouse_x, false);
			var pos_y = coord_to_grid(mouse_y, false);

			var zone_define = '<div class="zone_create overlay" onClick="javascript:$(this).remove()"><div class="panel panel-default" onClick="javascript:event.stopPropagation()"><div class="panel-heading">Create zone<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$(this).parent().parent().parent().remove()"></span></div><div class="panel-body" style="max-height:335px">';
			zone_define += '<label for="width">Width:</label>';
			zone_define += '<input type="text" id="width" value="3" class="form-control" onKeyUp="javascript:$(\'#height\').val($(this).val())" />';
			zone_define += '<label for="height">Height:</label>';
			zone_define += '<input type="text" id="height" value="3" class="form-control" />';
			zone_define += '<label for="color">Color:</label>';
			zone_define += '<input type="text" id="color" value="#ff0000" class="form-control" />';
			zone_define += '<label for="opacity">Opacity:</label>';
			zone_define += '<input type="text" id="opacity" value="0.2" class="form-control" />';
			zone_define += '<div class="btn-group"><button class="btn btn-default">Create zone</button></div>';
			zone_define += '</div></div></div>';

			$('body').prepend(zone_define);
			$('div.zone_create div.panel').draggable({
				handle: 'div.panel-heading',
				cursor: 'grab'
			});
			$('div.zone_create').css('z-index', DEFAULT_Z_INDEX + 5);

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

				if (opacity < 0.2) {
					opacity = 0.2;
				} else if (opacity > 1) {
					opacity = 1;
				}

				pos_x -= Math.floor((width - 1) / 2) * grid_cell_size;
				pos_y -= Math.floor((height - 1) / 2) * grid_cell_size;

				zone_create(obj, pos_x, pos_y, width, height, color, opacity);

				$(this).parent().parent().parent().parent().remove();
			});
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
	$('div.zone').draggable({
		create: function(event, ui) {
			$(this).css('cursor', 'grab');
		},
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$('div.token[is_hidden=no]').each(function() {
		$(this).show();
	});

	$('div.token').each(function() {
		$(this).css('z-index', DEFAULT_Z_INDEX + 1);
		object_rotate($(this), $(this).attr('rotation'), false);
	});

	$('div.character').css('z-index', DEFAULT_Z_INDEX + 2);

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
				'rotate_n':  {name:'North', icon:'fa-arrow-circle-up'},
				'rotate_ne': {name:'North East'},
				'rotate_e':  {name:'East', icon:'fa-arrow-circle-right'},
				'rotate_se': {name:'South East'},
				'rotate_s':  {name:'South', icon:'fa-arrow-circle-down'},
				'rotate_sw': {name:'South West'},
				'rotate_w':  {name:'West', icon:'fa-arrow-circle-left'},
				'rotate_nw': {name:'North West'},
			}},
			'presence': {name:'Presence', icon:'fa-low-vision'},
			'collectable': {name:'Collectable', icon:'fa-key'},
			'sep1': '-',
			'armor_class': {name:'Armor class', icon:'fa-shield'},
			'hitpoints': {name:'Hitpoints', icon:'fa-heartbeat'},
			'sep2': '-',
			'zone_create': {name:'Zone', icon:'fa-square-o'},
			'sep3': '-',
			'lower': {name:'Lower', icon:'fa-arrow-down'},
			'clone': {name:'Clone', icon:'fa-copy'},
			'delete': {name:'Delete', icon:'fa-trash'}
		},
		zIndex: DEFAULT_Z_INDEX + 3
	});

	$.contextMenu({
		selector: 'div.character img',
		callback: context_menu_handler,
		items: {
			'info': {name:'Info', icon:'fa-info-circle'},
			'presence': {name:'Presence', icon:'fa-low-vision'},
			'sep1': '-',
			'zone_create': {name:'Zone', icon:'fa-square-o'}
		},
		zIndex: DEFAULT_Z_INDEX + 3
	});

	$.contextMenu({
		selector: 'div.zone',
		callback: context_menu_handler,
		items: {
			'delete': {name:'Delete', icon:'fa-trash'},
		},
		zIndex: DEFAULT_Z_INDEX + 3
	});

	$.contextMenu({
		selector: 'div.playarea > div',
		callback: context_menu_handler,
		items: {
			'zone_create': {name:'Zone', icon:'fa-square-o'}
		},
		zIndex: DEFAULT_Z_INDEX + 4
	});

	$('div.collectables').css('z-index', DEFAULT_Z_INDEX + 5);
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
			mouse_x = event.clientX + $('div.playarea').scrollLeft() - 16;
			mouse_y = event.clientY + $('div.playarea').scrollTop() - 41;
		}
	});
});
