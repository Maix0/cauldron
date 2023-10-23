<?php
	class vault_players_controller extends Banshee\controller {
		private function show_overview() {
			if (($adventures = $this->model->get_adventures()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("adventures");
			foreach ($adventures as $adventure) {
				$this->view->record($adventure, "adventure");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_invite_form($invite) {
			if (($adventure = $this->model->get_adventure($invite["adventure_id"])) == false) {
				$this->view->add_tag("result", "Adventure not found.");
				return;
			}

			if (($characters = $this->model->get_characters($invite["adventure_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($characters) == 0) {
				$this->view->add_tag("result", "No characters available to invite. Ask your players to create them.");
				return;
			}

			if (is_array($invite["characters"] ?? null) == false) {
				$invite["characters"] = array();
			}

			$this->view->open_tag("edit");

			$this->view->record($adventure, "adventure");

			$active_adventure = false;

			if (is_array($characters)) {
				$this->view->open_tag("characters");
				foreach ($characters as $user => $chars) {
					$this->view->open_tag("user", array("name" => $user));
					foreach ($chars as $char) {
						if (is_true($char["enrolled"])) {
							array_push($invite["characters"], $char["id"]);
							$active_adventure = true;
						}

						$attr = array(
							"id"      => $char["id"],
							"checked" => show_boolean(in_array($char["id"], $invite["characters"])),
							"sheet"   => $char["sheet"]);
						$this->view->add_tag("character", $char["name"], $attr);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();
			}

			if ($active_adventure) {
				$this->view->add_message("Changing characters in an active adventure, will move all characters to the 'Player start' location on each map.");
			}

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				/* Inite players
				 */
				if ($this->model->save_okay($_POST) == false) {
					$this->show_invite_form($_POST);
				} else if ($this->model->invite_players($_POST) == false) {
					$this->view->add_message("Error while inviting players.");
					$this->show_invite_form($_POST);
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_numeric(0)) {
				/* Select players
				 */
				$invite = array("adventure_id" => $this->page->parameters[0]);
				$this->show_invite_form($invite);
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
