<?php
	class cms_map_arrange_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function arrange_map($map_id) {
			if (($map = $this->model->get_map($map_id)) == false) {
				$this->view->add_tag("result", "Database error.", array("url" => "cms/map"));
				return;
			}

			if (($library = $this->model->get_available_tokens()) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "cms/map"));
				return;
			}

			if (($game = $this->model->get_game($map["game_id"])) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "cms/map"));
				return;
			}

			if (($tokens = $this->model->get_tokens($map_id)) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "cms/map"));
				return;
			}

			if (($characters = $this->model->get_characters($map_id)) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "cms/map"));
				return;
			}

			if (($doors = $this->model->get_doors($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($walls = $this->model->get_walls($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($zones = $this->model->get_zones($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$grid_cell_size = $this->settings->screen_grid_size;
			$factor = 1 / $map["grid_size"] * $grid_cell_size;
			$map["width"] = round($map["width"] * $factor);
			$map["height"] = round($map["height"] * $factor);

			$this->view->title = $game["title"];
			$this->view->set_layout("game");

			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("banshee/jquery.contextMenu.js");
			$this->view->add_javascript("includes/library.js");
			$this->view->add_javascript("includes/script.js");
			$this->view->add_javascript("cms/map/arrange.js");
			$this->view->add_javascript("includes/fog_of_war.js");

		   	$this->view->add_css("banshee/context-menu.css");
			$this->view->add_css("banshee/font-awesome.css");

			$attr = array(
				"id"             => $game["id"],
				"grid_cell_size" => $grid_cell_size);
			$this->view->open_tag("game", $attr);
			$this->view->record($game);

			$map["show_grid"] = show_boolean($map["show_grid"]);
			$map["start_x"] *= $grid_cell_size;
			$map["start_y"] *= $grid_cell_size;
			$this->view->record($map, "map");

			/* Library
			 */
			$this->view->open_tag("library");
			foreach ($library as $token) {
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

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
				if ($zone["opacity"] < 0.2) {
					$zone["opacity"] = 0.2;
				} else if ($zone["opacity"] > 0.8) {
					$zone["opacity"] = 0.8;
				}
				$this->view->record($zone, "zone");
			}
			$this->view->close_tag();

			/* Tokens
			 */
			$this->view->open_tag("tokens");
			foreach ($tokens as $token) {
				$token["pos_x"] *= $grid_cell_size;
				$token["pos_y"] *= $grid_cell_size;
				$token["width"] *= $grid_cell_size;
				$token["height"] *= $grid_cell_size;
				$token["hidden"] = show_boolean($token["hidden"]);
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			/* Characters
			 */
			$this->view->open_tag("characters");
			foreach ($characters as $character) {
				$character["pos_x"] *= $grid_cell_size;
				$character["pos_y"] *= $grid_cell_size;
				$character["hidden"] = show_boolean($character["hidden"]);
				$this->view->record($character, "character");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Game";

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->view->add_tag("result", "No map specified.", array("url" => "cms/map"));
			} else {
				$this->arrange_map($this->page->parameters[0]);
			}
		}
	}
?>
