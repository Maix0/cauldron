<?php
	/* Get width in characters of current terminal
	 */
	function get_terminal_width() {
		$view = explode(";", exec("stty -a | grep columns"));

		foreach ($view as $line) {
			list($key, $value) = explode(" ", ltrim($line), 2);
			if ($key == "columns") {
				return (int)$value;
			}
		}

		return 80;
	}

	/* Copy file, but don't overwrite
	 */
	function safe_copy($source, $dest) {
		if (file_exists($source) == false) {
			return false;
		} else if (file_exists($dest)) {
			printf("Warning, destination file already exists: %s\n", $dest);
			return false;
		}

		copy($source, $dest);

		return true;
	}

	/* Delete file
	 */
	function delete_file($file) {
		if (file_exists($file)) {
			unlink($file);
		}
	}
?>
