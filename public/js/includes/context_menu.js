function show_context_menu(obj, event, menu_entries, callback, options) {
	var settings = {
		root: 'body',
		z_index: 1,
		main: true
	};

	Object.assign(settings, options);

	var menu_x = event.clientX;
	var menu_y = event.clientY;

	var flip_y = (event.clientY > (window.innerHeight / 2));
	var flip_x = (event.clientX + 450 > window.innerWidth);

	var type = (settings.main) ? 'main' : 'sub';
	var menu = $('<div class="context_menu context_menu_' + type + '" style="position:absolute; display:none; z-index:' + settings.z_index + ';"></div>');

	for (const [key, value] of Object.entries(menu_entries)) {
		if (value == '-') {
			menu.append('<div><hr /></div>');
		} else {
			var item = $('<div class="option" option="' + key + '"><span class="fa ' + value.icon + '"></span><span class="text">' + value.name + '</span></div>');
			if (settings.main) {
				if (value.items != undefined) {
					item.addClass('submenu');
					item.hover(function() {
						var item_pos = $(this).position();
						var e = {
							clientX: event.clientX + 200,
							clientY: event.clientY + item_pos.top
						};

						if (flip_y) {
							e.clientY -= $(this).parent().outerHeight();
						}

						if (flip_x) {
							e.clientX -= 200;
						}

						$(settings.root + ' div.context_menu_sub').remove();

						var opt = Object.assign({}, options, { main: false });

						show_context_menu(obj, e, value.items, callback, opt);
					});
				} else {
					item.hover(function() {
						$(settings.root + ' div.context_menu_sub').remove();
					});
				}
			}
			menu.append(item);
		}
	};

	menu.find('div.option').on('mousedown', function(event) {
		if (event.button != 0) {
			return false;
		}

		if ($(this).hasClass('submenu')) {
			return false;
		}

		var option = $(this).attr('option');
		$('body div.context_menu').remove();

		callback.call(obj, option);

		return false;
	});

	if (settings.main) {
		$(settings.root + ' div.context_menu').remove();
	}
	$(settings.root).append(menu);

	var root_pos = $(settings.root).position();

	var scroll = settings.root == 'body' ? 'html' : settings.root;
	var scroll_y = Math.round($(scroll).scrollTop());

	menu_y += scroll_y - Math.round(root_pos.top) - 1;

	var scroll_x = Math.round($(scroll).scrollLeft());
	menu_x += scroll_x - Math.round(root_pos.left);

	if (flip_y) {
		menu_y -= menu.outerHeight();
	}

	if (flip_x) {
		menu_x -= 200;
	}

	menu.css('left', menu_x + 'px');
	menu.css('top', menu_y + 'px');
	menu.css('display', '');

	$(document).one('mousedown', function() {
		$('body div.context_menu').remove();
		return false;
	});
}
