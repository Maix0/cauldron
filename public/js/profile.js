function set_authenticator_code() {
	$.get('/profile/authenticator', function(data) {
		$('input#secret').val($(data).find('secret').text());
		secret_change();
	});
}
