<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_menu_controller extends Banshee\controller {
		private function show_menu($menu) {
			if (is_array($menu) == false) {
				$menu = array();
			}

			$this->view->open_tag("branch");
			foreach ($menu as $item) {
				$this->view->open_tag("item");
				$this->view->add_tag("text", $item["text"]);
				$this->view->add_tag("link", $item["link"]);
				if (isset($item["submenu"])) {
					$this->show_menu($item["submenu"]);
				}
				$this->view->close_tag();
			}
			$this->view->close_tag();
		}

		private function show_menu_form($menu) {
			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("banshee/jquery.menueditor.js");
			$this->view->add_javascript("cms/menu.js");

			$this->view->add_css("banshee/menueditor.css");

			$this->view->open_tag("edit");
			$this->show_menu($menu);
			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				/* Update menu
				 */
				if ($this->model->menu_oke($_POST["menu"]) == false) {
					$this->show_menu_form($_POST["menu"]);
				} else if ($this->model->update_menu($_POST["menu"]) == false) {
					$this->view->add_system_warning("Error while updating menu.");
				} else {
					$this->view->add_system_message("The menu has been updated.");
					$this->user->log_action("menu updated");
					header("X-Hiawatha-Cache-Remove: all");

					if (is_true(MENU_PERSONALIZED)) {
						$cache = new \Banshee\Core\cache($this->db, "banshee_menu");
						$cache->store("last_updated", time(), 365 * DAY);
					}

					$this->show_menu_form($_POST["menu"]);
				}
			} else {
				/* Show menu
				 */
				if (($menu = $this->model->get_menu()) === false) {
					$this->view->add_tag("result", "Error loading menu.");
				} else {
					$this->show_menu_form($menu);
				}
			}
		}
	}
?>
