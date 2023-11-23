function click_anchor(obj) {
	document.location = $(obj).find('a').attr('href');
}

function rename_file(filename) {
	if ((filename_new = prompt('Rename ' + filename + ' to:', filename)) != null) {
		$.post('', {
			submit_button: 'Rename',
			filename: filename,
			filename_new: filename_new
		}).done(function(data) {
			$.each($('table.files tr td:nth-child(2) a'), function() {
				if ($(this).text() == filename) {
					$(this).text(filename_new);
					var parts = $(this).prop('href').split('/');
					var pos = (parts[parts.length - 1] == '') ? 2 : 1;
					parts[parts.length - pos] = encodeURIComponent(filename_new);
					$(this).prop('href', parts.join('/'));
				}
			});
		}).fail(function(data) {
			alert($(data.responseXML).find('result').text());
		});
	}
}

function edit_file(filename) {
	$.ajax({
		url: filename,
		dataType: "text",
		success:function(data) {
			var file = filename.replace(/^.*[\\\/]/, '');
			var form =
				'<p><input type="hidden" id="filename" value="' + file + '" />' +
				'<textarea id="editfile" class="form-control" onInput="javascript:text_changed=true">' + data + '</textarea></p>';
			text_changed = false;

			var dialog = $(form).windowframe({
				header: filename,
				width: 800,
				buttons: {
					'Save': function() {
						$.post('', {
							content: $('textarea#editfile').val(),
							filename: $('input#filename').val(),
							submit_button: 'SaveFile'
						}).done(function() {
							text_changed = false;
							$(this).close();
						}).fail(function(data) {
							alert($(data.responseXML).find('result').text());
						});
					},
					'Cancel': function() {
						$(this).close();
					}
				},
				close: function() {
					if (text_changed) {
						if (confirm("Discard text changes?") == false) {
							return false;
						}
					}
				}
			});
			dialog.open();
			$('textarea#editfile').focus();
		}
	});
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
	$('table.files tr.alter').on('contextmenu', function(event) {
		var file = $(this).find('td:nth-child(2)').text();
		var parts = file.split('.');

		var menu_entries = {};

		if (parts[1] == 'txt') {
			menu_entries['edit'] = { name:'Edit', icon:'fa-pencil' };
		}

		menu_entries['rename'] = { name:'Rename', icon:'fa-edit' };
		menu_entries['delete'] = { name:'Delete', icon:'fa-remove' };

		var handler = function(key, options) {

			switch (key) {
				case 'edit':
					var url = $(this).find('td a').attr('href');
					edit_file(url);
					break;
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

	$('table.files tr').find('a').on('click', function(e) {
		e.stopPropagation();
	});
});
