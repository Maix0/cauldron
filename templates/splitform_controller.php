<?php
	class XXX_controller extends Banshee\splitform_controller {
		protected function prepare_example($data) {
		}

		public function execute() {
			$this->model->default_value("key1", "Hello world");
			parent::execute();
		}
	}
?>
