<?php
	class vault_collectable_controller extends Banshee\controller {
		private function show_overview() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($games) == 0) {
				$this->view->add_tag("result", "Create a game first.", array("url" => "vault/game/new"));
				return;
			}

			if (isset($_SESSION["edit_game_id"]) == false) {
				$_SESSION["edit_game_id"] = $games[0]["id"];
			}

			if (($collectables = $this->model->get_collectables()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$attr = array(
					"id"	   => $game["id"],
					"selected" => show_boolean($game["id"] == $_SESSION["edit_game_id"]));
				$this->view->add_tag("game", $game["title"], $attr);
			}
			$this->view->close_tag();

			$this->view->open_tag("collectables");
			foreach ($collectables as $collectable) {
				$collectable["found"] = show_boolean($collectable["found"]);
				$collectable["hide"] = show_boolean($collectable["hide"]);
				$collectable["placed"] = show_boolean($collectable["map_token_id"] != null);
				$this->view->record($collectable, "collectable");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_collectable_form($collectable) {
			$this->view->open_tag("edit");
			$collectable["found"] = show_boolean($collectable["found"] ?? false);
			$collectable["hide"] = show_boolean($collectable["hide"] ?? false);
			$this->view->record($collectable, "collectable");
			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Change game") {
					/* Change game
					 */
					if ($this->model->is_my_game($_POST["game"])) {
						$_SESSION["edit_game_id"] = $_POST["game"];
					}
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save collectable") {
					/* Save collectable
					 */
					if ($this->model->save_oke($_POST, $_FILES["image"]) == false) {
						$this->show_collectable_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create collectable
						 */
						if ($this->model->create_collectable($_POST, $_FILES["image"]) === false) {
							$this->view->add_message("Error creating collectable.");
							$this->show_collectable_form($_POST);
						} else {
							$this->user->log_action("collectable %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update collectable
						 */
						if ($this->model->update_collectable($_POST, $_FILES["image"]) === false) {
							$this->view->add_message("Error updating collectable.");
							$this->show_collectable_form($_POST);
						} else {
							$this->user->log_action("collectable %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete collectable") {
					/* Delete collectable
					 */
					if ($this->model->delete_oke($_POST) == false) {
						$this->show_collectable_form($_POST);
					} else if ($this->model->delete_collectable($_POST["id"]) === false) {
						$this->view->add_message("Error deleting collectable.");
						$this->show_collectable_form($_POST);
					} else {
						$this->user->log_action("collectable %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New collectable
				 */
				$collectable = array();
				$this->show_collectable_form($collectable);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit collectable
				 */
				if (($collectable = $this->model->get_collectable($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Collectable not found.");
				} else {
					$this->show_collectable_form($collectable);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
