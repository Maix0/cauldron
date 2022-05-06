<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	require "../controllers/cms/file.php";

	class cms_resources_controller extends cms_file_controller {
		protected $root = "resources";

		protected function get_base_dir() {
			return "resources/".$this->user->resources_key;
		}

        public function execute() {
			parent::execute();

			if ($this->user->max_resources > 0) {
				$resources = $this->model->get_directory_size($this->get_base_dir());
				$capacity = round($resources / MB * 100 / $this->user->max_resources);
				$this->view->add_tag("capacity", $capacity, array("max" => $this->user->max_resources));
			}
		}
	}
?>
