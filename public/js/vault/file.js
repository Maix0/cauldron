function click_anchor(obj) {
	document.location = $(obj).find('a').attr('href');
}

function rename_file(filename_current) {
	if ((filename_new = prompt('Rename ' + filename_current + ' to:', filename_current)) != null) {
		$.post('', {
			submit_button: 'Rename',
			filename_current: filename_current,
			filename_new: filename_new
		}).done(function(data) {
			$.each($('table.files tr td:nth-child(2) a'), function() {
				if ($(this).text() == filename_current) {
					$(this).text(filename_new);
					var parts = $(this).prop('href').split('/');
					parts[parts.length - 1] = encodeURIComponent(filename_new);
					$(this).prop('href', parts.join('/'));
				}
			});
		}).fail(function(data) {
			alert($(data.responseXML).find('result').text());
		});
	}
}

function delete_file(filename) {
	if (confirm('Delete ' + filename + '?')) {
		$.post('', {
			submit_button: 'Delete',
			filename: filename,
		}).done(function() {
			document.location = document.location;
		}).fail(function(data) {
			alert($(data.responseXML).find('result').text());
		});
	}
}

$(document).ready(function() {
	$('table.files tr.alter').contextmenu(function(event) {
		var menu_entries = {
			'rename': { name:'Rename', icon:'fa-edit' },
			'delete': { name:'Delete', icon:'fa-remove' }
		};

		var handler = function(key, options) {
			var file = $(this).find('td:nth-child(2)').text();

			switch (key) {
				case 'rename':
					rename_file(file);
					break;
				case 'delete':
					delete_file(file);
					break;
			}
		};

		show_context_menu($(this), event, menu_entries, handler, 100);
		return false;
	});

	$('table.files tr').find('a').click(function(e) {
		e.stopPropagation();
	});
});
