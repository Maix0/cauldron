<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class banshee_error_controller extends Banshee\controller {
		public function execute() {
			$this->view->add_tag("website_error", $this->page->http_code);
			$this->view->add_tag("webmaster_email", $this->settings->webmaster_email);
		}
	}
?>
