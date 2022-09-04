<?php
	class vault_journal_controller extends Banshee\controller {
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

			if (($journal = $this->model->get_journal($_SESSION["edit_game_id"])) === false) {
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

			$this->view->open_tag("journal");
			foreach ($journal as $entry) {
				$entry["timestamp"] = date("j M Y, H:i", $entry["timestamp"]);
				$this->view->record($entry, "entry");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_entry_form($entry) {
			$this->view->open_tag("edit");
			if (isset($entry["id"])) {
				unset($entry["game_id"]);
			}
			$this->view->record($entry, "entry");
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
				} else if ($_POST["submit_button"] == "Save entry") {
					/* Save entry
					 */
					if ($this->model->save_okay($_POST) == false) {
						$this->show_entry_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create entry
						 */
						if ($this->model->create_entry($_POST) === false) {
							$this->view->add_message("Error creating entry.");
							$this->show_entry_form($_POST);
						} else {
							$this->user->log_action("journal entry %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update entry
						 */
						if ($this->model->update_entry($_POST) === false) {
							$this->view->add_message("Error updating entry.");
							$this->show_entry_form($_POST);
						} else {
							$this->user->log_action("journal entry %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete entry") {
					/* Delete entry
					 */
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_entry_form($_POST);
					} else if ($this->model->delete_entry($_POST["id"]) === false) {
						$this->view->add_message("Error deleting entry.");
						$this->show_entry_form($_POST);
					} else {
						$this->user->log_action("journal entry %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "search") {
					/* Search
					 */
					$_SESSION["entry_search"] = $_POST["search"];
					$this->show_overview();
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New entry
				 */
				$entry = array(
					"game_id"  => $_SESSION["edit_game_id"],
					"fullname" => $this->user->fullname);
				$this->show_entry_form($entry);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit entry
				 */
				if (($entry = $this->model->get_entry($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "entry not found.");
				} else {
					$this->show_entry_form($entry);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
