<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class splitform_model extends model {
		private $values = null;
		private $current_step = null;
		private $max_steps = null;
		protected $forms = null;

		/* Constructor
		 *
		 * INPUT:  core objects
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct() {
			$arguments = func_get_args();
			call_user_func_array(array(parent::class, "__construct"), $arguments);

			$this->max_steps = count($this->forms) - 1;

			if (isset($_SESSION["splitform"]) == false) {
				$_SESSION["splitform"] = array();
			}

			if (isset($_SESSION["splitform"][$this->page->module]) == false) {
				$_SESSION["splitform"][$this->page->module] = array(
					"current" => 0,
					"values"  => array());
			}

			$this->current_step = &$_SESSION["splitform"][$this->page->module]["current"];
			$this->values = &$_SESSION["splitform"][$this->page->module]["values"];
		}

		/* Magic method set
		 *
		 * INPUT:  string key, mixed value
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __set($key, $value) {
			if ($key == "current_step") {
				if (($value >= 0) && ($value <= $this->max_steps)) {
					$this->current_step = $value;
				}
			}
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "forms": return $this->forms;
				case "values": return $this->values;
				case "current_form":
					$forms = array_keys($this->forms);
					return $forms[$this->current_step];
				case "current_step": return $this->current_step;
				case "max_steps": return $this->max_steps;
			}

			return null;
		}

		/* Check class settings
		 *
		 * INPUT:  -
		 * OUTPUT: boolean class validation okay
		 * ERROR:  -
		 */
		public function class_settings_okay() {
			$class_okay = true;

			if (is_array($this->forms) == false) {
				printf("this->forms in %s is not an array.\n", get_class($this));
				$class_okay = false;
			} else if (count($this->forms) == 0) {
				printf("this->forms in %s is empty.\n", get_class($this));
				$class_okay = false;
			} else foreach ($this->forms as $form) {
				if (is_array($form) == false) {
					printf("%s in this->forms in %s is not an array.\n", $form, get_class($this));
					$class_okay = false;
				} else if (count($form) == 0) {
					printf("%s in this->forms in %s is empty.\n", $form, get_class($this));
					$class_okay = false;
				}
			}

			if (method_exists($this, "process_form_data") == false) {
				printf("Function process_form_data() in %s is missing.\n", get_class($this));
				$class_okay = false;
			}

			return $class_okay;
		}

		/* Default values for form elements
		 *
		 * INPUT:  string key, string value
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function default_value($key, $value) {
			if (isset($this->values[$key]) == false) {
				$this->values[$key] = $value;
			}
		}

		/* Set form element value
		 *
		 * INPUT:  string key, string value
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function set_value($key, $value) {
			$this->values[$key] = $value;
			$_POST[$key] = $value;
		}

		/* Save $_POST data in $_SESSION
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function save_post_data() {
			foreach ($this->forms[$this->current_form] as $element) {
				$this->values[$element] = $_POST[$element] ?? null;
			}
		}

		/* Restore $_SESSION data to $_POST
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function load_form_data() {
			$_POST = array();
			foreach ($this->forms[$this->current_form] as $element) {
				$_POST[$element] = $this->values[$element] ?? null;
			}
		}

		/* Reset splitform progress
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function reset_form_progress() {
			$this->current_step = 0;
			$this->values = array();
		}
	}
?>
