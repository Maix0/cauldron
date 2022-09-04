<?php
	class vault_condition_model extends \Banshee\tablemanager_model {
		protected $table = "conditions";
		protected $order = "name";
		protected $elements = array(
			"name" => array(
				"label"    => "Condition",
				"type"     => "varchar",
				"overview" => true,
				"required" => true));
	}
?>
