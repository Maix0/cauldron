<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_language_controller extends Banshee\tablemanager_controller {
		protected $name = "Language";
		protected $icon = "language.png";
		protected $back = "cms";

		public function execute() {
			if (is_a($this->language, "\Banshee\Core\language")) {
				parent::execute();
			} else {
				$this->view->open_tag("tablemanager");
				$this->view->add_tag("name", "Language");
				$this->view->add_tag("result", "Multiple languages are not supported by this website.", array("url" => "admin", "seconds" => "5"));
				$this->view->close_tag();
			}
		}
	}
?>
