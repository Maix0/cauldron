<?php
	class cms_token_model extends Banshee\model {
		private $columns = array();

		public function get_tokens() {
			$query = "select * from tokens where organisation_id=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id);
		}

		public function get_token($token_id) {
			static $tokens = array();

			if (isset($tokens[$token_id]) == false) {
				if (($token = $this->db->entry("tokens", $token_id)) === false) {
					return false;
				}

				if ($token["organisation_id"] != $this->user->organisation_id) {
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
			$token = new \Banshee\image($image["tmp_name"]);
			$token->rotate(180);
			$token->save($image["tmp_name"]);

			return copy($image["tmp_name"], "files/".$this->user->files_key."/tokens/".$id.".".$image["extension"]);
		}

		public function create_token($token, $image) {
			$keys = array("id", "organisation_id", "name", "width", "height");

			$token["id"] = null;
			$token["organisation_id"] = $this->user->organisation_id;

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
			$keys = array("name", "width", "height");

			if (($current = $this->get_token($token["id"])) == false) {
				return false;
			}

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
				$this->view->add_message("Token not found.");
				return false;
			}

			$query = "select count(*) as count from map_token where token_id=%d";
			if (($tokens = $this->db->execute($query, $token["id"])) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if ($tokens[0]["count"] > 0) {
				$this->view->add_message("This token is being used.");
				$result = false;
			}

			return $result;
		}

		public function delete_token($token_id) {
			if (($current = $this->get_token($token_id)) == false) {
				return false;
			}

			if ($this->db->delete("tokens", $token_id) == false) {
				return false;
			}

			unlink("files/".$this->user->files_key."/tokens/".$token_id.".".$current["extension"]);

			return true;
		}
	}
?>
