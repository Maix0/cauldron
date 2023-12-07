function set_authenticator_code() {
	$.get('/account/authenticator', function(data) {
		$('input#secret').val($(data).find('secret').text());
	});
}
