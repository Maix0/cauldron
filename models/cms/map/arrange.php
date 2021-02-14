<?php
	class cms_map_arrange_model extends Banshee\model {
		public function get_game($game_id) {
			$query = "select g.*, u.fullname as dm from games g, game_character i, characters c, users u ".
			         "where g.id=%d and g.dm_id=u.id and g.id=i.game_id and i.character_id=c.id and (g.dm_id=%d or c.user_id=%d) ".
			         "order by g.timestamp desc";

			if (($games = $this->db->execute($query, $game_id, $this->user->id, $this->user->id)) == false) {
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
			         "where t.id=i.token_id and i.game_map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_characters($map_id) {
			$query = "select c.*, i.id as instance_id, i.pos_x, i.pos_y, i.hidden ".
			         "from characters c, map_character i ".
			         "where c.id=i.character_id and i.game_map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_zones($map_id) {
			$query = "select * from zones where game_map_id=%d";

			return $this->db->execute($query, $map_id);
		}
	}
?>
