function cauldey_says(message) {
	message = '<div class="cauldey"><div class="message">' + message + '</div><img src="/images/cauldey_chat.png" class="chat" /></div>';

	$('body').append(message);
	var cauldey = $('div.cauldey');

	cauldey.draggable({
		containment: 'body div.wrapper',
		handle: 'img.chat'
	});

	cauldey.css({
		position: 'fixed',
		top: '30px',
		right: '50px'
	});

	cauldey.find('span').on('mouseenter', function() {
		var object = $($(this).attr('object')).first();
		if (object.length == 0) {
			return;
		}

		var pos = object.offset();
		var width = Math.round(object.outerWidth());
		var height = Math.round(object.outerHeight());

		var padding = $(this).attr('padding');
		if (padding != undefined) {
			padding = parseInt(padding);

			if (isNaN(padding) == false) {
				pos.left -= padding;
				pos.top -= padding;
				width += 2 * padding;
				height += 2 * padding;
			}
		}

		var border = '<div class="cauldey_pointer" style="position:absolute; left:' + Math.round(pos.left) + 'px; ' +
		             'top:' + Math.round(pos.top) + 'px; width:' + width + 'px; height:' + height + 'px; ' +
		             'border:3px solid #ff0000; border-radius:10px; z-index:3;"></div>';

		$('body').append(border);
	});

	cauldey.find('span').on('mouseleave', function() {
		$('div.cauldey_pointer').remove();
	});
}

function cauldey_url(url) {
	return location.pathname.substr(0, url.length) == url;
}

function cauldey_title(title) {
	return $('h1').text() == title;
}

function cauldey_button(text) {
	if ($('.btn[value="' + text + '"]').length > 0) {
		return true;
	}

	var result = false;
	$('button.btn,a.btn').each(function() {
		if ($(this).text() == text) {
			result = true;
		}
	});

	return result;
}

$(document).ready(function() {
	if (cauldey_url('/adventure/') || cauldey_url('/spectate/')) {
		return;
	}

	$('html head').append('<link rel="stylesheet" type="text/css" href="/css/includes/cauldey.css" />');

	$.ajax('/cauldey').done(function(data) {
		var step = $(data).find('step').text();

		var dm_vault_text = '<p>Everything you need to create and maintain your adventures can be found in the Dungeon Master\'s Vault. To access it, click the <span object="ul.nav li:nth-child(6)">DM\'s Vault link</span> in the menu bar.</p>';

		if (step == 'adventure') {
			/* Adventure
			 */
			if (cauldey_title('Cauldey')) {
				cauldey_says('<p>Hi, my name is Cauldey. I\m here to help you creating your first adventure in Cauldron VTT.</p><p>This chat balloon can contain red dashed underlined words, which refurrrr to elements on the screen. Hover your mouse over <span object="img.chat">this text</span> to see me highlighted.</p><p>This chat balloon is moveable. Drag me to move the balloon when it overlaps controls, like the menu or help button.</p>' + dm_vault_text + '<p>And oh, I promise, I won\'t eat your mouse... for now...</p>');
			} else if (cauldey_url('/vault/adventure') == false) {
				if (cauldey_title('Dungeon Master\'s Vault')) {
					cauldey_says('This is the DM\'s Vault main menu. The first thing we are going to do is creating a new adventure. To do so, click on the <span object="a[href=\'/vault/adventure\']" padding="10">Adventures icon</span>.');
				} else {
					cauldey_says(dm_vault_text);
				}
			} else if (cauldey_url('/vault/adventure/market')) {
				cauldey_says('Welcome to the Cauldron VTT adventure market. Import one of the adventures or click the <span object="div.btn-group a">Back button</span> at the bottom of this page.');
			} else if (cauldey_button('Save adventure')) {
				cauldey_says('<p>Fill in this form. For now, the only thing you need to enter is the <span object="input#title">title</span>.</p><p>Again, the <span object="button.help" padding="5">Help button</span> shows you extra information.</p><p>When done, purrrress the <span object="div.btn-group input[type=submit]">Save adventure button</span>.</p>');
			} else {
				cauldey_says('<p>Click on the <span object="div.btn-group a">New adventure button</span> to open the adventure form. This allows you to add a new adventure to your adventures list.</p><p>A click on the <span object="button.help" padding="5">Help button</span> shows you extra information about this page.</p><p>You can also import one of the adventures from the <span object="div.btn-group:last-child a" padding="5">adventure market</span>, like the Curse of Strahd or the Lost Mine of Phandelver, but it\'s better to explore that option later.</p>');
			}
		} else if (step == 'map') {
			/* Map
			 */
			if (cauldey_url('/vault/map') == false) {
				if (cauldey_title('Dungeon Master\'s Vault')) {
					cauldey_says('Click on the <span object="a[href=\'/vault/map\']" padding="10">Maps icon</span>. There you can add battle maps to your adventure.');
				} else {
					cauldey_says(dm_vault_text);
				}
			} else if (cauldey_url('/vault/map/market')) {
				cauldey_says('Don\'t use this yet. Come back later.');
			} else if (cauldey_button('Save map')) {
				cauldey_says('<p>Fill in this form. You need at least to enter a <span object="input#title">title</span> and <span object="div.method-upload div.input-group">upload</span> a battle map image or <span object="div.method-url div.input-group">specify an URL</span> to an online battle map.</p><p>When you upload an image file, it will be saved in your resources, which will be explained later.</p><p>To use a URL to an online battle map or to use one from your resources, select <span object="div.method span:nth-child(2)" padding="4">Specify URL to online map file</span>. Enter the image file URL or purrrress the <span object="input.map_browser">Browse resources button</span> to select a map from your resources.</p><p>The Fog of War setting is an advanced setting. After setting the grid, you can add walls, windows and doors to you map, which will have an effect to the shown fog of war. Leave it to Off when unsure.</p><p>When done, purrrress the <span object="div.btn-group input[type=submit]">Save map button</span>.</p>');
			} else {
				cauldey_says('<p>The next step is to add a battle map to your newly created adventure. To do so, click on the <span object="div.btn-group a">New map button</span> to open the map form. You can add as many maps as you want.</p><p>When you have multiple adventures, use the <span object="select">adventure selector</span> to switch to another adventure.</p><p>Cauldron VTT has a lot of ready-to-use maps in the <span object="div.btn-group:last-child a" padding="5">map market</span>, which can be imported via a single click. But that\'s also something for you to explore later.</p>');
			}
		} else if (step == 'done') {
			/* Done
			 */
			if (cauldey_button('Set grid size')) {
				cauldey_says('Set the grid for this map. Use the <span object="input.finder" padding="5">Grid finder</span> if you have trouble finding the right grid. Use it by drawing a 5x5 grid box somewhere on the map.');
			} else if (cauldey_url('/vault/map/arrange')) {
				cauldey_says('<p>This is where you can populate your map with tokens. Drag them from the <span object="div.library">library</span> onto your map. After placing a token on the map, right-click it for options.</p><p>Right-click anywhere on the map and select Create door, wall or window to create constructs, which will affect the fog of war. It will also affect to where players can move their token. The blinders and zones are explained in the <a href="/manual#creating" target="_blank">online manual</a>.</p><p>When you\'re done here, click on the <span object="button.open_menu" padding="5">Menu button</span> and select Back to go to your map list.</p>');
				var left = $('div.cauldey').css('left');
				left = parseInt(left.substr(0, left.length - 2)) - 200;
				$('div.cauldey').css('left', left + 'px');
			} else if (cauldey_button('New map')) {
				cauldey_says('<p>You can add another map if want or click the <span object="div.btn-group a:nth-child(2)">Back button</span> to go to the DM\'s Vault main menu and explore the other options.</p><p>To add players to your adventure, click on the Players icon in the DM\'s Vault main menu. Open its help function for further information.</p><p>Perhaps now is a good moment to explore the <span object="div.btn-group:last-child a" padding="5">map market</span>.</p>');
			} else if (cauldey_title('Dungeon Master\'s Vault')) {
				cauldey_says('<p>Now it\'s time to explore the other options of the DM\'s Vault. Select any of the icons and, when available, use the Help button for information about that page. Don\'t forget to take a look at the <span object="a[href=\'/vault/players\']" padding="10">Players option</span>. You need it to add players to your adventure.</p><p>Read the <span object="ul.nav li:nth-child(4)">online manual</span> to learn more about Cauldron VTT. Urge your players to do the same before the start of your first session.</p><p>Click <a href="/cauldey">here</a> when you no longer need my help.</p>');
			} else if (cauldey_title('Map market')) {
				cauldey_says('Welcome to the Cauldron VTT map market. Import one of the maps or click the <span object="div.btn-group a">Back button</span> at the bottom of this page.');
			} else if (cauldey_button('New token')) {
				cauldey_says('This is your token collection. Click the <span object="div.btn-group a">New token button</span> to add a new token to your collection.');
			} else if (cauldey_title('Resources')) {
				cauldey_says('<p>This is where you upload content to Cauldron VTT. It\'s also the place where you manage the content that\'s uploaded via other pages.</p><p>When you create a map and upload a map image/video file from there, it will be placed in the maps directory. It\'s better to create a subdirectory per adventure in the maps directory, upload your maps image/video files there and when creating a new map, select one from the resources. That keeps the maps directory organized.</p>');
			} else if (cauldey_title('Player assignment')) {
				cauldey_says('<p>This is where you add player characters to your adventure. Players have to <span object="ul.nav li:nth-child(2)">create a character</span> first of course. Be aware that a player character can only be active in one adventure at a time.</p><p>The <span object="button.help" padding="5">help function</span> describes everything you need to know.</p>');
			} else if (cauldey_title('Cauldey')) {
				cauldey_says('I hope my help was useful. I wish, yes, that level 9 conjuration spell, that you and your players have many happy and exciting adventures while using Cauldron VTT. And now, your mouse please...');
				$('body').css('cursor', 'url(/images/mouse.png), auto');
				$('img.chat').on('mouseover', function() {
					$('div.cauldey div.message').html('Thank you, that was delicious!<br /><br /><br />');
					$('body').css('cursor', '');
				});
			} else if (cauldey_url('/vault') && cauldey_button('Help')) {
				cauldey_says('The <span object="button.help" padding="5">help function</span> gives you more information about this page.');
			} else if (cauldey_url('/vault')) {
				cauldey_says('Purrrr.');
			}
		}
	});
});
