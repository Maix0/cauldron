<?php
	class vault_adventure_model extends cauldron_model {
		public function get_adventures() {
			$query = "select *, (select count(*) from adventure_character where adventure_id=a.id) as players, ".
			         "(select count(*) from maps where adventure_id=a.id) as maps ".
			         "from adventures a where dm_id=%d order by timestamp desc";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_adventure($adventure_id) {
			static $cache = array();

			if (isset($cache[$adventure_id]) == false) {
				$query = "select * from adventures where id=%d and dm_id=%d";

				if (($adventures = $this->db->execute($query, $adventure_id, $this->user->id)) == false) {
					return false;
				}
				$cache[$adventure_id] = $adventures[0];
			}

			return $cache[$adventure_id];
		}

		public function save_okay($adventure) {
			$result = true;

			if (isset($adventure["id"])) {
				if (($current = $this->get_adventure($adventure["id"])) == false) {
					$this->view->add_message("Adventure not found.");
					$result = false;
				}
			}

			if (trim($adventure["title"]) == "") {
				$this->view->add_message("Fill in the title.");
				$result = false;
			}

			if (strlen($adventure["image"]) > 250) {
				$this->view->add_message("Image URL is too long.");
				$result = false;
			}

			return $result;
		}

		public function create_adventure($adventure) {
			$keys = array("id", "title", "image", "story", "dm_id", "access");

			$adventure["id"] = null;
			$adventure["dm_id"] = $this->user->id;
			$adventure["active_map_id"] = null;

			return $this->db->insert("adventures", $adventure, $keys) !== false;
		}

		public function update_adventure($adventure) {
			$keys = array("title", "image", "story", "access");

			return $this->db->update("adventures", $adventure["id"], $adventure, $keys) !== false;
		}

		public function delete_okay($adventure) {
			$result = true;

			if (($current = $this->get_adventure($adventure["id"])) == false) {
				$this->view->add_message("Adventure not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_adventure($adventure_id) {
			$query = "select resources_key from organisations o, users u, adventures a ".
			         "where o.id=u.organisation_id and u.id=a.dm_id and a.id=%d";
			if (($result = $this->db->execute($query, $adventure_id)) == false) {
				return false;
			}
			$resources_key = $result[0]["resources_key"];

			$query = "select image from collectables where adventure_id=%d";
			if (($collectables = $this->db->execute($query, $adventure_id)) === false) {
				return false;
			}

			$queries = array(
				array("delete from journal where adventure_id=%d", $adventure_id),
				array("delete from collectables where adventure_id=%d", $adventure_id),
				array("delete from lights where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from blinders where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from doors where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from walls where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from zones where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from map_token where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from map_character where map_id in (select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from adventure_character where adventure_id=%d", $adventure_id),
				array("update adventures set active_map_id=null where id=%d", $adventure_id),
				array("delete from maps where adventure_id=%d", $adventure_id),
				array("delete from adventures where id=%d", $adventure_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				unlink("resources/".$resources_key."/collectables/".$collectable["image"]);
			}

			return true;
		}
	}
?>
