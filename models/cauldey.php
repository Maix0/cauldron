<?php
    class cauldey_model extends Banshee\model {
		public function get_adventure_ids() {
			$query = "select a.id from adventures a, users u where a.dm_id=u.id and u.organisation_id=%d";
			if (($adventures = $this->db->execute($query, $this->user->organisation_id)) === false) {
				return false;
			}

			$result = array();
			foreach ($adventures as $adventure) {
				array_push($result, (int)$adventure["id"]);
			}

			return $result;
		}

		public function get_map_count($adventure_id) {
			$query = "select count(*) as count from maps m, adventures a where m.adventure_id=a.id and a.id=%d and a.dm_id=%d";
			if (($maps = $this->db->execute($query, $adventure_id, $this->user->id)) === false) {
				return false;
			}

			return $maps[0]["count"];
		}
	}
?>
