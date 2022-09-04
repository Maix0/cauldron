<?php
	class vault_token_model extends Banshee\model {
		private $columns = array();

		public function get_tokens() {
			$query = "select * from tokens where organisation_id=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id);
		}

		public function get_token($token_id) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->get_token($token_id);
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
				} else if ($this->user->max_resources > 0) {
					$max_capacity = $this->user->max_resources * MB;
					$capacity = $this->borrow("vault/file")->get_directory_size("resources/".$this->user->resources_key);

					if ($capacity + filesize($image["tmp_name"]) > $max_capacity) {
						$this->view->add_message("This file is too big for your maximum resource capacity (%s MB).", $this->user->max_resources);
						return false;
					}
				}
			}

			return $result;
		}

		public function create_token($post, $image) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->create_token($post, $image);
		}

		public function update_token($post, $image) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->update_token($post, $image);
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
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->delete_token($token_id);
		}
	}
?>
