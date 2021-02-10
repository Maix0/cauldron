<?php
	class cms_map_model extends Banshee\model {
		public function get_games() {
			$query = "select * from games where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function is_my_game($game_id) {
			$query = "select * from games where id=%d and dm_id=%d";

			return $this->db->execute($query, $game_id, $this->user->id) != false;
		}

		public function get_maps($game_id) {
			$query = "select * from game_maps where game_id=%d order by title";

			return $this->db->execute($query, $game_id);
		}

		public function get_map($map_id) {
			$query = "select m.* from game_maps m, games g ".
			         "where m.game_id=g.id and m.id=%d and g.dm_id=%d";

			if (($maps = $this->db->execute($query, $map_id, $this->user->id)) == false) {
				return false;
			}

			return $maps[0];
		}

		public function save_oke($map) {
			$result = true;

			if (isset($map["id"])) {
				if ($this->get_map($map["id"]) == false) {
					$this->view->add_message("Map not found.");
					$result = false;
				}
			}

			return $result;
		}

		private function place_characters($game_id, $map_id) {
			$query = "select l.character_id from game_character l, characters c ".
			         "where l.character_id=c.id and game_id=%d order by c.name";

			if (($characters = $this->db->execute($query, $game_id)) === false) {
				return false;
			}

			$data = array(
				"id"          => null,
				"game_map_id" => $map_id,
				"pos_x"       => 1,
				"pos_y"       => 1,
				"hidden"      => NO);

			foreach ($characters as $character) {
				$data["character_id"] = $character["character_id"];
				if ($this->db->insert("game_map_character", $data) == false) {
					return false;
				}
				$data["pos_x"]++;
			}

			return true;
		}

		public function create_map($map) {
			$keys = array("id", "game_id", "title", "url", "type", "width", "height", "grid_size", "show_grid");

			$map["id"] = null;
			$map["game_id"] = $_SESSION["edit_game_id"];
			$map["url"] = str_replace(" ", "%20", $map["url"]);
			$map["show_grid"] = is_true($map["show_grid"]) ? YES : NO;

			if ($this->db->query("begin") === false) {
				return false;
			}

			if ($this->db->insert("game_maps", $map, $keys) == false) {
				$this->db->query("rollback");
				return false;
			}
			$map_id = $this->db->last_insert_id;

			if ($this->place_characters($_SESSION["edit_game_id"], $map_id) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") !== false;
		}

		public function update_map($map) {
			if ($this->get_map($map["id"]) == false) {
				$this->view->add_message("Map not found.");
				return false;
			}

			$keys = array("title", "url", "type", "width", "height", "grid_size", "show_grid");

			$map["url"] = str_replace(" ", "%20", $map["url"]);
			$map["show_grid"] = is_true($map["show_grid"]) ? YES : NO;

			return $this->db->update("game_maps", $map["id"], $map, $keys);
		}

		public function delete_oke($map) {
			$result = true;

			if ($this->get_map($map["id"]) == false) {
				$this->view->add_message("Map not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_map($map_id) {
			$queries = array(
				array("delete from zones where game_map_id=%d", $map_id),
				array("delete from game_map_token where game_map_id=%d", $map_id),
				array("delete from game_map_character where game_map_id=%d", $map_id),
				array("update games set active_map_id=null where active_map_id=%d", $map_id),
				array("delete from game_maps where id=%d", $map_id));

			return $this->db->transaction($queries);
		}
	}
?>
