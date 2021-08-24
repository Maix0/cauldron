<?php
	class cms_organisation_model extends Banshee\model {
		public function count_organisations() {
			$query = "select count(*) as count from organisations";

			if (($result = $this->db->execute($query)) == false) {
				return false;
			}

			return $result[0]["count"];
		}

		public function get_organisations($offset, $limit) {
			$query = "select * from organisations limit %d,%d";

			return $this->db->execute($query, $offset, $limit);
		}

		public function get_organisation($organisation_id) {
			return $this->db->entry("organisations", $organisation_id);
		}

		public function get_users($organisation_id) {
			$query = "select * from users where organisation_id=%d order by fullname";

			return $this->db->execute($query, $organisation_id);
		}

		public function save_oke($organisation) {
			$result = true;

			if (trim($organisation["name"]) == "") {
				$this->view->add_message("Empty name is not allowed.");
				$result = false;
			}

			if (($check = $this->db->entry("organisations", $organisation["name"], "name")) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if ($check != false) {
				if ($check["id"] != $organisation["id"]) {
					$this->view->add_message("Organisation name already exists.");
					$result = false;
				}
			}

			return $result;
		}

		public function create_organisation($organisation) {
			$keys = array("id", "name", "files_key");

			$files_key = random_string(32);

			$organisation["id"] = null;
			$organisation["files_key"] = $files_key;

			if (($this->db->insert("organisations", $organisation, $keys)) === false) {
				return false;
			}

			mkdir("files/".$files_key, 0755);
			mkdir("files/".$files_key."/audio", 0755);
			mkdir("files/".$files_key."/characters", 0755);
			mkdir("files/".$files_key."/collectables", 0755);
			mkdir("files/".$files_key."/effects", 0755);
			mkdir("files/".$files_key."/maps", 0755);
			mkdir("files/".$files_key."/tokens", 0755);

			return true;
		}

		public function update_organisation($organisation) {
			$keys = array("name");

			return $this->db->update("organisations", $organisation["id"], $organisation, $keys);
		}

		public function delete_oke($organisation_id) {
			$query = "select count(*) as count from users where organisation_id=%d";

			if (($result = $this->db->execute($query, $organisation_id)) === false) {
				$this->view->add_system_warming("Database error.");
				return false;
			}

			if ((int)$result[0]["count"] > 0) {
				$this->view->add_message("Organisation in use.");
				return false;
			}

			return true;
		}

		private function remove_directory($directory) {
			if (($dp = opendir($directory)) == false) {
				return false;
			}

			while (($file = readdir($dp)) != false) {
				if (($file == ".") || ($file == "..")) {
					continue;
				}

				$path = $directory."/".$file;
				if (is_dir($path)) {
					$this->remove_directory($path);
				} else {
					unlink($path);
				}
			}

			closedir($dp);

			return rmdir($directory);
		}

		public function delete_organisation($organisation_id) {
			if (($organisation = $this->db->entry("organisations", $organisation_id)) == false) {
				return false;
			}

			if ($this->db->delete("organisations", $organisation_id) == false) {
				return false;
			}

			if ($organisation["files_key"] != "") {
				$this->remove_directory("files/".$organisation["files_key"]);
			}

			return true;
		}
	}
?>
