<?php
	class cms_map_controller extends Banshee\controller {
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
			$this->view->add_javascript("cms/map.js");

			$this->view->open_tag("edit");

			$this->view->open_tag("map_types");
			$this->view->add_tag("type", "image");
			$this->view->add_tag("type", "video");
			$this->view->close_tag();

			$map["show_grid"] = show_boolean($map["show_grid"]);
			$this->view->record($map, "map");

			$this->view->close_tag();
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
					/* Save map
					 */
					if ($this->model->save_oke($_POST) == false) {
						$this->show_map_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create map
						 */
						if ($this->model->create_map($_POST) === false) {
							$this->view->add_message("Error creating map.");
							$this->show_map_form($_POST);
						} else {
							$this->user->log_action("map %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update map
						 */
						if ($this->model->update_map($_POST) === false) {
							$this->view->add_message("Error updating map.");
							$this->show_map_form($_POST);
						} else {
							$this->user->log_action("map %d updated", $_POST["id"]);
							$this->show_overview();
						}
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
				$map = array();
				$this->show_map_form($map);
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Edit map
				 */
				if (($map = $this->model->get_map($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "map not found.");
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
