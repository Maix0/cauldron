<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	require "../models/vault/file.php";

	class vault_resources_model extends vault_file_model {
		protected $max_capacity = true;
	}
?>
