function filter_tokens() {
	var filter = $('input#filter').val().toLowerCase();

	$('div.token').show();

	if (filter == '') {
		return;
	}

	$('div.token').each(function() {
		var name = $(this).find('div.name').text().toLowerCase();
		if (name.includes(filter) == false) {
			$(this).hide();
		}
	});
}
