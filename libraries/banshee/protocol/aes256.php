<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Protocol;

	class AES256 {
		private $mode = "aes-256-";
		private $crypto_key = null;
		private $iv_size = null;

		/* Constructor
		 *
		 * INPUT:  string crypto key[, string block mode]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($crypto_key, $mode = "gcm") {
			if (strlen($crypto_key) < 32) {
				$crypto_key .= hash("sha256", $crypto_key);
			}

			$this->mode .= $mode;
			$this->crypto_key = substr($crypto_key, 0, 32);
			$this->iv_size = openssl_cipher_iv_length($this->mode);
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "mode": return $this->mode;
				case "iv": return $this->iv;
			}

			return null;
		}

		/* Encrypt data
		 *
		 * INPUT:  string plain text data
		 * OUTPUT: string encrypted data
		 * ERROR:  false
		 */
		public function encrypt($data) {
			if ($this->crypto_key == null) {
				return false;
			}

			$iv = openssl_random_pseudo_bytes($this->iv_size);
			$data = openssl_encrypt($data, $this->mode, $this->crypto_key, OPENSSL_RAW_DATA, $iv, $tag);

			if ($data == false) {
				return false;
			}

			$data = json_encode(array(
				"iv"   => base64_encode($iv),
				"tag"  => base64_encode($tag),
				"data" => base64_encode($data)));
			$data = rtrim(strtr(base64_encode($data), '+/', '-_'), '=');

			return $data;
		}

		/* Decrypt data
		 *
		 * INPUT:  string encrypted data
		 * OUTPUT: string plain text data
		 * ERROR:  false
		 */
		public function decrypt($data) {
			if ($this->crypto_key == null) {
				return false;
			}

			$data = base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
			$data = json_decode($data, true);

			if (is_array($data) == false) {
				return false;
			}

			foreach ($data as $key => $value) {
				$data[$key] = base64_decode($value);
			}

			return openssl_decrypt($data["data"], $this->mode, $this->crypto_key, OPENSSL_RAW_DATA, $data["iv"], $data["tag"]);
		}
	}
?>
