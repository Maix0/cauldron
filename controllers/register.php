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

		protected function prepare_code($data) {
			if ($_SESSION["register_email"] == $data["email"]) {
				return;
			}

			$_SESSION["register_code"] = random_string(20);

			$email = new \Banshee\Protocol\email("Verification code for the ".$this->settings->head_title." website");
			$email->set_message_fields(array(
				"CODE"    => $_SESSION["register_code"],
				"WEBSITE" => $this->settings->head_title));
			$email->message(file_get_contents("../extra/register.txt"));
			$email->send($data["email"]);

			$_SESSION["register_email"] = $data["email"];
			$this->model->set_value("code", "");
		}

		public function execute() {
			if ($this->user->logged_in) {
				$this->view->add_tag("result", "You already have an account.", array("url" => ""));
				return;
			}

			if ($_SERVER["REQUEST_METHOD"] == "GET") {
				$this->model->reset_form_progress();
			}

			$this->view->add_tag("ask_organisation", show_boolean(DEFAULT_ORGANISATION_ID == 0));

			parent::execute();
		}
	}
?>
