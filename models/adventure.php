<?php
	class adventure_model extends cauldron_model {
		public function get_adventures() {
			$query = "select distinct a.*, u.fullname as dm from users u, adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where a.dm_id=u.id and (a.dm_id=%d or c.user_id=%d) ".
			         "order by timestamp desc";

			if (($adventures = $this->db->execute($query, $this->user->id, $this->user->id, ADVENTURE_ACCESS_PLAYERS_SPECTATORS)) === false) {
				return false;
			}

			$result = array();
			foreach ($adventures as $adventure) {
				$adventure["type"] = "play";
				$result[$adventure["id"]] = $adventure;
			}

			$query = "select a.*, u.fullname as dm from adventures a, users u ".
                     "where a.dm_id=u.id and u.organisation_id=%d and access>=%d ".
			         "order by timestamp desc";

			if (($adventures = $this->db->execute($query, $this->user->organisation_id, ADVENTURE_ACCESS_PLAYERS_SPECTATORS)) === false) {
				return false;
			}

			foreach ($adventures as $adventure) {
				if (isset($result[$adventure["id"]])) {
					continue;
				}

				$adventure["type"] = "spectate";
				$result[$adventure["id"]] = $adventure;
			}

			return $result;
		}

		public function get_adventure($adventure_id) {
			$query = "select a.*, u.fullname as dm from users u, adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where a.id=%d and a.dm_id=u.id and (a.dm_id=%d or c.user_id=%d) ".
			         "order by a.timestamp desc";

			if (($adventures = $this->db->execute($query, $adventure_id, $this->user->id, $this->user->id)) == false) {
				return false;
			}

			return $adventures[0];
		}

		public function get_maps($adventure_id) {
			$query = "select id, title from maps where adventure_id=%d order by title";

			return $this->db->execute($query, $adventure_id);
		}

		public function get_map($map_id) {
			if (($map = $this->db->entry("maps", $map_id)) == false) {
				return false;
			}

			$parts = explode(".", $map["url"]);
			$extension = array_pop($parts);

			if (in_array($extension, config_array(MAP_VIDEO_EXTENSIONS))) {
				$map["type"] = "video";
			} else {
				$map["type"] = "image";
			}

			return $map;
		}

		public function get_map_resources() {
			if (($maps = $this->get_resources("maps")) === false) {
				return false;
			}

			foreach ($maps as $i => $map) {
				$type = $this->borrow("vault/map")->get_map_type($map);
				if ($type == "video") {
					unset($maps[$i]);
				}
			}

			return $maps;
		}

		public function get_audio_resources() {
			return $this->get_resources("audio");
		}

		public function get_alternate_icons($character_id) {
			$query = "select * from character_icons where character_id=%d order by name";

			return $this->db->execute($query, $character_id);
		}

		public function get_weapons($character_id) {
			$query = "select * from character_weapons where character_id=%d order by name";

			return $this->db->execute($query, $character_id);
		}

		public function get_blinders($map_id) {
			$query = "select * from blinders where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_brushes() {
			$result = array();

			if (($dp = opendir(BRUSH_DIRECTORY)) !== false) {
				while (($file = readdir($dp)) !== false) {
					if (substr($file, 0, 1) == ".") {
						continue;
					}

					array_push($result, BRUSH_DIRECTORY.$file);
				}

				closedir($dp);
			}

			$brush_dir = "resources/".$this->user->resources_key."/brushes/";
			if (($dp = opendir($brush_dir)) !== false) {
				while (($file = readdir($dp)) !== false) {
					if (substr($file, 0, 1) == ".") {
						continue;
					}

					array_push($result, $brush_dir.$file);
				}

				closedir($dp);
			}

			sort($result);

			return $result;
		}

		public function get_characters($map_id) {
			$query = "select c.*, i.id as instance_id, i.pos_x, i.pos_y, i.rotation, i.hidden, ".
			         "a.id as alternate_id, a.extension as alternate_extension, a.size as alternate_size, ".
					 "t.id as token_id, t.extension as token_extension ".
			         "from characters c, map_character i, maps m, adventure_character l ".
			         "left join character_icons a on l.alternate_icon_id=a.id ".
			         "left join tokens t on l.token_id=t.id ".
			         "where c.id=i.character_id and i.map_id=%d and m.id=i.map_id ".
			         "and l.adventure_id=m.adventure_id and l.character_id=c.id ".
			         "order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_conditions() {
			$query = "select * from conditions order by name";

			return $this->db->execute($query);
		}

		public function get_doors($map_id) {
			$query = "select * from doors where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_effects() {
			$effects = array();

			$directories = array("files/effects", "resources/".$this->user->resources_key."/effects");
			foreach ($directories as $directory) {
				if (($dp = opendir($directory)) === false) {
					continue;
				}

				while (($file = readdir($dp)) != false) {
					if (substr($file, 0, 1) == ".") {
						continue;
					}

					array_push($effects, $directory."/".$file);
				}

				closedir($dp);
			}

			sort($effects);

			return $effects;
		}

		public function get_journal($adventure_id) {
			/* Get DM
			 */
			if (($adventure = $this->db->entry("adventures", $adventure_id)) === false) {
				return false;
			}
			$characters = array($adventure["dm_id"] => "Dungeon Master");

			/* Get players
			 */
			$query = "select c.user_id, c.name from characters c, adventure_character p ".
			         "where c.id=p.character_id and p.adventure_id=%d";

			if (($players = $this->db->execute($query, $adventure_id)) === false) {
				return false;
			}

			foreach ($players as $player) {
				$characters[$player["user_id"]] = $player["name"];
			}

			/* Get journal
			 */
			$query = "select user_id, content, UNIX_TIMESTAMP(timestamp) as timestamp ".
			         "from journal where adventure_id=%d order by timestamp";

			if (($result = $this->db->execute($query, $adventure_id)) === false) {
				return false;
			}

			foreach ($result as $i => $item) {
				$result[$i]["writer"] = $characters[$item["user_id"]];
				unset($result[$i]["user_id"]);
			}

			return $result;
		}

		public function get_lights($map_id) {
			$query = "select * from lights where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_available_tokens() {
			$query = "select * from tokens where organisation_id=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id);
		}

		public function get_tokens($map_id) {
			$query = "select t.id, t.name as type, t.width, t.height, t.extension, ".
			         "c.id as c_id, c.name as c_name, c.image as c_src, hide as c_hide, found as c_found, ".
			         "i.id as instance_id, i.name, i.pos_x, i.pos_y, i.rotation, i.hidden, i.armor_class, i.hitpoints, i.damage ".
			         "from tokens t, map_token i ".
					 "left join collectables c on c.map_token_id=i.id ".
			         "where t.id=i.token_id and i.map_id=%d order by i.id";

			return $this->db->execute($query, $map_id);
		}

		public function get_tokens_for_shape_change() {
			$query = "select id, name, width as size, extension from tokens ".
			         "where organisation_id=%d and shape_change=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id, YES);
		}

		public function get_walls($map_id) {
			$query = "select * from walls where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_zones($map_id) {
			$query = "select * from zones where map_id=%d";

			return $this->db->execute($query, $map_id);
		}
	}
?>
