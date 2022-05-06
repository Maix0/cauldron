<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class POST_protection {
		const KEY_CSRF = "banshee_csrf";
		const KEY_REPOST = "banshee_repost";
		const REPOST_MEMORY_SIZE = 32;

		private $page = null;
		private $user = null;
		private $view = null;

		/* Constructor
		 *
		 * INPUT:  object page, object user, object view
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($page, $user, $view) {
			$this->page = $page;
			$this->user = $user;
			$this->view = $view;

			if (is_array($_SESSION[self::KEY_REPOST]) == false) {
				$_SESSION[self::KEY_REPOST] = array();
				$_SESSION[self::KEY_REPOST."_count"] = 0;
			} else {
				$_SESSION[self::KEY_REPOST."_count"] += 1;
			}

			if (isset($_SESSION[self::KEY_CSRF]) == false) {
				$_SESSION[self::KEY_CSRF] = random_string(16);
			}
		}

		/* Magic function get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "csrf_key": return self::KEY_CSRF;
				case "repost_key": return self::KEY_REPOST;
			}

			return null;
		}

		/* Block re-post
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function block_repost() {
			$this->view->run_javascript("add_to_form('".self::KEY_REPOST."', '".$_SESSION[self::KEY_REPOST."_count"]."')");

			if (($_SERVER["REQUEST_METHOD"] != "POST") || $this->page->ajax_request || ($this->page->module == LOGIN_MODULE)) {
				return;
			}

			$repost = in_array($_POST[self::KEY_REPOST], $_SESSION[self::KEY_REPOST]);
			$this->register_post();

			if ($repost == false) {
				return;
			}

			$this->view->add_system_warning("Re-post detected and blocked.");

			$_SERVER["REQUEST_METHOD"] = "GET";
			$_GET = array();
			$_POST = array();
		}

		/* Register POST request
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function register_post() {
			if (isset($_POST[self::KEY_REPOST]) == false) {
				return;
			}

			if (in_array($_POST[self::KEY_REPOST], $_SESSION[self::KEY_REPOST])) {
				return;
			}

			array_push($_SESSION[self::KEY_REPOST], $_POST[self::KEY_REPOST]);

			if (count($_SESSION[self::KEY_REPOST]) > self::REPOST_MEMORY_SIZE) {
				array_shift($_SESSION[self::KEY_REPOST]);
			}
		}

		/* Prevent CSRF attack
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function prevent_CSRF() {
			if ($this->page->module == "setup") {
				return false;
			}

			$token = hash("sha256", $_SESSION[self::KEY_CSRF]);
			$this->view->run_javascript("add_to_form('".self::KEY_CSRF."', '".$token."')");

			if (($_SERVER["REQUEST_METHOD"] != "POST") || $this->page->ajax_request || ($this->page->module == LOGIN_MODULE)) {
				return;
			}

			if ($_POST[self::KEY_CSRF] == $token) {
				unset($_POST[self::KEY_CSRF]);
				return;
			}

			if (($_SESSION["request_counter"] > 2) && $this->page->is_private) {
				/* CSRF attack detected
				 */
				if (isset($_SERVER["HTTP_ORIGIN"])) {
					$referer = $_SERVER["HTTP_ORIGIN"];
				} else if (isset($_SERVER["HTTP_REFERER"])) {
					$referer = $_SERVER["HTTP_REFERER"];
				} else {
					$referer = "previous visited website";
				}

				$message = "CSRF attempt via %s blocked.";
				$this->view->add_system_warning($message, $referer);
				$this->user->log_action($message, $referer);
				$this->user->logout();
			} else {
				/* You're probably just dealing with a spam bot
				 */
				$logfile = new logfile("spam");
				$logfile->add_entry("POST without token.");
			}

			$_SERVER["REQUEST_METHOD"] = "GET";
			$_GET = array();
			$_POST = array();
		}

		/* Execute
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function execute($prevent_repost) {
			$this->view->add_javascript("banshee/post_protection.js");

			if ($prevent_repost) {
				$this->block_repost();
			}

			if ($this->user->logged_in || ($this->page->module == LOGIN_MODULE)) {
				$this->prevent_CSRF();
			}
		}
	}
?>
