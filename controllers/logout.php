<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class logout_controller extends Banshee\controller {
		public function execute() {
			if ($this->user->logged_in) {
				header("Status: 401");

				if (isset($_SESSION["user_switch"]) == false) {
					$this->user->logout();
					$url = $this->settings->start_page;
				} else {
					$this->user->log_action("switched back to self");
					$this->user->session->set_user_id($_SESSION["user_switch"]);
					unset($_SESSION["user_switch"]);
					unset($_SESSION["edit_game_id"]);
					$url = "vault/switch";
				}

				$this->view->add_tag("result", "You are now logged out.", array("url" => $url));
			} else {
				$this->view->add_tag("result", "You are not logged in.", array("url" => $this->settings->start_page));
			}
		}
	}
?>
