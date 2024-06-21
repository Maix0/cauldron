<?php
	class vault_dice_model extends Banshee\model {
		private $columns = array();

		public function get_dices() {
			$query = "select * from custom_dice where user_id=%d order by name";

			if (($dices = $this->db->execute($query, $this->user->id)) === false) {
				return false;
			}

			foreach ($dices as $i => $dice) {
				$dices[$i]["sides"] = count(json_decode($dice["sides"]));
			}

			return $dices;
		}

		public function get_dice($dice_id) {
			$query = "select * from custom_dice where id=%d and user_id=%d";
			if (($dice = $this->db->execute($query, $dice_id, $this->user->id)) == false) {
				return false;
			}
			$dice = $dice[0];

			$dice["sides"] = json_decode($dice["sides"], true);

			return $dice;
		}

		public function save_okay($dice) {
			$result = true;

			if (isset($dice["id"])) {
				if ($this->get_dice($dice["id"]) == false) {
					$this->view->add_tag("Dice not found.");
					$result = false;
				}
			}

			if (trim($dice["name"]) == "") {
				$this->view->add_message("Specify the dice name.");
				$result = false;
			}

			$valid_sides = array(4, 6, 8, 10, 12, 20);
			if (in_array(count($dice["sides"]), $valid_sides) == false) {
				$this->view->add_message("Invalid side count.");
				$result = false;
			} else foreach ($dice["sides"] as $side) {
				if (trim($side) == "") {
					$this->view->add_message("Specify each dice side.");
					$result = false;
					break;
				}
			}

			return $result;
		}

		public function create_dice($dice) {
			$keys = array("id", "user_id", "name", "sides");

			$dice["id"] = null;
			$dice["user_id"] = $this->user->id;
			$dice["sides"] = json_encode($dice["sides"]);

			return $this->db->insert("custom_dice", $dice, $keys);
		}

		public function update_dice($dice) {
			$keys = array("name", "sides");

			$dice["sides"] = json_encode($dice["sides"]);

			return $this->db->update("custom_dice", $dice["id"], $dice, $keys);
		}

		public function delete_okay($dice) {
			$result = true;

			if ($this->get_dice($dice["id"]) == false) {
				$this->view->add_tag("Dice not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_dice($dice_id) {
			return $this->db->delete("custom_dice", $dice_id);
		}
	}
?>
