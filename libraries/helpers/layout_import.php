<?php
	function import_layout($banshee_dir, $name) {
		$layout = "views/banshee/layout_".$name.".xslt";
		if (file_exists($layout)) {
			exit("Layout already exists.\n");
		} else if (file_exists($banshee_dir."/".$layout) == false) {
			exit("Layout not found.\n");
		}

		print "Copying layout.\n";
		$xslt = file($banshee_dir."/".$layout);
		if (($fp = fopen("views/banshee/layout_".$name.".xslt", "w")) != false) {
			foreach ($xslt as $line) {
				if (strpos($line, "<xsl:template ") === 0) {
					$line = "<xsl:template match=\"layout[@name='".$name."']\">\n";
				}
				fputs($fp, $line);
			}
		}

		$stylesheet = "public/css/banshee/layout_".$name.".css";
		if (file_exists($banshee_dir."/".$stylesheet)) {
			safe_copy($banshee_dir."/".$stylesheet, $stylesheet);
		}

		$img_dir = "public/images/layout";
		if (($dp = opendir($banshee_dir."/".$img_dir)) !== false) {
			$len = strlen($name) + 1;
			while (($file = readdir($dp)) !== false) {
				if (substr($file, 0, $len) == $name."_") {
					safe_copy($banshee_dir."/".$img_dir."/".$file, $img_dir."/".$file);
				}
			}
		}

		print "Adding layout to website.\n";
		add_layout_to_website($name);

		print "Activating new layout.\n";
		activate_layout($name);

		print "Done.\n";
	}
?>
