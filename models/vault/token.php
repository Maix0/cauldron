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

		private function valid_number($number, $label) {
			if (is_numeric($number) == false) {
				$this->view->add_message("Invalid ".strtolower($label).".");
				return false;
			} else if ($number < 0) {
				$this->view->add_message($label." too low.");
				return false;
			}

			return true;
		}

		public function save_okay($token, $image) {
			$result = true;

			if (trim($token["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			if ($this->valid_number($token["width"], "Width") == false) {
				$result = false;
			}

			if ($this->valid_number($token["height"], "Height") == false) {
				$result = false;
			}

			if ($this->valid_number($token["armor_class"], "Armor class") == false) {
				$result = false;
			}

			if ($this->valid_number($token["hitpoints"], "Hit points") == false) {
				$result = false;
			}

			if ($image["error"] != 0) {
				if (isset($token["id"]) == false) {
					$this->view->add_message("Upload a image.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $image["type"], 2);
				if (in_array($extension, array("gif", "jpg", "jpeg", "png", "webp")) == false) {
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
			return $token->create($post, $image);
		}

		public function update_token($post, $image) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->update($post, $image);
		}

		public function delete_okay($token) {
			$result = true;

			if (($current = $this->get_token($token["id"])) == false) {
				$this->view->add_message("Token not found.");
				return false;
			}

			$query = "select distinct m.title, a.title as adventure from maps m, adventures a, map_token t where m.id=t.map_id and m.adventure_id=a.id and token_id=%d order by title";
			if (($maps = $this->db->execute($query, $token["id"])) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if (count($maps) > 0) {
				$titles = array();
				foreach ($maps as $map) {
					array_push($titles, "\"".$map["adventure"]." - ".$map["title"]."\"");
				}
				$this->view->add_message("This token is being used in the following maps: ".implode(", ", $titles));
				$result = false;
			}

			return $result;
		}

		public function delete_token($token_id) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->delete($token_id);
		}
	}
?>
