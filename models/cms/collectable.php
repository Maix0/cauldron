<?php
	class cms_collectable_model extends Banshee\model {
		public function get_games() {
			$query = "select * from games where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function is_my_game($game_id) {
			$query = "select * from games where id=%d and dm_id=%d";

			return $this->db->execute($query, $game_id, $this->user->id) != false;
		}

		public function get_collectables() {
			$query = "select * from collectables where game_id=%d order by name";

			return $this->db->execute($query, $_SESSION["edit_game_id"]);
		}

		public function get_collectable($collectable_id) {
			$query = "select c.* from collectables c, games g ".
			         "where c.game_id=g.id and c.id=%d and g.dm_id=%d";

			if (($collectables = $this->db->execute($query, $collectable_id, $this->user->id)) == false) {
				return false;
			}

			return $collectables[0];
		}

		public function save_oke($collectable, $image) {
			$result = true;

			if (isset($collectable["id"])) {
				if ($this->get_collectable($collectable["id"]) == false) {
					$this->view->add_message("Collectable not found.");
					$result = false;
				}
			}

			if (trim($collectable["name"]) == "") {
				$this->view->add_message("Specify a name.");
				$result = false;
			}

			if (isset($collectable["id"]) == false) {
				if ($image["error"] != 0) {
					$this->view->add_message("Upload an image.");
					$result = false;
				}
			}

			return $result;
		}

		private function make_filename($id, $name) {
			return $id."_".str_replace(" ", "_", strtolower($name));
		}

		private function save_image($image, $filename) {
			return copy($image["tmp_name"], "files/".$this->user->files_key."/collectables/".$filename);
		}

		public function create_collectable($collectable, $image) {
			$keys = array("id", "game_id", "name", "image", "found", "hide");

			$collectable["id"] = null;
			$collectable["game_id"] = $_SESSION["edit_game_id"];
			$collectable["image"] = "";
			$collectable["found"] = is_true($collectable["found"]) ? YES : NO;
			$collectable["hide"] = is_true($collectable["hide"]) ? YES : NO;

			if ($this->db->insert("collectables", $collectable, $keys) === false) {
				return false;
			}
			$collectable_id = $this->db->last_insert_id;

			$filename = $this->make_filename($collectable_id, $image["name"]);
			if ($this->save_image($image, $filename)) {
				$data = array("image" => $filename);
				$this->db->update("collectables", $collectable_id, $data);
			} else {
				$this->delete_collectable($collectable_id);
				return false;
			}

			return true;
		}

		public function update_collectable($collectable, $image) {
			$keys = array("name", "found", "hide");

			if ($image["error"] == 0) {
				if (($current = $this->get_collectable($collectable["id"])) == false) {
					return false;
				}

				unlink("files/".$this->user->files_key."/collectables/".$current["image"]);

				$collectable["image"] = $this->make_filename($collectable["id"], $image["name"]);
				if ($this->save_image($image, $collectable["image"])) {
					array_push($keys, "image");
				} else {
					return false;
				}
			}

			$collectable["found"] = is_true($collectable["found"]) ? YES : NO;
			$collectable["hide"] = is_true($collectable["hide"]) ? YES : NO;

			return $this->db->update("collectables", $collectable["id"], $collectable, $keys);
		}

		public function delete_oke($collectable) {
			$result = true;

			if ($this->get_collectable($collectable["id"]) == false) {
				$this->view->add_message("Collectable not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_collectable($collectable_id) {
			if (($current = $this->get_collectable($collectable_id)) == false) {
				return false;
			}

			if ($this->db->delete("collectables", $collectable_id) == false) {
				return false;
			}

			unlink("files/".$this->user->files_key."/collectables/".$current["image"]);

			return true;
		}
	}
?>
