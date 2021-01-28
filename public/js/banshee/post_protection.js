function add_to_form(name, value) {
	$('form').prepend('<input type="hidden" name="' + name + '" value="' + value + '" />');
}
