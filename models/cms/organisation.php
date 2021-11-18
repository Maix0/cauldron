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
			$query = "select *, (select count(*) from users where organisation_id=o.id) as users, ".
			         "(select count(*) from games g, users u where g.dm_id=u.id and u.organisation_id=o.id) as games, ".
			         "(select count(*) from tokens t where t.organisation_id=o.id) as tokens, ".
			         "(select count(*) from maps m, games g, users u where m.game_id=g.id and g.dm_id=u.id and u.organisation_id=o.id) as maps ".
			         "from organisations o order by name limit %d,%d";

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
			$keys = array("id", "name", "resources_key", "max_resources");

			$resources_key = random_string(32);

			$organisation["id"] = null;
			$organisation["resources_key"] = $resources_key;

			if (($this->db->insert("organisations", $organisation, $keys)) === false) {
				return false;
			}

			mkdir("resources/".$resources_key, 0755);
			mkdir("resources/".$resources_key."/audio", 0755);
			mkdir("resources/".$resources_key."/characters", 0755);
			mkdir("resources/".$resources_key."/collectables", 0755);
			mkdir("resources/".$resources_key."/effects", 0755);
			mkdir("resources/".$resources_key."/maps", 0755);
			mkdir("resources/".$resources_key."/tokens", 0755);

			return true;
		}

		public function update_organisation($organisation) {
			$keys = array("name", "max_resources");

			return $this->db->update("organisations", $organisation["id"], $organisation, $keys);
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
			/* Delete games
			 */
			$query = "select g.id from games g, users u where g.dm_id=u.id and u.organisation_id=%d";
			if (($games = $this->db->execute($query, $organisation_id)) === false) {
				return false;
			}

			foreach ($games as $game) {
				if ($this->borrow("cms/game")->delete_game($game["id"]) === false) {
					return false;
				}
			}

			/* Delete users
			 */
			$query = "select id from users where organisation_id=%d";
			if (($users = $this->db->execute($query, $organisation_id)) === false) {
				return false;
			}

			foreach ($users as $user) {
				if ($this->borrow("cms/user")->delete_user($user["id"]) === false) {
					return false;
				}
			}

			/* Delete organsattion
			 */
			if (($organisation = $this->db->entry("organisations", $organisation_id)) == false) {
				return false;
			}

			$queries = array(
				array("delete from tokens where organisation_id=%d", $organisation_id),
				array("delete from organisations where id=%d", $organisation_id));

			if ($this->db->transaction($queries) === false) {
				return false;
			}

			if ($organisation["resources_key"] != "") {
				$this->remove_directory("resources/".$organisation["resources_key"]);
			}

			return true;
		}
	}
?>
