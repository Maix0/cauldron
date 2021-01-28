<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class logfile {
		private $type = null;
		private $entries = array();
		private $user_id = null;

		/* Constructor
		 *
		 * INPUT:  string logfile type
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($type) {
			$this->type = $type;
		}

		/* Destructor
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __destruct() {
			$this->flush();
		}

		/* Magic method get
		 *
		 * INPUT:  string key, mixed value
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __set($key, $value) {
			switch ($key) {
				case "user_id": $this->user_id = ($value === null) ? "-" : $value;
			}
		}

		/* Clear output buffer
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function clean() {
			$this->entries = array();
		}

		/* Flush output to disk
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function flush() {
			if (count($this->entries) == 0) {
				return true;
			}

			if (($fp = fopen(__DIR__."/../../logfiles/".$this->type.".log", "a")) == false) {
				return false;
			}

			$remote_addr = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "localhost";

			foreach ($this->entries as $entry) {
				$entry = sprintf("%s|%s\n", $remote_addr, $entry);
				fputs($fp, $entry);
			}

			fclose($fp);

			$this->clean();

			return true;
		}

		/* Add item to output buffer
		 *
		 * INPUT:  string item
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function add_entry($entry) {
			if (func_num_args() > 1) {
				$args = func_get_args();
				array_shift($args);
				$entry = vsprintf($entry, $args);
			}

			if ($this->user_id !== null) {
				$entry = sprintf("%s|%s", $this->user_id, $entry);
			}

			$entry = sprintf("%s|%s", date("D d M Y H:i:s"), $entry);

			array_push($this->entries, $entry);
		}

		/* Add variable to output buffer
		 *
		 * INPUT:  mixed variable[, string prefix]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function add_variable($variable, $prefix = null) {
			ob_start();
			var_dump($variable);
			$variable = rtrim(ob_get_clean());

			$variable = preg_replace('/=>$\s*/m', " => ", $variable);

			if ($prefix !== null) {
				$variable = sprintf("%s: %s", $prefix, $variable);
			}

			$this->add_entry($variable);
		}
	}
?>
