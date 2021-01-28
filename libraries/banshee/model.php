<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class model {
		protected $db = null;
		protected $settings = null;
		protected $user = null;
		protected $page = null;
		protected $view = null;
		protected $language = null;
		private $borrowed = array();

		/* Constructor
		 *
		 * INPUT: object database, object settings, object user, object page, object view[, object language]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($database, $settings, $user, $page, $view, $language = null) {
			$this->db = $database;
			$this->settings = $settings;
			$this->user = $user;
			$this->page = $page;
			$this->view = $view;
			$this->language = $language;
		}

		/* Borrow function from other model
		 *
		 * INPUT:  string module name
		 * OUTPUT: object model
		 * ERROR:  null
		 */
		protected function borrow($module) {
			if (file_exists($file = "../models/".$module.".php") == false) {
				header("Content-Type: text/plain");
				printf("Can't borrow model '%s'.\n", $module);
				print Core\error_backtrace();
				exit();
			}

			require_once($file);

			$model_class = str_replace("/", "_", $module)."_model";

			if (isset($this->borrowed[$model_class])) {
				return $this->borrowed[$model_class];
			}

			if (class_exists($model_class) == false) {
				printf("Can't borrow model %s, as it does not exist.\n", $module);
				return null;
			} else if (is_subclass_of($model_class, "Banshee\\model") == false) {
				printf("Can't borrow model %s, as it is not a model subclass.\n", $module);
				return null;
			}

			$this->borrowed[$model_class] = new $model_class($this->db, $this->settings, $this->user, $this->page, $this->view, $this->language);

			return $this->borrowed[$model_class];
		}
	}
?>
