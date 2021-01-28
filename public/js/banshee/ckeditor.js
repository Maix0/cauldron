function add_ckeditor_button(button_selector, textarea_selector) {
	var button = '<div class="btn-group" id="ckeditor_starter"><input type="button" value="Start CKEditor" class="btn btn-default" onClick="javascript:start_ckeditor(\'' + textarea_selector + '\')"></div>';

	$(button_selector).after(button);
}

function start_ckeditor(selector) {
	CKEDITOR.config.entities = false;
	CKEDITOR.replace(selector, {
		toolbar: 'Basic'
	});

	$('div#ckeditor_starter').css('display', 'none');
}
