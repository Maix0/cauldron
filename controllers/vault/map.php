<?php
	class vault_map_controller extends Banshee\controller {
		private $fog_of_war = array(
			"Off",
			"On, day / illuminated (cell)",
			"On, day / illuminated (real)",
			"On, night / dark (cell)",
			"On, night / dark (real)");

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
			if (($adventures = $this->model->get_adventures()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($adventures) == 0) {
				$this->view->add_tag("result", "Create an adventure first.", array("url" => "vault/adventure/new"));
				return;
			}

			if (isset($_SESSION["edit_adventure_id"]) == false) {
				$_SESSION["edit_adventure_id"] = $adventures[0]["id"];
			}

			if (($maps = $this->model->get_maps($_SESSION["edit_adventure_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("adventures");
			foreach ($adventures as $adventure) {
				$attr = array(
					"id"       => $adventure["id"],
					"selected" => show_boolean($adventure["id"] == $_SESSION["edit_adventure_id"]));
				$this->view->add_tag("adventure", $adventure["title"], $attr);
			}
			$this->view->close_tag();

			$this->view->open_tag("maps");
			foreach ($maps as $map) {
				$map["type"] = $this->model->get_map_type($map["url"]);
				$map["fog_of_war"] = $this->fog_of_war[$map["fog_of_war"]];
				$this->view->record($map, "map");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_map_form($map) {
			if (isset($_GET["first"])) {
				$this->view->add_system_message("Adventure has been created. Now add the first map to this adventure.");
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("vault/map.js");
			$this->view->run_javascript("init_map_browser()");

			$this->view->open_tag("edit");

			$this->view->open_tag("fog_of_war");
			foreach ($this->fog_of_war as $value => $label) {
				$this->view->add_tag("type", $label, array("value" => $value));
			}
			$this->view->close_tag();

			$map["show_grid"] = show_boolean($map["show_grid"] ?? false);
			$map["drag_character"] = show_boolean($map["drag_character"] ?? false);

			$this->view->record($map, "map");

			$this->view->close_tag();
		}

		private function show_grid_form($map) {
			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("vault/map.js");
			$this->view->add_javascript("includes/grid.js");
			$this->view->run_javascript("init_grid(".$map["grid_size"].")");

			$this->view->add_css("webui/jquery-ui.css");

			$map["show_grid"] = show_boolean($map["show_grid"] ?? false);
			$map["type"] = $this->model->get_map_type($map["url"]);
			$map["url"] = $this->resource_path($map["url"]);

			$this->view->record($map, "grid");
		}

		private function show_local_maps() {
			if (($maps = $this->model->get_resources("maps")) == false) {
				return false;
			}

			$this->view->open_tag("maps");
			$this->view->add_tag("map", "files/empty_map.png");
			foreach ($maps as $map) {
				$this->view->add_tag("map", $map);
			}
			$this->view->close_tag();
		}

		public function execute() {
			if ($this->page->ajax_request) {
				$this->show_local_maps();
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Change adventure") {
					/* Change adventure
					 */
					if ($this->model->is_my_adventure($_POST["adventure"])) {
						$_SESSION["edit_adventure_id"] = $_POST["adventure"];
					}
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save map") {
					if (($_POST["width"] == "") && ($_POST["height"] == "")) {
						$parts = explode(".", $_POST["url"]);
						$extension = array_pop($parts);

						if (in_array($extension, config_array(MAP_IMAGE_EXTENSIONS))) {
							if (($result = $this->model->get_image_dimensions($_POST)) !== false) {
								$_POST = $result;
							}
						} else if (in_array($extension, config_array(MAP_VIDEO_EXTENSIONS))) {
							if (($result = $this->model->get_video_dimensions($_POST)) !== false) {
								$_POST = $result;
							}
						}
					}

					/* Save map
					 */
					if ($this->model->save_okay($_POST) == false) {
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
						$map_changed = $this->model->map_changed($_POST);

						if ($this->model->update_map($_POST) === false) {
							$this->view->add_message("Error updating map.");
							$this->show_map_form($_POST);
						} else {
							$this->user->log_action("map %d updated", $_POST["id"]);

							if ($map_changed) {
								$this->show_grid_form($_POST);
							} else {
								header("Location: /vault/map/arrange/".$_POST["id"]);
							}
						}
					}
				} else if ($_POST["submit_button"] == "Set grid size") {
					/* Set grid size
					 */
					if ($this->model->set_grid($_POST) === false) {
						$this->show_grid_form($_POST);
					} else {
						header("Location: /vault/map/arrange/".$_POST["id"]);
					}
				} else if ($_POST["submit_button"] == "Delete map") {
					/* Delete map
					 */
					if ($this->model->delete_okay($_POST) == false) {
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
			} else if ($this->page->parameter_value(0, "new")) {
				/* New map
				 */
				$map = array("grid_size" => 50, "fow_distance" => 3);
				$this->show_map_form($map);
			} else if ($this->page->parameter_value(0, "grid") && $this->page->parameter_numeric(1)) {
				if (($map = $this->model->get_map($this->page->parameters[1])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else {
					$this->show_grid_form($map);
				}
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit map
				 */
				if (($map = $this->model->get_map($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else if ($this->page->parameter_value(1, "grid")) {
					$this->show_grid_form($map);
				} else {
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
