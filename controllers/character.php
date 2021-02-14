<?php
	class character_controller extends Banshee\controller {
		private function show_overview() {
			if (($characters = $this->model->get_characters()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("characters");
			foreach ($characters as $character) {
				$this->view->record($character, "character");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_character_form($character) {
			$this->view->open_tag("edit");
			$this->view->record($character, "character");
			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Characters";

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save character") {
					/* Save character
					 */
					if ($_FILES["portrait"]["error"] == 0) {
						list(, $extension) = explode("/", $_FILES["portrait"]["type"], 2);
						if ($extension == "jpeg") {
							$extension = "jpg";
						}
						$_FILES["portrait"]["extension"] = $extension;
					}

					if ($this->model->save_oke($_POST, $_FILES["portrait"]) == false) {
						$this->show_character_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create character
						 */
						if ($this->model->create_character($_POST, $_FILES["portrait"]) === false) {
							$this->view->add_message("Error creating character.");
							$this->show_character_form($_POST);
						} else {
							$this->user->log_action("character %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update character
						 */
						if ($this->model->update_character($_POST, $_FILES["portrait"]) === false) {
							$this->view->add_message("Error updating character.");
							$this->show_character_form($_POST);
						} else {
							$this->user->log_action("character %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete character") {
					/* Delete character
					 */
					if ($this->model->delete_oke($_POST) == false) {
						$this->show_character_form($_POST);
					} else if ($this->model->delete_character($_POST["id"]) === false) {
						$this->view->add_message("Error deleting character.");
						$this->show_character_form($_POST);
					} else {
						$this->user->log_action("character %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "search") {
					/* Search
					 */
					$_SESSION["character_search"] = $_POST["search"];
					$this->show_overview();
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameters[0] === "new") {
				/* New character
				 */
				$character = array();
				$this->show_character_form($character);
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Edit character
				 */
				if (($character = $this->model->get_character($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "character not found.");
				} else {
					$this->show_character_form($character);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
