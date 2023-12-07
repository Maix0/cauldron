<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class account_model extends Banshee\model {
		private $hashed = null;

		public function get_user($user_id) {
			$query = "select fullname, email".
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
				$parts = explode("|", chop($line));
				if (count($parts) < 4) {
					continue;
				}

				list($ip, $timestamp, $user_id, $message) = $parts;

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

		public function account_okay($account) {
			$result = true;

			if (trim($account["fullname"]) == "") {
				$this->view->add_message("Fill in your name.");
				$result = false;
			}

			if (valid_email($account["email"]) == false) {
				$this->view->add_message("Invalid e-mail address.");
				$result = false;
			} else if (($check = $this->db->entry("users", $account["email"], "email")) != false) {
				if ($check["id"] != $this->user->id) {
					$this->view->add_message("E-mail address already exists.");
					$result = false;
				}
			}

			if (strlen($account["current"]) > PASSWORD_MAX_LENGTH) {
				$this->view->add_message("Current password is too long.");
				$result = false;
			} else if (password_verify($account["current"], $this->user->password) == false) {
				$this->view->add_message("Current password is incorrect.");
				$result = false;
			}

			if ($account["password"] != "") {
				if (is_secure_password($account["password"], $this->view) == false) {
					$result = false;
				} else if ($account["password"] != $account["repeat"]) {
					$this->view->add_message("New passwords do not match.");
					$result = false;
				} else if (password_verify($account["password"], $this->user->password)) {
					$this->view->add_message("New password must be different from current password.");
					$result = false;
				}

			}

			if (is_true(USE_AUTHENTICATOR)) {
				if ((strlen($account["authenticator_secret"]) > 0) && ($account["authenticator_secret"] != str_repeat("*", 16))) {
					if (valid_input($account["authenticator_secret"], Banshee\authenticator::BASE32_CHARS, 16) == false) {
						$this->view->add_message("Invalid authenticator secret.");
						$result = false;
					}
				}
			}

			return $result;
		}

		public function update_account($account) {
			$keys = array("fullname", "email", "keyboard");

			if ($account["password"] != "") {
				array_push($keys, "password");
				array_push($keys, "status");

				$account["password"] = password_hash($account["password"], PASSWORD_ALGORITHM);
				$account["status"] = USER_STATUS_ACTIVE;
			}

			if (is_true(USE_AUTHENTICATOR)) {
				if ($account["authenticator_secret"] != str_repeat("*", 16)) {
					array_push($keys, "authenticator_secret");
					if (trim($account["authenticator_secret"]) == "") {
						$account["authenticator_secret"] = null;
					}
				}
			}

			return $this->db->update("users", $this->user->id, $account, $keys) !== false;
		}

		public function delete_okay($account) {
			$result = true;

			if (strlen($account["current"]) > PASSWORD_MAX_LENGTH) {
				$this->view->add_message("Current password is too long.");
				$result = false;
			} else if (password_verify($account["current"], $this->user->password) == false) {
				$this->view->add_message("Current password is incorrect.");
				$result = false;
			}

			$query = "select count(*) as count from adventures where dm_id=%d";
			if (($adventures = $this->db->execute($query, $this->user->id)) == false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if ($adventures[0]["count"] > 0) {
				$this->view->add_message("This account contains adventures.");
				$result = false;
			}

			return $result;
		}

		public function delete_account() {
			if ($this->user->is_admin) {
				return false;
			}

			$organisation_id = $this->user->organisation_id;

			if ($this->borrow("vault/user")->delete_user($this->user->id) === false) {
				return false;
			}

			$query = "select count(*) as count from users where organisation_id=%d";
			if (($users = $this->db->execute($query, $organisation_id)) === false) {
				return true;
			}

			if ($users[0]["count"] == 0) {
				$this->borrow("vault/organisation")->delete_organisation($organisation_id);
			}

			return true;
		}
	}
?>
