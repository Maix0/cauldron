<?php
	class cms_reroute_model extends Banshee\tablemanager_model {
		protected $table = "reroute";
		protected $order = "original";
		protected $elements = array(
			"original" => array(
				"label"    => "Original URL",
				"type"     => "varchar",
				"overview" => true,
				"required" => true),
			"replacement" => array(
				"label"    => "Replacement URL",
				"type"     => "varchar",
				"overview" => true,
				"required" => true),
			"type" => array(
				"label"    => "Type",
				"type"     => "enum",
				"overview" => true,
				"options"   => array(
					"0" => "Internal",
					"1" => "301 Moved Permanently",
					"2" => "307 Temporary Redirect")),
			"description" => array(
				"label"    => "Description",
				"type"     => "varchar",
				"overview" => true));
	}
?>
