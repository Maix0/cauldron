<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_page_controller extends Banshee\controller {
		private function show_page_overview() {
			if (($pages = $this->model->get_pages()) === false) {
				$this->view->add_tag("result", "Database error.");
			} else {
				list($webserver) = explode(" ", $_SERVER["SERVER_SOFTWARE"], 2);

				$this->view->open_tag("overview", array("hiawatha" => show_boolean($webserver == "Hiawatha")));
				$this->view->open_tag("pages");
				foreach ($pages as $page) {
					$page["visible"] = show_boolean($page["visible"]);
					$this->view->record($page, "page");
				}
				$this->view->close_tag();
				$this->view->close_tag();
			}
		}

		private function show_page_form($page) {
			$this->view->set_xslt_parameter("admin_role_id", ADMIN_ROLE_ID);

			$page["private"] = show_boolean($page["private"]);
			$page["visible"] = show_boolean($page["visible"]);
			$page["back"] = show_boolean($page["back"]);
			$page["form"] = show_boolean($page["form"]);

			$args = array();
			if (isset($page["id"])) {
				$args["id"] = $page["id"];
			}

			$this->view->add_javascript("banshee/textarea-tab.js");
			$this->view->add_javascript("cms/page.js");
			$this->view->add_ckeditor("div.btn-group");
			$this->view->add_help_button();

			$args = array();
			if ($page["preview"] != null) {
				$args["preview"] = $page["preview"];
			}

			$this->view->open_tag("edit", $args);

			/* Languages
			 */
			$this->view->open_tag("languages");
			foreach (config_array(SUPPORTED_LANGUAGES) as $code => $lang) {
				$this->view->add_tag("language", $lang, array("code" => $code));
			}
			$this->view->close_tag();

			/* Layouts
			 */
			$this->view->open_tag("layouts", array("current" => $page["layout"]));
			if (($layouts = $this->model->get_layouts()) != false) {
				foreach ($layouts as $layout) {
					$this->view->add_tag("layout", $layout);
				}
			}
			$this->view->close_tag();

			/* Roles
			 */
			$this->view->open_tag("roles");
			if (($roles = $this->model->get_roles()) != false) {
				foreach ($roles as $role) {
					$this->view->add_tag("role", $role["name"], array(
						"id"      => $role["id"],
						"checked" => show_boolean($page["roles"][$role["id"]])));
				}
			}
			$this->view->close_tag();

			/* Dynamic page content
			 */
			if (class_exists("dynamic_page_blocks")) {
				$sections = dynamic_page_blocks::available_sections();
				$this->view->add_tag("blocks", implode(", ", $sections));
			}

			/* Page data
			 */
			$this->view->record($page, "page", $args);

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save page") {
					/* Save page
					 */
					$_POST["url"] = "/".trim($_POST["url"], "/ ");
					if ($this->model->save_oke($_POST) == false) {
						$this->show_page_form($_POST);
					} else if (isset($_POST["id"]) == false) {
						/* Create page
						 */
						if ($this->model->create_page($_POST) === false) {
							$this->view->add_message("Database error while creating page.");
							$this->show_page_form($_POST);
						} else {
							$this->user->log_action("page %s created", $_POST["url"]);
							$this->show_page_overview();
						}
					} else {
						/* Update user
						 */
						$url = $this->model->get_url($_POST["id"]);

						if ($this->model->update_page($_POST, $_POST["id"]) === false) {
							$this->view->add_message("Database error while updating page.");
							$this->show_page_form($_POST);
						} else {
							if ($_POST["url"] == $url) {
								$name = $_POST["url"];
							} else {
								$name = sprintf("%s -> %s", $url, $_POST["url"]);
							}
							$this->user->log_action("page %s updated", $name);

							list($webserver) = explode(" ", $_SERVER["SERVER_SOFTWARE"], 2);
							if ($this->settings->hiawatha_cache_enabled && ($webserver == "Hiawatha")) {
								if ($_POST["url"] == "/".$this->settings->start_page) {
									header("X-Hiawatha-Cache-Remove: all");
								} else {
									header("X-Hiawatha-Cache-Remove: ".$_POST["url"]);
								}
							}

							$this->show_page_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Preview page") {
					/* Preview page
					 */
					$preview = $_POST;
					$preview["url"] .= "-".random_string(32);
					$preview["visible"] = NO;
					$preview["private"] = NO;
					$preview["roles"] = null;

					if ($this->model->create_page($preview) === false) {
						$this->view->add_message("Error while creating preview.");
					} else {
						$_POST["preview"] = $preview["url"];
					}

					$this->show_page_form($_POST);
				} else if ($_POST["submit_button"] == "Delete preview") {
					/* Delete previewed page
					 */
					$this->model->delete_preview($_POST["url"]);
				} else if ($_POST["submit_button"] == "Delete page") {
					/* Delete page
					 */
					$url = $this->model->get_url($_POST["id"]);

					if ($this->model->delete_page($_POST["id"]) == false) {
						$this->view->add_tag("result", "Database error while deleting page.");
					} else {
						$this->user->log_action("page %s deleted", $url);
						$this->show_page_overview();
					}
				} else if ($_POST["submit_button"] == "Clear Hiawatha cache") {
					header("X-Hiawatha-Cache-Remove: all");
					$this->view->add_system_message("Hiawatha webserver cache cleared.");
					$this->show_page_overview();
				} else {
					$this->show_page_overview();
				}
			} else if ($this->page->parameters[0] == "new") {
				/* Show the user webform
				 */
				$page = array(
					"url"      => "/",
					"language" => $this->settings->default_language,
					"layout"   => null,
					"visible"  => 1,
					"roles"    => array());
				$this->show_page_form($page);
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Show the user webform
				 */
				if (($page = $this->model->get_page($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Page not found.");
				} else {
					$this->show_page_form($page);
				}
			} else {
				/* Show a list of all users
				 */
				$this->show_page_overview();
			}
		}
	}
?>
