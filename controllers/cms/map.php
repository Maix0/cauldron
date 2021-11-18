<?php
	class cms_map_controller extends Banshee\controller {
		private function resource_path($path) {
			if (substr($path, 0, 11) != "/resources/") {
				return $path;
			}

			$len = strlen($this->user->resources_key);
			if (substr($path, 11, $len) == $this->user->resources_key) {
				return $path;
			}

			return "/resources/".$this->user->resources_key.substr($path, 10);
		}

		private function show_overview() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($games) == 0) {
				$this->view->add_tag("result", "Create a game first.", array("url" => "cms/game/new"));
				return;
			}

			if (isset($_SESSION["edit_game_id"]) == false) {
				$_SESSION["edit_game_id"] = $games[0]["id"];
			}

			if (($maps = $this->model->get_maps($_SESSION["edit_game_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$attr = array(
					"id"       => $game["id"],
					"selected" => show_boolean($game["id"] == $_SESSION["edit_game_id"]));
				$this->view->add_tag("game", $game["title"], $attr);
			}
			$this->view->close_tag();

			$this->view->open_tag("maps");
			foreach ($maps as $map) {
				$this->view->record($map, "map");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_map_form($map) {
			if (isset($_GET["first"])) {
				$this->view->add_system_message("Game has been created. Now add the first map to this game.");
			}

			$this->view->add_javascript("cms/map.js");

			$fog_of_war = array("Off", "On, day / illuminated", "On, night / dark");

			$this->view->open_tag("edit");

			$this->view->open_tag("map_types");
			$this->view->add_tag("type", "image");
			$this->view->add_tag("type", "video");
			$this->view->close_tag();

			$this->view->open_tag("fog_of_war");
			foreach ($fog_of_war as $value => $label) {
				$this->view->add_tag("type", $label, array("value" => $value));
			}
			$this->view->close_tag();

			$map["show_grid"] = show_boolean($map["show_grid"]);
			$map["drag_character"] = show_boolean($map["drag_character"]);

			$this->view->record($map, "map");

			$this->view->close_tag();
		}

		private function show_grid_form($map) {
			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("cms/map.js");
			$this->view->run_javascript("init_grid(".$map["grid_size"].")");

			$this->view->add_css("webui/jquery-ui.css");

			$map["show_grid"] = show_boolean($map["show_grid"]);
			$map["url"] = $this->resource_path($map["url"]);

			$this->view->record($map, "grid");
		}

		private function show_local_maps() {
			if (($maps = $this->model->get_local_maps()) == false) {
				return false;
			}

			$this->view->open_tag("maps");
			foreach ($maps as $map) {
				$this->view->add_tag("map", $map);
			}
			$this->view->close_tag();
		}

		public function execute() {
			if ($this->page->ajax_request) {
				$this->show_local_maps();
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Change game") {
					/* Change game
					 */
					if ($this->model->is_my_game($_POST["game"])) {
						$_SESSION["edit_game_id"] = $_POST["game"];
					}
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save map") {
					if (($_POST["width"] == "") && ($_POST["height"] == "")) {
						if ($_POST["type"] == "image") {
							if (($result = $this->model->get_image_dimensions($_POST)) !== false) {
								$_POST = $result;
							}
						} else if ($_POST["type"] == "video") {
							if (($result = $this->model->get_video_dimensions($_POST)) !== false) {
								$_POST = $result;
							}
						}
					}

					/* Save map
					 */
					if ($this->model->save_oke($_POST) == false) {
						$this->show_map_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create map
						 */
						if (($map_id = $this->model->create_map($_POST)) === false) {
							$this->view->add_message("Error creating map.");
							$this->show_map_form($_POST);
						} else {
							$_POST["id"] = $map_id;
							$this->user->log_action("map %d created", $map_id);
							$this->show_grid_form($_POST);
						}
					} else {
						/* Update map
						 */
						if ($this->model->update_map($_POST) === false) {
							$this->view->add_message("Error updating map.");
							$this->show_map_form($_POST);
						} else {
							$this->user->log_action("map %d updated", $_POST["id"]);
							$this->show_grid_form($_POST);
						}
					}
				} else if ($_POST["submit_button"] == "Set grid size") {
					/* Set grid size
					 */
					if ($this->model->set_grid($_POST) === false) {
						$this->show_grid_form($_POST);
					} else if ($_POST["mode"] == "new") {
						header("Location: /cms/map/arrange/".$_POST["id"]);
					} else {
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Delete map") {
					/* Delete map
					 */
					if ($this->model->delete_oke($_POST) == false) {
						$this->show_map_form($_POST);
					} else if ($this->model->delete_map($_POST["id"]) === false) {
						$this->view->add_message("Error deleting map.");
						$this->show_map_form($_POST);
					} else {
						$this->user->log_action("map %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameters[0] === "new") {
				/* New map
				 */
				$map = array("grid_size" => 50, "fow_distance" => 3, "mode" => "new");
				$this->show_map_form($map);
			} else if (($this->page->parameters[0] === "grid") && (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY))) {
				if (($map = $this->model->get_map($this->page->parameters[1])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else {
					$this->show_grid_form($map);
				}
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Edit map
				 */
				if (($map = $this->model->get_map($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else {
					$map["mode"] = "edit";
					$this->show_map_form($map);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
