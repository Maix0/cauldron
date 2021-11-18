<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class register_model extends Banshee\model {
		const MINIMUM_USERNAME_LENGTH = 4;
		const MINIMUM_FULLNAME_LENGTH = 4;

		public function count_organisations() {
			$query = "select count(*) as count from organisations";

			if (($result = $this->db->execute($query)) === false) {
				return false;
			}

			return (int)$result[0]["count"];
		}

		private function create_signature($data) {
			return hash_hmac("sha256", json_encode($data), $this->settings->secret_website_code);
		}

		public function valid_signup($data) {
			$result = true;

			if ((strlen($data["username"]) < self::MINIMUM_USERNAME_LENGTH) || (valid_input($data["username"], VALIDATE_NONCAPITALS, VALIDATE_NONEMPTY) == false)) {
				$this->view->add_message("Your username must consist of lowercase letters with a mimimum length of %d.", self::MINIMUM_USERNAME_LENGTH);
				$result = false;
			}

			if (valid_email($data["email"]) == false) {
				$this->view->add_message("Invalid e-mail address.");
				$result = false;
			}

			if (trim($data["organisation"]) == "") {
				$this->view->add_message("Specify a group name.");
				$result = false;
			}

			if ($result == false) {
				return false;
			}

			if (is_secure_password($data["password"], $this->view) == false) {
				$result = false;
			}

			if (strlen($data["fullname"]) < self::MINIMUM_FULLNAME_LENGTH) {
				$this->view->add_message("The length of your name must be equal or greater than %d.", self::MINIMUM_FULLNAME_LENGTH);
				$result = false;
			}

			$query = "select * from users where username=%s or email=%s";
			if (($users = $this->db->execute($query, $data["username"], $data["email"])) === false) {
				$this->view->add_message("Error while validating sign up.");
				return false;
			}

			foreach ($users as $user) {
				if ($user["username"] == $data["username"]) {
					$this->view->add_message("The username is already taken.");
					$result = false;
				}

				if ($data["email"] != "") {
					if ($user["email"] == $data["email"]) {
						$this->view->add_message("The e-mail address has already been used to register an account.");
						$result = false;
					}
				}
			}

			return $result;
		}

		public function send_link($data) {
			$data = array(
				"username"     => $data["username"],
				"password"     => $data["password"],
				"email"        => strtolower($data["email"]),
				"fullname"     => $data["fullname"],
				"organisation" => $data["organisation"],
				"timestamp"    => time());
			$data["signature"] = $this->create_signature($data);

			$link = json_encode($data);

			$aes = new \Banshee\Protocol\AES256($this->settings->secret_website_code);
			if (($link = $aes->encrypt($link)) === false) {
				return false;
			}

			$email = new \Banshee\Protocol\email("Confirm account creation at ".$_SERVER["SERVER_NAME"], $this->settings->webmaster_email);
			$email->set_message_fields(array(
				"FULLNAME" => $data["fullname"],
				"HOSTNAME" => $_SERVER["SERVER_NAME"],
				"PROTOCOL" => $_SERVER["HTTP_SCHEME"],
				"LINK"     => $link));
			$email->message(file_get_contents("../extra/register.txt"));

			if ($email->send($data["email"], $data["fullname"]) == false) {
				return false;
			}

			return true;
		}

		public function sign_up($data) {
			$aes = new \Banshee\Protocol\AES256($this->settings->secret_website_code);
			if (($data = $aes->decrypt($data)) === false) {
				return false;
			}

			if (($data = json_decode($data, true)) === false) {
				return false;
			}

			if ($data["timestamp"] + HOUR < time()) {
				return false;
			}

			$signature = $data["signature"];
			unset($data["signature"]);
			if ($this->create_signature($data) != $signature) {
				return false;
			}

			if ($this->valid_signup($data) == false) {
				return false;
			}

			$user = array(
				"id"                   => null,
				"organisation_id"      => DEFAULT_ORGANISATION_ID,
				"username"             => $data["username"],
				"password"             => password_hash($data["password"], PASSWORD_ALGORITHM),
				"one_time_key"         => null,
				"cert_serial"          => 0,
			    "status"               => USER_STATUS_ACTIVE,
				"authenticator_secret" => null,
				"fullname"             => $data["fullname"],
				"email"                => $data["email"]);

			if ($this->db->query("begin") == false) {
				return false;
			}

			$organisation = array(
				"name"          => $data["organisation"],
				"max_resources" => $this->settings->default_max_resources);
			if ($this->borrow("cms/organisation")->create_organisation($organisation) == false) {
				$this->db->query("rollback");
				return false;
			}
			$user["organisation_id"] = $this->db->last_insert_id;

			if ($this->db->insert("users", $user) == false) {
				$this->db->query("rollback");
				return false;
			}
			$user_id = $this->db->last_insert_id;

			if (module_exists("forum")) {
				$data = array("user_id" => $user_id, "forum_topic_id" => null);
				$this->db->insert("forum_last_view", $data);
			}

			$this->user->log_action("user %s registered", $data["username"]);

			$roles = array(USER_MAINTAINER_ROLE_ID, PLAYER_ROLE_ID, DUNGEON_MASTER_ROLE_ID);
			foreach ($roles as $role_id) {
				if ($this->db->query("insert into user_role values (%d, %d)", $user_id, $role_id) == false) {
					$this->db->query("rollback");
					return false;
				}
			}

			if ($this->db->query("commit") === false) {
				return false;
			}

			$email = new \Banshee\Protocol\email("New account registered at ".$_SERVER["SERVER_NAME"], $this->settings->webmaster_email);
			$email->set_message_fields(array(
				"FULLNAME" => $data["fullname"],
				"EMAIL"    => $data["email"],
				"USERNAME" => $data["username"],
				"HOSTNAME" => $_SERVER["SERVER_NAME"],
				"IP_ADDR"  => $_SERVER["REMOTE_ADDR"]));
			$email->message(file_get_contents("../extra/account_registered.txt"));
			$email->send($this->settings->webmaster_email);

			return true;
		}
	}
?>
