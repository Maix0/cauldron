function _script_error(message) {
	write_sidebar('<b>Script error</b><br />' + message);
}

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

function script_disable_all() {
	$('div.zone div.script').attr('disabled', 'disabled');
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
		if ((line.substring(0, 1) == '#') || (line == '')) {
			continue;
		}

		var parts = line.split(/ +/, 1);
		var command = parts[0];
		var param = line.substring(parts[0].length + 1).trim();

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
				var filename = '/resources/' + resources_key + '/audio/' + param;

				if (debug == false) {
					var data = {
						action: 'audio',
						filename: filename
					};
					websocket_send(data);
				}

				var audio = new Audio(filename);
				audio.play();
				break;
			case 'condition':
				var conditions = $('div.conditions div');
				var param_lower = param.toLowerCase()
				var condition_set = false;
				conditions.each(function() {
					if ($(this).text().toLowerCase() == param_lower) {
						set_condition(character, $(this).text(), true);
						condition_set = true;

						write_sidebar('You are ' + $(this).text());
					}
				});

				if ((condition_set == false) && debug) {
					write_sidebar('Invalid condition: ' + param);
				}
				break;
			case 'damage':
				var points = parseInt(param);
				if (isNaN(points)) {
					if (debug) {
						_script_error('invalid damage points: ' + param);
					}
					break;
				}

				object_damage_command(character, points);
				write_sidebar('You\'ve taken ' + points + ' damage!');
				break;
			case 'disable':
				zone_script.attr('disabled', 'disabled')
				break;
			case 'heal':
				var points = parseInt(param);
				if (isNaN(points)) {
					if (debug) {
						_script_error('Invalid healing points: ' + param);
					}
					break;
				}

				object_damage_command(character, -points);
				write_sidebar('You\'ve taken ' + points + ' healing!');
				break;
			case 'move':
				var parts = param.split(/ +/);

				var coord = parts[0].split(/, */);
				var x = parseInt(coord[0]);
				var y = parseInt(coord[1]);

				if (isNaN(x) || isNaN(y)) {
					if (debug) {
						_script_error('Invalid coordinate: ' + part[0]);
					}
					break;
				}

				var pos = object_position(character);

				if ((coord[0].substr(0, 1) == '+') || (coord[0].substr(0, 1) == '-')) {
					x += Math.floor(pos.left / grid_cell_size);
				}

				if ((coord[1].substr(0, 1) == '+') || (coord[1].substr(0, 1) == '-')) {
					y += Math.floor(pos.top / grid_cell_size);
				}

				x *= grid_cell_size;
				y *= grid_cell_size;

				var slide = ((parts[1] == 'silde') || ((parts[1] != undefined) && (parts[1] != '0')));

				character.stop(false, true);
				if (slide) {
					var speed = 500;
					character_steerable = false;
					character.animate({
						left: x,
						top: y
					}, speed, function() {
						character_steerable = true;
						if (debug == false) {
							object_move(character, speed);
						}

						zone_init_presence();
					});
				} else {
					character.css('left', x + 'px');
					character.css('top', y + 'px');
					if (debug == false) {
						object_move(character, 0);
					}

					zone_init_presence();
				}
				break;
			case 'name':
				if (param.trim() == '') {
					if (debug) {
						_script_error('No name specified.');
					}
					break;
				}

				speaker = param;
				break;
			case 'write':
				param = param.replace('character', name);

				if (debug == false) {
					var send = 'To ' + name;
					if (speaker != null) {
						send += ' by ' + speaker;
					}
					send += ':\n' + param;

					var data = {
						action: 'say',
						to_char_id: 0,
						name: 'Zone script message',
						mesg: send
					};
					websocket_send(data);
				}

				if (speaker != null) {
					param = '<b>' + speaker + '</b>:<span class="say">' + param + '</span>';
				}
				write_sidebar(param);
				break;
			case 'write_all':
				param = param.replace('character', name);

				if (debug == false) {
					send_message(param, speaker);
				} else {
					var send = '<b>Message to all'
					if (speaker != null) {
						send += ' by ' + speaker;
					}
					send += '</b>:<span class="say">' + param + '</span>';
					write_sidebar(send);
				}
				break;
			case 'write_dm':
				param = param.replace('character', name);

				if (debug == false) {
					var data = {
						action: 'say',
						to_char_id: 0,
						name: 'Zone script message',
						mesg: param
					};
					websocket_send(data);
				} else {
					write_sidebar('<b>Message to DM:</b><span class="say">' + param + '</span>');
				}
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
	var zone_group = $('input#zone_group').val();
	var copy_script = $('div.script_editor input#copy_script').prop('checked');
	var script = $('div.script_editor textarea').val();

	$.post('/object/script', {
		zone_id: zone_id.substring(4),
		map_id: map_id,
		script: script,
		copy_script: copy_script ? 'true' : 'false',
		zone_group: zone_group
	}).done(function(data) {
		if ($('div#' + zone_id + ' div.script').length == 0) {
			$('div#'  + zone_id).append('<div class="script"></div>');
		}

		if (zone_group != '') {
			$('div#' + zone_id).attr('group', zone_group);
		} else {
			$('div#' + zone_id).removeAttr('group');
		}

		if (copy_script) {
			$('div.zone[group="' + zone_group + '"] div.script').text(script);
		} else {
			$('div#' + zone_id + ' div.script').text(script);
		}

		$('div#' + zone_id + ' div.script').removeAttr('disabled');

		if (typeof zone_announce_group_id == 'function') {
			zone_announce_group_id(zone_id, zone_group);
		}
	}).fail(function(data) {
		alert('Script save error');
	});
}
