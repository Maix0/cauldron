<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class banshee_page_controller extends Banshee\controller {
		public function execute() {
			if (($page = $this->model->get_page($this->page->url)) == false) {
				$this->view->add_tag("website_error", 500);
				return;
			}

			/* Page header
			 */
			if (trim($page["description"]) != "") {
				$this->view->description = $page["description"];
			}
			if (trim($page["keywords"]) != "") {
				$this->view->keywords = $page["keywords"];
			}
			$this->view->title = $page["title"];
			if ($page["style"] != null) {
				$this->view->add_inline_css($page["style"]);
			}
			$this->view->language = $page["language"];

			$this->view->set_layout($page["layout"]);

			$this->view->add_css("banshee/font-awesome.css");

			/* Page content
			 */
			$this->view->open_tag("page");

			$this->view->add_tag("title", $page["title"]);

			/* Page form
			 */
			if (is_true($page["form"])) {
				$page_form = new \Banshee\form_script($this->view, $this->settings, $page["content"]);
				if ($_SERVER["REQUEST_METHOD"] == "POST") {
					if ($page_form->handle_post($_POST, $page["title"], $page["form_email"], $this->user) == false) {
						$page["content"] = $page_form->generate_form($_POST);
					} else {
						$page["content"] = $page["form_done"];
						if (substr($page["content"], 0, 1) != "<") {
							$page["content"] = "<p>".$page["content"]."</p>\n";
						}
						$page["form"] = false;
					}
				} else {
					$page["content"] = $page_form->generate_form();
				}
			}

			/* Dynamic content block
			 */
			if (class_exists("dynamic_page_blocks")) {
				$dynamic = new dynamic_page_blocks($this->db, $this->settings, $this->user, $this->page, $this->view);
				$page["content"] = $dynamic->execute($page["content"]);
			}

			/* Page to view
			 */
			if (is_true($page["form"])) {
				$this->view->add_css("banshee/page_form.css");

				$this->view->open_tag("form");
				$this->view->add_tag("url", $page["url"]);
				$this->view->add_tag("submit", $page["form_submit"]);
				$this->view->add_tag("content", $page["content"]);
				$this->view->close_tag();
			} else {
				$this->view->add_tag("content", $page["content"]);
				$this->view->allow_hiawatha_cache();
			}

			if (is_true($page["back"])) {
				$parts = explode("/", $this->page->page);
				array_pop($parts);
				$this->view->add_tag("back", implode("/", $parts));
			}

			$this->view->close_tag();
		}
	}
?>
