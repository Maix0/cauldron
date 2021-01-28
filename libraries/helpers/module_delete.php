<?php
	function show_modules($banshee_modules) {
		$modules = array();
		foreach ($banshee_modules as $module => $info) {
			$file = $info["pages"][0];
			if (file_exists("controllers/".$file.".php") || file_exists("../views/".$file.".xslt")) {
				array_push($modules, $module);
			}
		}
		sort($modules);

		$width = get_terminal_width();

		$max = 0;
		foreach ($modules as $module) {
			$len = strlen($module);
			if ($len > $max) {
				$max = $len;
			}
		}
		$cols = floor($width / ($max + 2));
		$col = 0;

		print "Usage: ".$argv[0]." <module> [<module> ...]\n\n";
		print "Available modules:\n";
		foreach ($modules as $module) {
			print "  ".str_pad($module, $max);
			if (++$col >= $cols) {
				print "\n";
				$col = 0;
			}
		}
		print "\n";
	}

	/* Delete modules
	 */
	function delete_modules($modules, $db) {
		if (count($modules) == 0) {
			return;
		}

		$locations = array(
			"css"  => array("public/css"),
			"js"   => array("public/js"),
			"php"  => array("controllers", "models"),
			"png"  => array("public/images/icons"),
			"xslt" => array("views"));

		foreach ($modules as $module) {
			/* Pages
			 */
			foreach ($locations as $extension => $paths) {
				foreach ($paths as $path) {
					foreach ($module["pages"] as $page) {
						$file = $path."/".$page.".".$extension;
						if (file_exists($file)) {
							printf("Deleting file %s.\n", $file);
							if (unlink($file) == false) {
								printf("Error while deleting file %s\n", $file);
							}
						}
					}
				}
			}

			/* Libraries
			 */
			if (isset($module["libraries"])) {
				foreach ($module["libraries"] as $library) {
					$file = "libraries/banshee/".$library.".php";
					if (file_exists($file)) {
						printf("Deleting library %s.\n", $file);
						if (unlink($file) == false) {
							printf("Error while deleting library %s\n", $file);
						}
					}
				}
			}

			/* Tables
			 */
			if (isset($module["tables"]) && $db->connected) {
				foreach ($module["tables"] as $table) {
					printf("Dropping table %s.\n", $table);
					$db->query("drop table if exists %S", $table);
				}
			}

			/* Files
			 */
			if (isset($module["files"])) {
				foreach ($module["files"] as $file) {
					if (file_exists($file)) {
						printf("Deleting file %s.\n", $file, 3);
						if (unlink($file) == false) {
							printf("Error while deleting file %s\n", $file, 3);
						}
					}
				}
			}

			/* Settings
			 */
			if (isset($module["settings"]) && $db->connected) {
				foreach ($module["settings"] as $setting) {
					$key = str_replace("\\", "", $setting);
					$key = str_replace("%", "*", $key);
					printf("Deleting setting %s.\n", $key);
					$db->query("delete from settings where %S like %s", "key", $setting);
				}
			}

			/* Directories
			 */
			if (isset($module["directories"])) {
				foreach ($module["directories"] as $directory) {
					if (file_exists($directory)) {
						printf("Deleting directory %s.\n", $directory);
						if (rmdir($directory) == false) {
							printf("Error while deleting directory %s\n", $directory);
						}
					} else foreach ($locations as $paths) {
						foreach ($paths as $path) {
							$dir = $path."/".$directory;
							if (file_exists($dir)) {
								printf("Deleting directory %s.\n", $dir);
								if (rmdir($dir) == false) {
									printf("Error while deleting directory %s\n", $dir);
								}
							}
						}
					}
				}
			}
		}

		/* Page configuration
		 */
		printf("Removing module from page configuration files.\n");
		foreach (array("public_modules.conf", "private_modules.conf") as $file) {
			$file = "settings/".$file;

			if (($config = file($file)) == false) {
				continue;
			}

			if (($fp = fopen($file, "w")) == false) {
				continue;
			}

			foreach ($config as $line) {
				$item = chop($line);
				list($item) = explode(".", $item, 2);

				foreach ($modules as $module) {
					if (in_array($item, $module["pages"])) {
						continue 2;
					}
				}

				fputs($fp, $line);
			}

			fclose($fp);
		}

		system("database/private_modules");
	}
?>
