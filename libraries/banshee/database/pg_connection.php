<?php /* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Database;

class Pg_connection extends database_connection {
		/* @param string $hostname */
		/* @param string $database */
		/* @param string $username */
		/* @param string $password */
		/* @param int $port */
		public function __construct($hostname, $database, $username, $password, $port = 5432) {
			$this->db_close         = "pg_close";
			$this->db_insert_id     = null;
			$this->db_escape_string = array($this, "db_escape_string_wrapper");
			$this->db_query         = array($this, "db_query_wrapper");
			$this->db_fetch         = "pg_fetch_assoc";
			$this->db_free_result   = "pg_free_result";
			$this->db_affected_rows = "pg_affected_rows";
			$this->db_error         = null;
			$this->db_errno         = null;
			$this->id_delim         = "`";

			if ($database != "") {
				if (($this->link = pg_connect($hostname, $username, $password, $database, $port)) == false) {
					$this->link = null;
				} else {
					$this->link->set_charset("utf8mb4");
				}
			}
		}

		/* @param string $str */
		/* @return string */
		protected function db_escape_string_wrapper($str): string {
			return pg_escape_string($this->link, $str);
		}

		/* @param string $query */
		/* @return resource|false */
		protected function db_query_wrapper($query): mixed {
			return pg_query($this->link, $query);
		}
	}
?>
