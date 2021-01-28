<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	/* Pre-defined validation strings for valid_input()
	 */
	define("VALIDATE_CAPITALS",     "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
	define("VALIDATE_NONCAPITALS",  "abcdefghijklmnopqrstuvwxyz");
	define("VALIDATE_LETTERS",      VALIDATE_CAPITALS.VALIDATE_NONCAPITALS);
	define("VALIDATE_PHRASE",       VALIDATE_LETTERS." ,.?!:;-'");
	define("VALIDATE_NUMBERS",      "0123456789");
	define("VALIDATE_SYMBOLS",      "!@#$%^&*()_-+={}[]|\:;\"'`~<>,./?");
	define("VALIDATE_URL",          VALIDATE_LETTERS.VALIDATE_NUMBERS."-_/.=");

	define("VALIDATE_NONEMPTY",     0);

	/* Validate input
	 *
	 * INPUT:  string input, string valid characters[, int length]
	 * OUTPUT: boolean input oke
	 * ERROR:  -
	 */
	function valid_input($data, $allowed, $length = null) {
		if (is_array($data) == false) {
			$data_len = strlen($data);

			if ($length !== null) {
				if ($length == VALIDATE_NONEMPTY) {
					if ($data_len == 0) {
						return false;
					}
				} else if ($data_len !== $length) {
					return false;
				}
			} else if ($data_len == 0) {
				return true;
			}

			$data = str_split($data);
			$allowed = str_split($allowed);
			$diff = array_diff($data, $allowed);

			return count($diff) == 0;
		} else foreach ($data as $item) {
			if (valid_input($item, $allowed, $length) == false) {
				return false;
			}
		}

		return true;
	}

	/* Validate an e-mail address
	 *
	 * INPUT:  string e-mail address
	 * OUTPUT: boolean e-mail address oke
	 * ERROR:  -
	 */
	function valid_email($email) {
		return Banshee\Protocol\email::valid_address($email);
	}

	/* Validate a date string
	 *
	 * INPUT:  string date
	 * OUTPUT: boolean date oke
	 * ERROR:  -
	 */
	function valid_date($date) {
		if ($date == "0000-00-00") {
			return false;
		}

		return preg_match("/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/", $date) === 1;
	}

	/* Validate a time string
	 *
	 * INPUT:  string time
	 * OUTPUT: boolean time oke
	 * ERROR:  -
	 */
	function valid_time($time) {
		return preg_match("/^(([01]?[0-9])|(2[0-3])):[0-5][0-9](:[0-5][0-9])?$/", $time) === 1;
	}

	/* Validate a timestamp
	 *
	 * INPUT:  string timestamp
	 * OUTPUT: boolean timestamp oke
	 * ERROR:  -
	 */
	function valid_timestamp($timestamp) {
		list($date, $time) = explode(" ", $timestamp, 2);
		return valid_date($date) && valid_time($time);
	}

	/* Validate a telephone number
	 *
	 * INPUT:  string telephone number
	 * OUTPUT: boolean telephone number oke
	 * ERROR:  -
	 */
	function valid_phonenumber($phonenr) {
		return preg_match("/^\+?(\(?\d+\)?[- ]?)*\d+$/", $phonenr) === 1;
	}

	/* Validate password security
	 *
	 * INPUT:  string password[, object view]
	 * OUTPUT: boolean password secure
	 * ERROR:  -
	 */
	function is_secure_password($password, $view = null) {
		$result = true;

		$pwd_len = strlen($password);

		if ($pwd_len < PASSWORD_MIN_LENGTH) {
			if ($view == null) {
				return false;
			}
			$view->add_message("The password must be at least %d characters long.", PASSWORD_MIN_LENGTH);
			$result = false;
		} else if ($pwd_len > PASSWORD_MAX_LENGTH) {
			if ($view == null) {
				return false;
			}
			$view->add_message("The password is too long.");
			$result = false;
		}

		$numbers = 0;
		$letters = 0;
		$symbols = 0;
		for ($i = 0; $i < $pwd_len; $i++) {
			$c = ord(strtolower(substr($password, $i, 1)));

			if (($c >= 48) && ($c <= 57)) {
				$numbers++;
			} else if (($c >= 97) && ($c <= 122)) {
				$letters++;
			} else {
				$symbols++;
			}
		}

		if (($letters == 0) || (($numbers == 0) && ($symbols == 0))) {
			if ($view == null) {
				return false;
			}
			$view->add_message("The password must contain at least one letter and one number or special character.");
			$result = false;
		}

		return $result;
	}

	/* Get users with a certain role
	 *
	 * INPUT:  object database, string role name[, string role name, ...]
	 * OUTPUT: array user information
	 * ERROR:  false
	 */
	function users_with_role() {
		$roles = func_get_args();
		if (count($roles) < 2) {
			return false;
		}

		$db = array_shift($roles);

		$query = "select distinct u.* from users u, user_role m, roles r ".
		         "where r.id=m.role_id and m.user_id=u.id and (".
		         implode(" or ", array_fill(0, count($roles), "r.name=%s")).
		         ") order by fullname";

		return $db->execute($query, $roles);
	}

	/* Return a per-page overview of the access levels
	 *
	 * INPUT:  object database
	 * OUTPUT: array( string module => int access level[, ...] )
	 * ERROR:  false
	 */
	function page_access_list($db, $user) {
		$access_rights = array();

		/* Public modules on disk
		 */
		$public = page_to_module(config_file("public_modules"));
		foreach ($public as $page) {
			$access_rights[$page] = 1;
		}

		/* Private modules on disk
		 */
		$private_modules = page_to_module(config_file("private_modules"));
		foreach ($private_modules as $module) {
			$access_rights[$module] = $user->is_admin ? YES : NO;
		}

		if ($user->logged_in && ($user->is_admin == false)) {
			$query = "select * from roles where id in ".
					 "(select role_id from user_role where user_id=%d)";
			if (($roles = $db->execute($query, $user->id)) === false) {
				return false;
			}
			foreach ($roles as $role) {
				$role = array_slice($role, 2);
				foreach ($role as $page => $level) {
					$level = (int)$level;
					if ($user->is_admin && ($level == NO)) {
						$level = YES;
					}
					if (isset($access_rights[$page]) == false) {
						$access_rights[$page] = $level;
					} else if ($access_rights[$page] < $level) {
						$access_rights[$page] = $level;
					}
				}
			}
		}

		/* Pages in database
		 */
		if (($pages = $db->execute("select * from pages")) === false) {
			return false;
		}
		foreach ($pages as $page) {
			$access_rights[ltrim($page["url"], "/")] = is_false($page["private"]) || $user->is_admin ? YES : NO;
		}

		if ($user->logged_in && ($user->is_admin == false)) {
			$conditions = $rids = array();
			foreach ($user->role_ids as $rid) {
				array_push($conditions, "role_id=%d");
				array_push($rids, $rid);
			}

			$query = "select p.url,a.level from pages p, page_access a ".
					 "where p.id=a.page_id and (".implode(" or ", $conditions).")";
			if (($pages = $db->execute($query, $rids)) === false) {
				return false;
			}

			foreach ($pages as $page) {
				$url = ltrim($page["url"], "/");
				if ($access_rights[$url] < $page["level"]) {
					$access_rights[$url] = $page["level"];
				}
			}
		}

		return $access_rights;
	}

	/* Generate random string
	 *
	 * INPUT:  int length
	 * OUTPUT: string random string
	 * ERROR:  -
	 */
	function random_string($length) {
		$characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		$max_chars = strlen($characters) - 1;

		$result = "";
		for ($i = 0; $i < $length; $i++) {
			$result .= $characters[random_int(0, $max_chars)];
		}

		return $result;
	}

	/* Get user's one time key
	 *
	 * INPUT:  object database, int user identifier
	 * OUTPUT: string one time key
	 * ERROR:  false
	 */
	function one_time_key($db, $user_id) {
		if (($user = $db->entry("users", $user_id)) == false) {
			return false;
		}

		if ($user["one_time_key"] != null) {
			return $user["one_time_key"];
		}

		$key = $user_id."x".random_string(ONE_TIME_KEY_SIZE - strlen((string)$user_id) - 1);

		if ($db->update("users", $user_id, array("one_time_key" => $key)) == false) {
			return false;
		}

		return $key;
	}
?>
