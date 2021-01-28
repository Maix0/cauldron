<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_apitest_controller extends Banshee\controller {
		private function show_form($data) {
			$this->view->open_tag("form");

			$methods = array("GET", "POST", "PUT", "DELETE");
			$this->view->open_tag("methods");
			foreach ($methods as $method) {
				$this->view->add_tag("method", $method);
			}
			$this->view->close_tag();

			$types = array("ajax", "xml", "json");
			$this->view->open_tag("types");
			foreach ($types as $type) {
				$this->view->add_tag("type", $type);
			}
			$this->view->close_tag();

			$this->view->record($data);

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if (($result = $this->model->request_result($_POST)) === false) {
					$this->view->add_message("Request error.");
				} else {
					if ($result["status"] != 200) {
						$this->view->add_message("Request result: %s", $result["status"]);
					}
					$this->view->add_tag("result", $result["body"]);
				}

				$this->show_form($_POST);
			} else {
				$data = array("url" => "/");
				$this->show_form($data);
			}
		}
	}
?>
