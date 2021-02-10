<?php
	class character_model extends Banshee\model {
		private $columns = array();

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

			if ($portrait["error"] != 0) {
				if (isset($character["id"]) == false) {
					$this->view->add_message("Upload a portrait.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $portrait["type"], 2);
				if (in_array($extension, array("gif", "jpeg", "jpg", "png")) == false) {
					$this->view->add_message("Invalid portrait.");
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

			return $result;
		}

		public function delete_character($character_id) {
			if (($current = $this->get_character($character_id)) == false) {
				return false;
			}

			unlink("files/portraits/".$character_id.".".$current["extension"]);

			return $this->db->delete("characters", $character_id);
		}
	}
?>
