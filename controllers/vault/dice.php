<?php
	class vault_dice_controller extends Banshee\controller {
		private function show_overview() {
			if (($dices = $this->model->get_dices()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("dices");
			foreach ($dices as $dice) {
				$this->view->record($dice, "dice");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_dice_form($dice) {
			if (isset($dice["id"]) == false) {
				$this->view->add_javascript("vault/dice.js");
			}

			$sides = $dice["sides"];
			unset($dice["sides"]);

			$this->view->open_tag("edit");

			$args = array();
			if (isset($dice["id"])) {
				$args["id"] = $dice["id"];
			}

			$this->view->open_tag("dice", $args);

			$this->view->record($dice);

			foreach ($sides as $side) {
				$this->view->add_tag("sides", $side);
			}

			$this->view->close_tag();

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save dice") {
					/* Save dice
					 */
					if ($this->model->save_okay($_POST) == false) {
						$this->show_dice_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create dice
						 */
						if ($this->model->create_dice($_POST) === false) {
							$this->view->add_message("Error creating dice.");
							$this->show_dice_form($_POST);
						} else {
							$this->user->log_action("dice %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update dice
						 */
						if ($this->model->update_dice($_POST) === false) {
							$this->view->add_message("Error updating dice.");
							$this->show_dice_form($_POST);
						} else {
							$this->user->log_action("dice %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete dice") {
					/* Delete dice
					 */
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_dice_form($_POST);
					} else if ($this->model->delete_dice($_POST["id"]) === false) {
						$this->view->add_message("Error deleting dice.");
						$this->show_dice_form($_POST);
					} else {
						$this->user->log_action("dice %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "search") {
					/* Search
					 */
					$_SESSION["dice_search"] = $_POST["search"];
					$this->show_overview();
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New dice
				 */
				$dice = array("sides" => array());
				$this->show_dice_form($dice);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit dice
				 */
				if (($dice = $this->model->get_dice($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "dice not found.");
				} else {
					$this->show_dice_form($dice);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
