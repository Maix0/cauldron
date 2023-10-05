$(document).ready(function() {
	$('div.introduction').each(function() {
		$(this).windowframe({
			header: $(this).attr('title'),
			activator: 'button.show_' + $(this).attr('id')
		});
	});
});
