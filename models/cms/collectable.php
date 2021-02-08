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

		private function save_image($image, $id) {
			return copy($image["tmp_name"], "files/collectables/".$id."_".$image["name"]);
		}

		public function create_collectable($collectable, $image) {
			$keys = array("id", "game_id", "name", "image", "found", "hide");

			$collectable["id"] = null;
			$collectable["game_id"] = $_SESSION["edit_game_id"];
			$collectable["image"] = $image["name"];
			$collectable["found"] = is_true($collectable["found"]) ? YES : NO;
			$collectable["hide"] = is_true($collectable["hide"]) ? YES : NO;

			if ($this->db->insert("collectables", $collectable, $keys) === false) {
				return false;
			}
			$collectable_id = $this->db->last_insert_id;

			if ($this->save_image($image, $collectable_id)) {
				$data = array("image" => $collectable_id."_".$image["name"]);
				$this->db->update("collectables", $collectable_id, $data);
			} else {
				$this->delete_collectable($collectable_id);
				return false;
			}

			return true;
		}

		public function update_collectable($collectable, $image) {
			if ($this->get_collectable($collectable["id"]) == false) {
				$this->view->add_message("Map not found.");
				return false;
			}

			$keys = array("name", "found", "hide");

			if ($image["error"] == 0) {
				if (($current = $this->get_collectable($collectable["id"])) == false) {
					return false;
				}

				if ($this->save_image($image, $collectable["id"])) {
					array_push($keys, "image");
					$collectable["image"] = $collectable["id"]."_".$image["name"];
				} else {
					return false;
				}

				unlink("files/collectables/".$current["image"]);
			}

			$collectable["found"] = is_true($collectable["found"]) ? YES : NO;
			$collectable["hide"] = is_true($collectable["hide"]) ? YES : NO;

			return $this->db->update("collectables", $collectable["id"], $collectable, $keys);
		}

		public function delete_oke($collectable) {
			$result = true;

			if ($this->get_collectable($collectable["id"]) == false) {
				$this->view->add_message("Map not found.");
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

			unlink("files/collectables/".$current["image"]);

			return true;
		}
	}
?>
