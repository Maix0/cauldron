function array_remove(arr, val) {
	arr = arr.filter(function(item) {
		return item !== val
	});

	return arr;
}

/* Dialogs windows
 */
function cauldron_alert(message, title = 'Cauldron alert', callback_close = undefined) {
	message = message.replaceAll('\n', '<br />');

	var dialog =
		'<div class="cauldron_dialog">' +
		'<div class="message">' + message + '</div>' + 
		'<div class="btn-group">' +
		'<input type="button" value="Ok" class="btn btn-default" />' +
		'</div>' +
		'</div>';
	var alert_window = $(dialog).windowframe({
		header: title,
		width: 500,
		close: function() {
			$(document).off('keydown', key_handler);
		}
	});

	alert_window.find('div.btn-group input').click(function() {
		alert_window.close();
	});

	var key_handler = function() {
		if ((event.which != 13) && (event.which != 27)) {
			return;
		}

		alert_window.find('div.btn-group input').trigger('click');
	};
	$(document).on('keydown', key_handler);

	alert_window.open();
}

function cauldron_confirm(message, callback_yes, callback_no = undefined) {
	var dialog =
		'<div class="cauldron_dialog">' +
		'<div class="message">' + message + '</div>' + 
		'<div class="btn-group">' +
		'<input type="button" value="Yes" class="btn btn-default" />' +
		'<input type="button" value="No" class="btn btn-default" />' +
		'</div>' +
		'</div>';
	var confirm_window = $(dialog).windowframe({
		header: 'Confirm',
		width: 500,
		maximize: false,
		minimize: false,
		close: function() {
			$(document).off('keydown', key_handler);
		},
		resize: false,
		dialog: true
	});

	confirm_window.find('div.btn-group input').first().click(function() {
		confirm_window.close();

		callback_yes();
	});

	confirm_window.find('div.btn-group input').last().click(function() {
		confirm_window.close();

		if (callback_no != undefined) {
			callback_no();
		}
	});

	var key_handler = function() {
		if (event.which == 13) {
			confirm_window.find('div.btn-group input').first().trigger('click');
		} else if (event.which == 27) {
			confirm_window.find('div.btn-group input').last().trigger('click');
		}
	};
	$(document).on('keydown', key_handler);

	confirm_window.open();
}

function cauldron_prompt(message, input, callback_okay, callback_cancel = undefined) {
	var dialog =
		'<div class="cauldron_dialog">' +
		'<div class="message">' + message + '</div>' + 
		'<input type="text" value="' + input.replace('"', '\\"') + '" class="form-control" />' +
		'<div class="btn-group">' +
		'<input type="button" value="Ok" class="btn btn-default" />' +
		'<input type="button" value="Cancel" class="btn btn-default" />' +
		'</div>' +
		'</div>';
	var prompt_window = $(dialog).windowframe({
		header: 'Prompt',
		width: 500,
		maximize: false,
		minimize: false,
		open: function() {
			var input = prompt_window.find('input.form-control');
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		close: function() {
			$(document).off('keydown', key_handler);
		},
		resize: false,
		dialog: true
	});

	prompt_window.find('div.btn-group input').first().click(function() {
		var input = prompt_window.find('input.form-control').val();

		prompt_window.close();

		callback_okay(input);
	});

	prompt_window.find('div.btn-group input').last().click(function() {
		prompt_window.close();

		if (callback_cancel != undefined) {
			callback_cancel();
		}
	});

	var key_handler = function() {
		if (event.which == 13) {
			prompt_window.find('div.btn-group input').first().trigger('click');
		} else if (event.which == 27) {
			prompt_window.find('div.btn-group input').last().trigger('click');
		}
	};
	$(document).on('keydown', key_handler);

	prompt_window.open();
}
