<?php
	require "game.php";

	class spectate_model extends game_model {
		public function get_games() {
			$query = "select g.*, u.fullname as dm, o.resources_key ".
			         "from games g, users u, organisations o ".
			         "where g.dm_id=u.id and u.organisation_id=o.id ";
			if ($this->user->is_admin == false) {
				$query .= "and access>=%d and o.id=%d ";
			}
			$query .= "order by g.timestamp desc";

			return $this->db->execute($query, GAME_ACCESS_PLAYERS_SPECTATORS, $this->user->organisation_id);
		}

		public function get_game($game_id) {
			$query = "select g.*, u.fullname as dm, o.resources_key ".
			         "from games g, users u, organisations o ".
			         "where g.id=%d and g.dm_id=u.id and u.organisation_id=o.id ";
			if ($this->user->is_admin == false) {
				$query .= "and access>=%d and o.id=%d ";
			}
			$query .= "order by g.timestamp desc";

			if (($games = $this->db->execute($query, $game_id, GAME_ACCESS_PLAYERS_SPECTATORS, $this->user->organisation_id)) == false) {
				return false;
			}

			return $games[0];
		}
	}
?>
