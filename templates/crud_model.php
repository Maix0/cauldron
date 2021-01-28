<?php
	class XXX_model extends Banshee\model {
		private $columns = array();

		public function count_XXXs() {
			$query = "select count(*) as count from XXXs";

			if (($result = $this->db->execute($query)) == false) {
				return false;
			}

			return $result[0]["count"];
		}

		public function get_XXXs($offset = null, $limit = null) {
			if (isset($_SESSION["XXX_order"]) == false) {
				$_SESSION["XXX_order"] = array("yyy", "zzz");
			}

			if ((in_array($_GET["order"], $this->columns)) && ($_GET["order"] != $_SESSION["XXX_order"][0])) {
				$_SESSION["XXX_order"] = array($_GET["order"], $_SESSION["XXX_order"][0]);
			}

			$query = "select * from XXXs";

			$search_columns = $search_values = array();
			if ($_SESSION["XXX_search"] != null) {
				foreach ($this->columns as $i => $column) {
					array_push($search_columns, $column." like %s");
					array_push($search_values, "%".$_SESSION["XXX_search"]."%");
				}
				$query .= " having (".implode(" or ", $search_columns).")";
			}

			$query .= " order by %S,%S";

			if ($offset !== null) {
				$query .= " limit %d,%d";
			}

			return $this->db->execute($query, $search_values, $_SESSION["XXX_order"], $offset, $limit);
		}

		public function get_XXX($XXX_id) {
			return $this->db->entry("XXXs", $XXX_id);
		}

		public function save_oke($XXX) {
			$result = true;

			return $result;
		}

		public function create_XXX($XXX) {
			$keys = array("id", "...");

			$XXX["id"] = null;

			return $this->db->insert("XXXs", $XXX, $keys);
		}

		public function update_XXX($XXX) {
			$keys = array("...");

			return $this->db->update("XXXs", $XXX["id"], $XXX, $keys);
		}

		public function delete_oke($XXX) {
			$result = true;

			return $result;
		}

		public function delete_XXX($XXX_id) {
			return $this->db->delete("XXXs", $XXX_id);
		}
	}
?>
