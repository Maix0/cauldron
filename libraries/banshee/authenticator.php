<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class authenticator {
		const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=";
		const ALGORITHM = "sha1";
		const INTERVAL = 30;
		const DIGITS = 6;

		protected $code_length = null;
		protected $base32_chars = array();

		/* Constructor
		 *
		 * INPUT:  int code length
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($code_length = self::DIGITS) {
			$this->code_length = $code_length;
			$this->base32_chars = str_split(self::BASE32_CHARS);
		}

		/* Create new secret (RFC 6238)
		 *
		 * INPUT:  int secret length
		 * OUTPUT: string secret
		 * ERROR:  -
		 */
		public function create_secret($secret_length = 16) {
			$max_pos = count($this->base32_chars) - 2;

			$result = "";
			for ($i = 0; $i < $secret_length; $i++) {
				$result .= $this->base32_chars[random_int(0, $max_pos)];
			}

			return $result;
		}

		/* Calculate the code based on the secret and time slice
		 *
		 * INPUT:  string secret[, int time slice]
		 * OUTPUT: string code
		 * ERROR:  -
		 */
		private function get_code($secret, $time_slice = null) {
			if ($time_slice === null) {
				$time_slice = floor(time() / self::INTERVAL);
			}

			$secret_key = $this->base32_decode($secret);

			$time = str_repeat(chr(0), 4).pack("N*", $time_slice);
			$hash = hash_hmac(self::ALGORITHM, $time, $secret_key, true);
			$offset = ord(substr($hash, -1)) & 0x0F;
			$hashpart = substr($hash, $offset, 4);

			list(, $value) = unpack("N", $hashpart);
			$value = $value & 0x7FFFFFFF;

			$modulo = pow(10, $this->code_length);

			return str_pad($value % $modulo, $this->code_length, "0", STR_PAD_LEFT);
		}

		/* Verify the code (RFC 6238)
		 *
		 * INPUT:  string secret, string code[, int time shift[, int time slice]]
		 * OUTPUT: boolean code ok
		 * ERROR:  -
		 */
		public function verify_code($secret, $code, $margin = 1, $time_slice = null) {
			if ($time_slice === null) {
				$time_slice = floor(time() / self::INTERVAL);
			}

			if (hash_equals($this->get_code($secret, $time_slice), $code)) {
				return true;
			}

			for ($i = 1; $i <= $margin; $i++) {
				if (hash_equals($this->get_code($secret, $time_slice - $i), $code)) {
					return true;
				}

				if (hash_equals($this->get_code($secret, $time_slice + $i), $code)) {
					return true;
				}
			}

			return false;
		}

		/* Base32 decoder
		 *
		 * INPUT:  string data
		 * OUTPUT: string decoded data
		 * ERROR:  false
		 */
		private function base32_decode($str) {
			if (empty($str)) {
				return "";
			}

			$base32_chars_flipped = array_flip($this->base32_chars);

			$padding_char_count = substr_count($str, $this->base32_chars[32]);
			$allowed_values = array(6, 4, 3, 1, 0);
			if (in_array($padding_char_count, $allowed_values) == false) {
				return false;
			}

			for ($i = 0; $i < 4; $i++){
				if ($padding_char_count == $allowed_values[$i]) {
					if (substr($str, -($allowed_values[$i])) != str_repeat($this->base32_chars[32], $allowed_values[$i])) {
						return false;
					}
				}
			}

			$str = str_replace("=", "", $str);
			$str = str_split($str);

			$result = "";
			for ($i = 0; $i < count($str); $i = $i + 8) {
				if (in_array($str[$i], $this->base32_chars) == false) {
					return false;
				}

				$x = "";
				for ($j = 0; $j < 8; $j++) {
					$x .= str_pad(base_convert($base32_chars_flipped[$str[$i + $j]], 10, 2), 5, "0", STR_PAD_LEFT);
				}

				$eight_bits = str_split($x, 8);
				for ($z = 0; $z < count($eight_bits); $z++) {
					if (($val = base_convert($eight_bits[$z], 2, 10)) > 0) {
						$result .= chr($val);
					}
				}
			}

			return $result;
		}
	}
?>
