<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	class language {
		private $db = null;
		private $page = null;
		private $view = null;
		private $global_texts = array();
		private $page_texts = array();
		private $supported = null;

		/* Constructor
		 *
		 * INPUT:  object database, object page, object view
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db, $page, $view) {
			$this->db = $db;
			$this->page = $page;
			$this->view = $view;

			$this->supported = config_array(SUPPORTED_LANGUAGES);

			$this->global_texts = $this->load_texts("*");
			$this->page_texts = $this->load_texts($this->page->page);
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "supported": return $this->supported;
			}

			return null;
		}

		/* Load texts from database
		 *
		 * INPUT:  string page
		 * OUTPUT: array texts
		 * ERROR:  -
		 */
		private function load_texts($page) {
			$result = array();

			$query = "select name,%S as content from languages where page=%s";
			if (($messages = $this->db->execute($query, $this->view->language, $page)) != false) {
				foreach ($messages as $message) {
					$result[$message["name"]] = $message["content"];
				}
			}

			return $result;
		}

		/* Get global text
		 *
		 * INPUT:  string text name
		 * OUTPUT: string text
		 * ERROR:  false
		 */
		public function global_text($name) {
			if (isset($this->global_texts[$name])) {
				return $this->global_texts[$name];
			}

			return "GT{".$name."}";
		}

		/* Get page text
		 *
		 * INPUT:  string text name
		 * OUTPUT: string text
		 * ERROR:  null
		 */
		public function page_text($name) {
			if (isset($this->page_texts[$name])) {
				return $this->page_texts[$name];
			}

			return "PT{".$name."}";
		}

		/* Add all texts for page to XML output
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function add_to_view() {
			$this->view->open_tag("language", array("code" => $this->view->language));

			$this->view->open_tag("global");
			foreach ($this->global_texts as $name => $content) {
				$this->view->add_tag($name, $content);
			}
			$this->view->close_tag();

			$this->view->open_tag("page");
			foreach ($this->page_texts as $name => $content) {
				$this->view->add_tag($name, $content);
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}
	}
?>
