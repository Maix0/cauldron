$(document).ready(function() {
	$('div.story').each(function() {
		$(this).windowframe({
			header: $(this).attr('title'),
			activator: 'button.show_' + $(this).attr('id')
		});
	});
});
