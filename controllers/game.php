<?php
	class game_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function format_text($text) {
			if ($text == "") {
				return $text;
			}

			$text = strip_tags($text, "<b><i><u>");

			$replace = array("\r" => "", "\n\n" => "</p><p>", "\n" => "<br \>");
			foreach ($replace as $key => $value) {
				$text = str_replace($key, $value, $text);
			}

			return "<p>".$text."</p>";
		}

		private function show_games() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("games.js");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$game["story"] = $this->format_text($game["story"]);
				$game["player_access"] = show_boolean($game["player_access"]);

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

			if (is_false($game["player_access"]) && ($user_is_dungeon_master == false)) {
				$this->view->add_tag("result", "This game is not accessible at the moment.");
				return;
			}

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

				if (($conditions = $this->model->get_conditions()) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if (($doors = $this->model->get_doors($game["active_map_id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if (($walls = $this->model->get_walls($game["active_map_id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if (($zones = $this->model->get_zones($game["active_map_id"])) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if (($journal = $this->model->get_journal($game_id)) === false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}

				if ($user_is_dungeon_master == false) {
					foreach ($characters as $character) {
						if ($character["user_id"] == $this->user->id) {
							$my_name = $character["name"];
							$my_icon = "character".$character["instance_id"];

							if (($alternates = $this->model->get_alternate_icons($character["id"])) === false) {
								$this->view->add_tag("result", "Database error.");
								return;
							}
							break;
						}
					}
				} else {
					$my_name = "Dungeon Master";
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
				$this->view->add_javascript("includes/library.js");
				$this->view->add_javascript("includes/script.js");
				$this->view->add_javascript("game.js");
				if (is_true($active_map["fog_of_war"])) {
					$this->view->add_javascript("includes/fog_of_war.js");
				}

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

			/* Map selector
			 */
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

			/* Effects
			 */
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
				if ($user_is_dungeon_master) {
					$active_map["dm_notes"] = $this->format_text($active_map["dm_notes"]);
				} else {
					unset($active_map["dm_notes"]);
				}

				$active_map["show_grid"] = show_boolean($active_map["show_grid"]);
				$active_map["drag_character"] = show_boolean($active_map["drag_character"]);
				$active_map["fog_of_war"] = show_boolean($active_map["fog_of_war"]);

				$this->view->record($active_map, "map");

				/* Doors
				 */
				$this->view->open_tag("doors");
				foreach ($doors as $door) {
					$this->view->record($door, "door");
				}
				$this->view->close_tag();

				/* Walls
				 */
				$this->view->open_tag("walls");
				foreach ($walls as $wall) {
					$wall["transparent"] = show_boolean($wall["transparent"]);
					$this->view->record($wall, "wall");
				}
				$this->view->close_tag();

				/* Zones
				 */
				$this->view->open_tag("zones");
				foreach ($zones as $zone) {
					$zone["pos_x"] *= $grid_cell_size;
					$zone["pos_y"] *= $grid_cell_size;
					$zone["width"] *= $grid_cell_size;
					$zone["height"] *= $grid_cell_size;
					if ($user_is_dungeon_master) {
						if ($zone["opacity"] < 0.2) {
							$zone["opacity"] = 0.2;
						} else if ($zone["opacity"] > 0.8) {
							$zone["opacity"] = 0.8;
						}
					} else {
						unset($zone["script"]);
					}
					$this->view->record($zone, "zone");
				}
				$this->view->close_tag();

				/* Tokens
				 */
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
					if (isset($token["c_id"])) {
						$token["c_hide"] = show_boolean($token["c_hide"]);
						$token["c_found"] = show_boolean($token["c_found"]);
					}
					$this->view->record($token, "token");
				}
				$this->view->close_tag();

				/* Characters
				 */
				$attr = array("name" => $my_name);
				if ($user_is_dungeon_master == false) {
					$attr["mine"] = $my_icon;
				}
				$this->view->open_tag("characters", $attr);
				foreach ($characters as $character) {
					$character["pos_x"] *= $grid_cell_size;
					$character["pos_y"] *= $grid_cell_size;
					$character["width"] = $grid_cell_size;
					$character["height"] = $grid_cell_size;
					$character["hidden"] = show_boolean($character["hidden"]);
					$character["perc"] = round(100 * $character["damage"] / $character["hitpoints"]);
					$character["orig_src"] = $character["id"].".".$character["extension"];
					if ($character["alternate_id"] != null) {
						$character["src"] = $character["id"]."_".$character["alternate_id"].".".$character["extension"];
						$character["width"] *= $character["alternate_size"];
						$character["height"] *= $character["alternate_size"];
					} else {
						$character["src"] = $character["orig_src"];
					}
					$this->view->record($character, "character");
				}
				$this->view->close_tag();

				/* Alternates
				 */
				if (is_array($alternates)) {
					$this->view->open_tag("alternates");
					foreach ($alternates as $alternate) {
						$alternate["filename"] = $alternate["character_id"]."_".$alternate["id"].".".$alternate["extension"];
						$this->view->record($alternate, "alternate");
					}
					$this->view->close_tag();
				}

				/* Conditions
				 */
				$this->view->open_tag("conditions");
				foreach ($conditions as $condition) {
					$this->view->add_tag("condition", $condition["name"], array("id" => $condition["id"]));
				}
				$this->view->close_tag();

				/* Journal
				 */
				$timestamp = 0;
				$session = 1;
				$this->view->open_tag("journal");
				foreach ($journal as $entry) {
					if ($entry["timestamp"] - $timestamp > 6 * HOUR) {
						$entry["session"] = "Session ".$session;
						$session++;
					}
					$this->view->record($entry, "entry");
					$timestamp = $entry["timestamp"];
				}
				if (time() - $timestamp > 6 * HOUR) {
					$this->view->record(array("session" => "Session ".$session), "entry");
				}
				$this->view->close_tag();
			}

			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Games";

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->show_games();
			} else {
				$this->run_game($this->page->parameters[0]);
			}
		}
	}
?>
