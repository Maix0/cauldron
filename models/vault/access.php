<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_access_model extends Banshee\model {
		public function get_all_users() {
			$query = "select id, username from users where organisation_id=%d order by username";
			if (($users = $this->db->execute($query, $this->user->organisation_id)) === false) {
				return false;
			}

			$query = "select role_id from user_role where user_id=%d";
			foreach ($users as $i => $user) {
				if (($roles = $this->db->execute($query, $user["id"])) === false) {
					return false;
				}
				$users[$i]["roles"] = array_flatten($roles);
			}

			return $users;
		}

		public function get_private_modules() {
			if (($columns = $this->db->execute("show columns from %S", "roles")) === false) {
				return false;
			}

			$result = array();
			foreach ($columns as $column) {
				if (strstr($column["Type"], "INTEGER") === false) {
					continue;
				}
				if ($this->user->is_admin == false) {
					if ($this->user->access_allowed($column["Field"]) == false) {
						continue;
					}
				}
				array_push($result, $column["Field"]);
			}
			sort($result);

			return $result;
		}

		public function get_private_pages() {
			$query = "select id, url from pages where private=%d order by url";
			if (($pages = $this->db->execute($query, 1)) === false) {
				return false;
			}

			$result = array();
			$query = "select * from page_access where page_id=%d";
			foreach ($pages as $page) {
				$page["access"] = array(ADMIN_ROLE_ID => 1);
				if (($access = $this->db->execute($query, $page["id"])) != false) {
					foreach ($access as $right) {
						$page["access"][$right["role_id"]] = $right["level"];
					}
				}
				array_push($result, $page);
			}

			return $result;
		}

		public function get_all_roles() {
			$query = "select * from roles";
			if ($this->user->is_admin == false) {
				$query .= " where non_admins=%d";
			}
			$query .= " order by name";

			return $this->db->execute($query, YES);
		}
	}
?>
