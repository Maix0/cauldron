function filter_level() {
	var level = $('div.filter select').val();

	$('div.market div.adventure').show();

	if (level != '') {
		$('div.market div.adventure[level!="' + level + '"]').hide();
	}
}

function filter_category() {
	var category = $('div.filter select').val();

	$('div.market div.map').show();

	if (category != '') {
		$('div.market div.map[category!="' + category + '"]').hide();
	}
}

$(document).ready(function() {
	if ($('div.adventures').length > 0) {
		filter_level();
	}

	if ($('div.market div.map').length == 0) {
		return;
	}

	filter_category();

	var preview_window = $('<div class="preview"><img src="" /></div>').windowframe({
		header: 'Map preview',
		top: 50,
		width: 1000
	});

	$('div.market div.map img').on('click', function() {
		var img = preview_window.find('img');

		if (img.attr('src') != $(this).attr('full')) {
			preview_window.find('img').attr('src', '');
			preview_window.find('img').attr('src', $(this).attr('full'));
		}

		preview_window.open();
	});
});
