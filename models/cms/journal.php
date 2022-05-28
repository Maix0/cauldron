<?php
	class cms_journal_model extends Banshee\model {
		private $columns = array();

		public function get_games() {
			$query = "select * from games where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function is_my_game($game_id) {
			$query = "select * from games where id=%d and dm_id=%d";

			return $this->db->execute($query, $game_id, $this->user->id) != false;
		}

		public function get_journal($game_id) {
			$query = "select j.*, UNIX_TIMESTAMP(j.timestamp) as timestamp, u.fullname ".
			         "from journal j, users u where j.user_id=u.id and game_id=%d order by timestamp";

			return $this->db->execute($query, $game_id);
		}

		public function get_entry($entry_id) {
			$query = "select j.*, u.fullname from journal j, users u ".
			         "where j.user_id=u.id and j.id=%d";
			if (($entries = $this->db->execute($query, $entry_id)) == false) {
				return false;
			}

			if ($this->is_my_game($entries[0]["game_id"]) == false) {
				return false;
			}

			return $entries[0];
		}

		public function save_okay($entry) {
			$result = true;

			if (isset($entry["id"])) {
				if ($this->get_entry($entry["id"]) == false) {
					$this->view->add_message("Invalid entry id.");
					$result = false;
				}
			} else if ($this->is_my_game($entry["game_id"]) == false) {
				$this->view->add_message("Invalid game id.");
				$result = false;
			}

			if (trim($entry["content"]) == "") {
				$this->view->add_message("The entry can't be empty.");
				$result = false;
			}

			return $result;
		}

		public function create_entry($entry) {
			$keys = array("id", "game_id", "user_id", "timestamp", "content");

			$entry["id"] = null;
			$entry["user_id"] = $this->user->id;
			$entry["timestamp"] = date("Y-m-d H:i:s");

			return $this->db->insert("journal", $entry, $keys);
		}

		public function update_entry($entry) {
			$keys = array("content");

			return $this->db->update("journal", $entry["id"], $entry, $keys);
		}

		public function delete_okay($entry) {
			$result = true;

			if ($this->get_entry($entry["id"]) == false) {
				$this->view->add_message("Invalid entry id.");
				$result = false;
			}

			return $result;
		}

		public function delete_entry($entry_id) {
			return $this->db->delete("journal", $entry_id);
		}
	}
?>
