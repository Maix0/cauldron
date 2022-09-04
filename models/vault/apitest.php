<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_apitest_model extends Banshee\model {
		private function indent_json($json) {
			$result      = "";
			$pos         = 0;
			$json_len    = strlen($json);
			$indent      = "  ";
			$newline     = "\n";
			$prev_char   = "";
			$no_quotes   = true;

			for ($i = 0; $i <= $json_len; $i++) {
				$char = substr($json, $i, 1);

				if ($char == '"' && $prev_char != "\\") {
					$no_quotes = !$no_quotes;
				} else if(($char == "}" || $char == "]") && $no_quotes) {
					$result .= $newline;
					$pos --;
					for ($j = 0; $j < $pos; $j++) {
						$result .= $indent;
					}
				}

				$result .= $char;

				if (($char == "," || $char == "{" || $char == "[") && $no_quotes) {
					$result .= $newline;
					if ($char == "{" || $char == "[") {
						$pos ++;
					}

					for ($j = 0; $j < $pos; $j++) {
						$result .= $indent;
					}
				}

				$prev_char = $char;
			}

			return $result;
		}

		private function make_post_data($data) {
			$data = str_replace("\n", "&", $data);
			$data = explode("&", $data);

			$result = array();
			foreach ($data as $item) {
				list($key, $value) = explode("=", $item, 2);
				$result[$key] = $value;
			}

			return $result;
		}

		public function request_result($data) {
			if ($data["url"][0] != "/") {
				$this->view->add_message("Invalid URL.");
				return false;
			}

			if ($_SERVER["HTTPS"] == "on") {
				$http = new \Banshee\Protocol\HTTPS($_SERVER["HTTP_HOST"]);
			} else {
				$http = new \Banshee\Protocol\HTTP($_SERVER["HTTP_HOST"]);
			}

			$http->add_header("Referer", $_SERVER["HTTP_SCHEME"]."://".$_SERVER["HTTP_HOST"].$_SERVER["REQUEST_URI"]);

			/* Determine URL path
			 */
			$url = $data["url"];
			if (strpos($url, "?") === false) {
				$url .= "?";
			} else {
				$url .= "&";
			}
			$url .= "output=".$data["type"];

			/* Restore cookies
			 */
			if (isset($_SESSION["apitest_cookies"])) {
				if (($cookies = json_decode($_SESSION["apitest_cookies"], true)) !== null) {
					foreach ($cookies as $key => $value) {
						$http->add_cookie($key, $value);
					}
				}
			}

			/* Authentication
			 */
			if (($data["username"] != "") && ($data["password"] != "")) {
				$auth_str = sprintf("%s:%s", $data["username"], $data["password"]);
				$http->add_header("Authorization", "Basic ".base64_encode($auth_str));
			}

			/* Send request
			 */
			switch ($data["method"]) {
				case "GET": $result = $http->GET($url); break;
				case "POST": $result = $http->POST($url, $this->make_post_data($data["postdata"])); break;
				case "PUT": $result = $http->PUT($url, $this->make_post_data($data["postdata"])); break;
				case "DELETE": $result = $http->DELETE($url); break;
				default: return false;
			}

			/* Decode JSON result
			 */
			if ($result["headers"]["content-type"] == "application/json") {
				$result["body"] = $this->indent_json($result["body"]);
			}

			/* Store cookies
			 */
			$_SESSION["apitest_cookies"] = json_encode($http->cookies);

			return $result;
		}
	}
?>
