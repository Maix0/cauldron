<?php
	class spectate_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function format_text($text) {
			if ($text == "") {
				return $text;
			}

			$message = new \Banshee\message($text);
			$message->unescaped_output();
			$message->translate_bbcodes(false);

			return "<p>".$message->content."</p>";
		}

		private function resource_path($path, $resources_key) {
			if (substr($path, 0, 11) != "/resources/") {
				return $path;
			}

			$len = strlen($resources_key);
			if (substr($path, 11, $len) == $resources_key) {
				return $path;
			}

			return "/resources/".$resources_key.substr($path, 10);
		}

		private function show_games() {
			if (($games = $this->model->get_games()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("games.js");

			$this->view->open_tag("games");
			foreach ($games as $game) {
				$game["image"] = $this->resource_path($game["image"], $game["resources_key"]);
				$game["story"] = $this->format_text($game["story"]);

				$this->view->record($game, "game");
			}
			$this->view->close_tag();
		}

		private function spectate_game($game_id) {
			if (($game = $this->model->get_game($game_id)) === false) {
				$page = ($this->page->previous != "spectate") ? "game" : "spectate";
				$this->view->add_tag("result", "Game not found.", array("url" => $page));
				return;
			}

			if (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
				$game["active_map_id"] = $this->page->parameters[1];
			}

			if (($maps = $this->model->get_maps($game_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($maps) == 0) {
				$this->view->add_tag("result", "This game has no maps.");
				return;
			}

			$grid_cell_size = $this->settings->screen_grid_size;

			if ($game["active_map_id"] == null) {
				$game["active_map_id"] = $maps[0]["id"];
			}

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

			if (($lights = $this->model->get_lights($game["active_map_id"])) === false) {
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

			$factor = 1 / $active_map["grid_size"] * $grid_cell_size;
			$active_map["width"] = round($active_map["width"] * $factor);
			$active_map["height"] = round($active_map["height"] * $factor);

			$this->view->title = $game["title"];
			$this->view->set_layout("game");

			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("banshee/jquery.contextMenu.js");
			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("includes/library.js");
			$this->view->add_javascript("spectate.js");
			if ($active_map["fog_of_war"] > 0) {
				if (($active_map["fog_of_war"] == FOW_DAY_REAL) || ($active_map["fog_of_war"] == FOW_NIGHT_REAL)) {
					$type = "real";
				} else {
					$type = "cell";
				}
				$this->view->add_javascript("includes/fog_of_war_".$type.".js");
			}

			$this->view->add_css("banshee/context-menu.css");
			$this->view->add_css("banshee/font-awesome.css");

			$group_key = hash_hmac("sha256", $game["title"], $this->settings->secret_website_code);
			$group_key = substr($group_key, 0, 12);

			$attr = array(
				"id"             => $game["id"],
				"group_key"      => $group_key,
				"grid_cell_size" => $grid_cell_size);
			$this->view->open_tag("game", $attr);
			$this->view->record($game);

			/* Websocket
			 */
			$this->view->open_tag("websocket");
			$this->view->add_tag("host", $_SERVER["HTTP_HOST"]);
			$this->view->add_tag("port", WEBSOCKET_PORT);
			$this->view->close_tag();

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

			if ($active_map != null) {
				unset($active_map["dm_notes"]);

				$active_map["show_grid"] = show_boolean($active_map["show_grid"]);
				$active_map["drag_character"] = show_boolean($active_map["drag_character"]);
				$active_map["url"] = $this->resource_path($active_map["url"], $game["resources_key"]);

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

				/* Lights
				 */
				$this->view->open_tag("lights");
				foreach ($lights as $light) {
					$light["pos_x"] *= $grid_cell_size;
					$light["pos_y"] *= $grid_cell_size;

					$this->view->record($light, "light");
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
					unset($zone["script"]);
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
					if ($token["hitpoints"] > 0) {
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
				$this->view->open_tag("characters");
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
			$this->view->title = "Spectate games";
			$this->view->add_css("game.css");

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->show_games();
			} else {
				$this->spectate_game($this->page->parameters[0]);
			}
		}
	}
?>
