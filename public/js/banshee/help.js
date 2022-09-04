$(document).ready(function() {
	if ($('#help').length == 0) {
		return;
	}

	var help_button = $('<button type="button" class="btn btn-default btn-xs help" data-toggle="modal" data-target="#help_message">Help</button>');

	$('div#help').windowframe({
		activator: help_button,
		header: 'Help',
		top: '50px'
	});

	var content = $('body div.content');
	var container = $(content).find('div.container');
	if (container.length != 0) {
		content = container;
	}

	var title = $(content).find('h1');
	var icon = $(content).find('img.title_icon');
	var mesg = $(content).find('div.alert');

	if (title.length != 0) {
		$(title).first().before(help_button);
	} else if (icon.length != 0) {
		$(icon).first().after(help_button);
	} else if (mesg.length != 0) {
		$(mesg).first().after(help_button);
	} else {
		$(help_button).prependTo(content);
	}
});
