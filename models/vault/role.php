<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_role_model extends Banshee\model {
		public function get_all_roles() {
			$query = "select *, (select count(*) from user_role where role_id=r.id) as users from roles r order by name";

			return $this->db->execute($query);
		}

		public function get_role($role_id) {
			return $this->db->entry("roles", $role_id);
		}

		public function get_role_members($role_id) {
			$query = "select u.id, u.fullname, u.email from users u, user_role m ".
					 "where u.id=m.user_id and m.role_id=%d order by u.fullname";

			return $this->db->execute($query, $role_id);
		}

		public function get_restricted_pages() {
			if (($columns = $this->db->execute("show columns from %S", "roles")) === false) {
				return false;
			}

			$result = array();
			foreach ($columns as $column) {
				if (strstr($column["Type"], "INTEGER") !== false) {
					array_push($result, $column["Field"]);
				}
			}
			sort($result);

			return $result;
		}

		public function save_okay($role) {
			$result = true;

			$query = "select id,name from roles where name=%s";
			if (($roles = $this->db->execute($query, $role["name"])) === false) {
				$this->view->add_system_warning("Error while checking name uniqueness.");
				return false;
			}
			foreach ($roles as $current) {
				if (($current["name"] == $role["name"]) && ($current["id"] != $role["id"])) {
					$this->view->add_message("Role already exists.");
					$result = false;
					break;
				}
			}

			if (($role["id"] ?? null) == ADMIN_ROLE_ID) {
				$this->view->add_message("This role cannot be changed.");
				$result = false;
			}

			if ($role["name"] == "") {
				$this->view->add_message("The name cannot be empty.");
				$result = false;
			}

			return $result;
		}

		public function delete_okay($role) {
			return $role["id"] != ADMIN_ROLE_ID;
		}

		private function fix_role_data($keys, $role) {
			/* Work-around for PHP's nasty dot-to-underscore replacing
			 */
			foreach ($keys as $key) {
				if (isset($role[$key]) == false) {
					$alt_key = str_replace(".", "_", $key);
					$role[$key] = $role[$alt_key] ?? null;
				}
			}

			return $role;
		}

		private function role_value($value) {
			if ($value === null) {
				return NO;
			}

			if ($value === "on") {
				return YES;
			}

			$value = (int)$value;
			if (($value < 0) || ($value > 2)) {
				return NO;
			}

			return $value;
		}

		public function create_role($role) {
			$keys = $this->get_restricted_pages();
			$role = $this->fix_role_data($keys, $role);

			foreach ($keys as $key) {
				$role[$key] = $this->role_value($role[$key]);
			}

			array_unshift($keys, "id", "name", "non_admins");

			$role["id"] = null;
			$role["non_admins"] = is_true($role["non_admins"] ?? false) ? YES : NO;

			return $this->db->insert("roles", $role, $keys) !== false;
		}

		public function update_role($role) {
			$keys = $this->get_restricted_pages();
			$role = $this->fix_role_data($keys, $role);

			foreach ($keys as $key) {
				$role[$key] = $this->role_value($role[$key]);
			}

			array_unshift($keys, "name", "non_admins");

			$role["non_admins"] = is_true($role["non_admins"] ?? false) ? YES : NO;

			return $this->db->update("roles", $role["id"], $role, $keys) !== false;
		}

		public function delete_role($role_id) {
			$queries = array(
				array("delete from page_access where role_id=%d", $role_id),
				array("delete from user_role where role_id=%d", $role_id),
				array("delete from roles where id=%d", $role_id));

			return $this->db->transaction($queries);
		}
	}
?>
