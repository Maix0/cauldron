<?php
	/* Delete layout
	 */
	function delete_layout($name) {
		if ($name == "cms") {
			print "The CMS layout is required by Banshee.\n";
			return false;
		}

		$file = "views/banshee/layout_".$name.".xslt";
		if (file_exists($file) == false) {
			printf("Layout %s does not exist.\n", $name);
			return false;
		}

		$filename = "views/banshee/main.xslt";
		if (($file = file($filename)) === false) {
			return false;
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		$include = false;
		foreach ($file as $i => $line) {
			if (strpos($line, "layout_".$name) !== false) {
				continue;
			}

			if (strpos($line, "import") !== false) {
				list(, $last_layout) = explode('"', $line, 3);
				$last_layout = str_replace("layout_", "", $last_layout);
				$last_layout = str_replace(".xslt", "", $last_layout);
			}

			fputs($fp, $line);
		}

		fclose($fp);

		print "Deleting layout.\n";
		delete_file("views/banshee/layout_".$name.".xslt");
		delete_file("public/css/banshee/layout_".$name.".css");

		$name_len = strlen($name);
		$image_dir = "public/images/layout";
		if (($dp = opendir($image_dir)) !== false) {
			while (($file = readdir($dp)) !== false) {
				if (substr($file, 0, 1) == ".") {
					continue;
				}
				if (substr($file, 0, $name_len) == $name) {
					unlink($image_dir."/".$file);
				}
			}
			closedir($dp);
		}

		printf("Activating layout '%s'.\n", $last_layout);
		activate_layout($last_layout);

		print "Done.\n";

		return true;
	}
?>
