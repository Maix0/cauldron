<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_agenda_model extends Banshee\model {
		public function get_appointments() {
			$query = "select a.*, d.title as adventure from agenda a left join ".
			         "adventures d on a.adventure_id=d.id where user_id=%d order by begin,end";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_adventures() {
			$query = "select id, title from adventures where dm_id=%d order by title";

			if (($adventures = $this->db->execute($query, $this->user->id)) === false) {
				return false;
			}

			$result = array();
			foreach ($adventures as $adventure) {
				$result[$adventure["id"]] = $adventure["title"];
			}

			return $result;
		}

		public function get_appointment($appointment_id) {
			$query = "select * from agenda where id=%d and user_id=%d";

			if (($result = $this->db->execute($query, $appointment_id, $this->user->id)) == false) {
				return false;
			}

			return $result[0];
		}

		public function appointment_okay($appointment) {
			$result = true;

			if (valid_datetime($appointment["begin"]) == false) {
				$this->view->add_message("Invalid start time.");
				$result = false;
			} else if (trim($appointment["end"]) != "") {
				if (valid_datetime($appointment["end"]) == false) {
					$this->view->add_message("Invalid end time.");
					$result = false;
				} else if (strtotime($appointment["begin"]) > strtotime($appointment["end"])) {
					$this->view->add_message("Begin date must lie before end date.");
					$result = false;
				}
			}

			if (trim($appointment["title"]) == "") {
				$this->view->add_message("Empty title not allowed.");
				$result = false;
			}

			return $result;
		}

		public function create_appointment($appointment) {
			$keys = array("id", "user_id", "begin", "end", "title", "adventure_id");
			$appointment["id"] = null;
			$appointment["user_id"] = $this->user->id;

			if ($appointment["end"] == "") {
				$appointment["end"] = null;
			}

			if ($appointment["adventure_id"] == 0) {
				$appointment["adventure_id"] = null;
			}

			return $this->db->insert("agenda", $appointment, $keys) !== false;
		}

		public function update_appointment($appointment) {
			if ($this->get_appointment($appointment["id"]) == false) {
				return false;
			}

			$keys = array("begin", "end", "title", "adventure_id");

			if ($appointment["end"] == "") {
				$appointment["end"] = null;
			}

			if ($appointment["adventure_id"] == 0) {
				$appointment["adventure_id"] = null;
			}

			return $this->db->update("agenda", $appointment["id"], $appointment, $keys) !== false;
		}

		public function delete_appointment($appointment_id) {
			if ($this->get_appointment($appointment_id) == false) {
				return false;
			}

			return $this->db->delete("agenda", $appointment_id);
		}
	}
?>
