$(document).ready(function() {
	$.ajax('/vault/adventure').done(function(data) {
		var image_dialog = $('<div></div>').windowframe({
			activator: 'input.browser',
			header: 'Images from Resources',
		});

		var images = $(data).find('image');

		if (images.length > 0) {
			var list = '<div><ul class="browse-list">';
			$(data).find('image').each(function() {
				list += '<li>/' + $(this).text() + '</li>';
			});
			list += '</ul></div>';

			image_dialog.append(list);

			image_dialog.find('li').on('click', function() {
				$('input#image').val($(this).text());
				image_dialog.close();	
			});
		} else {
			image_dialog.append('<div>No images have been found in the root of the Resources.</div>');
		}
	});
});
