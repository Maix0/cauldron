<?php
	class cms_game_model extends Banshee\model {
		public function get_games() {
			$query = "select *, (select count(*) from game_character where game_id=g.id) as players ".
			         "from games g where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_game($game_id) {
			$query = "select * from games where id=%d and dm_id=%d";

			if (($games = $this->db->execute($query, $game_id, $this->user->id)) == false) {
				return false;
			}

			return $games[0];
		}

		public function get_characters() {
			$query = "select c.*, u.fullname, ".
			         "(select count(*) from game_character where character_id=c.id) as involved ".
			         "from characters c, users u ".
			         "where c.user_id=u.id and u.id!=%d having involved=%d order by u.fullname, c.name";

			if (($characters = $this->db->execute($query, $this->user->id, 0)) === false) {
				return false;
			}

			$result = array();
			foreach ($characters as $character) {
				if (isset($result[$character["fullname"]]) == false) {
					$result[$character["fullname"]] = array();
				}

				array_push($result[$character["fullname"]], array(
					"id"   => $character["id"],
					"name" => $character["name"]));
			}

			return $result;
		}

		public function save_oke($game) {
			$result = true;

			if (isset($game["id"])) {
				if (($current = $this->get_game($game["id"])) == false) {
					$this->view->add_message("Game not found.");
					$result = false;
				}
			}

			if (trim($game["title"]) == "") {
				$this->view->add_message("Fill in the title.");
				$result = false;
			}

			if (is_array($game["characters"]) == false) {
				$this->view->add_message("Select at least one character.");
				$result = false;
			} else if (count($game["characters"]) == 0) {
				$this->view->add_message("Select at least one character.");
				$result = false;
			}

			return $result;
		}

		private function save_characters($game_id, $characters) {
			$data = array("game_id" => $game_id);
			foreach ($characters as $character_id) {
				$data["character_id"] = $character_id;
				if ($this->db->insert("game_character", $data) === false) {
					return false;
				}
			}

			return true;
		}

		public function create_game($game) {
			$keys = array("id", "title", "dm_id");

			$game["id"] = null;
			$game["dm_id"] = $this->user->id;
			$game["active_map_id"] = null;

			if ($this->db->query("begin") === false) {
				return false;
			}

			if ($this->db->insert("games", $game, $keys) === false) {
				$this->db->query("rollback");
				return false;
			}
			$game_id = $this->db->last_insert_id;

			if ($this->save_characters($game_id, $game["characters"]) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") !== false;
		}

		public function update_game($game) {
			$keys = array("title");

			return $this->db->update("games", $game["id"], $game, $keys);
		}

		public function delete_oke($game) {
			$result = true;

			if (($current = $this->get_game($game["id"])) == false) {
				$this->view->add_message("Game not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_game($game_id) {
			$queries = array(
				array("delete from game_map_token where game_map_id in (select id from game_maps where game_id=%d)", $game_id),
				array("delete from game_map_character where game_map_id in (select id from game_maps where game_id=%d)", $game_id),
				array("update games set active_map_id=null where active_map_id=%d", $map_id),
				array("delete from game_maps where game_id=%d", $game_id),
				array("delete from game_character where game_id=%d", $game_id),
				array("delete from games where id=%d", $game_id));

			return $this->db->transaction($queries);
		}
	}
?>
