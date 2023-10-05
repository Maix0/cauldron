<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_controller extends Banshee\controller {
		public function execute() {
			$menu = array(
				"User accounts" => array(
					"Users"         => array("vault/user", "users.png"),
					"Invite"        => array("vault/invite", "invite.png"),
					"Roles"         => array("vault/role", "roles.png"),
					"Groups"        => array("vault/organisation", "organisations.png"),
					"Access"        => array("vault/access", "access.png"),
					"User switch"   => array("vault/switch", "switch.png")),
				"Adventure creation" => array(
					"Tokens"        => array("vault/token", "token.png"),
					"Resources"     => array("vault/resources", "resources.png"),
					"Adventures"    => array("vault/adventure", "adventure.png"),
					"Maps"          => array("vault/map", "map.png"),
					"Collectables"  => array("vault/collectable", "collectables.png"),
					"Players"       => array("vault/players", "players.png"),
					"Journal"       => array("vault/journal", "journal.png"),
					"Story"         => array("vault/story", "story.png")),
				"System" => array(
					"Files"         => array("vault/file", "file.png"),
					"Menu"          => array("vault/menu", "menu.png"),
					"Pages"         => array("vault/page", "page.png"),
					"Action log"    => array("vault/action", "action.png"),
					"Settings"      => array("vault/settings", "settings.png"),
					"Reroute"       => array("vault/reroute", "reroute.png"),
					"API test"      => array("vault/apitest", "apitest.png")));

			/* Show warnings
			 */
			if ($this->user->is_admin) {
				if (module_exists("setup")) {
					$this->view->add_system_warning("The setup module is still available. Remove it from settings/public_modules.conf.");
				}
			}

			if ($this->page->parameter_value(0)) {
				$this->view->add_system_warning("The administration module '%s' does not exist.", $this->page->parameters[0]);
			}

			/* Show icons
			 */
			$access_list = page_access_list($this->db, $this->user);
			$private_modules = config_file("private_modules");

			$this->view->open_tag("menu");

			foreach ($menu as $title => $section) {
				$elements = array();

				foreach ($section as $text => $info) {
					list($module, $icon) = $info;

					if (in_array($module, $private_modules) == false) {
						continue;
					}

					if (isset($access_list[$module])) {
						$access = $access_list[$module] > 0;
					} else {
						$access = true;
					}

					if ($access) {
						array_push($elements, array(
							"text"   => $text,
							"module" => $module,
							"icon"   => $icon));
					}
				}

				$element_count = count($elements);
				if ($element_count > 0) {
					$this->view->open_tag("section", array("title" => $title));

					foreach ($elements as $element) {
						$this->view->add_tag("entry", $element["module"], array(
							"text"   => $element["text"],
							"icon"   => $element["icon"]));
					}

					$this->view->close_tag();
				}
			}

			$this->view->close_tag();
		}
	}
?>
