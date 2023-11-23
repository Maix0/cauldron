function show_appointment(cell) {
	var title = $(cell).text();
	var begin = $(cell).attr('begin');
	var end = $(cell).attr('end');
	var adventure = $(cell).attr('adventure');

	var message = '<p>Session starts at ' + begin;
	if (end != '') {
		message += '<br />and ends at ' + end + '.</p>';
	} else {
		message += '.</p>';
	}

	if (adventure != '') {
		message += '<p>Adventure: ' + adventure + '.</p>';
	}

	var dialog =
		'<div class="cauldron_dialog">' +
		'<div class="message">' + message + '</div>' + 
		'<div class="btn-group">' +
		'<input type="button" value="Ok" class="btn btn-default" />' +
		'</div>' +
		'</div>';
	var alert_window = $(dialog).windowframe({
		header: title,
		width: 500
	});

	alert_window.find('div.btn-group input').on('click', function() {
		alert_window.close();
	});

	alert_window.open();
}
