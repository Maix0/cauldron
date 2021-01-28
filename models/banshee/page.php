<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class banshee_page_model extends Banshee\model {
		private function get_page_for_language($url, $language = null) {
			static $pages = null;

			if ($pages === null) {
				$query = "select * from pages where url=%s";
				$pages = $this->db->execute($query, $url);
			}

			if ($pages == false) {
				return false;
			}

			foreach ($pages as $page) {
				if ($page["language"] == $language) {
					return $page;
				}

				if ($language === null) {
					return $page;
				}
			}

			return false;
		}

		public function get_page($url) {
			if (isset($_SERVER["HTTP_ACCEPT_LANGUAGE"])) {	
				$languages = explode(",", $_SERVER["HTTP_ACCEPT_LANGUAGE"]);
				foreach ($languages as $language) {
					$language = substr(ltrim($language), 0, 2);
					if (valid_input($language, VALIDATE_LETTERS, 2)) {
						if (($page = $this->get_page_for_language($url, $language)) != false) {
							return $page;
						}
					}
				}
			}

			if (($page = $this->get_page_for_language($url, $this->settings->default_language)) != false) {
				return $page;
			}

			if (($page = $this->get_page_for_language($url, "en")) != false) {
				return $page;
			}

			if (($page = $this->get_page_for_language($url)) != false) {
				return $page;
			}

			return false;
		}
	}
?>
