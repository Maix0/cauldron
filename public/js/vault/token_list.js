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

function filter_clear() {
}

$(document).ready(function() {
	$('input#filter').val(localStorage.getItem('vault_token_filter'));
	$('span.input-group-btn button.btn').on('click', function() {
		$('input#filter').val('');
		filter_tokens();
	});

	filter_tokens();
});
