<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	/* Because the model file is loaded before any output is generated,
	 * it is used to handle the login submit.
	 */

	$login_successful = false;
	if (($_SERVER["REQUEST_METHOD"] == "POST") && (($_POST["submit_button"] ?? null) == "Login")) {
		/* Login via password
		 */
		$_POST["username"] = strtolower($_POST["username"]);

		if ($_user->login_password($_POST["username"], $_POST["password"], $_POST["code"] ?? null)) {
			if (is_true($_POST["bind_ip"] ?? null)) {
				$_session->bind_to_ip();
			}

			$post_protection = new \Banshee\POST_protection($_page, $_user, $_view);
			if (isset($_POST["postdata"]) == false) {
				$post_protection->register_post();

				$_SERVER["REQUEST_METHOD"] = "GET";
				$_POST = array();
			} else if (is_true($_POST["repost"])) {
				$token = $_POST[$post_protection->csrf_key];
				$_POST = json_decode(base64_decode($_POST["postdata"]), true);
				$_POST[$post_protection->csrf_key] = $token;
			}

			$login_successful = true;
		} else {
			if (valid_input($_POST["username"], VALIDATE_LETTERS."@.", VALIDATE_NONEMPTY)) {
				$_user->log_action("login failed for username %s", $_POST["username"]);
			} else {
				$_user->log_action("login failed, possibly the password was entered as the username");
			}
		}
	} else if (isset($_GET["login"])) {
		/* Login via one time key
		 */
		if ($_user->login_one_time_key($_GET["login"])) {
			$login_successful = true;
		}
	} else if (($_SERVER["HTTPS"] == "on") && isset($_SERVER[TLS_CERT_SERIAL_VAR])) {
		/* Login via client SSL certificate
		 */
		if ($_user->login_ssl_auth($_SERVER[TLS_CERT_SERIAL_VAR])) {
			$login_successful = true;
		}
	}

	/* Pre-login actions
	 */
	if ($login_successful) {
		/* Load requested page
		 */
		if (($next_page = ltrim($_page->url, "/")) == "") {
			$next_page = $_settings->start_page;
		}

		$_page->select_module($next_page);

		if ($_page->module != LOGIN_MODULE) {
			if (file_exists($file = "../models/".$_page->module.".php")) {
				include($file);
			}
		}

		/* Show new mail notification
		 */
		if (module_exists("mailbox")) {
			$query = "select count(*) as count from mailbox where to_user_id=%d and %S=%d";
			if (($result = $_database->execute($query, $_user->id, "read", NO)) !== false) {
				$count = $result[0]["count"];
				if ($count > 0) {
					$_view->add_system_message("You have %d unread message(s) in your mailbox.", $count);
				}
			}
		}
	}
?>
