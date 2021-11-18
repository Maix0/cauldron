<?php
	class cms_game_controller extends Banshee\controller {
		private function show_overview() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$game_access_levels = array("DM", "Players", "Spectators");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$game["access"] = $game_access_levels[$game["access"]];
				$this->view->record($game, "game");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_game_form($game) {
			$this->view->open_tag("edit");

			$game_access_levels = array("Dungeon Master only", "Dungeon Master and players", "Dungeon Master, players and spectators");
			$this->view->open_tag("access");
			foreach ($game_access_levels as $level => $label) {
				$this->view->add_tag("level", $label, array("value" => $level));
			}
			$this->view->close_tag();

			$this->view->record($game, "game");

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save game") {
					/* Save game
					 */
					if ($this->model->save_oke($_POST) == false) {
						$this->show_game_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create game
						 */
						if ($this->model->create_game($_POST) === false) {
							$this->view->add_message("Error creating game.");
							$this->show_game_form($_POST);
						} else {
							$new_game_id = $this->db->last_insert_id;
							$_SESSION["edit_game_id"] = $new_game_id;

							$this->user->log_action("game %d created", $new_game_id);

							$this->view->add_tag("result", "Game created.");
							header("Location: /cms/map/new?first");
						}
					} else {
						/* Update game
						 */
						if ($this->model->update_game($_POST) === false) {
							$this->view->add_message("Error updating game.");
							$this->show_game_form($_POST);
						} else {
							$this->user->log_action("game %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete game") {
					/* Delete game
					 */
					if ($this->model->delete_oke($_POST) == false) {
						$this->show_game_form($_POST);
					} else if ($this->model->delete_game($_POST["id"]) === false) {
						$this->view->add_message("Error deleting game.");
						$this->show_game_form($_POST);
					} else {
						$this->user->log_action("game %d deleted", $_POST["id"]);
						$this->show_overview();
						if ($_POST["id"] == $_SESSION["edit_game_id"]) {
							unset($_SESSION["edit_game_id"]);
						}
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameters[0] === "new") {
				/* New game
				 */
				$game = array();
				$this->show_game_form($game);
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Edit game
				 */
				if (($game = $this->model->get_game($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Game not found.");
				} else {
					$this->show_game_form($game);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
