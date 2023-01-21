function password_field() {
	if ($('input#generate:checked').length > 0) {
		$('input#password').val('');
		$('input#password').prop('disabled', true);
	} else {
		$('input#password').prop('disabled', false);
	}
}

function set_authenticator_code() {
	$.get('/vault/user/authenticator', function(data) {
		$('input#secret').val($(data).find('secret').text());
	});
}
