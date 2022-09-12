<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class banshee_login_controller extends Banshee\controller {
		public function execute() {
			header("Status: 401");

			$this->view->description = "Login";
			$this->view->keywords = "login";
			$this->view->title = "Login";

			$this->view->add_javascript("banshee/login.js");

			$bind_ip = ($_SERVER["REQUEST_METHOD"] == "POST") ? ($_POST["bind_ip"] ?? null) : false;

			$this->view->open_tag("login", array(
				"authenticator" => show_boolean(USE_AUTHENTICATOR),
				"password"      => show_boolean(module_exists("password")),
				"register"      => show_boolean(module_exists("register")),
				"bind_ip"       => show_boolean($bind_ip)));

			$this->view->add_tag("url", $_SERVER["REQUEST_URI"]);
			$previous = in_array($this->page->previous, array("password", "register")) ? "" : $this->page->previous;
			$this->view->add_tag("previous", $previous);

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				$this->view->add_tag("username", $_POST["username"] ?? "");
			}

			$this->view->add_tag("remote_addr", $_SERVER["REMOTE_ADDR"]);

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if (($_POST["submit_button"] ?? null) == "Login") {
					if (strpos($_POST["username"], "'") !== false) {
						$this->view->add_message("Sorry, this application does not support SQL injection.");
						$this->user->log_action("SQL injection attempt");
					} else {
						$this->view->add_message("Login incorrect");
					}
				} else {
					#$this->view->add_message("Session expired. Login to continue your previous submit.");
					$_POST["postdata"] = base64_encode(json_encode($_POST));
				}

				if (isset($_POST["postdata"])) {
					$this->view->add_tag("postdata", $_POST["postdata"]);
				}
			}

			$this->view->close_tag();
		}
	}
?>
