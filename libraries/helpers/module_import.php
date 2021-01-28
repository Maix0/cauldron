<?php
	/* Import module
	 */
	function module_import($banshee_dir, $module) {
		$locations = array(
			"css"  => array("public/css"),
			"js"   => array("public/js"),
			"php"  => array("controllers", "models"),
			"xslt" => array("views"));

		print "Checking module name.\n";
		if (module_exists($module, true)) {
			printf("The module '%s' already exists.\n", $module);
			return;
		}

		$module_type = null;
		foreach (array("public", "private") as $type) {
			foreach (array("modules", "pages") as $item) {
				if (in_array($module, config_file($banshee_dir."/settings/".$type."_".$item.".conf"))) {
					$module_type = $type;
					break;
				}
			}
		}

		if ($module_type == null) {
			printf("Module '%s' not found.\n", $module);
			return;
		}

		print "Copying module files.\n";
		foreach ($locations as $extension => $paths) {
			foreach ($paths as $path) {
				$file = $path."/".$module.".".$extension;
				if (($pos = strrpos($file, "/")) !== false) {
					$dir = substr($file, 0, $pos);
					if (file_exists($dir) == false) {
						mkdir($dir, 0755, true);
					}
				}
				safe_copy($banshee_dir."/".$file, $file);
			}
		}

		foreach ($locations["php"] as $path) {
			$file = $path."/".$module.".php";
			if (file_exists($file) == false) {
				continue;
			}
			$content = file_get_contents($file);
			if (($fp = fopen($file, "w")) != false) {
				if (strpos($content, "_controller extends Banshee") === false) {
					$content = str_replace("_controller extends ", "_controller extends Banshee\\", $content);
				}
				if (strpos($content, "_model extends Banshee") === false) {
					$content = str_replace("_model extends ", "_model extends Banshee\\", $content);
				}
				if ((strpos($content, " = new Banshee") === false) && (strpos($content, " = new \\Banshee") === false)) {
					$content = str_replace(" = new ", " = new \\Banshee\\", $content);
				}
				$content = str_replace("this->output", "this->view", $content);
				fputs($fp, $content);
				fclose($fp);
			}
		}

		print "Activating module.\n";
		if (($fp = fopen("settings/".$module_type."_modules.conf", "a")) !== false) {
			fputs($fp, $module."\n");
			fclose($fp);
		}

		if ($module_type == "private") {
			system("database/private_modules");
		}

		print "Done.\n";
	}
?>
