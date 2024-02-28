<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class register_controller extends Banshee\splitform_controller {
		protected $button_submit = "Register";
		protected $back_page = "";
		protected $ask_organisation = null;
		protected $prevent_repost = true;

		protected function prepare_code($data) {
			if (($_SESSION["register_email"] ?? null) == $data["email"]) {
				return;
			}

			$_SESSION["register_code"] = random_string(20);

			$email = new cauldron_email("Verification code for the ".$this->settings->head_title." website",
				$this->settings->webmaster_email, "Cauldron VTT");
			$email->set_message_fields(array("CODE" => $_SESSION["register_code"]));
			$email->message(file_get_contents("../extra/register.txt"));
			$email->send($data["email"]);

			$_SESSION["register_email"] = $data["email"];
			$this->model->set_value("code", "");
		}

		protected function prepare_account($data) {
			$this->view->add_javascript("register.js");

			if (empty($data["username"])) {
				$this->model->set_value("username", strtolower($data["email"]));
			}
		}

		public function execute() {
			if ($this->user->logged_in) {
				$this->view->add_tag("result", "You already have an account.", array("url" => ""));
				return;
			}

			if ($_SERVER["REQUEST_METHOD"] == "GET") {
				$this->model->reset_form_progress();
			} else if ((($_POST["splitform_current"] ?? 0) == 2) && isset($_POST["username"])) {
				$_POST["username"] = strtolower($_POST["username"]);
			}

			parent::execute();
		}
	}
?>
