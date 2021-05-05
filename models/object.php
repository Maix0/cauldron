<?php
	class object_model extends Banshee\api_model {
		private function valid_game_id($game_id) {
			$query = "select count(*) as count from games g ".
			         "left join game_character i on g.id=i.game_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where g.id=%d and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $game_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		/* Map functions
		 */
		private function valid_map_id($map_id) {
			$query = "select count(*) as count from maps m, games g ".
			         "where m.game_id=g.id and m.id=%d and g.dm_id=%d";

			if (($result = $this->db->execute($query, $map_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function change_map($game_id, $map_id) {
			if ($this->valid_map_id($map_id) == false) {
				return false;
			}

			$query = "update games set active_map_id=%d where id=%d and dm_id=%d";

			return $this->db->query($query, $map_id, $game_id, $this->user->id) != false;
		}

		/* Start functions
		 */
		public function start_move($map_id, $pos_x, $pos_y) {
			if ($this->valid_map_id($map_id) == false) {
				return false;
			}

			$query = "update maps set start_x=%d, start_y=%d where id=%d";

			return $this->db->query($query, $pos_x, $pos_y, $map_id) != false;
		}

		/* Token functions
		 */
		private function valid_token_instance_id($instance_id) {
			$query = "select count(*) as count ".
			         "from map_token t, maps m, games g ".
			         "left join game_character i on g.id=i.game_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where t.id=%d and t.map_id=m.id and m.game_id=g.id ".
			         "and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $instance_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}


			return $result[0]["count"] > 0;
		}

		public function token_armor_class($instance_id, $armor_class) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$query = "update map_token set armor_class=%d where id=%d";
			return $this->db->query($query, $armor_class, $instance_id) !== false;
		}

		public function token_create($token) {
			if ($this->valid_map_id($token["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"          => null,
				"map_id"      => (int)$token["map_id"],
				"token_id"    => (int)$token["token_id"],
				"name"        => null,
				"pos_x"       => (int)$token["pos_x"],
				"pos_y"       => (int)$token["pos_y"],
				"rotation"    => 0,
				"hidden"      => NO,
				"armor_class" => 10,
				"hitpoints"   => 0,
				"damage"      => 0);

			if ($this->db->insert("map_token", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function token_damage($instance_id, $damage) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			if (($current = $this->db->entry("map_token", $instance_id)) == false) {
				return false;
			}

			if ($damage > $current["hitpoints"]) {
				$damage = $current["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update map_token set damage=%d where id=%d";

			return $this->db->query($query, $damage, $instance_id) !== false;
		}

		public function token_delete($instance_id) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$queries = array(
				array("update collectables set map_token_id=null where map_token_id=%d", $instance_id),
				array("delete from map_token where id=%d", $instance_id));

			return $this->db->transaction($queries) != false;
		}

		public function token_hide($instance_id, $hidden) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_hitpoints($instance_id, $hitpoints) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$query = "update map_token set hitpoints=%d where id=%d";
			return $this->db->query($query, $hitpoints, $instance_id) !== false;
		}

		public function token_move($instance_id, $pos_x, $pos_y) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_name($instance_id, $name) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("name" => (trim($name) == "") ? null : $name);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_rotate($instance_id, $direction) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("rotation" => (int)$direction);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		/* Character functions
		 */
		private function valid_character_instance_id($instance_id) {
			$query = "select count(*) as count ".
			         "from map_character h, maps m, games g, game_character p, characters c ".
			         "where h.map_id=m.id and m.game_id=g.id and g.id=p.game_id and p.character_id=c.id ".
			         "and h.character_id=c.id and h.id=%d and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $instance_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		private function get_character($instance_id) {
			$query = "select c.* from characters c, map_character i ".
			         "where c.id=i.character_id and i.id=%d";
			if (($characters = $this->db->execute($query, $instance_id)) == false) {
				return false;
			}

			return $characters[0];
		}

		public function character_armor_class($instance_id, $armor_class) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			$data = array("armor_class" => $armor_class);
			return $this->db->update("characters", $character["id"], $data) !== false;
		}

		public function character_damage($instance_id, $damage) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			if ($damage > $character["hitpoints"]) {
				$damage = $character["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update characters set damage=%d where id=%d";

			return $this->db->query($query, $damage, $character["id"]) !== false;
		}

		public function character_hide($instance_id, $hidden) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_hitpoints($instance_id, $hitpoints) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			$data = array("hitpoints" => $hitpoints);
			return $this->db->update("characters", $character["id"], $data) !== false;
		}

		public function character_move($instance_id, $pos_x, $pos_y) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_rotate($instance_id, $direction) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("rotation" => (int)$direction);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		/* Door functions
		 */
		private function valid_door_id($door_id) {
			$query = "select count(*) as count from doors d, maps m, games g ".
			         "left join game_character i on g.id=i.game_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where d.id=%d and d.map_id=m.id and m.game_id=g.id ".
			         "and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $door_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function door_create($door) {
			if ($this->valid_map_id($door["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"        => null,
				"map_id"    => (int)$door["map_id"],
				"pos_x"     => (int)$door["pos_x"],
				"pos_y"     => (int)$door["pos_y"],
				"length"    => (int)$door["length"],
				"direction" => $door["direction"],
				"state"     => $door["state"]);

			if ($this->db->insert("doors", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function door_state($door_id, $state) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			$valid_states = array("open", "closed", "locked");
			if (in_array($state, $valid_states) == false) {
				return false;
			}

			$data = array("state" => $state);
			return $this->db->update("doors", $door_id, $data) !== false;
		}

		public function door_delete($door_id) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			return $this->db->delete("doors", $door_id) !== false;
		}

		/* Wall functions
		 */
		private function valid_wall_id($wall_id) {
			$query = "select count(*) as count from walls w, maps m, games g ".
			         "where w.id=%d and w.map_id=m.id and m.game_id=g.id and g.dm_id=%d";

			if (($result = $this->db->execute($query, $wall_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function wall_create($wall) {
			if ($this->valid_map_id($wall["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"        => null,
				"map_id"    => (int)$wall["map_id"],
				"pos_x"     => (int)$wall["pos_x"],
				"pos_y"     => (int)$wall["pos_y"],
				"length"    => (int)$wall["length"],
				"direction" => $wall["direction"]);

			if ($this->db->insert("walls", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function wall_delete($wall_id) {
			if ($this->valid_wall_id($wall_id) == false) {
				return false;
			}

			return $this->db->delete("walls", $wall_id) !== false;
		}

		/* Zone functions
		 */
		private function valid_zone_id($zone_id) {
			$query = "select count(*) as count from zones z, maps m, games g ".
			         "left join game_character i on g.id=i.game_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where z.id=%d and z.map_id=m.id and m.game_id=g.id ".
			         "and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $zone_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function zone_create($zone) {
			if ($this->valid_map_id($zone["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"      => null,
				"map_id"  => (int)$zone["map_id"],
				"pos_x"   => (int)$zone["pos_x"],
				"pos_y"   => (int)$zone["pos_y"],
				"width"   => (int)$zone["width"],
				"height"  => (int)$zone["height"],
				"color"   => $zone["color"],
				"opacity" => $zone["opacity"],
				"group"   => $zone["group"]);

			if ($this->db->insert("zones", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function zone_delete($zone_id) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			}

			return $this->db->delete("zones", $zone_id) !== false;
		}

		public function zone_move($zone_id, $pos_x, $pos_y) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("zones", $zone_id, $data) !== false;
		}

		public function script_save($zone_id, $map_id, $script, $group, $copy_script) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			}

			if ($copy_script && ($group != '')) {
				if ($this->valid_map_id($map_id) == false) {
					return false;
				}

				$query = "update zones set script=%s where %S=%s and map_id=%d";
				if ($this->db->query($query, $script, 'group', $group, $map_id) === false) {
					return false;
				}

			}

			$data = array("script" => trim($script), "group" => trim($group));
			return $this->db->update("zones", $zone_id, $data) !== false;
		}

		/* Collectable functions
		 */
		private function valid_collectable_id($collectable_id) {
			$query = "select count(*) as count from collectables o, games g ".
			         "left join game_character i on g.id=i.game_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where o.id=%d and o.game_id=g.id and (g.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $collectable_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function collectables_get_unused($game_id, $token_instance_id) {
			if ($this->valid_game_id($game_id) == false) {
				return false;
			}

			if ($this->valid_token_instance_id($token_instance_id) == false) {
				return false;
			}

			$query = "select id, map_token_id, name, image from collectables ".
			         "where game_id=%d and (map_token_id is null or map_token_id=%d) order by name";

			return $this->db->execute($query, $game_id, $token_instance_id);
		}

		public function collectable_place($collectable_id, $token_instance_id) {
			if ($this->valid_token_instance_id($token_instance_id) == false) {
				return false;
			}

			$query = "update collectables set map_token_id=null where map_token_id=%d";
			if ($this->db->query($query, $token_instance_id) === false) {
				return false;
			}

			if ($collectable_id == 0) {
				return true;
			}

			if ($this->valid_collectable_id($collectable_id) == false) {
				return false;
			}

			$data = array("map_token_id" => $token_instance_id);
			return $this->db->update("collectables", $collectable_id, $data);
		}

		public function collectable_found($collectable_id) {
			if ($this->valid_collectable_id($collectable_id) == false) {
				return false;
			}

			$data = array("found" => YES);

			return $this->db->update("collectables", $collectable_id, $data) !== false;
		}

		public function collectables_get_found($game_id) {
			if ($this->valid_game_id($game_id) == false) {
				return false;
			}

			$query = "select id, name, image from collectables ".
					 "where game_id=%d and found=%d order by name";

			return $this->db->execute($query, $game_id, YES);
		}

		/* Journal functions
		 */
		public function journal_add($game_id, $content) {
			if ($this->valid_game_id($game_id) == false) {
				return false;
			}

			$data = array(
				"game_id" => $game_id,
				"user_id" => $this->user->id,
				"content" => $content);

			return $this->db->insert("journal", $data) != false;
		}

		/* Alternate functions
		 */
		public function set_alternate($game_id, $character_id, $alternate_id) {
			$query = "select * from game_character g, characters c ".
			         "where g.game_id=%d and g.character_id=c.id and c.id=%d and c.user_id=%d";

			if (($character = $this->db->execute($query, $game_id, $character_id, $this->user->id)) == false) {
				return false;
			}

			$params = array();
			$query = "update game_character set alternate_icon_id=";
			if ($alternate_id == 0) {
			 	$query .= "null";
			} else {
				$query .= "%d";
				array_push($params, $alternate_id);
			}
			$query .= " where game_id=%d and character_id=%d";
			array_push($params, $game_id, $character_id);

			return $this->db->query($query, $params) !== false;
		}

		/* Audio functions
		 */
		public function get_audio_files($game_id) {
			if (valid_input($game_id, VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				return false;
			}

			$directory = "files/audio/".$game_id;

			if (file_exists($directory) == false) {
				return false;
			}

			if (($dp = opendir($directory)) == false) {
				return false;
			}

			$files = array();
			while (($file = readdir($dp)) != false) {
				if (substr($file, 0, 1) == ".") {
					continue;
				}
				array_push($files, $file);
			}

			closedir($dp);

			sort($files);

			return $files;
		}
	}
?>
