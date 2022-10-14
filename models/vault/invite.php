<?php
	class vault_invite_model extends Banshee\model {
		public function get_invitation_code() {
			$query = "select invitation_code from organisations where id=%d";

			if (($result = $this->db->execute($query, $this->user->organisation_id)) == false) {
				return false;
			}

			return $result[0]["invitation_code"];
		}

		public function save_invitation_code($invitation_code) {
			$invitation_code = trim($invitation_code);

			if ($invitation_code == "") {
				$invitation_code = null;
			}

			$data = array("invitation_code" => $invitation_code);

			return $this->db->update("organisations", $this->user->organisation_id, $data) != false;
		}
	}
?>
