function browse_local() {
	$.ajax('/cms/map').done(function(data) {
		var dialog =
			'<div class="overlay" onClick="javascript:$(this).remove()">' +
			'<div class="panel panel-default" onClick="javascript:event.stopPropagation();">' +
			'<div class="panel-heading">Maps<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$(this).parent().parent().parent().hide()"></span></div>' +
			'<div class="panel-body"><ul class="maps">';

		$(data).find('maps map').each(function() {
			dialog += '<li onClick="javascript:select_map($(this));">/' + $(this).text() + '</li>';
		});

		dialog += '</ul></div></div>';

		$('body').append(dialog);
		$('body div.overlay').show();
	});
}

function select_map(li) {
	$('input#url').val(li.text());
	li.parent().parent().parent().parent().remove();
}
