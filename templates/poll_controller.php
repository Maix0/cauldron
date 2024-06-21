<?php
	class demos_poll_controller extends Banshee\controller {
		public function execute() {
			$poll = new \Banshee\poll($this->db, $this->view, $this->settings);

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				$poll->vote($_POST["vote"]);
			}

			$poll->add_to_view();
		}
	}
?>
