<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class sitemap_controller extends Banshee\controller {
		public function execute() {
			$this->view->content_type = "application/xml";

			if ($this->view->fetch_from_cache("sitemap")) {
				return;
			}

			$this->view->start_caching("sitemap");

			$this->view->add_tag("protocol", $_SERVER["HTTP_SCHEME"]);
			$this->view->add_tag("hostname", $_SERVER["SERVER_NAME"]);

			$this->view->open_tag("urls");

			$urls = $this->model->get_public_urls();
			foreach ($urls as $url) {
				if (strpos($url, "*") !== false) {
					continue;
				}

				$this->view->open_tag("url");
				$this->view->add_tag("loc", $url);
				$this->view->close_tag();
			}
			$this->view->close_tag();

			$this->view->stop_caching();
		}
	}
?>
