function edit_weapon(button) {
	var row = $(button).parent().parent().parent().parent();

	var name = row.find('td:first-child').text();
	var roll = row.find('td:nth-child(2)').text();

	$('input#name').val(name);
	$('input#roll').val(roll);
}
