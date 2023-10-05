function add_monster() {
	var nr = $('div.monsters div.panel').length + 1;

	$('div.monsters').append(
		'<div class="panel panel-primary"><div class="panel-body">\n'+
		'<label for="monster">Monster:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][monster]" class="form-control" />\n' +
		'<label for="count">Number of monsters:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][count]" class="form-control" />\n' +
		'<label for="source">Source:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][source]" class="form-control" />\n' +
		'<label for="cr">Challenge Rating:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][cr]" class="form-control cr" />\n' +
		'</div></div>\n');

	cr_input_to_select();
}

function cr_input_to_select() {
	var template = '<select class="form-control">\n';
	$('crs cr').each(function() {
		template += '<option>' + $(this).text() + '</option>\n';
	});
	template += "</select>\n";

	$('input.cr').each(function() {
		var select = $(template);
		select.attr('name', $(this).attr('name'));
		select.val($(this).attr('value'));
		$(this).after(select);
		$(this).remove();
	});
}

function sortable_events() {
	var adventure_id = $('form.adventures_pulldown select').val();

	$('div.sortable').sortable({
		handle: 'div.handle',
		update: function(event, ui) {
			var items = [];
			ui.item.parent().find('div.item').each(function() {
				items.push($(this).attr('item_id'));
			});
			$.post('/vault/story', {
				adventure_id: adventure_id,
				type: ui.item.parent().attr('type'),
				order: items
			}).done(function() {
			});
		}
	});

	$('div.sortable').find('div.handle').on('click', function(event) {
		event.stopPropagation();
		return false;
	});
}

$(document).ready(function() {
	cr_input_to_select();
	add_monster();

	sortable_events();

	$('div.item a > div.header').each(function() {
		var name = $(this).text();

		var pos = name.indexOf(']');
		if ((name.substring(0, 1) == '[') && (pos > 0)) {
			name = '<span class="section">' + name.substr(1);
			name = name.replace(']', '</span>');

			$(this).html(name);
		}
	});
});
