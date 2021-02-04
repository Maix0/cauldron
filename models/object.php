<?php
	class object_model extends Banshee\api_model {
		public function change_map($game_id, $map_id) {
			$query = "update games set active_map_id=%d where id=%d and dm_id=%d";

			return $this->db->query($query, $map_id, $game_id, $this->user->id);
		}

		/* Token functions
		 */
		public function token_armor_class($instance_id, $armor_class) {
			$query = "update game_map_token set armor_class=%d where id=%d";
			return $this->db->query($query, $armor_class, $instance_id) !== false;
		}

		public function token_create($token) {
			$data = array(
				"id"          => null,
				"game_map_id" => (int)$token["map_id"],
				"token_id"    => (int)$token["token_id"],
				"name"        => null,
				"pos_x"       => (int)$token["pos_x"],
				"pos_y"       => (int)$token["pos_y"],
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

		public function token_damage($instance_id, $damage) {
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

		public function token_delete($instance_id) {
			return $this->db->delete("game_map_token", $instance_id) !== false;
		}

		public function token_hide($instance_id, $hidden) {
			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function token_hitpoints($instance_id, $hitpoints) {
			$query = "update game_map_token set hitpoints=%d where id=%d";
			return $this->db->query($query, $hitpoints, $instance_id) !== false;
		}

		public function token_move($instance_id, $pos_x, $pos_y) {
			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function token_name($instance_id, $name) {
			$data = array("name" => (trim($name) == "") ? null : $name);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		public function token_rotate($instance_id, $direction) {
			$data = array("rotation" => (int)$direction);
			return $this->db->update("game_map_token", $instance_id, $data) !== false;
		}

		/* Character functions
		 */
		public function character_damage($instance_id, $damage) {
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

		public function character_hide($instance_id, $hidden) {
			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("game_map_character", $instance_id, $data) !== false;
		}

		public function character_move($instance_id, $pos_x, $pos_y) {
			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("game_map_character", $instance_id, $data) !== false;
		}

		/* Zone functions
		 */
		public function zone_create($zone) {
			$data = array(
				"id"          => null,
				"game_map_id" => (int)$zone["map_id"],
				"pos_x"       => (int)$zone["pos_x"],
				"pos_y"       => (int)$zone["pos_y"],
				"width"       => (int)$zone["width"],
				"height"      => (int)$zone["height"],
				"color"       => $zone["color"],
				"opacity"     => $zone["opacity"]);

			if ($this->db->insert("zones", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function zone_delete($instance_id) {
			return $this->db->delete("zones", $instance_id) !== false;
		}

		public function zone_move($instance_id, $pos_x, $pos_y) {
			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("zones", $instance_id, $data) !== false;
		}
	}
?>
