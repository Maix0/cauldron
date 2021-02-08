<?php
	class object_controller extends Banshee\api_controller {
		public function post_armor_class() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_armor_class($instance_id, $_POST["armor_class"]);
			}
		}

		public function post_change_map() {
			$this->model->change_map($_POST["game_id"], $_POST["map_id"]);
		}

		public function post_create_token() {
			if (($instance_id = $this->model->token_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_zone() {
			if (($instance_id = $this->model->zone_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_damage() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_damage($instance_id, $_POST["damage"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_damage($instance_id, $_POST["damage"]);
			}
		}

		public function post_delete() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 4) == "zone") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->zone_delete($instance_id);
			}
		}

		public function post_hide() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_hide($instance_id, true);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hide($instance_id, true);
			}
		}

		public function post_hitpoints() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hitpoints($instance_id, $_POST["hitpoints"]);
			}
		}

		public function post_move() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 4) == "zone") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->zone_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			}
		}

		public function post_name() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_name($instance_id, $_POST["name"]);
			}
		}

		public function post_rotate() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_rotate($instance_id, $_POST["rotation"]);
			}
		}

		public function post_show() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_hide($instance_id, false);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hide($instance_id, false);
			}
		}

		/* Collectables
		 */
		public function post_collectables_unused() {
			if (($collectables = $this->model->collectables_get_unused($_POST["game_id"], $_POST["instance_id"])) === false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				$this->view->record($collectable, "collectable");
			}
		}

		public function post_collectable_place() {
			$this->model->collectable_place($_POST["collectable_id"], $_POST["instance_id"]);
		}

		public function post_collectable_found() {
			$this->model->collectable_found($_POST["collectable_id"]);
		}

		public function post_collectables_found() {
			if (($collectables = $this->model->collectables_get_found($_POST["game_id"])) === false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				$this->view->record($collectable, "collectable");
			}
		}
	}
?>
