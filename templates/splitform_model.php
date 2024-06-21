<?php
	class XXX_model extends Banshee\splitform_model {
		protected $forms = array(
			"example" => array("key1", "key2"));

		public function validate_example($data) {
			$result = true;

			foreach ($this->forms[$this->current_form] as $element) {
				if (trim($data[$element]) == "") {
					$this->view->add_message($element." cannot be empty.");
					$result = false;
				}
			}

			return $result;
		}
	}
?>
