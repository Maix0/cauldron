/* jQuery plugin template
 */
(function($) {
	var pluginName = 'myPlugin';
	var element;
	var settings;
	var defaults = {
		key: 'value',
	};

	/* Constructor
	 */
	var plugin = function(el, options) {
		element = $(el);
		settings = $.extend({}, defaults, options);
	};

	var private_function = function() {
	};

	var public_function = function() {
		return this;
	};

	/* JQuery prototype
	 */
	$.fn[pluginName] = function(options) {
		return this.each(function() {
			(new plugin(this, options));
		});
	};

	$.fn.extend({
		interface: public_function
	});
})(jQuery);
