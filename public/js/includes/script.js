function zone_group_change(init = false) {
	if (init) {
		$('input#copy_script').prop('checked', false);
	}

	if ($('input#zone_group').val() == '') {
		$('div.copy_script').hide();
	} else {
		$('div.copy_script').show();
	}
}

function script_error(message) {
	write_sidebar('<b>Script error</b><br />' + message);
}

function filter_zone_events(zone_events) {
	zone_events.leave.forEach(function(leave_zone_id) {
		var leave_group_id = $('div#' + leave_zone_id).attr('group');
		if (leave_group_id != undefined) {
			zone_events.enter.forEach(function(enter_zone_id) {
				var enter_group_id = $('div#' + enter_zone_id).attr('group');
				if (enter_group_id != undefined) {
					if (leave_group_id == enter_group_id) {
						zone_events.leave = array_remove(zone_events.leave, leave_zone_id);
						zone_events.enter = array_remove(zone_events.enter, enter_zone_id);
						zone_events.move.push(enter_zone_id);
					}
				}
			});
		}
	});

	return zone_events;
}

function zone_run_script(zone_id, char_id, trigger, pos_x, pos_y, debug = false) {
	var zone_script = $('div#' + zone_id + ' div.script');
	if (zone_script.length == 0) {
		return;
	}

	if (zone_script.attr('disabled') != undefined) {
		return;
	}

	var character = $('div#' + char_id);
	if (character.length == 0) {
		write_sidebar('Script error. Triggering character (' + char_id + ') not found.');
		return;
	}
	var name = character.find('span.name').text();

	var valid_triggers = ['enter', 'move', 'turn', 'leave'];
	var speaker = null;

	var script = zone_script.text().split('\n');
	for (ip = 0; ip < script.length; ip++) {
		var line = script[ip].trim();
		if ((line.substr(0, 1) == '#') || (line == '')) {
			continue;
		}

		var parts = line.split(/ +/, 1);
		var command = parts[0];
		var param = line.substr(parts[0].length + 1).trim();

		if (command == 'event') {
			valid_triggers = param.split(/, */);
			continue;
		}

		if (valid_triggers != null) {
			if (valid_triggers.includes(trigger) == false) {
				continue;
			}
		}

		switch (command) {
			case 'audio':
				var filename = '/files/audio/' + game_id + '/' + param;

				if (debug == false) {
					var data = {
						game_id: game_id,
						action: 'audio',
						filename: filename
					};
					websocket.send(JSON.stringify(data));
				}

				var audio = new Audio(filename);
				audio.play();
				break;
			case 'damage':
				var points = parseInt(param);
				if (isNaN(points)) {
					if (debug) {
						script_error('invalid damage points: ' + param);
					}
					break;
				}

				object_damage(character, points);
				break;
			case 'delete':
				if (param == '') {
					param = zone_id;
				} else if ($('div#' + param).length == 0) {
					if (debug) {
						script_error('Unknown zone id: ' + param);
					}
					break;
				}

				if (debug == false) {
					zone_delete($('div#' + param));
				} else {
					$('div#' + param).remove();
				}
				break;
			case 'disable':
				zone_script.attr('disabled', 'disabled')
				break;
			case 'heal':
				var points = parseInt(param);
				if (isNaN(points)) {
					if (debug) {
						script_error('Invalid healing points: ' + param);
					}
					break;
				}

				object_damage(character, -points);
				break;
			case 'hide':
				if (param.substr(0, 5) == 'token') {
					var target = $('div#' + param);
					if (target.length == 0) {
						if (debug) {
							script_error('Unknown token id: ' + param);
						}
						break;
					}

					if (debug == false) {
						object_hide(target);
					} else {
						target.fadeTo(0, 0.5);
					}
				} else if (debug) {
					script_error('Invalid token id: ' + param);
				}
				break;
			case 'move':
				var parts = param.split(/ +/);
				if (parts[0] == 'player') {
					var target = character;
				} else {
					var target = $('div#' + parts[0]);
					if (target.length == 0) {
						if (debug) {
							script_error('Unknown object id: ' + parts[0]);
						}
						break;
					}
				}

				var coord = parts[1].split(/, */);
				var x = parseInt(coord[0]);
				var y = parseInt(coord[1]);

				if ((isNaN(x) || isNaN(y)) && (parts[0] == 'player') && (parts[3] == undefined)) {
					var pos = object_position(character);

					if (coord[0] == 'x') {
						x = Math.floor(pos.left / grid_cell_size);
					}

					if (coord[1] == 'y') {
						y = Math.floor(pos.top / grid_cell_size);
					}
				}

				if (isNaN(x) || isNaN(y)) {
					if (debug) {
						script_error('Invalid coordinate: ' + parts[1] + ', ' + parts[2]);
					}
					break;
				}

				var speed = 200;
				if (parts[3] != undefined) {
					speed = parseInt(parts[3]);
					if (isNaN(speed)) {
						if (debug) {
							script_error('Invalid speed.', parts[4]);
						}
						break;
					}
				} else {
					var s = parseInt(parts[2]);
					if (isNaN(s) == false) {
						speed = s;
						parts[2] = undefined;
					}
				}

				if ((parts[2] == 'player') || ((parts[0] == 'player') && (parts[2] == 'self'))) {
					pos_x += x * grid_cell_size;
					pos_y += y * grid_cell_size;
				} else if (parts[2] != undefined) {
					if (parts[2] == 'self') {
						var object = target;
					} else {
						var object = $('div#' + parts[2]);
					}
					if (object.length == 0) {
						if (debug) {
							script_error('Unknown object: ' + parts[2]);
						}
						break;
					}

					var pos = object_position(object);
					pos_x = pos.left + x * grid_cell_size;
					pos_y = pos.top + y * grid_cell_size;
				} else {
					pos_x = x * grid_cell_size;
					pos_y = y * grid_cell_size;
				}

				target.stop(false, true);
				target.css('left', pos_x + 'px');
				target.css('top', pos_y + 'px');

				if (debug == false) {
					object_move(target, speed);
				}
				break;
			case 'name':
				if (param.trim() == '') {
					if (debug) {
						script_error('No name specified.');
					}
					break;
				}

				speaker = param;
				break;
			case 'rotate':
				var parts = param.split(/ +/);
				var target = $('div#' + parts[0]);
				if (target.length == 0) {
					if (debug) {
						script_error('Unknown object id: ' + parts[0]);
					}
					break;
				}

				if (target.hasClass('token') == false) {
					if (debug) {
						script_error('Object is not a token: ' + parts[0]);
					}
					break;
				}

				var directions = {'n':   0, 'ne':  45, 'e':  90, 'se': 135,
				                  's': 180, 'sw': 225, 'w': 270, 'nw': 315};
				var direction = directions[parts[1]];
				if (direction == undefined) {
					direction = parseInt(parts[1]);
					if (isNaN(direction)) {
						if (debug) {
							script_error('Invalid direction: ' + parts[1]);
						}
						break;
					}
					if ((direction < -3) || (direction > 4)) {
						if (debug) {
							script_error('Invalid direction: ' + parts[1]);
						}
						break;
					}

					var rotation = parseInt(target.attr('rotation'));

					direction = rotation + 45 * direction;
					if (direction < 0) {
						direction += 360;
					} else if (direction >= 360) {
						direction -= 360;
					}
				}

				object_rotate(target, direction, debug == false);
				break;
			case 'show':
				if (param.substr(0, 5) == 'token') {
					var target = $('div#' + param);
					if (target.length == 0) {
						if (debug) {
							script_error('Unknown token id: ' + param);
						}
						break;
					}

					if (debug == false) {
						object_show(target);
					} else {
						target.fadeTo(0, 1);
					}
				} else if (debug) {
					script_error('Invalid token id: ' + param);
				}
				break;
			case 'write':
				if (debug == false) {
					var data = {
						game_id: game_id,
						action: 'whisper',
						name: speaker,
						to: char_id,
						mesg: param
					};
					websocket.send(JSON.stringify(data));
				}

				message = '<b>Sent to ' + name + ':</b>';
				if (speaker != null) {
					message += '<br />' + speaker + ':';
				}
				message += '<br />' + param;

				write_sidebar(message);
				break;
			case 'write_all':
				param = param.replace('PLAYER', name);
				if (debug == false) {
					send_message(param, speaker);
				} else {
					write_sidebar('Message to all:<br />' + param);
				}
				break;
			case 'write_dm':
				param = param.replace('PLAYER', name);
				write_sidebar('<b>Zone script message:</b><br />' + param);
				break;
			default:
				if (debug) {
					write_sidebar('Unknown script command:<br />' + line);
				}
		}
	}
}

function script_save(zone) {
	var zone_id = $('div.script_editor input#zone_id').val();
	var zone_group = $('div.script_editor input#zone_group').val();
	var copy_script = $('div.script_editor input#copy_script').prop('checked');
	var script = $('div.script_editor textarea').val();

	$.post('/object/script', {
		zone_id: zone_id.substr(4),
		map_id: map_id,
		script: script,
		copy_script: copy_script ? 'true' : 'false',
		zone_group: zone_group
	}).done(function(data) {
		if ($('div#' + zone_id + ' div.script').length == 0) {
			$('div#'  + zone_id).append('<div class="script"></div>');
		}

		if (copy_script) {
			$('div.zone[group=' + zone_group + '] div.script').text(script);
		} else {
			$('div#' + zone_id + ' div.script').text(script);
		}

		if (zone_group != '') {
			$('div#' + zone_id).attr('group', zone_group);
		} else {
			$('div#' + zone_id).removeAttr('group');
		}

		$('div#' + zone_id + ' div.script').removeAttr('disabled');

		if (typeof zone_announce_group_id == 'function') {
			zone_announce_group_id(zone_id, zone_group);
		}

		$('div.script_editor').hide();
	}).fail(function(data) {
		alert('Script save error');
	});
}
