<?php
	abstract class cauldron_model extends Banshee\model {
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
	}
?>
