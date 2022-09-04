function filter_tokens() {
	var filter = $('input#filter').val().toLowerCase();

	localStorage.setItem('vault_token_filter', filter);

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

$(document).ready(function() {
	$('input#filter').val(localStorage.getItem('vault_token_filter'));

	filter_tokens();
});
