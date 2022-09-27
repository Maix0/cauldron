<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_page_model extends Banshee\model {
		private $default_layout = "Default layout";

		public function get_pages() {
			$query = "select id, url, language, private, title, visible from pages order by url";

			return $this->db->execute($query);
		}

		public function get_page($page_id) {
			if (($page = $this->db->entry("pages", $page_id)) == false) {
				return false;
			}

			$query = "select role_id,level from page_access where page_id=%d";
			if (($roles = $this->db->execute($query, $page_id)) === false) {
				return false;
			}

			$page["roles"] = array();
			foreach ($roles as $role) {
				$page["roles"][$role["role_id"]] = $role["level"];
			}

			return $page;
		}

		public function get_url($page_id) {
			if (($page = $this->db->entry("pages", $page_id)) == false) {
				return false;
			}

			return $page["url"];
		}

		public function get_roles() {
			$query = "select id, name from roles order by name";

			return $this->db->execute($query);
		}

		public function get_layouts() {
			if (($fp = fopen("../views/banshee/main.xslt", "r")) == false) {
				return false;
			}

			$result = array($this->default_layout);
			while (($line = fgets($fp)) !== false) {
				if (strpos($line, "xsl:import") !== false) {
					list(, $layout) = explode('"', $line);
					$layout = str_replace(".xslt", "", $layout);

					$parts = explode("_", $layout, 2);
					if (($parts[0] == "layout") && isset($parts[1])) {
						array_push($result, $parts[1]);
					}
				}
			}

			fclose($fp);

			return $result;
		}

		private function url_belongs_to_module($url, $config) {
			$url = ltrim($url, "/");
			$modules = page_to_module(config_file($config));

			$url_parts = explode("/", $url);
			while (count($url_parts) > 0) {
				if (in_array(implode("/", $url_parts), $modules)) {
					return true;
				}
				array_pop($url_parts);
			}

			return false;
		}

		public function save_okay($page) {
			$result = true;

			if (valid_input(trim($page["url"]), VALIDATE_URL, VALIDATE_NONEMPTY) == false) {
				$this->view->add_message("URL is empty or contains invalid characters.");
				$result = false;
			} else if ((strpos($page["url"], "//") !== false) || ($page["url"][0] !== "/")) {
				$this->view->add_message("Invalid URL.");
				$result = false;
			}

			if (in_array($page["language"], array_keys(config_array(SUPPORTED_LANGUAGES))) == false) {
				$this->view->add_message("Language not supported.");
				$result = false;
			}

			if (($layouts = $this->get_layouts()) != false) {
				if (in_array($page["layout"], $layouts) == false) {
					$this->view->add_message("Invalid layout.");
					$result = false;
				}
			}

			if (trim($page["title"]) == "") {
				$this->view->add_message("Empty title not allowed.");
				$result = false;
			}

			if (valid_input($page["language"], VALIDATE_NONCAPITALS, 2) == false) {
				$this->view->add_message("Invalid language code.");
				$result = false;
			}

			if ($this->url_belongs_to_module($page["url"], "public_modules")) {
				$this->view->add_message("The URL belongs to a public module.");
				$result = false;
			} else if ($this->url_belongs_to_module($page["url"], "private_modules")) {
				$this->view->add_message("The URL belongs to a private module.");
				$result = false;
			} else {
				$query = "select count(*) as count from pages where id!=%d and url=%s and language=%s";
				if (($check = $this->db->execute($query, $page["id"] ?? 0, $page["url"], $page["language"])) === false) {
					$this->view->add_system_warning("Error while verifying the URL.");
					$result = false;
				} else if ($check[0]["count"] > 0) {
					$this->view->add_message("The URL and language combination already exists.");
					$result = false;
				}
			}

			if (is_true($page["form"] ?? false)) {
				$page_form = new \Banshee\form_script($this->view, $this->settings, $page["content"]);
				if ($page_form->valid_script() == false) {
					$result = false;
				}

				if (trim($page["form_submit"]) == "") {
					$this->view->add_message("Form submit button text is empty.");
					$result = false;
				}

				if (valid_email($page["form_email"]) == false) {
					$this->view->add_message("Invalid e-mail address in form settings.");
					$result = false;
				}

				if (trim($page["form_done"]) == "") {
					$this->view->add_message("The text to show after form submit is empty.");
					$result = false;
				}
			}

			return $result;
		}

		public function save_access($page_id, $roles) {
			if ($this->db->query("delete from page_access where page_id=%d", $page_id) === false) {
				return false;
			}

			if (is_array($roles) == false) {
				return true;
			}

			foreach ($roles as $role_id => $has_role) {
				if (is_false($has_role) || ($role_id == ADMIN_ROLE_ID)) {
					continue;
				}

				$values = array(
					"page_id" => (int)$page_id,
					"role_id" => (int)$role_id,
					"level"   => 1);
				if ($this->db->insert("page_access", $values) === false) {
					return false;
				}
			}

			return true;
		}

		public function create_page($page) {
			$keys = array("id", "url", "layout", "language", "private", "style",
			              "title", "description", "keywords", "content", "visible",
			              "back", "form", "form_submit", "form_email", "form_done");
			$page["id"] = null;
			$page["private"] = is_true($page["private"] ?? false) ? YES : NO;
			$page["visible"] = is_true($page["visible"] ?? false) ? YES : NO;
			$page["back"] = is_true($page["back"] ?? false) ? YES : NO;
			$page["form"] = is_true($page["form"] ?? false) ? YES : NO;

			$page["form_submit"] = null_if_empty($page["form_submit"]);
			$page["form_email"] = null_if_empty($page["form_email"]);
			$page["form_done"] = null_if_empty($page["form_done"]);

			if ($page["layout"] == $this->default_layout) {
				$page["layout"] = null;
			}

			$page["style"] = null_if_empty($page["style"]);

			if ($this->db->query("begin") == false) {
				return false;
			} else if ($this->db->insert("pages", $page, $keys) === false) {
				$this->db->query("rollback");
				return false;
			} else if ($this->save_access($this->db->last_insert_id, $page["roles"] ?? null) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") != false;
		}

		public function update_page($page, $page_id) {
			$keys = array("url", "language", "layout", "private", "style",
			              "title", "description", "keywords", "content", "visible",
			              "back", "form", "form_submit", "form_email", "form_done");
			$page["private"] = is_true($page["private"] ?? false) ? YES : NO;
			$page["visible"] = is_true($page["visible"] ?? false) ? YES : NO;
			$page["back"] = is_true($page["back"] ?? false) ? YES : NO;
			$page["form"] = is_true($page["form"] ?? false) ? YES : NO;

			$page["form_submit"] = null_if_empty($page["form_submit"]);
			$page["form_email"] = null_if_empty($page["form_email"]);
			$page["form_done"] = null_if_empty($page["form_done"]);

			if ($page["layout"] == $this->default_layout) {
				$page["layout"] = null;
			}

			$page["style"] = null_if_empty($page["style"]);

			if ($this->db->query("begin") == false) {
				return false;
			} else if ($this->db->update("pages", $page_id, $page, $keys) === false) {
				$this->db->query("rollback");
				return false;
			} else if ($this->save_access($page_id, $page["roles"] ?? null) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") != false;
		}

		public function delete_page($page_id) {
			$queries = array(
				array("delete from page_access where page_id=%d", $page_id),
				array("delete from pages where id=%d", $page_id));

			return $this->db->transaction($queries);
		}

		public function delete_preview($url) {
			if (strlen($url) <= 33) {
				return false;
			} else if (substr($url, -33, 1) != "-") {
				return false;
			}

			$query = "delete from pages where url=%s";
			return $this->db->query($query, $url) !== false;
		}
	}
?>
