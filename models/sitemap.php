<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class sitemap_model extends Banshee\model {
		public function get_public_urls() {
			/* Modules on disk
			 */
			$exclude = array("captcha.png", "logout", "offline", "password", "sitemap.xml");

			$urls = array_diff(config_file("public_modules"), $exclude);

			/* Pages from database
			 */
			$query = "select url from pages where private=%d";
			if (($pages = $this->db->execute($query, NO)) != false) {
				foreach ($pages as $page) {
					array_push($urls, ltrim($page["url"], "/"));
				}
			}

			sort($urls);

			return $urls;
		}
	}
?>
