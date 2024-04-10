var account_status = null;

function password_field() {
	if ($('input#generate:checked').length > 0) {
		$('input#password').val('');
		$('input#password').prop('disabled', true);

		if ($('select#status').prop('disabled') == false) {
			account_status = $('select#status').val();
			$('select#status').val(1);
		}
	} else {
		$('input#password').prop('disabled', false);

		if ($('select#status').prop('disabled') == false) {
			$('select#status').val(account_status);
		}
	}
}

function set_authenticator_code() {
	$.get('/vault/user/authenticator', function(data) {
		$('input#secret').val($(data).find('secret').text());
	});
}
