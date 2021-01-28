<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class setup_model extends Banshee\model {
		private $required_php_extensions = array("gd", "libxml", "mysqli", "xsl");

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
				if ((DB_HOSTNAME == "localhost") && (DB_DATABASE == "banshee") && (DB_USERNAME == "banshee") && (DB_PASSWORD == "banshee")) {
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
					$this->view->add_message("Invalid credentials in settings/website.conf.");
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

			return true;
		}

		/* Collect latest database version from update_database() function
		 */
		private function latest_database_version() {
			$old_db = $this->db;
			$old_settings = $this->settings;
			$this->db = new dummy_object();
			$this->settings = new dummy_object();
			$this->settings->database_version = 4.0;

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
				$this->view->add_message("Change the value of 'database_version' in the settings table to the version of your previous Banshee installation.");
				return false;
			}

			if ($this->settings->database_version < 4.0) {
				$this->view->add_message("Update your database manually to at least Banshee version 4.0.");
				return false;
			}

			if ($this->settings->database_version == 4.0) {
				$this->db_query("CREATE TABLE flags ( id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"role_id int(10) unsigned NOT NULL, module varchar(50) NOT NULL, ".
								"flag varchar(50) NOT NULL, PRIMARY KEY (id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE pages CHANGE layout layout VARCHAR(100) ".
								 "CHARACTER SET utf8 COLLATE utf8_general_ci NULL");
				$this->settings->hiawatha_cache_enabled = false;
				$this->settings->hiawatha_cache_default_time = 3600;
				$this->settings->session_timeout = 3600;
				$this->settings->session_persistent = false;

				$this->settings->database_version = 4.1;
			}

			if ($this->settings->database_version == 4.1) {
				$this->db_query("CREATE TABLE log_clients ( id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"os tinytext NOT NULL, browser tinytext NOT NULL, date date NOT NULL, ".
								"count int(10) unsigned NOT NULL, PRIMARY KEY (id) ) ENGINE=MyISAM DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE links CHANGE link link TINYTEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE poll_answers CHANGE answer answer VARCHAR(100) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");

				$this->settings->database_version = 4.2;
			}

			if ($this->settings->database_version == 4.2) {
				$this->settings->database_version = 4.3;
			}

			if ($this->settings->database_version == 4.3) {
				$this->db_query("ALTER TABLE agenda CHANGE begin begin DATE NULL DEFAULT NULL, ".
								"CHANGE end end DATE NULL DEFAULT NULL");
				$this->db_query("ALTER TABLE log_referers DROP verified");
				$this->db_query("ALTER TABLE news CHANGE %S %S DATETIME NOT NULL",
								"timestamp", "timestamp");

				$this->settings->database_version = 5.0;
			}

			if ($this->settings->database_version == 5.0) {
				$this->settings->database_version = 5.1;
			}

			if ($this->settings->database_version == 5.1) {
				$this->db_query("ALTER TABLE pages CHANGE content content TEXT CHARACTER ".
								"SET utf8 COLLATE utf8_general_ci NOT NULL");

				$this->db_query("CREATE TABLE shop_articles (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"article_nr varchar(50) NOT NULL, title varchar(100) NOT NULL, ".
								"short_description tinytext NOT NULL, long_description text NOT NULL, ".
								"image tinytext NOT NULL, price decimal(7,2) unsigned NOT NULL, ".
								"visible tinyint(1) NOT NULL, PRIMARY KEY (id) ) ".
								"ENGINE=InnoDB DEFAULT CHARSET=utf8");

				$this->db_query("CREATE TABLE shop_orders (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"user_id int(10) unsigned NOT NULL, %S datetime NOT NULL, ".
								"name varchar(100) NOT NULL, address varchar(100) NOT NULL, ".
								"zipcode varchar(7) NOT NULL, city varchar(100) NOT NULL, ".
								"country varchar(100) NOT NULL, closed tinyint(1) NOT NULL, PRIMARY KEY (id), ".
								"KEY user_id (user_id), ".
								"CONSTRAINT shop_orders_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ) ".
								"ENGINE=InnoDB DEFAULT CHARSET=utf8", "timestamp");

				$this->db_query("CREATE TABLE shop_order_article (shop_article_id int(10) unsigned NOT NULL, ".
								"shop_order_id int(10) unsigned NOT NULL, quantity int(11) NOT NULL, ".
								"article_price decimal(7,2) NOT NULL, KEY shop_article_id (shop_article_id), ".
								"KEY shop_order_id (shop_order_id), ".
								"CONSTRAINT shop_order_article_ibfk_1 FOREIGN KEY (shop_article_id) REFERENCES shop_articles (id), ".
								"CONSTRAINT shop_order_article_ibfk_2 FOREIGN KEY (shop_order_id) REFERENCES shop_orders (id) ) ".
								"ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->settings->database_version = 5.2;
			}

			if ($this->settings->database_version == 5.2) {
				$this->db_query("ALTER TABLE photo_albums CHANGE %S %S DATE NOT NULL, ".
								"ADD listed BOOLEAN NOT NULL AFTER %S, ADD private BOOLEAN NOT NULL AFTER listed",
								"timestamp", "timestamp", "timestamp");

				$this->db_query("ALTER TABLE sessions ADD login_id VARCHAR(100) NULL AFTER session_id, ".
								"ADD bind_to_ip BOOLEAN NOT NULL AFTER ip_address, ADD UNIQUE(session_id)");

				$this->db_query("CREATE TABLE shop_categories (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"name varchar(100) NOT NULL, PRIMARY KEY (id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

				$this->db_query("INSERT INTO shop_categories VALUES (1,%s)", "Articles");

				$this->db_query("ALTER TABLE shop_articles ADD shop_category_id INT UNSIGNED NOT NULL AFTER id, ".
								"ADD INDEX(shop_category_id)");

				$this->db_query("UPDATE shop_articles SET shop_category_id=1");

				$this->db_query("ALTER TABLE shop_articles ADD FOREIGN KEY (shop_category_id) REFERENCES shop_categories(id) ".
								"ON DELETE RESTRICT ON UPDATE RESTRICT");

				$this->db_query("ALTER TABLE photos ADD thumbnail_mode TINYINT UNSIGNED NOT NULL AFTER overview");

				$this->settings->database_version = 5.3;
			}

			if ($this->settings->database_version == 5.3) {
				$this->db_query("ALTER TABLE sessions CHANGE session_id session_id VARCHAR(128) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL, CHANGE login_id login_id VARCHAR(128) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL");

				$this->db_query("ALTER TABLE users ADD authenticator_secret VARCHAR(16) NULL AFTER cert_serial");

				$this->settings->database_version = 5.4;
			}

			if ($this->settings->database_version == 5.4) {
				$this->db_query("CREATE TABLE link_categories (id int(11) unsigned NOT NULL AUTO_INCREMENT, ".
								"category varchar(50) NOT NULL, PRIMARY KEY (id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("INSERT INTO link_categories VALUES (1,%s)", "Websites");

				$this->db_query("ALTER TABLE links ENGINE = INNODB");
				$this->db_query("ALTER TABLE links ADD category_id INT UNSIGNED NOT NULL AFTER id, ADD INDEX(category_id)");
				$this->db_query("UPDATE links SET category_id=1 ");
				$this->db_query("ALTER TABLE links ADD FOREIGN KEY (category_id) REFERENCES link_categories(id) ".
								"ON DELETE RESTRICT ON UPDATE RESTRICT");

				$this->db_query("ALTER TABLE mailbox ADD FOREIGN KEY (from_user_id) REFERENCES users(id) ".
								"ON DELETE RESTRICT ON UPDATE RESTRICT");
				$this->db_query("ALTER TABLE mailbox ADD FOREIGN KEY (to_user_id) REFERENCES users(id) ".
								"ON DELETE RESTRICT ON UPDATE RESTRICT");

				$this->db_query("ALTER TABLE photos ADD %S INT NOT NULL AFTER thumbnail_mode", "order");

				$this->settings->database_version = 6.0;
			}

			if ($this->settings->database_version == 6.0) {
				$this->settings->database_version = 6.1;
			}

			if ($this->settings->database_version == 6.1) {
				$this->db_query("CREATE TABLE reroute (id int(10) unsigned NOT NULL AUTO_INCREMENT, ".
								"original varchar(100) NOT NULL, replacement varchar(100) NOT NULL, ".
								"type tinyint(3) unsigned NOT NULL, description tinytext NOT NULL, ".
								"PRIMARY KEY (id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

				$this->settings->database_version = 6.2;
			}

			if ($this->settings->database_version == 6.2) {
				$this->settings->database_version = 6.3;
			}

			if ($this->settings->database_version == 6.3) {
				$this->db_query("ALTER TABLE pages ADD form BOOLEAN NOT NULL AFTER back, ADD form_submit VARCHAR(32) NULL AFTER form, ".
								"ADD form_email VARCHAR(100) NULL AFTER form_submit, ADD form_done TEXT NULL AFTER form_email");
				$this->db_query("ALTER TABLE pages DROP INDEX url");
				$this->db_query("ALTER TABLE pages ADD UNIQUE(url, language)");

				$this->settings->database_version = 6.4;
			}

			if ($this->settings->database_version == 6.4) {
				$this->settings->database_version = 6.5;
			}

			if ($this->settings->database_version == 6.5) {
				$this->db_query("ALTER TABLE users CHANGE password password TINYTEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE weblogs CHANGE %S %S TIMESTAMP NULL", "timestamp", "timestamp");

				$this->settings->database_version = 6.6;
			}

			if ($this->settings->database_version == 6.6) {
				$this->db_query("ALTER TABLE forum_messages CHANGE ip_address ip_address VARCHAR(45) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE guestbook CHANGE ip_address ip_address VARCHAR(45) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE sessions CHANGE ip_address ip_address VARCHAR(45) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE weblog_comments CHANGE ip_address ip_address VARCHAR(45) ".
								"CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("DROP TABLE log_clients");
				$this->db_query("DROP TABLE log_search_queries");
				$this->db_query("ALTER TABLE log_visits ADD error SMALLINT UNSIGNED NOT NULL AFTER count");

				$this->settings->database_version = 7.0;
			}

			if ($this->settings->database_version == 7.0) {
				$this->settings->database_version = 7.1;
			}

			if ($this->settings->database_version == 7.1) {
				$this->db_query("ALTER TABLE agenda CHANGE %S %S DATE NOT NULL", "begin", "begin");
				$this->db_query("ALTER TABLE forums ADD private BOOLEAN NOT NULL AFTER %S", "order");
				$this->db_query("DROP TABLE forum_last_view");
				$this->db_query("CREATE TABLE forum_last_view (user_id int(10) unsigned NOT NULL, forum_topic_id int(10) unsigned DEFAULT NULL, ".
  				                "last_view timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY user_id (user_id), KEY forum_topic_id (forum_topic_id), ".
				                "CONSTRAINT forum_last_view_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id), ".
				                "CONSTRAINT forum_last_view_ibfk_2 FOREIGN KEY (forum_topic_id) REFERENCES forum_topics (id) ".
				                ") ENGINE=InnoDB DEFAULT CHARSET=utf8");
				$this->db_query("ALTER TABLE forum_messages CHANGE topic_id forum_topic_id INT(10) UNSIGNED NOT NULL");
				$this->db_query("ALTER TABLE forum_topics CHANGE subject subject TINYTEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL");
				$this->db_query("ALTER TABLE forum_topics ADD sticky BOOLEAN NOT NULL AFTER subject, ADD closed BOOLEAN NOT NULL AFTER sticky");
				$this->db_query("ALTER TABLE links ADD description TINYTEXT NOT NULL AFTER link");
				$this->db_query("ALTER TABLE link_categories ADD description TEXT NOT NULL AFTER category");
				$this->db_query("ALTER TABLE users ADD avatar TINYTEXT NOT NULL AFTER email, ADD signature TINYTEXT NOT NULL AFTER avatar");

				$this->settings->database_version = 7.2;
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
