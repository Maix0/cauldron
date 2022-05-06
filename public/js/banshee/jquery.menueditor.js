/* Copyright (C) by Hugo Leisink <hugo@leisink.net>
 * This file is part of the Banshee PHP framework
 * https://www.banshee-php.org/
 *
 * Licensed under The MIT License
 */

(function($) {
	var pluginName = 'menuEditor';
	var element;
	var settings;
	var defaults = {
		max_depth: 3
	};

	var h_insert_node = '<input type="button" value="Insert" class="insert btn btn-default">';
	var h_new_node =    '<li><input type="text" placeholder="Text" class="form-control"><input type="text" placeholder="Link" class="form-control"></li>';
	var h_new_buttons = '<input type="button" value="+" title="Add node" class="btn btn-default btn-xs add_node">' +
	                    '<input type="button" value="&rdsh;" title="Add branch" class="btn btn-default btn-xs add_branch">' +
	                    '<input type="button" value="&sc;" title="Make branch" class="btn btn-default btn-xs make_branch">' +
	                    '<input type="button" value="&Cross;" title="Delete node" class="btn btn-default btn-xs delete_node">';

	/* Constructor
	 */
	var plugin = function(el, options) {
		element = $(el);
		settings = $.extend({}, defaults, options);

		if (element.prop('tagName') != 'UL') {
			return null;
		}

		element.find('li').each(function() {
			$(this).find('input:nth-child(2)').first().after(new_buttons());
		});

		var b_insert_node = $(h_insert_node);
		b_insert_node.bind('click', function(e) { insert_node(); });
		element.before(b_insert_node);

		element.addClass('menu-editor');

		element.addClass('sortable');
		element.find('ul').addClass('sortable');
		make_editor_sortable();

		element.parent('form').bind('submit', function(e) { menu_submit() });

		show_hide_buttons();

		return $(this);
	};

	/* Show or hide buttons
	 */
	var show_hide_buttons = function(start = element, depth = 0) {
		if (depth == 0) {
			$(start).find('input.btn').prop('disabled', false);
		}

		$(start).children('li').each(function() {
			var buttons = $(this).find('span.buttons');

			if ($(this).prev().prop('tagName') != 'LI') {
				$(this).children('span').find('input.make_branch').prop('disabled', true);
			}

			if (depth >= settings.max_depth) {
				$(this).children('span').find('input.add_branch').prop('disabled', true);
				$(this).children('span').find('input.make_branch').prop('disabled', true);
			}

			$(this).children('ul').each(function() {
				$(this).parent().children('span').find('input.add_branch').prop('disabled', true);
				show_hide_buttons($(this), depth + 1);
			});
		});
	}

	/* Calculate depth
	 */
	var node_depth = function(item) {
		var depth = 0;

		var node = $(item).parent().parent().parent();
		while (node.prop('tagName') == 'UL') {
			node = node.parent().parent();
			depth++;
		}

		return depth;
	}

	/* Return all buttons
	 */
	var new_buttons = function() {
		var buttons = $('<span class="buttons">' + h_new_buttons + '</span>');
		buttons.find('input.add_node').bind('click', function(e) { add_node(this); });
		buttons.find('input.delete_node').bind('click', function(e) { delete_node(this); });
		buttons.find('input.add_branch').bind('click', function(e) { add_branch(this); });
		buttons.find('input.make_branch').bind('click', function(e) { make_branch(this); });

		return buttons;
	};

	/* Insert node at top
	 */
	var insert_node = function() {
		var node = $(h_new_node);
		node.append(new_buttons());
		element.prepend(node);
		show_hide_buttons();
	};

	/* Add node
	 */
	var add_node = function(item) {
		var node = $(h_new_node);
		node.append(new_buttons());
		$(item).parent().parent().after(node);

		show_hide_buttons();
		make_editor_sortable();
	};

	/* Delete node
	 */
	var delete_node = function(item) {
		li = $(item).parent().parent();
		ul = li.parent();

		if (li.find('ul').length > 0) {
			if (confirm('Delete branch?') == false) {
				return;
			}
		}
		li.remove();

		remove_empty_ul();
		show_hide_buttons();
	};

	/* Add branch
	 */
	var add_branch = function(item) {
		var li = $(item).parent().parent();
		var branch = $('<ul class="sortable">' + h_new_node + '</ul>');
		branch.find('li').append(new_buttons());
		li.append(branch);

		show_hide_buttons();
		make_editor_sortable();
	};

	/* Add branch
	 */
	var make_branch = function(item) {
		var prev = $(item).parent().parent().prev();
		var branch = $(item).parent().parent().detach();

		if ($(prev).find('ul').length == 0) {
			var ul = $('<ul class="sortable"></ul>').append(branch);
			$(prev).append(ul);
		} else {
			$(prev).find('ul').first().append(branch);
		}

		sorting_done();
		make_editor_sortable();
	}

	/* Remove empty branches
	 */
	var remove_empty_ul = function() {
		element.find('ul').each(function() {
			if ($(this).find('li').length == 0) {
				$(this).remove();
			}
		});
	}

	/* Sorting done
	 */
	var sorting_done = function(event, ui) {
		remove_empty_ul();
		show_hide_buttons();
	}

	/* Make menu editor sortable
	 */
	var make_editor_sortable = function() {
		element.sortable({ connectWith:'ul.sortable', axis:'y', update:sorting_done });
		element.find('ul.sortable').sortable({ connectWith:'ul.sortable', axis:'y', update:sorting_done });
	};

	/* Give name to elements
	 */
	var give_name = function(elems, current) {
		var i = 0;
		elems.children('li').each(function() {
			var pos = '[' + i + ']';
			$(this).find('input[type=text]:nth-child(1)').prop('name', 'menu' + current + pos + '[text]');
			$(this).find('input[type=text]:nth-child(2)').prop('name', 'menu' + current + pos + '[link]');
			$(this).children('ul').each(function() {
				give_name($(this), current + pos + '[submenu]');
			});
			i++;
		});
	}

	/* Menu submit handler
	 */
	var menu_submit = function() {
		give_name(element, '');
	};

	/* JQuery prototype
	 */
	$.fn[pluginName] = function(options) {
		return this.each( function () {
			(new plugin(this, options));
		}); // this.each
	};
}(jQuery));
