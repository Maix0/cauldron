<?php
	class vault_map_controller extends cauldron_controller {
		private $fog_of_war = array(
			"Off",
			"On, day / illuminated (cell)",
			"On, day / illuminated (real)",
			"On, night / dark (cell)",
			"On, night / dark (real)",
			"On, manually reveal");

		private function show_overview() {
			if (isset($_GET["first"])) {
				$this->view->add_system_message("Your adventure has been created. Now add the first map to this adventure.");
			}

			if ($this->adventures_pulldown_init() == false) {
				return;
			}

			if (($maps = $this->model->get_maps($_SESSION["edit_adventure_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview", array("market" => show_boolean(ENABLE_MARKET)));

			$this->adventures_pulldown_show();

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
			if ($map["method"] == "upload") {
				$map["url"] = "";
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("vault/map.js");
			$this->view->run_javascript("init_map_edit()");

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
			$this->view->add_javascript("includes/library.js");
			$this->view->run_javascript("init_grid(".$map["grid_size"].")");

			$this->view->add_css("webui/jquery-ui.css");

			$map["show_grid"] = show_boolean($map["show_grid"] ?? false);
			$map["type"] = $this->model->get_map_type($map["url"]);
			$map["url"] = $this->model->resource_path($map["url"]);

			$this->view->record($map, "grid");
		}

		private function show_market() {
			$this->view->title = "Map market";
			$this->view->add_javascript("vault/market.js");

			$maps = $this->model->get_market();

			$this->view->open_tag("market");
			foreach ($maps as $map) {
				$this->view->record($map, "map");
			}
			$this->view->close_tag();
		}

		private function show_import_form($map) {
			$this->view->record($map, "import");
		}

		private function show_export_form($map) {
			$this->view->record($map, "export");
		}

		private function show_map_resources() {
			if (($maps = $this->model->get_resources("maps")) == false) {
				return false;
			}

			$this->view->add_tag("map", "files/empty_map.png");
			foreach ($maps as $map) {
				$this->view->add_tag("map", $map);
			}
		}

		private function show_audio_resources() {
			if (($sounds = $this->model->get_resources("audio")) == false) {
				return false;
			}

			foreach ($sounds as $sound) {
				$this->view->add_tag("audio", $sound);
			}
		}

		public function execute() {
			$this->view->title = "Adventure maps";

			if ($this->page->ajax_request) {
				if ($this->page->parameter_value(0, "maps")) {
					$this->show_map_resources();
				} else if ($this->page->parameter_value(0, "audio")) {
					$this->show_audio_resources();
				}
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($this->adventures_pulldown_changed()) {
					/* Change adventure
					 */
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save map") {
					if (empty($_POST["width"]) && empty($_POST["height"])) {
						if ($_POST["method"] == "upload") {
							$parts = explode("/", $_FILES["file"]["type"] ?? "/");
							$extension = $parts[1] ?? "";
							$_POST["url"] = $_FILES["file"]["tmp_name"] ?? "";
						} else {
							$parts = explode(".", $_POST["url"]);
							$extension = array_pop($parts);
						}

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
							if ($_POST["method"] == "upload") {
								$_POST["url"] = $this->model->upload_to_url($_POST);
							}
							$_POST["offset_x"] = 0;
							$_POST["offset_y"] = 0;
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
								if ($_POST["method"] == "upload") {
									$_POST["url"] = $this->model->upload_to_url($_POST);
								}
								$_POST["offset_x"] = 0;
								$_POST["offset_y"] = 0;
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
				} else if ($_POST["submit_button"] == "Import constructs") {
					/* Import constructs
					 */
					if ($_FILES["file"]["error"] ?? null != 0) {
						$this->view->add_message("Error uploading file.");
						$this->show_import_form($_POST);
					} else if ($this->model->constructs_import_file($_POST["id"], $_FILES["file"]) == false) {
						$this->view->add_message("Error importing constructs.");
						$this->show_import_form($_POST);
					} else {
						header("Location: /vault/map/arrange/".$_POST["id"]);
					}
				} else if ($_POST["submit_button"] == "Export constructs") {
					/* Export constructs
					 */
					if (($export = $this->model->constructs_export($_POST)) == false) {
						$this->view->add_message("Error exporting constructs.");
						$this->show_export_form($_POST);
					} else {
						$this->view->disable();

						$filename = $this->model->generate_filename($_POST["title"]).".cvm";
						header("Content-Type: application/x-binary");
						header("Content-Disposition: attachment; filename=\"".$filename."\"");
						print $export;
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
				} else if (($_POST["submit_button"] == "Import map") && is_true(ENABLE_MARKET)) {
					/* Import map
					 */
					if (($map_id = $this->model->import_map($_POST["map"])) == false) {
						$this->show_market();
					} else {
						$this->user->log_action("market map %s imported", $_POST["map"]);
						header("Location: /vault/map/arrange/".$map_id);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New map
				 */
				$map = array("method" => "upload", "grid_size" => 50, "show_grid" => false, "fow_distance" => 3);
				$this->show_map_form($map);
			} else if ($this->page->parameter_value(0, "grid") && $this->page->parameter_numeric(1)) {
				/* Map grid
				 */
				if (($map = $this->model->get_map($this->page->parameters[1])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else {
					$this->show_grid_form($map);
				}
			} else if ($this->page->parameter_value(0, "market") && is_true(ENABLE_MARKET)) {
				/* Show market
				 */
				$this->show_market();
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit map
				 */
				if (($map = $this->model->get_map($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Map not found.");
				} else if ($this->page->parameter_value(1, "grid")) {
					$this->show_grid_form($map);
				} else if ($this->page->parameter_value(1, "import")) {
					$map["url"] = "";
					$this->show_import_form($map);
				} else if ($this->page->parameter_value(1, "export")) {
					$map["url"] = "";
					$this->show_export_form($map);
				} else {
					$map["method"] = "url";
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
