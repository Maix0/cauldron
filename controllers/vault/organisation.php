<?php
	class vault_organisation_controller extends Banshee\controller {
		private function show_overview() {
			if (($organisation_count = $this->model->count_organisations()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$paging = new \Banshee\pagination($this->view, "organisations", $this->settings->admin_page_size, $organisation_count);

			if (($organisations = $this->model->get_organisations($paging->offset, $paging->size)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("organisations");
			foreach ($organisations as $organisation) {
				$organisation["idle"] = floor((time() - strtotime($organisation["last_login"])) / DAY);
				$this->view->record($organisation, "organisation");
			}
			$this->view->close_tag();

			$paging->show_browse_links();

			$this->view->close_tag();
		}

		private function show_organisation_form($organisation) {
			if (isset($organisation["id"])) {
				if (($users = $this->model->get_users($organisation["id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}
			} else {
				$users = array();
			}

			$this->view->open_tag("edit");

			$this->view->record($organisation, "organisation");

			$this->view->open_tag("users");
			foreach ($users as $user) {
				$this->view->record($user, "user");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save organisation") {
					/* Save organisation
					 */
					if ($this->model->save_okay($_POST) == false) {
						$this->show_organisation_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create organisation
						 */
						if ($this->model->create_organisation($_POST) === false) {
							$this->view->add_message("Error creating organisation.");
							$this->show_organisation_form($_POST);
						} else {
							$this->user->log_action("organisation %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update organisation
						 */
						if ($this->model->update_organisation($_POST) === false) {
							$this->view->add_message("Error updating organisation.");
							$this->show_organisation_form($_POST);
						} else {
							$this->user->log_action("organisation %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete organisation") {
					/* Delete organisation
					 */
					if ($this->model->delete_organisation($_POST["id"]) === false) {
						$this->view->add_message("Error deleting organisation.");
						$this->show_organisation_form($_POST);
					} else {
						$this->user->log_action("organisation %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "search") {
					/* Search
					 */
					$_SESSION["organisation_search"] = $_POST["search"];
					$this->show_overview();
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New organisation
				 */
				$organisation = array("max_resources" => $this->settings->default_max_resources);
				$this->show_organisation_form($organisation);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit organisation
				 */
				if (($organisation = $this->model->get_organisation($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "organisation not found.");
				} else {
					$this->show_organisation_form($organisation);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
