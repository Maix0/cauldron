$(document).ready(function() {
	$('head').append('<link rel="stylesheet" type="text/css" href="/dice-box/stylesheet.css">');
	$('body').prepend('<div id="dice-box"></div>');
	$('head').append('<script type="module" src="/dice-box/dice-box.js">import dicebox_roll from "/dice-box/dice-box.js"; window.dicebox_roll = dicebox_roll;</script>');
});
