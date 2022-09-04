function remove_preview_page(url) {
	$.post('/vault/page', { submit_button: 'Delete preview', url: url });
}

function close_preview(preview, url) {
	remove_preview_page(url);
	$(preview).parent().parent().remove();
}

function preview_loaded(url) {
	remove_preview_page(url);
	$('div.preview iframe').contents().find('body a').each(function() {
		var href = $(this).attr('href');
		$(this).attr('href', 'javascript:alert(\'Link to ' + href + '\')');
	});
	$('div.preview iframe').contents().find('body input[type=submit]').each(function() {
		$(this).attr('type', 'button');
		$(this).attr('onClick', 'javascript:alert(\'Submit button\')');
	});
}

function set_preview_width(width) {
	$('div.preview-body').css("max-width", width);
}

$(document).ready(function() {
	if ($('input#private').prop('checked') == false) {
		$('div#roles').hide();
	}

	if ($('input#form').prop('checked') == false) {
		$('div#formsettings').hide();
	}
});
