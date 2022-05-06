<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class session_model extends Banshee\model {
		public function get_sessions() {
			$now = date("Y-m-d H:i:s");
			$query = "select id, session_id, UNIX_TIMESTAMP(expire) as expire, ip_address, bind_to_ip, name from sessions ".
			         "where user_id=%d and expire>=%s order by name, ip_address";

			return $this->db->execute($query, $this->user->id, $now);
		}

		public function get_session($id) {
			$query = "select id, UNIX_TIMESTAMP(expire) as expire, ip_address, name ".
			         "from sessions where id=%d and user_id=%d and expire>=%s";

			if (($result = $this->db->execute($query, $id, $this->user->id, $now)) == false) {
				return false;
			}

			return $result[0];
		}

		public function session_oke($session) {
			$result = true;

			if ($this->settings->session_persistent) {
				if (strtotime($session["expire"]) < time()) {
					$this->view->add_message("The expire time lies in the past.");
					$result = false;
				}
			}

			if (strlen($session["name"]) > 250) {
				$this->view->add_message("Session name is too long.");
				$result = false;
			}

			return $result;
		}

		public function update_session($session) {
			$query = "update sessions set name=%s";
			$values = array("name" => $session["name"]);

			if ($this->settings->session_persistent) {
				$query .= ", expire=%s";
				$values["expire"] = $session["expire"];
			}

			$query .= " where id=%d and user_id=%d";

			return $this->db->execute($query, $values, $session["id"], $this->user->id) !== false;
		}

		public function delete_session($id) {
			$query = "delete from sessions where id=%d and user_id=%d";

			return $this->db->query($query, $id, $this->user->id) !== false;
		}
	}
?>
