<?php
	class cms_players_controller extends Banshee\controller {
		private function show_overview() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$this->view->record($game, "game");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_invite_form($invite) {
			if (($game = $this->model->get_game($invite["game_id"])) == false) {
				$this->view->add_tag("result", "Game not found.");
				return;
			}

			if (($characters = $this->model->get_characters()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($characters) == 0) {
				$this->view->add_tag("result", "No characters available to invite.");
				return;
			}

			if (is_array($invite["characters"]) == false) {
				$invite["characters"] = array();
			}

			$this->view->open_tag("edit");

			$this->view->record($game, "game");

			if (is_array($characters)) {
				$this->view->open_tag("characters");
				foreach ($characters as $user => $chars) {
					$this->view->open_tag("user", array("name" => $user));
					foreach ($chars as $char) {
						$attr = array(
							"id"      => $char["id"],
							"checked" => show_boolean(in_array($char["id"], $invite["characters"])));
						$this->view->add_tag("character", $char["name"], $attr);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();
			}

			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				/* Inite players
				 */
				if ($this->model->save_oke($_POST) == false) {
					$this->show_invite_form($_POST);
				} else if ($this->model->invite_players($_POST) == false) {
					$this->view->add_message("Error while inviting players.");
					$this->show_invite_form($_POST);
				} else {
					$this->show_overview();
				}
			} else if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				/* Select players
				 */
				$invite = array("game_id" => $this->page->parameters[0]);
				$this->show_invite_form($invite);
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
