<?php
	class character_model extends Banshee\model {
		/* Character functions
		 */
		public function get_characters() {
			$query = "select * from characters where user_id=%d order by name";

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

		private function file_upload_oke($portrait) {
			$result = true;

			if ($portrait["error"] != 0) {
				if (isset($character["id"]) == false) {
					$this->view->add_message("Upload a portrait.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $portrait["type"], 2);
				if (in_array($extension, array("gif", "jpg", "png")) == false) {
					$this->view->add_message("Invalid portrait.");
					$result = false;
				}
			}

			return $result;
		}

		public function save_oke($character, $portrait) {
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
				if ($this->file_upload_oke($portrait) == false) {
					$result = false;
				}
			}

			return $result;
		}

		private function save_portrait($portrait, $id) {
			return copy($portrait["tmp_name"], "files/portraits/".$id.".".$portrait["extension"]);
		}

		public function create_character($character, $portrait) {
			$keys = array("id", "user_id", "name", "initiative", "armor_class", "hitpoints");

			$character["id"] = null;
			$character["user_id"] = $this->user->id;

			if ($this->db->insert("characters", $character, $keys) === false) {
				return false;
			}
			$char_id = $this->db->last_insert_id;

			if ($this->save_portrait($portrait, $char_id)) {
				$keys = array("extension");
				$character["extension"] = $portrait["extension"];
				$this->db->update("characters", $char_id, $character, $keys);
			} else {
				$this->db->delete("characters", $char_id);
				return false;
			}

			return true;
		}

		public function update_character($character, $portrait) {
			$keys = array("name", "initiative", "armor_class", "hitpoints");

			if ($portrait["error"] == 0) {
				if (($current = $this->get_character($character["id"])) == false) {
					$this->view->add_message("Character not found.");
					$result = false;
				}
				unlink("files/portraits/".$current["id"].".".$current["extension"]);

				if ($this->save_portrait($portrait, $character["id"])) {
					array_push($keys, "extension");
					$character["extension"] = $portrait["extension"];
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
				unlink("files/portraits/".$character_id."_".$alternate["id"].".".$alternate["extension"]);
			}

			unlink("files/portraits/".$character_id.".".$current["extension"]);

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

		public function portrait_oke($info, $portrait) {
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

			if ($this->file_upload_oke($portrait) == false) {
				$result = false;
			}

			return $result;
		}

		public function add_portrait($info, $portrait) {
			$parts = pathinfo($portrait["name"]);

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

			if (copy($portrait["tmp_name"], "files/portraits/".$info["char_id"]."_".$id.".".$parts["extension"]) == false) {
				$this->db->delete("character_icons", $id);
			}

			return true;
		}

		public function delete_portrait($icon_id) {
			$query = "select * from character_icons i, characters c ".
			         "where i.character_id=c.id and i.id=%d and c.user_id=%d";
			if (($character = $this->db->execute($query, $icon_id, $this->user->id)) == false) {
				return false;
			}
			$current = $character[0];

			if ($this->db->delete("character_icons", $icon_id) == false) {
				return false;
			}

			unlink("files/portraits/".$current["character_id"]."_".$icon_id.".".$current["extension"]);

			return $current["character_id"];
		}
	}
?>
