<?php
	/* Set class name inside file
	 */
	function set_class_name($directory, $module) {
		$filename = $directory."/".$module.".php";

		if (($file = file($filename)) === false) {
			return false;
		}

		$module = str_replace("/", "_", $module);
		$file[1] = str_replace("XXX", $module, $file[1]);

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		fputs($fp, implode("", $file));
		fclose($fp);

		return true;
	}

	/* Fix import path in XSLT file
	 */
	function fix_view_import_path($module) {
		$filename = "views/".$module.".xslt";

		if (($count = substr_count($module, "/")) == 0) {
			return true;
		} else if (($file = file($filename)) === false) {
			return false;
		}

		foreach ($file as $i => $line) {
			if (substr($line, 0, 11) != "<xsl:import") {
				continue;
			}
			$file[$i] = substr($line, 0, 18).str_repeat("../", $count).substr($line, 18);
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		fputs($fp, implode("", $file));
		fclose($fp);

		return true;
	}

	/* Create new module
	 */
	function create_module($access, $module, $type = null) {
		$view = trim($module, "/");
		list($module) = explode(".", $view);

		/* Validate module name
		 */
		$module_characters = VALIDATE_NONCAPITALS.VALIDATE_NUMBERS."/_";
		if (valid_input($module, $module_characters) == false) {
			print "Invalid module name.\n";
			return;
		}

		/* Validate type
		 */
		if ($type === null) {
			$type = "page";
		} else if ($type == "tm") {
			$type = "tablemanager";
		} else if ($type == "sf") {
			$type = "splitform";
		} else if ($type == "db") {
			$type = "crud";
		} else if ($type == "api") {
			$type = "api";
		} else {
			print "Invalid module type.\n";
			return;
		}

		/* Check for module existence
		 */
		chdir("settings");

		if (module_exists($module)) {
			printf("The module '%s' already exists.\n", $module);
			return;
		}

		chdir("..");

		/* Make directories
		 */
		$locations = array("controllers", "models", "views", "public/css");

		$ofs = 0;
		while (($pos = strpos($module, "/", $ofs)) !== false) {
			$ofs = $pos + 1;
			$subdir = "/".substr($module, 0, $pos);
			foreach ($locations as $location) {
				if (file_exists($location.$subdir) == false) {
					printf("Creating directory %s%s.\n", $location, $subdir);
					mkdir($location.$subdir, 0755, true);
				}
			}
		}

		/* Copy templates
		 */
		print "Creating controller, model, view and stylesheet.\n";
		safe_copy("templates/".$type."_controller.php", "controllers/".$module.".php");
		safe_copy("templates/".$type."_model.php", "models/".$module.".php");
		if ($type != "api") {
			safe_copy("templates/".$type."_view.xslt", "views/".$view.".xslt");
			safe_copy("templates/".$type."_style.css", "public/css/".$module.".css");
			touch("public/css/".$module.".css");
		}

		/* Set class names
		 */
		print "Setting controller and model class name.\n";
		set_class_name("controllers", $module);
		set_class_name("models", $module);

		/* Fix include path in XSLT
		 */
		if ($type != "api") {
			print "Fixing include paths in view.\n";
			fix_view_import_path($module);
		}

		/* Add to configuration file
		 */
		printf("Adding module to %s pages configuration.\n", $access);
		if (($fp = fopen("settings/".$access."_modules.conf", "a")) !== false) {
			fputs($fp, $view."\n");
			fclose($fp);
		}

		/* Register private page in database
		 */
		if ($access == "private") {
			system("database/private_modules");
		}

		print "Done.\n";
	}
?>
