<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class controller {
		protected $model = null;
		protected $db = null;
		protected $settings = null;
		protected $user = null;
		protected $page = null;
		protected $view = null;
		protected $language = null;
		protected $prevent_repost = false;

		/* Constructor
		 *
		 * INPUT:  object database, object settings, object user, object page, object view[, object language]
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

			/* POST protection: CSRF and re-post
			 */
			$post_protection = new POST_protection($page, $user, $view);
			$post_protection->execute($this->prevent_repost);

			/* Load model
			 */
			$model_class = str_replace("/", "_", $page->module)."_model";
			if (class_exists($model_class)) {
				if (is_subclass_of($model_class, "Banshee\\model") == false) {
					print "Model class '".$model_class."' does not extend Banshee's model class.\n";
				} else {
					$this->model = new $model_class($database, $settings, $user, $page, $view, $language);
				}
			}
		}

		/* Default execute function
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function execute() {
			if ($this->page->ajax_request == false) {
				print "Page controller has no execute() function.\n";
			}
		}
	}
?>
