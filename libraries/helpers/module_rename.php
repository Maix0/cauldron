<?php
	function change_class_name($filename, $old, $new) {
		if (($file = file($filename)) === false) {
			return false;
		}

		$new = str_replace("/", "_", $new);
		$old = str_replace("/", "_", $old);

		foreach ($file as $i => $line) {
			list($class, $name, $extends, $banshee) = explode(" ", trim($line));

			if (($class == "class") && ($extends == "extends")) {
				$file[$i] = str_replace($old, $new, $line);
				break;
			}
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		fputs($fp, implode("", $file));
		fclose($fp);

		return true;
	}

	function change_module_name($filename, $old, $new) {
		if (($file = file($filename)) === false) {
			return false;
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		foreach ($file as $line) {
			if (trim($line) == $old) {
				fputs($fp, $new."\n");
			} else {
				fputs($fp, $line);
			}
		}

		fclose($fp);

		return true;
	}

	function change_js_include($filename, $old, $new) {
		if (($file = file($filename)) === false) {
			return false;
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		foreach ($file as $line) {
			if (strpos($line, "add_javascript") !== false) {
				$line = str_replace($old, $new, $line);
			}
			fputs($fp, $line);
		}

		fclose($fp);

		return true;
	}

	function rename_module($module, $new_module) {
		if (module_exists($module) == false) {
			printf("The module '%s' doesn't exist.\n", $module);
            return;
        }

		if (module_exists($new_module)) {
			printf("The module '%s' already exists.\n", $new_module);
            return;
        }

		print "Renaming module.\n";
		$directories = array("controllers.php", "models.php", "views.xslt", "public/css.css", "public/js.js");
		foreach ($directories as $directory) {
			list($directory, $extension) = explode(".", $directory, 2);
			$current = $directory."/".$module.".".$extension;
			$new = $directory."/".$new_module.".".$extension;

			if (file_exists($current)) {
				rename($current, $new);
				if ($extension == "php") {
					change_class_name($new, $module, $new_module);
				}
			}
		}

		change_js_include("controllers/".$new_module.".php", $module, $new_module);

		$types = array("public", "private");
		foreach ($types as $type) {
			$file = "settings/".$type."_modules.conf";
			change_module_name($file, $module, $new_module);
		}

		system("database/private_modules");
	}
?>
