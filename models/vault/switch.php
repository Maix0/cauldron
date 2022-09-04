<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_switch_model extends Banshee\model {
		public function get_user($user_id) {
			return $this->db->entry("users", $user_id);
		}

		public function get_users() {
			$query = "select * from users where id!=%d and status!=%d order by username";

			return $this->db->execute($query, $this->user->id, USER_STATUS_DISABLED);
		}
	}
?>
