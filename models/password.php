<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class password_model extends Banshee\model {
		public function get_user($username, $email) {
			$query = "select * from users where username=%s and email=%s";

			if (($result = $this->db->execute($query, $username, $email)) == false) {
				return false;
			}

			return $result[0];
		}

		public function key_okay($key) {
			return (empty($key) == false) && ($key == $_SESSION["reset_password_key"]);
		}

		public function send_password_link($user, $key) {
			$message = file_get_contents("../extra/password.txt");
			$replace = array(
				"FULLNAME" => $user["fullname"],
				"HOSTNAME" => $_SERVER["SERVER_NAME"],
				"PROTOCOL" => $_SERVER["HTTP_SCHEME"],
				"KEY"      => $key);

			$email = new \Banshee\Protocol\email("Reset password at ".$_SERVER["SERVER_NAME"], $this->settings->webmaster_email);
			$email->set_message_fields($replace);
			$email->message($message);
			$email->send($user["email"], $user["fullname"]);
		}

		public function password_okay($username, $password) {
			$result = true;

			if (is_secure_password($password["password"], $this->view) == false) {
				$result = false;
			} else if ($password["password"] != $password["repeat"]) {
				$this->view->add_message("Passwords are not the same.");
				$result = false;
			}

			return $result;
		}

		public function save_password($username, $password) {
			if ($username == "") {
				return false;
			}

			$password["password"] = password_hash($password["password"], PASSWORD_ALGORITHM);

			$query = "update users set password=%s where username=%s";

			return $this->db->query($query, $password["password"], $username) != false;
		}
	}
?>
