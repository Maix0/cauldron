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

				if (($effects = $this->model->get_effects()) === false) {
					$this->view->add_tag("result", "Error reading effects.");
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

				if (($zones = $this->model->get_zones($game["active_map_id"])) === false) {
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

			if ($effects != null) {
				$this->view->open_tag("effects");
				foreach ($effects as $effect) {
					list($name) = explode(".", $effect, 2);
					$name = str_replace("_", " ", $name);
					$this->view->add_tag("effect", $effect, array("name" => $name));
				}
				$this->view->close_tag();
			}

			if ($active_map != null) {
				$active_map["show_grid"] = show_boolean($active_map["show_grid"]);
				$this->view->record($active_map, "map");

				$this->view->open_tag("zones");
				foreach ($zones as $zone) {
					$zone["pos_x"] *= $grid_cell_size;
					$zone["pos_y"] *= $grid_cell_size;
					$zone["width"] *= $grid_cell_size;
					$zone["height"] *= $grid_cell_size;
					if ($user_is_dungeon_master && ($zone["opacity"] > 0.8)) {
						$zone["opacity"] = 0.8;
					}
					$this->view->record($zone, "zone");
				}
				$this->view->close_tag();

				$this->view->open_tag("tokens");
				foreach ($tokens as $token) {
					$token["type"] = rtrim($token["type"], " 01234567890");
					$token["pos_x"] *= $grid_cell_size;
					$token["pos_y"] *= $grid_cell_size;
					$token["width"] *= $grid_cell_size;
					$token["height"] *= $grid_cell_size;
					$token["hidden"] = show_boolean($token["hidden"]);
					if ($user_is_dungeon_master && ($token["hitpoints"] > 0)) {
						$token["perc"] = round(100 * $token["damage"] / $token["hitpoints"]);
					}
					if (isset($token["c_hide"])) {
						$token["c_hide"] = show_boolean($token["c_hide"]);
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

		public function execute() {
			$this->view->title = "Game";

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->show_games();
			} else {
				$this->run_game($this->page->parameters[0]);
			}
		}
	}
?>
