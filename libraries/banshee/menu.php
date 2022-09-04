<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class menu {
		private $db = null;
		private $view = null;
		private $parent_id = null;
		private $depth = 1;
		private $user = null;

		/* Constructor
		 *
		 * INPUT:  object database, object view
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db, $view) {
			$this->db = $db;
			$this->view = $view;
		}

		/* Set menu start point
		 *
		 * INPUT:  string link
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function set_start_point($link) {
			$query = "select id from menu where link=%s limit 1";
			if (($menu = $this->db->execute($query, $link)) == false) {
				return false;
			}

			$this->parent_id = $menu[0]["id"];

			return true;
		}

		/* Set menu depth
		 *
		 * INPUT:  int depth
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function set_depth($depth) {
			if (($this->depth = (int)$depth) < 1) {
				$this->depth = 1;
			}
		}

		/* Set user for access check
		 *
		 * INPUT:  object user
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function set_user($user) {
			$this->user = $user;
		}

		/* Get menu data
		 *
		 * INPUT:  int menu identifier[, int menu depth][, string link of active menu item for highlighting]
		 * OUTPUT: array menu data
		 * ERROR:  false
		 */
		private function get_menu($id, $depth = 1, $current_url = null) {
			$args = array();
			$query = "select * from menu where parent_id";
			if ($id == null) {
				$query .= " is null";
			} else {
				$query .= "=%d";
				array_push($args, $id);
			}
			$query .= " order by %S";
			array_push($args, "id");

			if (($menu = $this->db->execute($query, $args)) === false) {
				return false;
			}

			$result = array(
				"id"    => $id,
				"items" => array());

			foreach ($menu as $item) {
				$element = array();

				if (($this->user !== null) && ($item["link"][0] == "/")) {
					if (($module = ltrim($item["link"], "/")) != "") {
						list($module) = explode("?", $module, 2);
						$module = trim($module, "/");
						if ($this->user->access_allowed($module) == false) {
							continue;
						}
					}
				}

				$element["id"] = $item["id"];
				if ($current_url !== null) {
					$element["current"] = show_boolean($item["link"] == $current_url);
				}
				$element["text"] = $item["text"];
				$element["link"] = $item["link"];
				if ($depth > 1) {
					$element["submenu"] = $this->get_menu($item["id"], $depth - 1, $current_url);

					if (($element["link"] == "#") && (count($element["submenu"]["items"]) == 0)) {
						continue;
					}
				}

				array_push($result["items"], $element);
			}

			return $result;
		}

		/* Add menu to output
		 *
		 * INPUT:  array menu data
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function menu_to_view($menu) {
			if (count($menu) == 0) {
				return;
			}

			$this->view->open_tag("menu", array("id" => $menu["id"]));
			foreach ($menu["items"] as $item) {
				$args = array("id" => $item["id"]);
				if (isset($item["current"])) {
					$args["current"] = $item["current"];
				}

				$this->view->open_tag("item", $args);
				$this->view->add_tag("link", $item["link"]);
				$this->view->add_tag("text", $item["text"]);
				$this->view->add_tag("class", str_replace(" ", "_", strtolower($item["text"])));
				if (isset($item["submenu"])) {
					$this->menu_to_view($item["submenu"]);
				}
				$this->view->close_tag();
			}
			$this->view->close_tag();
		}

		/* Append menu to XML output
		 *
		 * INPUT:  [string link of active menu item for highlighting]
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function add_to_view($current_url = "") {
			if (substr($current_url, 0, 1) != "/") {
				$current_url = "/".$current_url;
			}

			if ($this->user !== null) {
				/* Create user specific menu
				 */
				$cache = new Core\cache($this->db, "banshee_menu");
				if ($cache->last_updated === null) {
					$cache->store("last_updated", time(), 365 * DAY);
				}
				if (isset($_SESSION["menu_last_updated"]) == false) {
					$_SESSION["menu_last_updated"] = $cache->last_updated;
				} else if ($cache->last_updated > $_SESSION["menu_last_updated"]) {
					unset($_SESSION["menu_cache"]);
					$_SESSION["menu_last_updated"] = $cache->last_updated;
				}
				unset($cache);

				if (isset($_SESSION["menu_cache"]) == false) {
					$_SESSION["menu_cache"] = array();
				}
				$cache = &$_SESSION["menu_cache"];

				$index = sha1(sprintf("%d-%d-%s-%s", $this->parent_id, $this->depth, $this->user->username, $current_url));

				if (isset($cache[$index]) == false) {
					if (($menu = $this->get_menu($this->parent_id, $this->depth, $current_url)) === false) {
						return false;
					}

					$cache[$index] = json_encode($menu);
				} else {
					$menu = json_decode($cache[$index], true);
				}

				$this->menu_to_view($menu);
			} else if ($this->depth > 1) {
				/* Create cached generic menu
				 */
				if ($this->view->fetch_from_cache("banshee_menu") == false) {
					if (($menu = $this->get_menu($this->parent_id, $this->depth, $current_url)) === false) {
						return false;
					}

					$this->view->start_caching("banshee_menu");
					$this->menu_to_view($menu);
					$this->view->stop_caching();
				}
			} else {
				/* Create generic menu
				 */
				if (($menu = $this->get_menu($this->parent_id, $this->depth, $current_url)) === false) {
					return false;
				}

				$this->menu_to_view($menu);
			}

			return true;
		}
	}
?>
