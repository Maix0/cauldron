<?php
	class game_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function show_games() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$this->view->record($game, "game");
			}
			$this->view->close_tag();
		}

		private function run_game($game_id) {
			if (($game = $this->model->get_game($game_id)) === false) {
				$this->view->add_tag("result", "Game not found.");
				return;
			}
			$user_is_dungeon_master = ($game["dm_id"] == $this->user->id);

			if (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				$game["traveled_from"] = $game["active_map_id"];
				$game["active_map_id"] = $this->page->parameters[1];
			}
			
			if ($user_is_dungeon_master) {
				if (($maps = $this->model->get_maps($game_id)) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}
			}

			$grid_cell_size = $this->settings->screen_grid_size;

			if ($game["active_map_id"] != null) {
				if (($active_map = $this->model->get_map($game["active_map_id"])) == false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if ($active_map["game_id"] != $game_id) {	
					$this->view->add_tag("result", "Invalid map.");
					return;
				}

				if (($tokens = $this->model->get_tokens($game["active_map_id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if (($characters = $this->model->get_characters($game["active_map_id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				$factor = 1 / $active_map["grid_size"] * $grid_cell_size;
				$active_map["width"] = round($active_map["width"] * $factor);
				$active_map["height"] = round($active_map["height"] * $factor);
			}

			$this->view->title = $game["title"];
			$this->view->set_layout("game");

			if ($active_map != null) {
				$this->view->add_javascript("webui/jquery-ui.js");
				$this->view->add_javascript("banshee/jquery.contextMenu.js");
				$this->view->add_javascript("game.js");

            	$this->view->add_css("banshee/context-menu.css");
				$this->view->add_css("banshee/font-awesome.css");
			} else {
				$this->view->add_javascript("game_no_map.js");
			}

			$attr = array(
				"id"             => $game["id"],
				"dm"             => show_boolean($user_is_dungeon_master),
				"grid_cell_size" => $grid_cell_size);
			$this->view->open_tag("game", $attr);
			$this->view->record($game);

			if ($maps != null) {
				$this->view->open_tag("maps");
				if ($active_map == null) {
					$this->view->add_tag("map", "-", array("id" => 0));
				}
				foreach ($maps as $map) {
					$attr = array("id" => $map["id"]);
					if ($active_map != null) {
						$attr["current"] = show_boolean($map["id"] == $active_map["id"]);
					} else {
						$attr["current"] = "no";
					}

					$this->view->add_tag("map", $map["title"], $attr);
				}
				$this->view->close_tag();
			}

			if ($active_map != null) {
				$active_map["show_grid"] = show_boolean($active_map["show_grid"]);
				$this->view->record($active_map, "map");

				$this->view->open_tag("tokens");
				foreach ($tokens as $token) {
					if (($token["width"] % 2) != ($token["height"] % 2)) {
						$token["rotation_point"] = $grid_cell_size."px ".$grid_cell_size."px";
					}
					$token["width"] *= $grid_cell_size;
					$token["height"] *= $grid_cell_size;
					$token["pos_x"] *= $grid_cell_size;
					$token["pos_y"] *= $grid_cell_size;
					$token["hidden"] = show_boolean($token["hidden"]);
					if ($user_is_dungeon_master && ($token["hitpoints"] > 0)) {
						$token["perc"] = round(100 * $token["damage"] / $token["hitpoints"]);
					}
					$this->view->record($token, "token");
				}
				$this->view->close_tag();

				$attr = array("name" => "Dungeon Master");
				if ($user_is_dungeon_master == false) {
					foreach ($characters as $character) {
						if ($character["user_id"] == $this->user->id) {	
							$attr["mine"] = "character".$character["instance_id"];
							$attr["name"] = $character["name"];
						}
					}
				}

				$this->view->open_tag("characters", $attr);
				foreach ($characters as $character) {
					$character["width"] = $grid_cell_size;
					$character["height"] = $grid_cell_size;
					$character["pos_x"] *= $grid_cell_size;
					$character["pos_y"] *= $grid_cell_size;
					$character["hidden"] = show_boolean($character["hidden"]);
					$character["perc"] = round(100 * $character["damage"] / $character["hitpoints"]);
					$this->view->record($character, "character");
				}
				$this->view->close_tag();
			}

			$this->view->close_tag();
		}

		private function handle_ajax_request() {
			switch ($_POST["action"]) {
				case "change_map":
					$this->model->change_map($_POST["game_id"], $_POST["map_id"]);
					break;
				case "damage":
					if (substr($_POST["instance_id"], 0, 9) == "character") {
						$instance_id = substr($_POST["instance_id"], 9);
						$this->model->damage_character($instance_id, $_POST["damage"]);
					} else if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->damage_token($instance_id, $_POST["damage"]);
					} else {
						debug_log($_POST);
					}
					break;
				case "hide":
					if (substr($_POST["instance_id"], 0, 9) == "character") {
						$instance_id = substr($_POST["instance_id"], 9);
						$this->model->set_character_hidden($instance_id, true);
					} else if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->set_token_hidden($instance_id, true);
					} else {
						debug_log($_POST);
					}
					break;
				case "move":
					if (substr($_POST["instance_id"], 0, 9) == "character") {
						$instance_id = substr($_POST["instance_id"], 9);
						$this->model->move_character($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
					} else if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->move_token($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
					} else {
						debug_log($_POST);
					}
					break;
				case "show":
					if (substr($_POST["instance_id"], 0, 9) == "character") {
						$instance_id = substr($_POST["instance_id"], 9);
						$this->model->set_character_hidden($instance_id, false);
					} else if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->set_token_hidden($instance_id, false);
					} else {
						debug_log($_POST);
					}
					break;
				default:
					debug_log($_POST);
			}
		}

		public function execute() {
			if ($this->page->ajax_request) {
				if ($_SERVER["REQUEST_METHOD"] == "POST") {
					$this->handle_ajax_request();
				}
				return;
			}

			$this->view->title = "Game";

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->show_games();
			} else {
				$this->run_game($this->page->parameters[0]);
			}
		}
	}
?>
