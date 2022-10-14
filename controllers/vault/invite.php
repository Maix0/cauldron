<?php
	class vault_invite_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function show_invitation_code() {
			if (($invitation_code = $this->model->get_invitation_code()) === false) {
				$this->view->add_tag("result", "Error fetching invitation code");
				return;
			}

			if ($invitation_code != "") {
				$invitation_code = $this->user->organisation_id."-".$invitation_code;
			}

			$this->view->add_help_button();

			$this->view->open_tag("show");
			$this->view->add_tag("invitation_code", $invitation_code);
			$this->view->close_tag();
		}

		private function show_form($invitation_code) {
			$this->view->add_javascript("vault/invite.js");

			$this->view->open_tag("edit");
			$this->view->add_tag("organisation_id", $this->user->organisation_id);
			$this->view->add_tag("invitation_code", $invitation_code);
			$this->view->close_tag();
		}

		public function execute() {
			if ($this->page->ajax_request) {
				$this->view->add_tag("code", random_string(20));
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($this->model->save_invitation_code($_POST["invitation_code"]) == false) { 
					$this->view->add_message("Error saving invitation code.");
					$this->show_form($_POST["invitation_code"]);
				} else {
					$this->show_invitation_code();
				}
			} else if ($this->page->parameter_value(0, "edit")) {
				if (($invitation_code = $this->model->get_invitation_code()) === false) {
					$this->view->add_tag("result", "Error fetching invitation code");
					return;
				}

				$this->show_form($invitation_code);
			} else {
				$this->show_invitation_code();
			}
		}
	}
?>
