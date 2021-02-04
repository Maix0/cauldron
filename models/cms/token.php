<?php
	class cms_token_model extends Banshee\model {
		private $columns = array();

		public function get_tokens() {
			$query = "select * from tokens order by name";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_token($token_id) {
			static $tokens = array();

			if (isset($tokens[$token_id]) == false) {
				if (($token = $this->db->entry("tokens", $token_id)) === false) {
					return false;
				}

				$tokens[$token_id] = $token;
			}

			return $tokens[$token_id];
		}

		public function save_oke($token, $image) {
			$result = true;

			if (trim($token["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			if (is_numeric($token["width"]) == false) {
				$this->view->add_message("Invalid width.");
				$result = false;
			} else if ($token["width"] < 0) {
				$this->view->add_message("Width too low.");
				$result = false;
			}

			if (is_numeric($token["height"]) == false) {
				$this->view->add_message("Invalid height.");
				$result = false;
			} else if ($token["height"] < 0) {
				$this->view->add_message("Height too low.");
				$result = false;
			}

			if ($image["error"] != 0) {
				if (isset($token["id"]) == false) {
					$this->view->add_message("Upload a image.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $image["type"], 2);
				if (in_array($extension, array("gif", "jpg", "png")) == false) {
					$this->view->add_message("Invalid image.");
					$result = false;
				}
			}

			return $result;
		}

		private function save_image($image, $id) {
			return copy($image["tmp_name"], "files/tokens/".$id.".".$image["extension"]);
		}

		public function create_token($token, $image) {
			$keys = array("id", "name", "width", "height");

			$token["id"] = null;

			if ($this->db->insert("tokens", $token, $keys) === false) {
				return false;
			}
			$char_id = $this->db->last_insert_id;

			if ($this->save_image($image, $char_id)) {
				$keys = array("extension");
				$token["extension"] = $image["extension"];
				$this->db->update("tokens", $char_id, $token, $keys);
			} else {
				$this->db->delete("tokens", $char_id);
				return false;
			}

			return true;
		}

		public function update_token($token, $image) {
			$keys = array("name", "width", "height");

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

		public function delete_oke($token) {
			$result = true;

			if (($current = $this->get_token($token["id"])) == false) {
				$this->view->add_message("Chacaracter not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_token($token_id) {
			if (($current = $this->get_token($token_id)) == false) {
				return false;
			}

			unlink("files/tokens/".$token_id.".".$current["extension"]);

			return $this->db->delete("tokens", $token_id);
		}
	}
?>
