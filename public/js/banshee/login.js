$(document).ready(function() {
	var username = document.getElementById('username');
	var password = document.getElementById('password');

	if (username.value == '') {
		username.focus();
	} else {
		password.focus();
	}
});
