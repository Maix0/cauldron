<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class api_controller extends controller {
		/* Set error code
		 *
		 * INPUT:  int error code
		 * OUTPUT: -
		 * ERROR:  -
		 */
		protected function set_error($code) {
			if ($code >= 400) {
				$this->view->add_tag("error", $code);
			}
			$this->page->set_http_code(500);
		}

		/* Default execute function
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function execute() {
			if ($this->page->ajax_request == false) {
				$this->view->disable();
				return;
			}

			$function = strtolower($_SERVER["REQUEST_METHOD"]);

			if (count($this->page->parameters) > 0) {
				$params = $this->page->parameters;
				foreach ($params as $i => $param) {
					if (preg_match('/^[0-9]+$/', $param)) {
						$params[$i] = "0";
					}
				}

				$uri_part = "_".implode("_", $params);
				$function .= $uri_part;
			}

			if (method_exists($this, $function)) {
				if (($_SERVER["REQUEST_METHOD"] == "POST") && (($_SERVER["HTTP_CONTENT_TYPE"] ?? null) == "application/octet-stream")) {
					$_POST = file_get_contents("php://input");
				}

				if (call_user_func(array($this, $function)) === false) {
					$this->set_error(500);
				}
				return;
			}

			$methods = array_diff(array("GET", "POST", "PUT", "DELETE"), array($_SERVER["REQUEST_METHOD"]));
			$allowed = array();
			foreach ($methods as $method) {
				if (method_exists($this, strtolower($method).$uri_part)) {
					array_push($allowed, $method);
				}
			}

			if (count($allowed) == 0) {
				$this->set_error(404);
			} else {
				$this->set_error(405);
				header("Allowed: ".implode(", ", $allowed));
			}
		}
	}
?>
