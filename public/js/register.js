$(document).ready(function() {
	$('body').append('<div class="creating"><div>Creating your account. This may take a few seconds. Please wait...</div></div>');

	$('input.submit').on('click', function() {
		$('div.creating').css('display', 'block');
	});
});
