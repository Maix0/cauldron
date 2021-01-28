<?php
	class game_model extends Banshee\model {
		public function get_games() {
			$query = "select distinct g.*, u.fullname as dm from games g, game_character i, characters c, users u ".
			         "where g.dm_id=u.id and g.id=i.game_id and i.character_id=c.id and (g.dm_id=%d or c.user_id=%d) ".
			         "order by g.timestamp desc";

			return $this->db->execute($query, $this->user->id, $this->user->id);
		}

		public function get_game($game_id) {
			$query = "select g.*, u.fullname as dm from games g, game_character i, characters c, users u ".
			         "where g.id=%d and g.dm_id=u.id and g.id=i.game_id and i.character_id=c.id and (g.dm_id=%d or c.user_id=%d) ".
			         "order by g.timestamp desc";

			if (($games = $this->db->execute($query, $game_id, $this->user->id, $this->user->id)) == false) {
				return false;
			}

			return $games[0];
		}

		public function get_maps($game_id) {
			$query = "select id, title from game_maps where game_id=%d order by title";

			return $this->db->execute($query, $game_id);
		}

		public function get_map($map_id) {
			return $this->db->entry("game_maps", $map_id);
		}

		public function change_map($game_id, $map_id) {
			$query = "update games set active_map_id=%d where id=%d and dm_id=%d";

			return $this->db->query($query, $map_id, $game_id, $this->user->id);
		}

		public function get_tokens($map_id) {
			$query = "select t.id, t.width, t.height, t.extension, ".
			         "i.id as instance_id, i.name, i.pos_x, i.pos_y, i.rotation, i.hidden, i.armor_class, i.hitpoints, i.damage ".
			         "from tokens t, game_map_token i ".
			         "where t.id=i.token_id and i.game_map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_characters($map_id) {
			$query = "select c.*, i.id as instance_id, i.pos_x, i.pos_y, i.hidden ".
			         "from characters c, game_map_character i ".
			         "where c.id=i.character_id and i.game_map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function move_token($instance_id, $pos_x, $pos_y) {
			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function move_character($instance_id, $pos_x, $pos_y) {
			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("game_map_character", $instance_id, $data) !== false;
		}

		public function set_token_hidden($instance_id, $hidden) {
			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function set_character_hidden($instance_id, $hidden) {
			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("game_map_character", $instance_id, $data) !== false;
		}

		public function damage_token($instance_id, $damage) {
			if (($current = $this->db->entry("game_map_token", $instance_id)) == false) {
				return false;
			}

			if ($damage > $current["hitpoints"]) {
				$damage = $current["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update game_map_token set damage=%d where id=%d";

			return $this->db->query($query, $damage, $instance_id) !== false;
		}

		public function damage_character($instance_id, $damage) {
			$query = "select c.* from characters c, game_map_character i ".
			         "where c.id=i.character_id and i.id=%d";
			if (($characters = $this->db->execute($query, $instance_id)) == false) {	
				return false;
			}
			$current = $characters[0];

			if ($damage > $current["hitpoints"]) {
				$damage = $current["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update characters set damage=%d where id=%d";

			return $this->db->query($query, $damage, $current["id"]) !== false;
		}
	}
?>
