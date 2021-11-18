<?php
	class token {
		private $db = null;
		private $organisation_id = null;
		private $resources_key = null;

		public function __construct($db, $organisation_id, $resources_key) {
			$this->db = $db;
			$this->organisation_id = $organisation_id;
			$this->resources_key = $resources_key;
		}

		public function get_token($token_id) {
			static $tokens = array();

			if (isset($tokens[$token_id]) == false) {
				if (($token = $this->db->entry("tokens", $token_id)) === false) {
					return false;
				}

				if ($token["organisation_id"] != $this->organisation_id) {
					return false;
				}

				$tokens[$token_id] = $token;
			}

			return $tokens[$token_id];
		}

		private function save_image($image, $id) {
			$destination = "resources/".$this->resources_key."/tokens/".$id.".".$image["extension"];

			if (copy($image["tmp_name"], $destination) == false) {
				return false;
			}

			$token = new \Banshee\image($destination);
			$token->rotate(180);
			return $token->save($destination);
		}

		public function create_token($token, $image) {
			$keys = array("id", "organisation_id", "name", "width", "height", "armor_class", "hitpoints", "shape_change");

			$token["id"] = null;
			$token["organisation_id"] = $this->organisation_id;
			$token["shape_change"] = is_true($token["shape_change"]) ? YES : NO;

			if ($this->db->insert("tokens", $token, $keys) === false) {
				return false;
			}
			$token_id = $this->db->last_insert_id;

			if ($this->save_image($image, $token_id)) {
				$data = array("extension" => $image["extension"]);
				$this->db->update("tokens", $token_id, $data);
			} else {
				$this->db->delete("tokens", $token_id);
				return false;
			}

			return true;
		}

		public function update_token($token, $image) {
			$keys = array("name", "width", "height", "armor_class", "hitpoints", "shape_change");

			if (($current = $this->get_token($token["id"])) == false) {
				return false;
			}

			$token["shape_change"] = is_true($token["shape_change"]) ? YES : NO;

			if ($image["error"] == 0) {
				if ($this->save_image($image, $token["id"])) {
					array_push($keys, "extension");
					$token["extension"] = $image["extension"];
				} else {
					return false;
				}
			}

			return $this->db->update("tokens", $token["id"], $token, $keys);
		}

		public function delete_token($token_id) {
			if (($current = $this->get_token($token_id)) == false) {
				return false;
			}

			$queries = array(
				array("update game_character set token_id=null where token_id=%d", $token_id),
				array("delete from tokens where token_id=%d", $token_id));
			if ($this->db->transaction($queries) === false) {
				return false;
			}

			unlink("resources/".$this->resources_key."/tokens/".$token_id.".".$current["extension"]);

			return true;
		}
	}
?>
