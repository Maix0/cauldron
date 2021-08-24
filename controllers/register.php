<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class register_controller extends Banshee\controller {
		private function show_form($data) {
			$this->view->record($data, "form", array("previous" => $this->page->previous));
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($this->model->valid_signup($_POST) == false) {
					$this->show_form($_POST);
				} else if ($this->model->send_link($_POST) == false) {
					$this->view->add_message("Error while sending confirmation e-mail.");
					$this->show_form($_POST);
				} else {
					$url = array("url" => "");
					$this->view->add_tag("result", "A confirmation e-mail has been sent to your e-mail address.", $url);
				}
			} else if (isset($_GET["confirmation"])) {
				if ($this->model->sign_up($_GET["confirmation"]) == false) {
					$this->view->add_tag("result", "An error occured while creating your account.");
				} else {
					$url = array("url" => "");
					$this->view->add_tag("result", "Your account has been created. You can now login.", $url);
				}
			} else {
				$data = array();
				$this->show_form($data);
			}
		}
	}
?>
