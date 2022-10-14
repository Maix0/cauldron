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
				if ($character["title"] == "") {
					$character["title"] = "(none)";
				}
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

		private function show_alternate_form($character_id) {
			if (($character = $this->model->get_character($character_id)) == false) {
				$this->view->add_tag("result", "Character not found.");
				return;
			}

			if (($alternates = $this->model->get_alternates($character_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$sizes = array(1 => "Medium", 2 => "Large");

			$attr = array(
				"char_id"   => $character["id"],
				"character" => $character["name"]);
			$this->view->open_tag("alternates", $attr);

			foreach ($alternates as $alternate) {
				$alternate["size"] = strtolower($sizes[$alternate["size"]]);
				$this->view->record($alternate, "alternate");
			}

			$this->view->open_tag("sizes");
			foreach ($sizes as $value => $label) {
				$this->view->add_tag("size", $label, array("value" => $value));
			}
			$this->view->close_tag();
			
			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Characters";

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save character") {
					/* Save character
					 */
					if ($_FILES["icon"]["error"] == 0) {
						list(, $extension) = explode("/", $_FILES["icon"]["type"], 2);
						$_FILES["icon"]["extension"] = $extension;
					}

					if ($this->model->save_okay($_POST, $_FILES["icon"]) == false) {
						$this->show_character_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create character
						 */
						if ($this->model->create_character($_POST, $_FILES["icon"]) === false) {
							$this->view->add_message("Error creating character.");
							$this->show_character_form($_POST);
						} else {
							$this->user->log_action("character %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update character
						 */
						if ($this->model->update_character($_POST, $_FILES["icon"]) === false) {
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
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_character_form($_POST);
					} else if ($this->model->delete_character($_POST["id"]) === false) {
						$this->view->add_message("Error deleting character.");
						$this->show_character_form($_POST);
					} else {
						$this->user->log_action("character %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Add icon") {
					/* Add alternate icon
					 */
					if ($this->model->icon_okay($_POST, $_FILES["icon"]) != false) {
						if ($this->model->add_icon($_POST, $_FILES["icon"]) == false) {
							$this->view->add_message("Error adding alternate icon.");
						}
					}
					$this->show_alternate_form($_POST["char_id"]);
				} else if ($_POST["submit_button"] == "delete") {
					/* Delete alternate icon
					 */
					if (($char_id = $this->model->delete_icon($_POST["icon_id"])) == false) {
						$this->view->add_system_warning("Portrait not found.");
						$this->show_overview();
					} else {
						$this->show_alternate_form($char_id);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "alternate")) {
				if (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
					$this->show_alternate_form($this->page->parameters[1]);
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New character
				 */
				$character = array("hitpoints" => 1, "armor_class" => 10, "initiative" => 0);
				$this->show_character_form($character);
			} else if ($this->page->parameter_numeric(0)) {
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
