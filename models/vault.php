<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_model extends Banshee\model {
		public function reset_idle() {
			$query = "update organisations set last_login=%s where id=%d";

			$this->db->query($query, date("Y-m-d H:i:s"), $this->user->organisation_id);
		}
	}
?>
