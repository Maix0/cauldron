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
			return $this->db->entry("game_maps", $map_id);
		}

		public function get_available_tokens() {
			$query = "select * from tokens order by name";

			return $this->db->execute($query);
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

		public function create_token($token) {
			$data = array(
				"id"          => null,
				"game_map_id" => $token["map_id"],
				"token_id"    => $token["token_id"],
				"name"        => null,
				"pos_x"       => $token["pos_x"],
				"pos_y"       => $token["pos_y"],
				"rotation"    => 0,
				"hidden"      => NO,
				"armor_class" => 10,
				"hitpoints"   => 0,
				"damage"      => 0);

			if ($this->db->insert("game_map_token", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
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

		public function name_token($instance_id, $name) {
			$data = array("name" => (trim($name) == "") ? null : $name);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function token_armor_class($instance_id, $armor_class) {
			$query = "update game_map_token set armor_class=%d where id=%d";
			return $this->db->query($query, $armor_class, $instance_id) !== false;
		}

		public function token_hitpoints($instance_id, $hitpoints) {
			$query = "update game_map_token set hitpoints=%d where id=%d";
			return $this->db->query($query, $hitpoints, $instance_id) !== false;
		}

		public function rotate_token($instance_id, $direction) {
			$data = array("rotation" => (int)$direction);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function delete_token($instance_id) {
			return $this->db->delete("game_map_token", $instance_id) !== false;
		}
	}
?>
