<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class password_controller extends Banshee\controller {
		private function show_password_form($key) {
			$this->view->open_tag("reset");
			$this->view->add_tag("key", $key);
			$this->view->add_tag("username", $_SESSION["reset_password_username"]);
			$this->view->close_tag();
		}

		public function execute() {
			if ($this->model->key_okay($_GET["key"] ?? null)) {
				/* Step 3: show password form
				 */
				$this->show_password_form($_GET["key"]);
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Reset password") {
					/* Step 2: send password link
					 */
					if (($user = $this->model->get_user($_POST["username"], $_POST["email"])) != false) {
						$_SESSION["reset_password_key"] = random_string(20);
						$_SESSION["reset_password_username"] = $_POST["username"];

						$this->model->send_password_link($user, $_SESSION["reset_password_key"]);
					}
					$this->view->add_tag("link_sent");
				} else if ($_POST["submit_button"] == "Save password") {
					/* Step 4: Save password
					 */
					if ($this->model->key_okay($_POST["key"]) == false) {
						$this->view->add_tag("request");
					} else if ($this->model->password_okay($_SESSION["reset_password_username"], $_POST) == false) {
						$this->show_password_form($_POST["key"]);
					} else if ($this->model->save_password($_SESSION["reset_password_username"], $_POST) == false) {
						$this->view->add_message("Error while saving password.");
						$this->show_password_form($_POST["key"]);
					} else {
						$this->view->add_tag("result", "Password has been saved.", array("url" => ""));
						unset($_SESSION["reset_password_key"]);
						unset($_SESSION["reset_password_username"]);
					}
				} else {
					$this->view->add_tag("request");
				}
			} else {
				/* Step 1: show request form
				 */
				$this->view->add_tag("request", null, array("previous" => $this->page->previous));
			}
		}
	}
?>
