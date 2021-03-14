<?php
	class cms_map_arrange_model extends Banshee\model {
		public function get_game($game_id) {
			$query = "select * from games where id=%d and dm_id=%d";

			if (($games = $this->db->execute($query, $game_id, $this->user->id)) == false) {
				return false;
			}

			return $games[0];
		}

		public function get_map($map_id) {
			return $this->db->entry("maps", $map_id);
		}

		public function get_available_tokens() {
			$query = "select * from tokens order by name";

			return $this->db->execute($query);
		}

		public function get_tokens($map_id) {
			$query = "select t.id, t.name as type, t.width, t.height, t.extension, ".
			         "i.id as instance_id, i.name, i.pos_x, i.pos_y, i.rotation, i.hidden, i.armor_class, i.hitpoints, i.damage ".
			         "from tokens t, map_token i ".
			         "where t.id=i.token_id and i.map_id=%d order by i.id";

			return $this->db->execute($query, $map_id);
		}

		private function place_characters($game_id, $map_id) {
			$query = "select l.character_id from game_character l, characters c ".
					 "where l.character_id=c.id and game_id=%d order by c.name";

			if (($characters = $this->db->execute($query, $game_id)) === false) {
				return false;
			}

			$data = array(
				"id"     => null,
				"map_id" => $map_id,
				"pos_x"	 => 1,
				"pos_y"	 => 1,
				"hidden" => NO);

			foreach ($characters as $character) {
				$data["character_id"] = $character["character_id"];
				if ($this->db->insert("map_character", $data) == false) {
					return false;
				}
				$data["pos_x"]++;
			}

			return true;
		}

		public function get_characters($map_id) {
			$query = "select c.*, i.id as instance_id, i.pos_x, i.pos_y, i.hidden, i.rotation ".
			         "from characters c, map_character i ".
			         "where c.id=i.character_id and i.map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_zones($map_id) {
			$query = "select * from zones where map_id=%d";

			return $this->db->execute($query, $map_id);
		}
	}
?>
