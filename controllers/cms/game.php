<?php
	class cms_game_controller extends Banshee\controller {
		private function show_overview() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$game["player_access"] = show_boolean($game["player_access"]);
				$this->view->record($game, "game");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_game_form($game) {
			$this->view->open_tag("edit");

			$game["player_access"] = show_boolean($game["player_access"]);
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
							$this->user->log_action("game %d created", $this->db->last_insert_id);
							$this->show_overview();
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
					$this->view->add_tag("result", "game not found.");
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
