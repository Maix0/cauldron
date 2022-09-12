<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class setup_model extends Banshee\model {
		private $required_php_extensions = array("gd", "libxml", "mysqli", "xsl");
		private $directories = array("audio", "characters", "collectables", "effects", "maps", "tokens");

		/* Determine next step
		 */
		public function step_to_take() {
			$missing = $this->missing_php_extensions();
			if (count($missing) > 0) {
				return "php_extensions";
			}

			if ($this->db->connected == false) {
				$db = new \Banshee\Database\MySQLi_connection(DB_HOSTNAME, DB_DATABASE, DB_USERNAME, DB_PASSWORD);
			} else {
				$db = $this->db;
			}

			if ($db->connected == false) {
				/* No database connection
				 */
				if ((DB_HOSTNAME == "localhost") && (DB_DATABASE == "cauldron") && (DB_USERNAME == "cauldron") && (DB_PASSWORD == "cauldron")) {
					return "db_settings";
				} else if (strpos(DB_PASSWORD, "'") !== false) {
					$this->view->add_system_message("A single quote is not allowed in the password!");
					return "db_settings";
				}

				return "create_db";
			}

			$result = $db->execute("show tables like %s", "settings");
			if (count($result) == 0) {
				return "import_sql";
			}

			if ($this->settings->database_version < $this->latest_database_version()) {
				return "update_db";
			}

			if ($this->directories_exist() == false) {
				return "create_dirs";
			}

			$result = $db->execute("select password from users where username=%s", "admin");
			if ($result[0]["password"] == "none") {
				return "credentials";
			}

			return "done";
		}

		/* Missing PHP extensions
		 */
		public function missing_php_extensions() {
			static $missing = null;

			if ($missing !== null) {
				return $missing;
			}

			$missing = array();
			foreach ($this->required_php_extensions as $extension) {
				if (extension_loaded($extension) == false) {
					array_push($missing, $extension);
				}
			}

			return $missing;
		}

		/* Remove datase related error messages
		 */
		public function remove_database_errors() {
			$errors = explode("\n", rtrim(ob_get_contents()));
			ob_clean();

			foreach ($errors as $error) {
				if (strpos(strtolower($error), "mysqli_connect") === false) {
					print $error."\n";
				}
			}
		}

		/* Create the MySQL database
		 */
		public function create_database($username, $password) {
			$db = new \Banshee\Database\MySQLi_connection(DB_HOSTNAME, "mysql", $username, $password);

			if ($db->connected == false) {
				$this->view->add_message("Error connecting to database.");
				return false;
			}

			$db->query("begin");

			/* Create database
			 */
			$query = "create database if not exists %S character set utf8";
			if ($db->query($query, DB_DATABASE) == false) {
				$db->query("rollback");
				$this->view->add_message("Error creating database.");
				return false;
			}

			/* Create user
			 */
			$query = "select count(*) as count from user where User=%s";
			if (($users = $db->execute($query, DB_USERNAME)) === false) {
				$db->query("rollback");
				$this->view->add_message("Error checking for user.");
				return false;
			}

			if ($users[0]["count"] == 0) {
				$query = "create user %s@%s identified by %s";
				if ($db->query($query, DB_USERNAME, DB_HOSTNAME, DB_PASSWORD) == false) {
					$db->query("rollback");
					$this->view->add_message("Error creating user.");
					return false;
				}
			}

			/* Set access rights
			 */
			$rights = array(
				"select", "insert", "update", "delete",
				"create", "drop", "alter", "index", "lock tables",
				"create view", "show view");

			$query = "grant ".implode(", ", $rights)." on %S.* to %s@%s";
			if ($db->query($query, DB_DATABASE, DB_USERNAME, DB_HOSTNAME) == false) {
				$db->query("rollback");
				$this->view->add_message("Error setting access rights.");
				return false;
			}

			/* Test login for existing user
			 */
			if ($users[0]["count"] == 0) {
				$login_test = new \Banshee\Database\MySQLi_connection(DB_HOSTNAME, DB_DATABASE, DB_USERNAME, DB_PASSWORD);
				if ($login_test->connected == false) {
					$db->query("rollback");
					$this->view->add_message("Invalid credentials in settings/banshee.conf.");
					return false;
				}
			}

			/* Commit changes
			 */
			$db->query("commit");
			$db->query("flush privileges");
			unset($db);

			return true;
		}

		/* Import database tables from file
		 */
		public function import_sql() {
			if (($queries = file("../database/mysql.sql")) === false) {
				$this->view->add_message("Can't read the database/mysql.sql file.");
				return false;
			}

			if (($db_link = mysqli_connect(DB_HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_DATABASE)) === false) {
				$this->view->add_message("Error while connecting to the database.");
				return false;
			}

			$query = "";
			foreach ($queries as $line) {
				if (($line = trim($line)) == "") {
					continue;
				}
				if (substr($line, 0, 2) == "--") {
					continue;
				}

				$query .= $line;
				if (substr($query, -1) == ";") {
					if (mysqli_query($db_link, $query) === false) {
						$this->view->add_message("Error while executing query [%s].", $query);
						return false;
					}
					$query = "";
				}
			}

			mysqli_close($db_link);

			$this->db->query("update users set status=%d", USER_STATUS_CHANGEPWD);
			$this->settings->secret_website_code = random_string(32);
			$this->db->query("update organisations set resources_key=%s", random_string(32));

			return true;
		}

		/* Collect latest database version from update_database() function
		 */
		private function latest_database_version() {
			$old_db = $this->db;
			$old_settings = $this->settings;
			$this->db = new dummy_object();
			$this->settings = new dummy_object();
			$this->settings->database_version = 1;

			$this->update_database();
			$version = $this->settings->database_version;

			unset($this->db);
			unset($this->settings);
			$this->db = $old_db;
			$this->settings = $old_settings;

			return $version;
		}

		/* Execute query and report errors
		 */
		private function db_query($query) {
			static $first = true;
			static $logfile = null;

			$args = func_get_args();
			array_shift($args);

			if ($this->db->query($query, $args) === false) {
				if ($first) {
					$this->view->add_message("The following queries failed (also added to debug logfile):");
					$first = false;
				}

				$query = vsprintf($query, $args);
				$this->view->add_message(" - %s", $query);

				if ($logfile === null) {
					$logfile = new \Banshee\logfile("debug");
				}

				$logfile->add_entry("Failed query: %s", $query);
			}
		}

		/* Update database
		 */
		public function update_database() {
			if ($this->settings->database_version == 1) {
				$this->db_query("CREATE TABLE zones (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "game_map_id int(10) unsigned NOT NULL, pos_x smallint(5) unsigned NOT NULL, ".
				                "pos_y smallint(5) unsigned NOT NULL, width tinyint(3) unsigned NOT NULL, ".
				                "height tinyint(3) unsigned NOT NULL, color varchar(7) NOT NULL, ".
				                "opacity decimal(1,1) NOT NULL, PRIMARY KEY (id), KEY game_map_id (game_map_id), ".
				                "CONSTRAINT zones_ibfk_1 FOREIGN KEY (game_map_id) REFERENCES game_maps (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8");

				$this->settings->database_version = 2;
			}

			if ($this->settings->database_version == 2) {
				$this->db_query("CREATE TABLE collectables (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "game_id int(10) unsigned NOT NULL, game_map_token_id int(10) unsigned DEFAULT NULL, ".
				                "name varchar(50) NOT NULL, image tinytext NOT NULL, found tinyint(1) NOT NULL, ".
				                "hide tinyint(1) NOT NULL, PRIMARY KEY (id), KEY game_map_token_id (game_map_token_id), ".
				                "CONSTRAINT collectables_ibfk_1 FOREIGN KEY (game_map_token_id) REFERENCES game_map_token (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8");

				$this->settings->database_version = 3;
			}

			if ($this->settings->database_version == 3) {
				$this->db_query("ALTER TABLE games ADD image TINYTEXT NOT NULL AFTER title, ADD story TEXT NOT NULL AFTER image");

				$this->settings->database_version = 4;
			}

			if ($this->settings->database_version == 4) {
				$this->db_query("RENAME TABLE game_maps TO maps");
				$this->db_query("RENAME TABLE game_map_character TO map_character");
				$this->db_query("RENAME TABLE game_map_token TO map_token");
				$this->db_query("ALTER TABLE collectables CHANGE game_map_token_id ".
				                "map_token_id INT(10) UNSIGNED NULL DEFAULT NULL");
				$this->db_query("ALTER TABLE maps ADD dm_notes TEXT NOT NULL AFTER show_grid");
				$this->db_query("CREATE TABLE journal (id int(11) NOT NULL AUTO_INCREMENT, ".
				                "game_id int(10) unsigned NOT NULL, user_id int(10) unsigned NOT NULL, ".
				                "timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, entry text NOT NULL, ".
				                "PRIMARY KEY (id), KEY game_id (game_id), KEY user_id (user_id), ".
				                "CONSTRAINT journal_ibfk_1 FOREIGN KEY (game_id) REFERENCES games (id), ".
				                "CONSTRAINT journal_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE games ADD player_access BOOLEAN NOT NULL AFTER active_map_id");
				$this->db_query("ALTER TABLE users DROP avatar, DROP signature");

				$this->settings->database_version = 5;
			}

			if ($this->settings->database_version == 5) {
				$this->db_query("CREATE TABLE character_icons (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "character_id int(10) unsigned NOT NULL, name varchar(20) NOT NULL, ".
				                "size tinyint(3) unsigned NOT NULL, extension varchar(3) NOT NULL, PRIMARY KEY (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE game_character ADD alternate_icon_id INT UNSIGNED NULL AFTER character_id");
				$this->db_query("ALTER TABLE game_character ADD FOREIGN KEY (alternate_icon_id) ".
				                "REFERENCES character_icons(id) ON DELETE RESTRICT ON UPDATE RESTRICT");
				$this->db_query("ALTER TABLE collectables ADD FOREIGN KEY (game_id) ".
				                "REFERENCES games(id) ON DELETE RESTRICT ON UPDATE RESTRICT");
				$this->db_query("DROP TABLE languages");

				$this->settings->database_version = 6;
			}

			if ($this->settings->database_version == 6) {
				$this->db_query("CREATE TABLE conditions (id int(10) unsigned NOT NULL AUTO_INCREMENT, name varchar(20) NOT NULL, ".
				                "PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("INSERT INTO conditions VALUES (1,%s),(2,%s),(3,%s),(4,%s),(5,%s),(6,%s),".
				                "(7,%s),(8,%s),(9,%s),(10,%s),(11,%s),(12,%s),(13,%s),(14,%s),(15,%s)",
				                "Blinded", "Charmed", "Deafened", "Exhausted", "Frightened", "Grappled",
				                "Incapacitated", "Paralyzed", "Invisible", "Petrified", "Poisoned", "Prone",
				                "Restrained", "Stunned", "Unconscious");
				$this->db_query("ALTER TABLE journal CHANGE entry content TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE map_character ADD hidden BOOLEAN NOT NULL AFTER pos_y");

				$this->settings->database_version = 7;
			}

			if ($this->settings->database_version == 7) {
				$this->db_query("ALTER TABLE maps ADD start_x SMALLINT UNSIGNED NOT NULL AFTER show_grid, ".
				                "ADD start_y SMALLINT UNSIGNED NOT NULL AFTER start_x");
				$this->db_query("ALTER TABLE map_character CHANGE game_map_id map_id INT(10) UNSIGNED NOT NULL");
				$this->db_query("ALTER TABLE map_token CHANGE game_map_id map_id INT(10) UNSIGNED NOT NULL");
				$this->db_query("ALTER TABLE zones CHANGE game_map_id map_id INT(10) UNSIGNED NOT NULL");
				$this->db_query("ALTER TABLE zones ADD script TEXT NOT NULL AFTER opacity");
				$this->db_query("ALTER TABLE zones ADD %S VARCHAR(10) NOT NULL AFTER script", "group");

				$this->settings->database_version = 8;
			}

			if ($this->settings->database_version == 8) {
				$this->db_query("ALTER TABLE map_character ADD rotation SMALLINT UNSIGNED NOT NULL AFTER pos_y");
				$this->db_query("ALTER TABLE maps ADD audio TINYTEXT NOT NULL AFTER url");
				$this->db_query("UPDATE menu SET id=4 WHERE id=3");
				$this->db_query("INSERT INTO menu (id, parent_id, text, link) VALUES (3, 0, %s, %s)", "DM's Vault", "/vault");

				$this->settings->database_version = 9;
			}

			if ($this->settings->database_version == 9) {
				$this->settings->database_version = 10;
			}

			if ($this->settings->database_version == 10) {
				$this->db_query("CREATE TABLE walls (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "map_id int(10) unsigned NOT NULL, pos_x smallint(5) unsigned NOT NULL, ".
				                "pos_y smallint(5) unsigned NOT NULL, length smallint(3) unsigned NOT NULL, ".
				                "direction enum(%s,%s) NOT NULL, PRIMARY KEY (id), ".
				                "KEY map_id (map_id), CONSTRAINT walls_ibfk_1 FOREIGN KEY (map_id) REFERENCES maps (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8", "horizontal", "vertical");
				$this->db_query("CREATE TABLE doors (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "map_id int(10) unsigned NOT NULL, pos_x smallint(5) unsigned NOT NULL, ".
				                "pos_y smallint(5) unsigned NOT NULL, length smallint(3) unsigned NOT NULL, ".
				                "direction enum(%s,%s) NOT NULL, state enum(%s,%s,%s) NOT NULL, PRIMARY KEY (id), ".
				                "KEY map_id (map_id), CONSTRAINT doors_ibfk_1 FOREIGN KEY (map_id) REFERENCES maps (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8", "horizontal", "vertical", "open", "closed", "locked");
				$this->db_query("ALTER TABLE maps ADD drag_character BOOLEAN NOT NULL AFTER show_grid");

				$this->settings->database_version = 11;
			}

			if ($this->settings->database_version == 11) {
				$this->db_query("ALTER TABLE maps ADD fog_of_war BOOLEAN NOT NULL AFTER drag_character");
				$this->db_query("ALTER TABLE walls ADD transparent BOOLEAN NOT NULL AFTER direction");

				$this->settings->database_version = 12;
			}

			if ($this->settings->database_version == 12) {
				$this->db_query("CREATE TABLE lights (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
				                "map_id int(10) unsigned NOT NULL, pos_x smallint(5) unsigned NOT NULL, ".
				                "pos_y smallint(5) unsigned NOT NULL, radius decimal(4,1) unsigned NOT NULL, ".
				                "state enum(%s,%s) NOT NULL, PRIMARY KEY (id), KEY map_id (map_id), ".
				                "CONSTRAINT lights_ibfk_1 FOREIGN KEY (map_id) REFERENCES maps (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8", "off", "on");
				$this->db_query("ALTER TABLE maps ADD fow_distance TINYINT UNSIGNED NOT NULL AFTER fog_of_war");

				$this->settings->database_version = 13;
			}

			if ($this->settings->database_version == 13) {
				$manual_html = file("../extra/manual.html");
				$manual_css = file("../extra/manual.css");
				$this->db_query("INSERT INTO pages VALUES (1,%s,%s,%s,1,%s,%s,%s,%s,%s,1,0,0,NULL,NULL,NULL)",
				                "/manual", "en", "cauldron", $manual_css, "Manual", "", "", $manual_html);

				$this->settings->database_version = 14;
			}

			if ($this->settings->database_version == 14) {
				$this->db_query("ALTER TABLE organisations ADD resources_key VARCHAR(32) NOT NULL AFTER name");
				$this->db_query("ALTER TABLE tokens ADD organisation_id INT UNSIGNED NOT NULL AFTER id");
				$this->db_query("UPDATE tokens SET organisation_id=%s", 1);
				$this->db_query("ALTER TABLE tokens ADD FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT ON UPDATE RESTRICT");

				$resources_key = random_string(32);
				$this->db_query("UPDATE organisations SET resources_key=%s", $resources_key);

				if (($organisation = $this->db->entry("organisations", 1)) == false) {
					return false;
				}

				if ($organisation["resources_key"] == $resources_key) {
					mkdir("resources/".$resources_key);

					if (($dp = opendir("files")) != false) {
						while (($file = readdir($dp)) != false) {
							if (($file == ".") || ($file == "..") || ($file == $resources_key)) {
								continue;
							}

							rename("files/".$file, "resources/".$resources_key."/".$file);
						}
						closedir($dp);
					}
				}

				$this->settings->database_version = 15;
			}

			if ($this->settings->database_version == 15) {
				$this->db_query("ALTER TABLE games CHANGE player_access access TINYINT(1) UNSIGNED NOT NULL");
				$this->db_query("ALTER TABLE game_character ADD token_id INT UNSIGNED NULL AFTER alternate_icon_id");
				$this->db_query("ALTER TABLE game_character ADD FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE RESTRICT ON UPDATE RESTRICT");
				$this->db_query("ALTER TABLE organisations CHANGE files_key resources_key VARCHAR(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE organisations ADD max_resources INT UNSIGNED NOT NULL AFTER resources_key, ".
				                "ADD last_login TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER max_resources");
				$this->db_query("ALTER TABLE tokens ADD armor_class TINYINT UNSIGNED NOT NULL AFTER extension, ".
				                "ADD hitpoints SMALLINT UNSIGNED NOT NULL AFTER armor_class, ".
				                "ADD shape_change BOOLEAN NOT NULL AFTER hitpoints");
				$this->db_query("ALTER TABLE zones ADD altitude TINYINT NOT NULL AFTER group");

				$this->settings->head_title = "Cauldron VTT";

				$this->settings->database_version = 20;
			}

			if ($this->settings->database_version == 20) {
				$this->db_query("CREATE TABLE blinders (id int(10) unsigned NOT NULL AUTO_INCREMENT, map_id int(10) unsigned NOT NULL, ".
				                "pos1_x int(10) unsigned NOT NULL, pos1_y int(10) unsigned NOT NULL, pos2_x int(10) unsigned NOT NULL, pos2_y int(10) unsigned NOT NULL, ".
				                "PRIMARY KEY (id), KEY map_id (map_id), CONSTRAINT blinders_ibfk_1 FOREIGN KEY (map_id) REFERENCES maps (id)) ".
				                "ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE maps DROP %S", "type");

				$this->settings->database_version = 21;
			}

			if ($this->settings->database_version == 21) {
				$this->settings->database_version = 22;
			}

			if ($this->settings->database_version == 22) {
				$this->settings->database_version = 23;
			}

			if ($this->settings->database_version == 23) {
				$this->settings->database_version = 24;
			}

			return true;
		}

		/* Set administrator password
		 */
		public function set_admin_credentials($username, $password, $repeat) {
			$result = true;

			if (valid_input($username, VALIDATE_LETTERS, VALIDATE_NONEMPTY) == false) {
				$this->view->add_message("The username must consist of lowercase letters.");
				$result = false;
			}

			if ($password != $repeat) {
				$this->view->add_message("The passwords do not match.");
				$result = false;
			}

			if (is_secure_password($password, $this->view) == false) {
				$result = false;
			}

			if ($result == false) {
				return false;
			}

			$password = password_hash($password, PASSWORD_ALGORITHM);
			$query = "update users set username=%s, password=%s, status=%d where username=%s";
			if ($this->db->query($query, $username, $password, USER_STATUS_ACTIVE, "admin") === false) {
				$this->view->add_message("Error while setting password.");
				return false;
			}

			return true;
		}

		/* Directories
		 */
		public function directories_exist() {
			if (($organisation = $this->db->entry("organisations", 1)) == false) {
				return false;
			}

			foreach ($this->directories as $directory) {
				if (is_dir("resources/".$organisation["resources_key"]."/".$directory) == false) {
					return false;
				}
			}

			return true;
		}

		public function create_directories() {
			if (($organisation = $this->db->entry("organisations", 1)) == false) {
				return false;
			}

			mkdir("resources/".$organisation["resources_key"], 0755);
			foreach ($this->directories as $directory) {
				mkdir("resources/".$organisation["resources_key"]."/".$directory, 0755);
			}
		}
	}

	class dummy_object {
		private $cache = array();

		public function __set($key, $value) {
			$this->cache[$key] = $value;
		}

		public function __get($key) {
			return $this->cache[$key];
		}

		public function __call($func, $args) {
			 return true;
		}
	}
?>
