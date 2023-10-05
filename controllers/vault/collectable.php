<?php
	class vault_collectable_controller extends cauldron_controller {
		private function show_overview() {
			if ($this->adventures_pulldown_init() == false) {
				return;
			}

			if (($collectables = $this->model->get_collectables()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->adventures_pulldown_show();

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
				if ($this->adventures_pulldown_changed()) {
					/* Change adventure
					 */
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save collectable") {
					/* Save collectable
					 */
					if ($this->model->save_okay($_POST, $_FILES["image"]) == false) {
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
					if ($this->model->delete_okay($_POST) == false) {
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
