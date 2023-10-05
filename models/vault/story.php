<?php
	class vault_story_model extends cauldron_model {
		/* Adventure
		 */
		public function get_story($adventure_id) {
			$query = "select id, title, story from adventures where id=%d and dm_id=%d";

			if (($adventure = $this->db->execute($query, $adventure_id, $this->user->id)) == false) {
				return false;
			}

			return $adventure[0];
		}

		public function save_story($story) {
			$query = "update adventures set story=%s where id=%d and dm_id=%d";

			return $this->db->execute($query, $story["story"], $story["id"], $this->user->id) !== false;
		}

		/* Characters
		 */
		public function get_characters($adventure_id) {
			$query = "select c.id, c.name, c.sheet_url, u.fullname ".
			         "from characters c, users u, adventure_character a ".
			         "where c.user_id=u.id and c.id=a.character_id and a.adventure_id=%d ".
			         "order by name";

			return $this->db->execute($query, $adventure_id);
		}

		/* NPCs
		 */
		public function get_npcs($adventure_id) {
			$query = "select n.* from story_npcs n, adventures a ".
			         "where n.adventure_id=a.id and n.adventure_id=%d and a.dm_id=%d ".
			         "order by name";

			return $this->db->execute($query, $adventure_id, $this->user->id);
		}

		public function get_npc($npc_id) {
			$query = "select n.* from story_npcs n, adventures a ".
			         "where n.id=%d and n.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $npc_id, $this->user->id)) == false) {
				return false;
			}

			return $result[0];
		}

		public function save_npc_okay($npc) {
			$result = true;

			if (isset($npc["id"])) {
				if ($this->get_npc($npc["id"]) == false) {
					$this->view->add_message("NPC not found.");
					$result = false;
				}
			}

			if (trim($npc["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			if ($npc["cr"] != "") {
				if (in_array($npc["cr"], array_keys(CR_to_XP)) == false) {
					$this->view->add_message("Invalid challenge rating.");
					$result = false;
				}
			}

			return $result;
		}

		public function create_npc($npc) {
			$keys = array("id", "adventure_id", "name", "cr", "type", "description");

			$npc["id"] = null;
			$npc["adventure_id"] = $this->active_adventure_id;
			$npc["description"] = trim($npc["description"]);

			return $this->db->insert("story_npcs", $npc, $keys);
		}

		public function update_npc($npc) {
			$keys = array("name", "cr", "type", "description");

			$npc["description"] = trim($npc["description"]);

			return $this->db->update("story_npcs", $npc["id"], $npc, $keys);
		}

		public function delete_npc_okay($npc) {
			$result = true;

			if ($this->get_npc($event["id"]) == false) {
				$this->view->add_message("NPC not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_npc($npc_id) {
			return $this->db->delete("story_npcs", $npc_id);
		}

		/* Objects
		 */
		public function get_objects($adventure_id) {
			$query = "select l.* from story_objects l, adventures a ".
			         "where l.adventure_id=a.id and l.adventure_id=%d and a.dm_id=%d ".
			         "order by nr, name";

			return $this->db->execute($query, $adventure_id, $this->user->id);
		}

		public function get_object($object_id) {
			$query = "select l.* from story_objects l, adventures a ".
			         "where l.id=%d and l.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $object_id, $this->user->id)) == false) {
				return false;
			}

			return $result[0];
		}

		public function save_object_okay($object) {
			$result = true;

			if (isset($object["id"])) {
				if ($this->get_object($object["id"]) == false) {
					$this->view->add_message("NPC not found.");
					$result = false;
				}
			}

			if (trim($object["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			return $result;
		}

		public function create_object($object) {
			$keys = array("id", "adventure_id", "nr", "name", "located", "description");

			$object["id"] = null;
			$object["nr"] = 0;
			$object["adventure_id"] = $this->active_adventure_id;
			$object["description"] = trim($object["description"]);

			return $this->db->insert("story_objects", $object, $keys);
		}

		public function update_object($object) {
			$keys = array("name", "located", "description");

			$object["description"] = trim($object["description"]);

			return $this->db->update("story_objects", $object["id"], $object, $keys);
		}

		public function delete_object_okay($object) {
			$result = true;

			if ($this->get_object($event["id"]) == false) {
				$this->view->add_message("NPC not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_object($object_id) {
			return $this->db->delete("story_objects", $object_id);
		}

		/* Events
		 */
		public function get_events($adventure_id) {
			$query = "select e.* from story_events e, adventures a ".
			         "where e.adventure_id=a.id and e.adventure_id=%d and a.dm_id=%d ".
			         "order by nr, title";

			return $this->db->execute($query, $adventure_id, $this->user->id);
		}

		public function get_event($event_id) {
			$query = "select e.* from story_events e, adventures a ".
			         "where e.id=%d and e.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $event_id, $this->user->id)) == false) {
				return false;
			}

			return $result[0];
		}

		public function save_event_okay($event) {
			$result = true;

			if (isset($event["id"])) {
				if ($this->get_event($event["id"]) == false) {
					$this->view->add_message("Event not found.");
					$result = false;
				}
			}

			if (trim($event["title"]) == "") {
				$this->view->add_message("Fill in the title.");
				$result = false;
			}

			return $result;
		}

		public function create_event($event) {
			$keys = array("id", "adventure_id", "nr", "title", "description");

			$event["id"] = null;
			$event["nr"] = 0;
			$event["adventure_id"] = $this->active_adventure_id;
			$event["description"] = trim($event["description"]);

			return $this->db->insert("story_events", $event, $keys);
		}

		public function update_event($event) {
			$keys = array("title", "description");

			$event["description"] = trim($event["description"]);

			return $this->db->update("story_events", $event["id"], $event, $keys);
		}

		public function delete_event_okay($event) {
			$result = true;

			if ($this->get_event($event["id"]) == false) {
				$this->view->add_message("Event not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_event($event_id) {
			return $this->db->delete("story_events", $event_id);
		}

		/* Encounters
		 */
		private function get_monsters($encounter_id) {
			$query = "select id, monster, cr, count, source from story_encounter_monsters ".
			         "where story_encounter_id=%d order by monster";

			return $this->db->execute($query, $encounter_id);
		}

		public function get_encounters($adventure_id) {
			$query = "select e.* from story_encounters e, adventures a ".
			         "where e.adventure_id=a.id and e.adventure_id=%d and a.dm_id=%d ".
			         "order by title";

			if (($encounters = $this->db->execute($query, $adventure_id, $this->user->id)) === false) {
				return false;
			}

			foreach ($encounters as $i => $encounter) {
				if (($monsters = $this->get_monsters($encounter["id"])) === false) {
					return false;
				}
				$encounters[$i]["monsters"] = $monsters;
			}

			return $encounters;
		}

		public function get_encounter($encounter_id) {
			$query = "select e.* from story_encounters e, adventures a ".
			         "where e.id=%d and e.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $encounter_id, $this->user->id)) == false) {
				return false;
			}

			if (($result[0]["monsters"] = $this->get_monsters($encounter_id)) === false) {
				return false;
			}

			return $result[0];
		}

		public function save_encounter_okay($encounter) {
			$result = true;

			if (isset($encounter["id"])) {
				if ($this->get_encounter($encounter["id"]) == false) {
					$this->view->add_message("Encounter not found.");
					$result = false;
				}
			}

			if (trim($encounter["title"]) == "") {
				$this->view->add_message("Fill in the title.");
				$result = false;
			}

			$crs = array_keys(CR_to_XP);

			if (count($encounter["monsters"]) == 0) {
				$this->view->add_message("add at least one monster.");
				$result = false;
			} else foreach ($encounter["monsters"] as $monster) {
				if (trim($monster["monster"]) == "") {
					$this->view->add_message("Specify what monster.");
					$result = false;
				}

				if (valid_input($monster["count"], VALIDATE_NUMBERS) == false) {
					$this->view->add_message("Invalid monster count.");
					$result = false;
				}

				if (in_array($monster["cr"], $crs) == false) {
					$this->view->add_message("Invalid challenge rating.");
					$result = false;
				}
			}

			return $result;
		}

		public function save_monsters($monsters, $encounter_id) {
			$keys = array("id", "story_encounter_id", "monster", "cr", "count", "source");

			foreach ($monsters as $monster) {
				$monster["id"] = null;
				$monster["story_encounter_id"] = $encounter_id;
				if ($monster["count"] == "") {
					$monster["count"] = 1;
				}

				if ($this->db->insert("story_encounter_monsters", $monster, $keys) === false) {
					return false;
				}
			}

			return true;
		}

		public function create_encounter($encounter) {
			$keys = array("id", "adventure_id", "title");

			$encounter["id"] = null;
			$encounter["adventure_id"] = $this->active_adventure_id;

			$this->db->query("begin");

			if ($this->db->insert("story_encounters", $encounter, $keys) === false) {
				$this->db->query("rollback");
				return false;
			}

			if ($this->save_monsters($encounter["monsters"], $this->db->last_insert_id) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") !== false;
		}

		public function update_encounter($encounter) {
			$keys = array("title");

			$this->db->query("begin");

			if ($this->db->update("story_encounters", $encounter["id"], $encounter, $keys) === false) {
				$this->db->query("rollback");
				return false;
			}

			$query = "delete from story_encounter_monsters where story_encounter_id=%d";
			if ($this->db->query($query, $encounter["id"]) === false) {
				$this->db->query("rollback");
				return false;
			}

			if ($this->save_monsters($encounter["monsters"], $encounter["id"]) == false) {
				$this->db->query("rollback");
				return false;
			}

			return $this->db->query("commit") !== false;
		}

		public function delete_encounter_okay($encounter) {
			$result = true;

			if ($this->get_encounter($encounter["id"]) == false) {
				$this->view->add_message("Encounter not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_encounter($encounter_id) {
			$queries = array(
				array("delete from story_encounter_monsters where story_encounter_id=%d", $encounter_id),
				array("delete from story_encounters where id=%d", $encounter_id));

			return $this->db->transaction($queries) !== false;
		}

		/* Order
		 */
		public function save_order($adventure_id, $type, $order) {
			$query = "select * from adventures where id=%d and dm_id=%d";
			if ($this->db->execute($query, $adventure_id, $this->user->id) == false) {
				return false;
			}

			if (in_array($type, array("events", "objects")) == false) {
				return false;
			}

			if (is_array($order) == false) {
				return false;
			} else if (count($order) == 0) {
				return false;
			}

			$query = "update %S set nr=%d where id=%d and adventure_id=%d";
			$nr = 1;
			foreach ($order as $item_id) {
				$this->db->query($query, "story_".$type, ($nr++), $item_id, $adventure_id);
			}

			return true;
		}
	}
?>
