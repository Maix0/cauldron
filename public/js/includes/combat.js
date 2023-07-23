const COMBAT_MAX_ENEMIES = 5;

var _combat_init_window = null;
var _combat_max_entries = COMBAT_MAX_ENEMIES;
var _combat_order = [];
var _combat_not_started = 'No combat has been started. Use the /combat command.';

function _combat_add_table_entry(name = '', bonus = 0) {
	var readonly = (name == '') ? '' : 'disabled="disabled" ';
	var cell = '<tr><td><input type="text" value="' + name + '" ' + readonly + 'class="form-control input-sm" /></td>' +
			   '<td><input type="text" value="' + bonus + '" class="form-control input-sm" /></td></tr>';
	$('table.combat-tracker tbody').append(cell);

	if ($('table.combat-tracker tbody tr').length >= _combat_max_entries) {
		var button = $('table.combat-tracker + div.btn-group button:nth-child(2)');
		button.addClass('disabled');
		button.off('click');
	}
}

function combat_check_running() {
	var bo = localStorage.getItem('combat_order');
	if (bo == undefined) {
		return;
	}

	var bg = localStorage.getItem('combat_adventure_id');
	if (bg == undefined) {
		combat_stop();
		return;
	} else if (bg != adventure_id) {
		combat_stop();
		return;
	}

	_combat_order = JSON.parse(bo);
	combat_show_order(false, false);
}

function combat_start() {
	if ($('div.character').length == 0) {
		write_sidebar('This map has no characters.');
		return;
	}

	if (_combat_order.length > 0) {
		write_sidebar('A combat has already been started. Type /next to go to the next round or /done to finish the current combat.');
		return;
	}

	_combat_init_window.open();
}

function combat_show_order(first_round = false, send = true) {
	if (first_round) {
		send_message('Prepare for combat!', null, false);
	}

	var message = '';
	var bullet = '&Rightarrow;';
	_combat_order.forEach(function(value, key) {
		message += bullet + ' ' + value.name + '\n';
		bullet = '&boxh;';
	});

	if (send) {
		send_message(message, 'Combat order');
	} else {
		message_to_sidebar('Combat order', message);
	}
}

function combat_add(being) {
	if (_combat_order.length == 0) {
		write_sidebar(_combat_not_started);
		return;
	}

	var item = _combat_order.shift();
	_combat_order.push(item);

	item = {
		key: 0,
		name: being,
		char_id: null
	};
	_combat_order.unshift(item);

	combat_show_order();
}

function combat_remove(being) {
	if (_combat_order.length == 0) {
		write_sidebar(_combat_not_started);
		return;
	}

	var remove = null;
	_combat_order.forEach(function(value, key) {
		if (value.name.substring(0, being.length) == being) {
			remove = key;
		}
	});

	if (remove == null) {
		write_sidebar(being + ' not in combat order.');
		$('div.input input').val(input);
		return;
	}

	write_sidebar(_combat_order[remove].name + ' removed from combat.');
	_combat_order.splice(remove, 1);
}

function combat_next(being) {
	if (_combat_order.length == 0) {
		write_sidebar(_combat_not_started);
		return;
	}

	var turn = null;
	if (being != '') {
		_combat_order.forEach(function(value, key) {
			if (value.name.substring(0, being.length) == being) {
				turn = key;
			}
		});

		if (turn == null) {
			write_sidebar(being + ' not in combat order.');
			$('div.input input').val(input);
			return;
		}

		if (turn == 0) {
			write_sidebar('Already its turn.');
			return;
		}

		turn -= 1;
	}

	var item = _combat_order.shift();
	_combat_order.push(item);

	if (turn != null) {
		var item = _combat_order[turn];
		_combat_order.splice(turn, 1);
		_combat_order.unshift(item);
	}

	combat_show_order();

	$('div.character').each(function() {
		if ($(this).prop('id') == _combat_order[0].char_id) {
			zone_check_presence_for_turn($(this));
		}
	});

	localStorage.setItem('combat_order', JSON.stringify(_combat_order));
}

function combat_stop() {
	_combat_order = [];
	localStorage.removeItem('combat_order');
	localStorage.removeItem('combat_adventure_id');
}

$(document).ready(function() {
	_combat_max_entries += $('div.character').length;

	var form = '<table class="table table-condensed combat-tracker">' +
			   '<thead><tr><th>Character / group name</th><th>Initiative bonus</th></tr></thead>' +
			   '<tbody></tbody></tbody></table>';

	_combat_init_window = $(form).windowframe({
		header: 'Start a new combat',
		info: '<p>If you remove a character\'s initiative bonus, that character will not be included in the combat.</p>' +
		      '<p>If you want a character or enemy to go first, give it a very high initiative bonus. If you want it to ' +
		      'go last, give it a very high negative initiative bonus.</p>',
		top: 75,
		open: function() {
			$('table.combat-tracker tbody').empty();
			$('div.character').each(function() {
				var name = $(this).find('span').text();
				var bonus = parseInt($(this).attr('initiative'));
				_combat_add_table_entry(name, bonus);
			});

			_combat_add_table_entry();
			_combat_add_table_entry();
			_combat_add_table_entry();

			var next = $('div.character').length + 1;
			$('table.combat-tracker tbody tr').filter(':nth-child(' + next + ')').find('input[type=text]').first().focus();

			_combat_init_window.footer(null);
		},
		close: function() {
			var info_window_id = _combat_init_window.data('windowframe_id') + 1;
			var info = $('div#windowframe' + info_window_id);
			info.close();
		},
		buttons: {
			'Start combat': function() {
				_combat_order = [];
				var error = null;
				$('table.combat-tracker tbody tr').each(function() {
					var name = $(this).find('td:first-child input').val();
					var bonus = $(this).find('td:last-child input').val();
					if ((name == '') || (bonus == '')) {
						return true;
					}

					var present = false;
					_combat_order.forEach(function(value, key) {
						if (value.name == name) {
							present = true;
						}
					});
					if (present) {
						error = name + ' is mentioned more than once.';
						return false;
					}

					bonus = parseInt(bonus);
					if (isNaN(bonus)) {
						error = 'Invalid initiative bonus value.';
						return false;
					}

					var roll = Math.floor(Math.random() * 20) + 1 + bonus;
					roll = roll.toString();
					while (roll.length < 2) {
						roll = '0' + roll;
					}

					var item = {
						key: roll + '-enemy',
						name: name,
						char_id: null
					}
					_combat_order.push(item);
				});

				if (error !== null) {
					error = '<font color="red">' + error + '</font>';
					_combat_init_window.footer(error);
					_combat_order = [];
					return;
				}

				_combat_order.sort((a, b) => b.key.localeCompare(a.key));

				combat_show_order(true);

				$('div.character').each(function() {
					if ($(this).prop('id') == _combat_order[0].char_id) {
						zone_check_presence_for_turn($(this));
					}
				});

				localStorage.setItem('combat_order', JSON.stringify(_combat_order));
				localStorage.setItem('combat_adventure_id', adventure_id);

				$(this).close();
			},
			'Add entry': function() {
				_combat_add_table_entry();
			},
			'Cancel': function() {
				write_sidebar('Combat canceled.');
				$(this).close();
			}
		}
	});
});
