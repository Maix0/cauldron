<?php
	class cms_players_model extends Banshee\model {
		public function get_games() {
			$query = "select id, title, (select count(*) from game_character where game_id=g.id) as players ".
			         "from games g where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_game($game_id) {
			$query = "select id, title, (select count(*) from game_character where game_id=g.id) as players ".
			         "from games g where id=%d and dm_id=%d";

			if (($games = $this->db->execute($query, $game_id, $this->user->id)) == false) {
				return false;
			}

			return $games[0];
		}

		public function get_characters($game_id) {
			$query = "select c.*, u.fullname, ".
			         "(select count(*) from game_character where character_id=c.id) as busy, ".
			         "(select count(*) from game_character where character_id=c.id and game_id=%d) as enrolled ".
			         "from characters c, users u where c.user_id=u.id and u.organisation_id=%d ".
			         "and u.id!=%d having busy=%d or enrolled=%d order by u.fullname, c.name";

			if (($characters = $this->db->execute($query, $game_id, $this->user->organisation_id, $this->user->id, 0, 1)) === false) {
				return false;
			}

			$result = array();
			foreach ($characters as $character) {
				if (isset($result[$character["fullname"]]) == false) {
					$result[$character["fullname"]] = array();
				}

				array_push($result[$character["fullname"]], array(
					"id"       => $character["id"],
					"name"     => $character["name"],
					"enrolled" => $character["enrolled"]));
			}

			return $result;
		}

		public function save_oke($invite) {
			$result = true;

			if ($this->get_game($invite["game_id"]) == false) {
				$this->view->add_message("Game not found.");
				$result = false;
			}

			if (is_array($invite["characters"])) {
				$format = implode(", ", array_fill(1, count($invite["characters"]), "%d"));
				$query = "select count(*) as count from characters where user_id=%d and id in (".$format.")";
				if (($result = $this->db->execute($query, $this->user->id, $invite["characters"])) == false) {
					$result = false;
				} else if ($result[0]["count"] > 0)  {
					$this->view->add_message("You can't play in your own game.");
					$result = false;
				}
			}

			return $result;
		}

		public function invite_players($invite) {
			if ($this->db->query("begin") == false) {
				return false;
			}

			if ($this->db->query("delete from game_character where game_id=%d", $invite["game_id"]) === false) {
				$this->db->query("rollback");
				return false;
			}

			if (is_array($invite["characters"])) {
				$data = array("game_id" => $invite["game_id"]);
				$query = "select * from game_character where character_id=%d";
				foreach ($invite["characters"] as $character_id) {
					if (($enrolled = $this->db->execute($query, $character_id)) === false) {
						$this->db->query("rollback");
						return false;
					}
					if (count($enrolled) > 0) {
						$this->db->query("rollback");
						return false;
					}

					$data["character_id"] = $character_id;
					if ($this->db->insert("game_character", $data) === false) {
						$this->db->query("rollback");
						return false;
					}
				}
			}

			$query = "select id, start_x, start_y from maps where game_id=%d";
			if (($maps = $this->db->execute($query, $invite["game_id"])) === false) {
				return false;
			}

			foreach ($maps as $map) {
				if ($this->db->query("delete from map_character where map_id=%d", $map["id"]) === false) {
					$this->db->query("rollback");
					return false;
				}

				if ($this->borrow("cms/map")->place_characters($invite["game_id"], $map["id"], $map["start_x"], $map["start_y"]) == false) {
					$this->db->query("rollback");
					return false;
				}
			}

			return $this->db->query("commit") !== false;
		}
	}
?>
