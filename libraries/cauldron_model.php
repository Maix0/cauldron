<?php
	abstract class cauldron_model extends Banshee\model {
		public function resource_path($path, $resources_key = null) {
			if ($path == "") {
				return "/files/default.jpg";
			}

			if (substr($path, 0, 11) != "/resources/") {
				return $path;
			}

			$path = str_replace(" ", "%20", $path);

			if ($resources_key == null) {
				$resources_key = $this->user->resources_key;
			}

			$len = strlen($resources_key);
			if (substr($path, 11, $len) == $resources_key) {
				return $path;
			}

			return "/resources/".$resources_key.substr($path, 10);
		}

		private function get_files($path, $recursive) {
			if (($dp = opendir($path)) == false) {
				return false;
			}

			$files = array();
			while (($file = readdir($dp)) != false) {
				if (substr($file, 0, 1) == ".") {
					continue;
				}

				$file = $path."/".$file;
				if (is_dir($file) == false) {
					array_push($files, $file);
				} else if ($recursive) {
					if (($dir = $this->get_files($file, $recursive)) != false) {
						$files = array_merge($files, $dir);
					}
				}
			}

			closedir($dp);

			sort($files);

			return $files;
		}

		public function get_resources($directory, $recursive = true) {
			if (strpos($directory, ".") !== false) {
				return false;
			}

			$path = "resources/".$this->user->resources_key;
			if ($directory != "") {
				$path .= "/".$directory;
			}

			if (($files = $this->get_files($path, $recursive)) === false) {
				return false;
			}

			$len = strlen($this->user->resources_key);
			foreach ($files as $i => $file) {
				$files[$i] = substr($file, 0, 10).substr($file, $len + 11);
			}

			return $files;
		}

		public function generate_filename($str) {
			$valid = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ ";

			$result = "";
			$len = strlen($str);
			for ($i = 0; $i < $len; $i++) {
				$c = substr($str, $i, 1);
				if (strpos($valid, $c) !== false) {
					$result .= $c;
				}
			}

			return $result;
		}
	}
?>
