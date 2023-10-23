<?php
	class vault_organisation_model extends Banshee\model {
		public function count_organisations() {
			$query = "select count(*) as count from organisations";

			if (($result = $this->db->execute($query)) == false) {
				return false;
			}

			return $result[0]["count"];
		}

		public function get_organisations($offset, $limit) {
			$query = "select *, (select count(*) from users where organisation_id=o.id) as users, ".
			         "(select count(*) from adventures a, users u where a.dm_id=u.id and u.organisation_id=o.id) as adventures, ".
			         "(select count(*) from tokens t where t.organisation_id=o.id) as tokens, ".
			         "(select count(*) from characters c, users u where c.user_id=u.id and u.organisation_id=o.id) as characters, ".
			         "(select count(*) from maps m, adventures a, users u where m.adventure_id=a.id and a.dm_id=u.id and u.organisation_id=o.id) as maps, ".
			         "(select count(*) from map_token t, maps m, adventures a, users u where t.map_id=m.id and m.adventure_id=a.id and a.dm_id=u.id and u.organisation_id=o.id) as placed ".
			         "from organisations o order by name limit %d,%d";

			return $this->db->execute($query, $offset, $limit);
		}

		public function get_organisation($organisation_id) {
			return $this->db->entry("organisations", $organisation_id);
		}

		public function get_users($organisation_id) {
			$query = "select u.*, r.role_id from users u left join user_role r on u.id=r.user_id and r.role_id=%d ".
			         "where u.organisation_id=%d order by fullname";

			return $this->db->execute($query, DUNGEON_MASTER_ROLE_ID, $organisation_id);
		}

		public function save_okay($organisation) {
			$result = true;

			if (trim($organisation["name"]) == "") {
				$this->view->add_message("Empty name is not allowed.");
				$result = false;
			}

			if (($check = $this->db->entry("organisations", $organisation["name"], "name")) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if ($check != false) {
				if ($check["id"] != ($organisation["id"] ?? null)) {
					$this->view->add_message("Organisation name already exists.");
					$result = false;
				}
			}

			return $result;
		}

		public function create_organisation($organisation) {
			$keys = array("id", "name", "resources_key", "max_resources", "invitation_code");

			$resources_key = random_string(32);

			$organisation["id"] = null;
			$organisation["resources_key"] = $resources_key;
			$organisation["invitation_code"] = null;

			if (($this->db->insert("organisations", $organisation, $keys)) === false) {
				return false;
			}

			$organisation_id = $this->db->last_insert_id;

			mkdir("resources/".$resources_key, 0755);
			foreach (USER_SUB_DIRECTORIES as $directory) {
				mkdir("resources/".$resources_key."/".$directory, 0755);
			}

			return $organisation_id;
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

		public function delete_okay($organisation) {
			$result = true;

			if ($organisation["id"] == $this->user->organisation_id) {
				$this->view->add_message("You cannot delete your own organisation.");
				$result = false;
			}

			return $result;
		}

		public function delete_organisation($organisation_id) {
			/* Delete adventures
			 */
			$query = "select a.id from adventures a, users u where a.dm_id=u.id and u.organisation_id=%d";
			if (($adventures = $this->db->execute($query, $organisation_id)) === false) {
				return false;
			}

			foreach ($adventures as $adventure) {
				if ($this->borrow("vault/adventure")->delete_adventure($adventure["id"]) === false) {
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
				if ($this->borrow("vault/user")->delete_user($user["id"]) === false) {
					return false;
				}
			}

			/* Delete organisation
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
