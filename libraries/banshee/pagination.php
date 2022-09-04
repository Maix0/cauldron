<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class pagination {
		private $view = null;
		private $name = null;
		private $page = 0;
		private $max_page = null;
		private $page_size = null;
		private $list_size = null;
		private $disabled = false;

		/* Constructor
		 *
		 * INPUT:  object view, string name, int page size, int list size, bool go to last on first visit
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($view, $name, $page_size, $list_size, $goto_last = false) {
			$this->view = $view;
			$this->name = $name;
			$this->page_size = $page_size;
			$this->list_size = $list_size;

			if (($this->page_size <= 0) || ($this->list_size <= 0)) {
				$this->disabled = true;
				return;
			}

			/* Calculate maximum page number
			 */
			$this->max_page = $this->list_size / $this->page_size;
			if ($this->max_page == floor($this->max_page)) {
				$this->max_page -= 1;
			} else {
				$this->max_page = floor($this->max_page);
			}

			/* Initialize session storage
			 */
			if (is_array($_SESSION["pagination"] ?? false) == false) {
				$_SESSION["pagination"] = array();
			}
			if (isset($_SESSION["pagination"][$name]) == false) {
				if ($goto_last) {
					$this->page = $this->max_page;
				}
				$_SESSION["pagination"][$name] = $this->page;
			}

			/* Calulate page number
			 */
			$this->page = &$_SESSION["pagination"][$name];
			if (isset($_GET["offset"])) {
				if (valid_input($_GET["offset"], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
					$this->page = 0;
				} else if (($this->page = (int)$_GET["offset"]) > $this->max_page) {
					$this->page = $this->max_page;
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
			if ($this->disabled == false) {
				switch ($key) {
					case "offset": return $this->page * $this->page_size;
					case "size": return $this->page_size;
				}
			}

			return null;
		}

		/* Disable library
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function disable() {
			$this->disabled = true;
		}

		/* Set active page to 0
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function reset() {
			$this->page = 0;
		}

		/* Generate XML for the browse links
		 *
		 * INPUT:  int number of page links, int step size of arrow links
		 * OUTPUT: boolean xml generated
		 * ERROR:  -
		 */
		public function show_browse_links($max_links = 7, $step = 7) {
			if ($this->disabled) {
				return false;
			}

			$max_links = (floor($max_links / 2) * 2) + 1;

			/* Calculate minimum and maximum page number
			 */
			if ($this->max_page > $max_links) {
				$min = $this->page - floor($max_links / 2);
				$max = $this->page + floor($max_links / 2);

				if ($min < 0) {
					$max -= $min;
					$min = 0;
				} else if ($max > $this->max_page) {
					$min -= ($max - $this->max_page);
					$max = $this->max_page;
				}
			} else {
				$min = 0;
				$max = $this->max_page;
			}

			/* Generate XML for browse links
			 */
			$this->view->open_tag("pagination", array(
				"page" => $this->page,
				"max"  => $this->max_page,
				"step" => $step));
			for ($page = $min; $page <= $max; $page++) {
				$this->view->add_tag("page", $page);
			}
			$this->view->close_tag();

			return true;
		}

		/* Returns content of table for current page
		 *
		 * INPUT:  object database, string table name[, string column name for ordering]
		 * OUTPUT: array table content
		 * ERROR:  false
		 */
		public function get_items($db, $table, $order = "id") {
			$query = "select * from %S order by %S limit %d,%d";

			return $db->execute($query, $table, $order, $this->offset, $this->size);
		}
	}
?>
