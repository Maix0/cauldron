<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class profile_model extends Banshee\model {
		private $hashed = null;

        public function get_user($user_id) {
			$query = "select fullname, email, avatar ".
			         "from users where id=%d limit 1";

			if (($users = $this->db->execute($query, $user_id)) == false) {
				return false;
			}

			return $users[0];
		}

		public function get_organisation() {
			if (($result = $this->db->entry("organisations", $this->user->organisation_id)) == false) {
				return false;
			}

			return $result["name"];
		}

		public function last_account_logs() {
			if (($fp = fopen("../logfiles/actions.log", "r")) == false) {
				return false;
			}

			$result = array();

			while (($line = fgets($fp)) !== false) {
				list($ip, $timestamp, $user_id, $message) = explode("|", chop($line));

				if ($user_id == "-") {
					continue;
				} else if ($user_id != $this->user->id) {
					continue;
				}

				array_push($result, array(
					"ip"        => $ip,
					"timestamp" => $timestamp,
					"message"   => $message));
				if (count($result) > 15) {
					array_shift($result);
				}
			}

			fclose($fp);

			return array_reverse($result);
		}

		public function profile_oke($profile) {
			$result = true;

			if (trim($profile["fullname"]) == "") {
				$this->view->add_message("Fill in your name.");
				$result = false;
			}

			if (valid_email($profile["email"]) == false) {
				$this->view->add_message("Invalid e-mail address.");
				$result = false;
			} else if (($check = $this->db->entry("users", $profile["email"], "email")) != false) {
				if ($check["id"] != $this->user->id) {
					$this->view->add_message("E-mail address already exists.");
					$result = false;
				}
			}

			if (strlen($profile["current"]) > PASSWORD_MAX_LENGTH) {
				$this->view->add_message("Current password is too long.");
				$result = false;
			} else if (password_verify($profile["current"], $this->user->password) == false) {
				$this->view->add_message("Current password is incorrect.");
				$result = false;
			}

			if ($profile["password"] != "") {
				if (is_secure_password($profile["password"], $this->view) == false) {
					$result = false;
				} else if ($profile["password"] != $profile["repeat"]) {
					$this->view->add_message("New passwords do not match.");
					$result = false;
				} else if (password_verify($profile["password"], $this->user->password)) {
					$this->view->add_message("New password must be different from current password.");
					$result = false;
				}

			}

			if (is_true(USE_AUTHENTICATOR)) {
				if ((strlen($profile["authenticator_secret"]) > 0) && ($profile["authenticator_secret"] != str_repeat("*", 16))) {
					if (valid_input($profile["authenticator_secret"], Banshee\authenticator::BASE32_CHARS, 16) == false) {
						$this->view->add_message("Invalid authenticator secret.");
						$result = false;
					}
				}
			}

			return $result;
		}

		public function update_profile($profile) {
			$keys = array("fullname", "email", "avatar", "signature");

			if ($profile["password"] != "") {
				array_push($keys, "password");
				array_push($keys, "status");

				$profile["password"] = password_hash($profile["password"], PASSWORD_ALGORITHM);
				$profile["status"] = USER_STATUS_ACTIVE;
			}

			if (is_true(USE_AUTHENTICATOR)) {
				if ($profile["authenticator_secret"] != str_repeat("*", 16)) {
					array_push($keys, "authenticator_secret");
					if (trim($profile["authenticator_secret"]) == "") {
						$profile["authenticator_secret"] = null;
					}
				}
			}

			return $this->db->update("users", $this->user->id, $profile, $keys) !== false;
		}

		public function delete_account() {
			if ($this->user->is_admin) {
				return false;
			}

			return $this->borrow("cms/user")->delete_user($this->user->id);
		}
	}
?>
