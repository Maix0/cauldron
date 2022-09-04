<?php
	class vault_players_controller extends Banshee\controller {
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

			if (($characters = $this->model->get_characters($invite["game_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($characters) == 0) {
				$this->view->add_tag("result", "No characters available to invite.");
				return;
			}

			if (is_array($invite["characters"] ?? null) == false) {
				$invite["characters"] = array();
			}

			$this->view->open_tag("edit");

			$this->view->record($game, "game");

			$active_game = false;

			if (is_array($characters)) {
				$this->view->open_tag("characters");
				foreach ($characters as $user => $chars) {
					$this->view->open_tag("user", array("name" => $user));
					foreach ($chars as $char) {
						if (is_true($char["enrolled"])) {
							array_push($invite["characters"], $char["id"]);
							$active_game = true;
						}

						$attr = array(
							"id"      => $char["id"],
							"checked" => show_boolean(in_array($char["id"], $invite["characters"])));
						$this->view->add_tag("character", $char["name"], $attr);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();
			}

			if ($active_game) {
				$this->view->add_message("Changing characters in an active game, will move all characters to the 'Player start' location on each map.");
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
			} else if ($this->page->parameter_numeric(0)) {
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
