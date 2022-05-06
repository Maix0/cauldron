<?php
	/* Add layout to website
	 */
	function add_layout_to_website($name) {
		$filename = __DIR__."/../../views/banshee/main.xslt";

		if (($file = file($filename)) === false) {
			return false;
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		$include = false;
		foreach ($file as $i => $line) {
			$text = chop($line);

			if (substr($text, 0, 11) == "<xsl:import") {
				$include = true;
			} else if (($text == "") && $include) {
				fputs($fp, "<xsl:import href=\"layout_".$name.".xslt\" />\n");
				$include = false;
			}

			fputs($fp, $line);
		}

		fclose($fp);

		return true;
	}

	/* Activate new layout
	 */
	function activate_layout($name) {
		$filename = __DIR__."/../../settings/banshee.conf";

		if (($file = file($filename)) === false) {
			return false;
		}

		foreach ($file as $i => $line) {
			if (substr($line, 0, 11) == "LAYOUT_SITE") {
				$file[$i] = "LAYOUT_SITE = ".$name."\n";
			}
		}

		if (($fp = fopen($filename, "w")) == false) {
			return false;
		}

		fputs($fp, implode("", $file));
		fclose($fp);
	}
?>
