$(document).ready(function() {
	$('input#random_code').click(function() {
		$.ajax({
			url:'/vault/invite'
		}).done(function(data) {
			var code = $(data).find('code').text();
			$('input#invitation_code').val(code);
		});
	});
});
