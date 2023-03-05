<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_settings_controller extends Banshee\tablemanager_controller {
		protected $name = "Setting";
		protected $back = "vault";
		protected $icon = "settings.png";
		protected $page_size = 25;
		protected $pagination_links = 7;
		protected $pagination_step = 1;
		protected $foreign_null = "---";

		protected function show_item_form($item) {
			if (is_false(DEBUG_MODE) && isset($item["id"])) {
				if (($current = $this->model->get_item($item["id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return false;
				}

				$this->view->add_javascript("vault/settings.js");

				$this->view->open_tag("label");
				$this->view->add_tag("key", $current["key"]);
				$this->view->add_tag("type", $current["type"]);
				$this->view->close_tag();
			}

			parent::show_item_form($item);
		}

		protected function handle_submit() {
			if (is_false(DEBUG_MODE)) {
				if (isset($_POST["id"]) == false) {
					return;
				}
				if (($item = $this->model->get_item($_POST["id"])) == false) {
					return;
				}

				$_POST["key"] = $item["key"];
				$_POST["type"] = $item["type"];
			}

			parent::handle_submit();

			$cache = new \Banshee\Core\cache($this->db, "banshee_settings");
			$cache->store("last_updated", time(), 365 * DAY);
		}
	}
?>
