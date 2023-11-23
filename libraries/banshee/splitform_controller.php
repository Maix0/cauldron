<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class splitform_controller extends controller {
		protected $button_previous = "Previous <<";
		protected $button_next = "Next >>";
		protected $button_submit = "Submit";
		protected $button_back = "Cancel";
		protected $back_page = null;

		/* Main function
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function execute() {
			if (is_a($this->model, "Banshee\\splitform_model") == false) {
				print "Splitform model has not been defined.\n";
				return false;
			}

			/* Check class settings
			 */
			if (is_true(DEBUG_MODE)) {
				if ($this->model->class_settings_okay() == false) {
					return false;
				}
			}

			/* Start
			 */
			$submit_button = $_POST["submit_button"] ?? null;
			unset($_POST["submit_button"]);

			$splitform_current = $_POST["splitform_current"] ?? null;
			unset($_POST["splitform_current"]);

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($splitform_current != $this->model->current_step) {
					/* Refresh button pressed
					 */
					$this->model->load_form_data();
				} else if ($submit_button == $this->button_previous) {
					/* Previous button pressed
					 */
					if ($this->model->current_step > 0) {
						$this->model->save_post_data();
						$this->model->current_step--;
						$this->model->load_form_data();
					} else {
						return false;
					}
				} else if (($submit_button == $this->button_next) || ($submit_button == $this->button_submit)) {
					/* Next or submit button pressed
					 */
					$this->model->save_post_data();

					$validate = "validate_".$this->model->current_form;
					if (method_exists($this->model, $validate)) {
						$form_data_okay = call_user_func(array($this->model, $validate), $_POST);
					} else {
						$form_data_okay = true;
					}

					if ($form_data_okay) {
						if ($this->model->current_step < $this->model->max_steps) {
							/* Subform okay
							 */
							$this->model->current_step++;
							$this->model->load_form_data();
						} else if ($this->model->process_form_data($this->model->values) == false) {
							/* Submit error
							 */
							$this->model->load_form_data();
						} else {
							/* Submit okay
							 */
							$this->view->add_tag("done");
							$this->view->open_tag("submit");
							$this->view->add_tag("current", $this->model->max_steps + 1, array("max" => $this->model->max_steps, "percentage" => "100"));
							foreach ($this->model->values as $key => $value) {
								$this->view->add_tag("value", $value, array("key" => $key));
							}
							$this->view->close_tag();

							$this->model->reset_form_progress();
							unset($_SESSION["splitform"][$this->page->module]);
							return true;
						}
					}
				}
			} else {
				$this->model->load_form_data();
			}

			$this->view->add_javascript("banshee/splitform.js");

			$this->view->open_tag("splitforms");
			$percentage = round(100 * ($this->model->current_step + 1) / ($this->model->max_steps + 2));
			$this->view->add_tag("current", $this->model->current_step, array("max" => $this->model->max_steps, "percentage" => $percentage));

			/* Prepare form
			 */
			$prepare = "prepare_".$this->model->current_form;
			if (method_exists($this, $prepare)) {
				$values = $_SESSION["splitform"][$this->page->module]["values"];
				call_user_func(array($this, $prepare), $values);
			}

			/* Show the webform
			 */
			$this->view->open_tag("splitform");
			$this->view->open_tag("form_".$this->model->current_form);
			foreach ($_POST as $key => $value) {
				$this->view->add_tag($key, $value);
			}
			$this->view->close_tag();
			$this->view->close_tag();

			/* Show the button labels
			 */
			$this->view->open_tag("buttons");
			$this->view->add_tag("previous", $this->button_previous);
			$this->view->add_tag("next", $this->button_next);
			$this->view->add_tag("submit", $this->button_submit);
			if ($this->back_page !== null) {
				$this->view->add_tag("back", $this->button_back, array("link" => $this->back_page));
			}
			$this->view->close_tag();

			$this->view->close_tag();

			return true;
		}
	}
?>
