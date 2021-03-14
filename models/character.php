<?php
	class character_model extends Banshee\model {
		/* Character functions
		 */
		public function get_characters() {
			$query = "select c.*, g.title from characters c ".
			         "left join game_character p on c.id=p.character_id ".
			         "left join games g on p.game_id=g.id ".
			         "where user_id=%d order by name";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_character($character_id) {
			static $characters = array();

			if (isset($characters[$character_id]) == false) {
				if (($character = $this->db->entry("characters", $character_id)) === false) {
					return false;
				}

				if ($character["user_id"] != $this->user->id) {
					return false;
				}

				$characters[$character_id] = $character;
			}

			return $characters[$character_id];
		}

		private function file_upload_oke($icon) {
			$result = true;

			if ($icon["error"] != 0) {
				if (isset($character["id"]) == false) {
					$this->view->add_message("Upload a icon.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $icon["type"], 2);
				if (in_array($extension, array("gif", "jpg", "png")) == false) {
					$this->view->add_message("Invalid icon.");
					$result = false;
				}
			}

			return $result;
		}

		public function save_oke($character, $icon) {
			$result = true;

			if (isset($character["id"])) {
				if ($this->get_character($character["id"]) == false) {
					$this->view->add_message("Character not found.");
					$result = false;
				}
			}

			if (trim($character["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			if (is_numeric($character["hitpoints"]) == false) {
				$this->view->add_message("Invalid hitpoints.");
				$result = false;
			} else if ($character["hitpoints"] < 1) {
				$this->view->add_message("Hitpoints too low.");
				$result = false;
			}

			if (isset($character["id"]) == false) {
				if ($this->file_upload_oke($icon) == false) {
					$result = false;
				}
			}

			return $result;
		}

		private function save_icon($icon, $id) {
			$token = new \Banshee\image($icon["tmp_name"]);
			$token->rotate(180);
			$token->save($icon["tmp_name"]);

			return copy($icon["tmp_name"], "files/characters/".$id.".".$icon["extension"]);
		}

		public function create_character($character, $icon) {
			$keys = array("id", "user_id", "name", "initiative", "armor_class", "hitpoints");

			$character["id"] = null;
			$character["user_id"] = $this->user->id;

			if ($this->db->insert("characters", $character, $keys) === false) {
				return false;
			}
			$char_id = $this->db->last_insert_id;

			if ($this->save_icon($icon, $char_id)) {
				$keys = array("extension");
				$character["extension"] = $icon["extension"];
				$this->db->update("characters", $char_id, $character, $keys);
			} else {
				$this->db->delete("characters", $char_id);
				return false;
			}

			return true;
		}

		public function update_character($character, $icon) {
			$keys = array("name", "initiative", "armor_class", "hitpoints");

			if ($icon["error"] == 0) {
				if (($current = $this->get_character($character["id"])) == false) {
					$this->view->add_message("Character not found.");
					$result = false;
				}
				unlink("files/characters/".$current["id"].".".$current["extension"]);

				if ($this->save_icon($icon, $character["id"])) {
					array_push($keys, "extension");
					$character["extension"] = $icon["extension"];
				} else {
					return false;
				}
			}

			return $this->db->update("characters", $character["id"], $character, $keys);
		}

		public function delete_oke($character) {
			$result = true;

			if (($current = $this->get_character($character["id"])) == false) {
				$this->view->add_message("Character not found.");
				$result = false;
			}

			$query = "select count(*) as count from game_character where character_id=%d";

			if (($games = $this->db->execute($query, $character["id"])) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			}

			if ($games[0]["count"] > 0) {
				$this->view->add_message("This character is part of a game.");
				$result = false;
			}

			return $result;
		}

		public function delete_character($character_id) {
			if (($current = $this->get_character($character_id)) == false) {
				return false;
			}

			$query = "select * from character_icons where character_id=%d";
			if (($alternates = $this->db->execute($query, $character_id)) === false) {
				return false;
			}

			foreach ($alternates as $alternate) {
				unlink("files/characters/".$character_id."_".$alternate["id"].".".$alternate["extension"]);
			}

			unlink("files/characters/".$character_id.".".$current["extension"]);

			$queries = array(
				array("delete from character_icons where character_id=%d", $character_id),
				array("delete from characters where id=%d", $character_id));

			return $this->db->transaction($queries);
		}

		/* Alternate functions
		 */
		public function get_alternates($character_id) {
			$query = "select * from character_icons where character_id=%d order by name";

			return $this->db->execute($query, $character_id);
		}

		public function icon_oke($info, $icon) {
			$result = true;

			if ($this->get_character($info["char_id"]) == false) {
				$this->view->add_message("Unknown character.");
				$result = false;
			}

			if (trim($info["name"]) == "") {
				$this->view->add_message("Invalid name");
				$result = false;
			}

			if (in_array($info["size"], array(1, 2)) == false) {
				$this->view->add_message("Invalid size");
				$result = false;
			}

			if ($this->file_upload_oke($icon) == false) {
				$result = false;
			}

			return $result;
		}

		public function add_icon($info, $icon) {
			$parts = pathinfo($icon["name"]);

			$data = array(
				"id"           => null,
				"character_id" => $info["char_id"],
				"name"         => $info["name"],
				"size"         => $info["size"],
				"extension"    => $parts["extension"]);

			if ($this->db->insert("character_icons", $data) == false) {
				return false;
			}
			$id = $this->db->last_insert_id;

			$token = new \Banshee\image($icon["tmp_name"]);
			$token->rotate(180);
			$token->save($icon["tmp_name"]);

			if (copy($icon["tmp_name"], "files/characters/".$info["char_id"]."_".$id.".".$parts["extension"]) == false) {
				$this->db->delete("character_icons", $id);
			}

			return true;
		}

		public function delete_icon($icon_id) {
			$query = "select * from character_icons i, characters c ".
			         "where i.character_id=c.id and i.id=%d and c.user_id=%d";
			if (($character = $this->db->execute($query, $icon_id, $this->user->id)) == false) {
				return false;
			}
			$current = $character[0];

			$queries = array(
				array("update game_character set alternate_icon_id=null where alternate_icon_id=%d", $icon_id),
				array("delete from character_icons where id=%d", $icon_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			unlink("files/characters/".$current["character_id"]."_".$icon_id.".".$current["extension"]);

			return $current["character_id"];
		}
	}
?>
