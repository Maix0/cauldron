<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class register_model extends Banshee\splitform_model {
		const MINIMUM_USERNAME_LENGTH = 4;
		const MINIMUM_FULLNAME_LENGTH = 4;

		protected $forms = array(
			"email"   => array("email"),
			"code"    => array("code"),
			"account" => array("fullname", "username", "password", "organisation"));

		public function reset_form_progress() {
			unset($_SESSION["register_email"]);
			unset($_SESSION["register_code"]);

			parent::reset_form_progress();
		}

		public function validate_email($data) {
			$result = true;

			if (valid_email($data["email"]) == false) {
				$this->view->add_message("Invalid e-mail address.");
				$result = false;
			}

			$query = "select * from users where email=%s";
			if ($this->db->execute($query, $data["email"]) != false) {
				$this->view->add_message("The e-mail address has already been used to register an account.");
				$result = false;
			}

			return $result;
		}

		public function validate_code($data) {
			if ($data["code"] != $_SESSION["register_code"]) {
				$this->view->add_message("Invalid verification code.");
				return false;
			}
			
			return true;
		}

		public function validate_account($data) {
			$result = true;

			if ((strlen($data["username"]) < self::MINIMUM_USERNAME_LENGTH) || (valid_input($data["username"], VALIDATE_NONCAPITALS, VALIDATE_NONEMPTY) == false)) {
				$this->view->add_message("Your username must consist of lowercase letters with a mimimum length of %d.", self::MINIMUM_USERNAME_LENGTH);
				$result = false;
			}

			$query = "select * from users where username=%s";
			if ($this->db->execute($query, $data["username"]) != false) {
				$this->view->add_message("The username is already taken.");
				$result = false;
			}

			if (is_secure_password($data["password"], $this->view) == false) {
				$result = false;
			}

			if (strlen($data["fullname"]) < self::MINIMUM_FULLNAME_LENGTH) {
				$this->view->add_message("The length of your name must be equal or greater than %d.", self::MINIMUM_FULLNAME_LENGTH);
				$result = false;
			}

			if (DEFAULT_ORGANISATION_ID == 0) {
				if (trim($data["organisation"] == "")) {
					$this->view->add_message("Fill in the group name.");
					$result = false;
				} else {
					$query = "select * from organisations where name=%s";
					if ($this->db->execute($query, $data["organisation"]) != false) {
						$this->view->add_message("The group name is already taken.");
						$result = false;
					}
				}
			}

			return $result;
		}

		public function process_form_data($data) {
			if (DEFAULT_ORGANISATION_ID == 0) {
				$organisation = array(
					"name"          => $data["organisation"],
					"max_resources" => $this->settings->default_max_resources);

				if ($this->borrow("cms/organisation")->create_organisation($organisation) == false) {
					$this->db->query("rollback");
					return false;
				}

				$organisation_id = $this->db->last_insert_id;
			} else {
				$organisation_id = DEFAULT_ORGANISATION_ID;
			}

			$user = array(
				"organisation_id" => $organisation_id,
				"username"        => $data["username"],
				"password"        => $data["password"],
			    "status"          => USER_STATUS_ACTIVE,
				"fullname"        => $data["fullname"],
				"email"           => $data["email"],
				"roles"           => array(USER_MAINTAINER_ROLE_ID, PLAYER_ROLE_ID, DUNGEON_MASTER_ROLE_ID));

			if ($this->borrow("cms/user")->create_user($user, true) == false) {
				$this->db->query("delete from organisations where id=%d", $organisation_id);
				return false;
			}

			$this->user->log_action("user %s registered", $data["username"]);

			unset($_SESSION["register_email"]);
			unset($_SESSION["register_code"]);

			$email = new \Banshee\Protocol\email("New account registered at ".$_SERVER["SERVER_NAME"], $this->settings->webmaster_email);
			$email->set_message_fields(array(
				"FULLNAME" => $data["fullname"],
				"EMAIL"    => $data["email"],
				"USERNAME" => $data["username"],
				"GROUP"    => $data["organisation"],
				"WEBSITE"  => $this->settings->head_title,
				"IP_ADDR"  => $_SERVER["REMOTE_ADDR"]));
			$email->message(file_get_contents("../extra/account_registered.txt"));
			$email->send($this->settings->webmaster_email);

			return true;
		}
	}
?>
