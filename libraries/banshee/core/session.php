<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	final class session {
		const SESSION_NAME = "banshee_session_id";
		const SESSION_LOGIN = "banshee_login_id";

		private $db = null;
		private $settings = null;
		private $id = null;
		private $session_id = null;
		private $user_id = null;
		private $denied = false;
		private $error = false;

		/* Constructor
		 *
		 * INPUT:  object database, objection settings
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db, $settings) {
			$this->db = $db;
			$this->settings = $settings;

			if ($this->db->connected == false) {
				$this->error = true;
				return;
			}

			$timeout = $this->settings->session_timeout;
			if (substr($timeout, -1) == "s") {
				$timeout = substr($timeout, 0, -1);
			}
			if (substr($timeout, -3) == "day") {
				$timeout = trim(substr($timeout, 0, -3));
				$multiplier = DAY;
			} else if (substr($timeout, -4) == "week") {
				$timeout = trim(substr($timeout, 0, -4));
				$multiplier = 7 * DAY;
			} else if (substr($timeout, -5) == "month") {
				$timeout = trim(substr($timeout, 0, -5));
				$multiplier = 31 * DAY;
			} else {
				$multiplier = 1;
			}
			$this->timeout = (int)$timeout * $multiplier;

			$query = "delete from sessions where expire<=%s";
			if ($this->db->query($query, date("Y-m-d H:i:s")) === false) {
				$this->error = true;
				return;
			}

			/* Don't write secure session cookie via HTTP
			 */
			if (is_true(ENFORCE_HTTPS) && ($_SERVER["HTTPS"] != "on")) {
				return;
			}

			$this->start();

			$_SESSION["request_counter"] = ($_SESSION["request_counter"] ?? 0) + 1;
		}

		/* Destructor
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __destruct() {
			if ($this->id === null) {
				return;
			} else if ($this->db->connected == false) {
				return;
			}

			$session_data = array("content" => json_encode($_SESSION));
			if (($this->settings->session_persistent == false) && ($this->user_id !== null)) {
				$session_data["expire"] = date("Y-m-d H:i:s", time() + $this->timeout);
			}

			$this->db->update("sessions", $this->id, $session_data);

			$_SESSION = array();
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "id": return $this->session_id;
				case "user_id": return $this->user_id;
				case "denied": return $this->denied;
				case "error": return $this->error;
			}

			return null;
		}

		/* Start session
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		private function start() {
			if (isset($_COOKIE[self::SESSION_NAME]) == false) {
				/* New session
				 */
				return $this->new_session();
			}

			$query = "select * from sessions where session_id=%s";
			if (($sessions = $this->db->execute($query, $_COOKIE[self::SESSION_NAME])) == false) {
				/* Unknown session
				 */
				return $this->new_session();
			}

			/* Existing session
			 */
			$session = $sessions[0];

			if ($session["bind_to_ip"]) {
				if ($session["ip_address"] != $_SERVER["REMOTE_ADDR"]) {
					$this->deny_session($session["user_id"]);
					return false;
				}
			}

			if ($session["user_id"] !== null) {
				if (($_COOKIE[self::SESSION_LOGIN] ?? null) != $session["login_id"]) {
					$this->deny_session($session["user_id"]);
					return false;
				}
				$this->user_id = (int)$session["user_id"];
			}

			$this->id = (int)$session["id"];
			$this->session_id = $_COOKIE[self::SESSION_NAME];
			$_SESSION = json_decode($session["content"], true);

			return true;
		}

		/* Start a new session stored in the database
		 *
		 * INPUT;  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		private function new_session() {
			$attempts = 3;

			$session_data = array(
				"id"         => null,
				"session_id" => null,
				"login_id"   => null,
				"content"    => null,
				"expire"     => date("Y-m-d H:i:s", time() + DAY),
				"user_id"    => null,
				"ip_address" => $_SERVER["REMOTE_ADDR"],
				"bind_to_ip" => false,
				"name"       => substr($_SERVER["HTTP_USER_AGENT"] ?? "", 0, 250));

			do {
				if ($attempts-- == 0) {
					print "session create error\n";
					return false;
				}

				$session_data["session_id"] = hash("sha512", random_string(128));
				$result = $this->db->insert("sessions", $session_data);
			} while ($result == false);

			$this->id = $this->db->last_insert_id;
			$this->session_id = $session_data["session_id"];

			$timeout = is_true($this->settings->session_persistent) ? time() + $this->timeout : 0;
			setcookie(self::SESSION_NAME, $this->session_id, $timeout, "/", "", is_true(ENFORCE_HTTPS), true);
			$_COOKIE[self::SESSION_NAME] = $this->session_id;

			$_SESSION["request_counter"] = 0;

			return true;
		}

		/* Deny access to current session
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function deny_session($user_id) {
			$this->denied = true;

			foreach (array_keys($_COOKIE) as $cookie) {
				setcookie($cookie, "", 1);
			}

			$_SERVER["REQUEST_METHOD"] = "GET";
			$_GET = array();
			$_POST = array();
			$_FILES = array();
			$_COOKIE = array();

			$logfile = new \Banshee\logfile("actions");
			$logfile->user_id = $user_id;
			$logfile->add_entry("session hijack attempt");
		}

		/* Update user_id in session record
		 *
		 * INPUT:  int user id
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function set_user_id($user_id) {
			if ($this->id === null) {
				return false;
			} else if ($this->db->connected == false) {
				return false;
			}

			$login_id = hash("sha512", random_string(128));
			$timeout = is_true($this->settings->session_persistent) ? time() + $this->timeout : 0;
			setcookie(self::SESSION_LOGIN, $login_id, $timeout, "/", "", is_true(ENFORCE_HTTPS), true);

			$user_data = array(
				"user_id"    => (int)$user_id,
				"login_id"   => $login_id,
				"expire"     => date("Y-m-d H:i:s", time() + $this->timeout),
				"ip_address" => $_SERVER["REMOTE_ADDR"]);

			return $this->db->update("sessions", $this->id, $user_data) !== false;
		}

		/* Bind session to IP
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function bind_to_ip() {
			if ($this->id === null) {
				return false;
			} else if ($this->db->connected == false) {
				return false;
			}

			$data = array(
				"bind_to_ip" => true,
				"ip_address" => $_SERVER["REMOTE_ADDR"]);

			return $this->db->update("sessions", $this->id, $data) !== false;
		}

		/* Reset session
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function reset() {
			if ($this->db->connected == false) {
				return false;
			}

			$this->db->query("delete from sessions where id=%d", $this->id);

			foreach (array_keys($_COOKIE) as $cookie) {
				setcookie($cookie, "", 1);
			}

			$_SESSION = array();
			$_COOKIE = array();

			$this->id = null;
			$this->session_id = null;

			return $this->start();
		}
	}
?>
