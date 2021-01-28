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

			$grid_cell_size = $this->settings->screen_grid_size;
			$factor = 1 / $map["grid_size"] * $grid_cell_size;
			$map["width"] *= $factor;
			$map["height"] *= $factor;

			$this->view->title = $game["title"];
			$this->view->set_layout("game");

			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("banshee/jquery.contextMenu.js");
			$this->view->add_javascript("cms/map/arrange.js");

		   	$this->view->add_css("banshee/context-menu.css");
			$this->view->add_css("banshee/font-awesome.css");

			$attr = array(
				"id"             => $game["id"],
				"grid_cell_size" => $grid_cell_size);
			$this->view->open_tag("game", $attr);
			$this->view->record($game);

			$this->view->record($map, "map");

			$this->view->open_tag("library");
			foreach ($library as $token) {
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

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
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			$this->view->open_tag("characters");
			foreach ($characters as $character) {
				$character["width"] = $grid_cell_size;
				$character["height"] = $grid_cell_size;
				$character["pos_x"] *= $grid_cell_size;
				$character["pos_y"] *= $grid_cell_size;
				$character["hidden"] = show_boolean($character["hidden"]);
				$this->view->record($character, "character");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function handle_ajax_request() {
			switch ($_POST["action"]) {
				case "armor_class":
					if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->token_armor_class($instance_id, $_POST["armor_class"]);
					} else {
						debug_log($_POST);
					}
					break;
				case "create":
					if (($instance_id = $this->model->create_token($_POST)) !== false) {
						$this->view->add_tag("instance_id", $instance_id);
					} else {
						$this->page->set_http_code(500);
						debug_log($_POST);
					}
					break;
				case "delete":
					if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->delete_token($instance_id);
					} else {
						debug_log($_POST);
					}
					break;
				case "name":
					if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->name_token($instance_id, $_POST["name"]);
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
				case "hitpoints":
					if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->token_hitpoints($instance_id, $_POST["hitpoints"]);
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
				case "rotate":
					if (substr($_POST["instance_id"], 0, 5) == "token") {
						$instance_id = substr($_POST["instance_id"], 5);
						$this->model->rotate_token($instance_id, $_POST["direction"]);
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
				$this->view->add_tag("result", "No map specified.", array("url" => "cms/map"));
			} else {
				$this->arrange_map($this->page->parameters[0]);
			}
		}
	}
?>
