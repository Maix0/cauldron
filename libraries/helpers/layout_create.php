<?php
	/* Set layout name inside file
	 */
	function set_layout_name($name) {
		$filename = "views/banshee/layout_".$name.".xslt";

		if (($file = file($filename)) === false) {
			return false;
		}

		foreach ($file as $i => $line) {
			$file[$i] = str_replace("@name='XXX'", "@name='".$name."'", $line);
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		fputs($fp, implode("", $file));
		fclose($fp);

		return true;
	}

	/* Create new layout
	 */
	function create_layout($name) {
		$layout_characters = VALIDATE_NONCAPITALS.VALIDATE_NUMBERS."/_";
		if (valid_input($name, $layout_characters) == false) {
			exit("Invalid module name.\n");
		}

		print "Creating new layout.\n";
		if (safe_copy("templates/layout_XXX.xslt", "views/banshee/layout_".$name.".xslt") == false) {
			return;
		}
		if (safe_copy("templates/layout_XXX.css", "public/css/banshee/layout_".$name.".css") == false) {
			return;
		}

		print "Setting layout name.\n";
		set_layout_name($name);

		print "Adding layout to website.\n";
		add_layout_to_website($name);

		print "Activating new layout.\n";
		activate_layout($name);

		print "Done.\n";
	}
?>
