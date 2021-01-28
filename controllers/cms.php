<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_controller extends Banshee\controller {
		public function execute() {
			$menu = array(
				"Authentication & authorization" => array(
					"Users"         => array("cms/user", "users.png"),
					"Roles"         => array("cms/role", "roles.png"),
					"Organisations" => array("cms/organisation", "organisations.png"),
					"Access"        => array("cms/access", "access.png"),
					"User switch"   => array("cms/switch", "switch.png")),
				"Content" => array(
					"Files"         => array("cms/file", "file.png"),
					"Languages"     => array("cms/language", "language.png"),
					"Menu"          => array("cms/menu", "menu.png"),
					"Pages"         => array("cms/page", "page.png"),
					"Tokens"        => array("cms/token", "token.png"),
					"Games"         => array("cms/game", "game.png"),
					"Maps"          => array("cms/map", "map.png")),
				"System" => array(
					"Action log"    => array("cms/action", "action.png"),
					"Settings"      => array("cms/settings", "settings.png"),
					"Reroute"       => array("cms/reroute", "reroute.png"),
					"API test"      => array("cms/apitest", "apitest.png")));

			/* Show warnings
			 */
			if ($this->user->is_admin) {
				if (module_exists("setup")) {
					$this->view->add_system_warning("The setup module is still available. Remove it from settings/public_modules.conf.");
				}
			}

			if ($this->page->parameters[0] != null) {
				$this->view->add_system_warning("The administration module '%s' does not exist.", $this->page->parameters[0]);
			}

			/* Show icons
			 */
			if (is_false(MULTILINGUAL)) {
				unset($menu["Content"]["Languages"]);
			}

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
					if ($element_count <= 3) {
						$class = "col-xs-12 col-sm-6";
					} else if ($element_count <= 4) {
						$class = "col-xs-12 col-sm-12 col-md-6";
					} else {
						$class = "col-xs-12";
					}

					$this->view->open_tag("section", array(
						"title" => $title,
						"class" => $class));

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
