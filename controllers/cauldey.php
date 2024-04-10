<?php
	class cauldey_controller extends Banshee\controller {
		private function show() {
			$first_run = (isset($_SESSION["cauldey"]) == false);

			if ($first_run) {
				$_SESSION["cauldey"] = array();
			}

			$data = &$_SESSION["cauldey"];

			if ($first_run) {
				$data["existing"] = array();
				$data["adventure_id"] = null;
			}

			$step = "adventure";

			if ($first_run) {
				if (($adventure_ids = $this->model->get_adventure_ids()) === false) {
					return;
				}

				foreach ($adventure_ids as $adventure_id) {
					array_push($data["existing"], $adventure_id);
				}
			} else if ($data["adventure_id"] === null) {
				if (($adventure_ids = $this->model->get_adventure_ids()) === false) {
					return;
				}

				foreach ($adventure_ids as $adventure_id) {
					if (in_array($adventure_id, $data["existing"]) == false) {
						$data["adventure_id"] = $adventure_id;
						break;
					}
				}
			}

			if ($data["adventure_id"] != null) {
				$step = "map";

				if (($map_count = $this->model->get_map_count($data["adventure_id"])) === false) {
					return;
				}

				if ($map_count > 0) {
					$step = "done";

					if (isset($_SESSION["cauldey_done"]) == false) {
						$this->user->log_action("Cauldey done");
						$_SESSION["cauldey_done"] = true;
					}
				}
			}

			$this->view->add_tag("step", $step);
		}

		public function execute() {
			if ($this->page->ajax_request) {
				$this->show();
				return;
			}

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Activate") {
					$_SESSION["cauldey_activated"] = true;
					$this->user->log_action("Cauldey activated");
				} else if ($_POST["submit_button"] == "Deactivate") {
					unset($_SESSION["cauldey_activated"]);
					unset($_SESSION["cauldey"]);
				}
			}

			$this->view->add_tag("type", ($_SESSION["cauldey_activated"] ?? false) ? "Deactivate" : "Activate");
		}
	}
?>
