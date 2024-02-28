<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	class XML {
		const XML_HEADER = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";

		private $xml_data = "";
		private $xslt_parameters = array();
		private $open_tags = array();
		private $cache = null;
		private $cache_key = null;
		private $cache_timeout = null;
		private $cache_buffer = "";
		private $tag_eol = true;

		/* Constructor
		 *
		 * INPUT:  [object database]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db = null) {
			if ($db !== null) {
				$this->cache = new cache($db, "banshee_xml");
			}
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "depth": return count($this->open_tags);
				case "data": return $this->xml_data;
				case "document": return self::XML_HEADER."\n".$this->xml_data;
				case "array": return $this->xml_to_array($this->xml_data);
			}

			return null;
		}

		/* Clear XML data buffer
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function clear_buffer() {
			$this->xml_data = "";
			$this->abort_caching();
		}

		/* Translate special characters in string to XML entities
		 *
		 * INPUT:  string data
		 * OUTPUT: string data
		 * ERROR:  -
		 */
		private function xmlspecialchars($str) {
			return htmlspecialchars($str ?? "", ENT_XML1 | ENT_COMPAT, "UTF-8");
		}

		/* Add string to buffer
		 *
		 * INPUT:  string data
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function add_to_buffer($str) {
			$this->xml_data .= $str;

			if ($this->cache_key !== null) {
				$this->cache_buffer .= $str;
			}
		}

		/* Add open-tag to buffer
		 *
		 * INPUT:  string tag name, array( string attributes[, ...] )
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function open_tag($name, $attributes = array()) {
			$this->add_to_buffer("<".$name);
			foreach ($attributes as $key => $value) {
				$this->add_to_buffer(" ".$key."=\"".$this->xmlspecialchars($value)."\"");
			}
			$this->add_to_buffer(">".($this->tag_eol ? "\n" : ""));

			array_push($this->open_tags, $name);
		}

		/* Add close-tag to buffer
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function close_tag() {
			if (count($this->open_tags) == 0) {
				exit("No open XML tags available to close.");
			}

			$this->add_to_buffer("</".array_pop($this->open_tags).">\n");
		}

		/* Add tag to buffer
		 *
		 * INPUT:  string tag name, string data, array( string key => string value[, ...] )
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function add_tag($name, $data = null, $attributes = array()) {
			$this->tag_eol = false;

			$this->open_tag($name, $attributes);
			if ($data !== null) {
				$this->add_to_buffer($this->xmlspecialchars($data));
			}
			$this->close_tag();

			$this->tag_eol = true;
		}

		/* Add record to buffer
		 *
		 * INPUT:  array( string key => string value[, ...] )[, string tag name][, array( string key => string value[, ...] )][, boolean recursive]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function record($record, $name = null, $attributes = array(), $recursive = false) {
			if ($name !== null) {
				if (isset($record["id"])) {
					$attributes["id"] = $record["id"];
				}

				if (is_numeric($name)) {
					$name = "item";
				}
				$this->open_tag($name, $attributes);
			}

			$skip_tags = array("id", "password", "creditcard");
			foreach (array_keys($record) as $key) {
				if (in_array($key, $skip_tags, true)) {
					continue;
				}

				if (is_array($record[$key]) == false) {
					$this->add_tag(is_numeric($key) ? "item" : $key, $record[$key]);
				} else if ($recursive) {
					$this->record($record[$key], $key, array(), true);
				}
			}
			if ($name !== null) {
				$this->close_tag($name);
			}
		}

		/* Add XML data to buffer
		 *
		 * INPUT:  string XML data, string tag name
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function add_xml($str, $tag) {
			if (strpos($str, "<!") !== false) {
				return false;
			}

			$xml = new \DomDocument();
			if ($xml->loadXML($str) == false) {
				return false;
			}

			if (($begin = strpos($str, "<".$tag.">")) === false) {
				if (($begin = strpos($str, "<".$tag." ")) === false) {
					return false;
				}
			}
			if (($end = strrpos($str, "</".$tag.">")) === false) {
				return false;
			}
			$end += strlen($tag) + 3;

			$str = substr($str, $begin, $end - $begin)."\n";

			$this->add_to_buffer($str);

			return true;
		}

		/* Set XSLT parameter
		 *
		 * INPUT:  string key, string value
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function set_xslt_parameter($key, $value) {
			$this->xslt_parameters[$key] = $value;
		}

		/* Convert XML string to array
		 *
		 * INPUT:  string xml
		 * OUTPUT: array data
		 * ERROR:  false
		 */
		public function xml_to_array($xml) {
			/* Convert XML to array
			 */
			$parser = xml_parser_create();
			xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, 0);
			if (xml_parse_into_struct($parser, $xml, $items, $index) == 0) {
				return false;
			}
			xml_parser_free($parser);

			/* Convert to usable array
			 */
			$result = $pointers = array();
			$depth = 0;
			$pointers[$depth] = &$result;

			foreach ($items as $item) {
				if (($item["attributes"] ?? null) === null) {
					$item["attributes"] = array();
				}

				/* Handle node types
				 */
				switch ($item["type"]) {
					case "open":
						array_push($pointers[$depth], array(
							"name"       => $item["tag"],
							"attributes" => $item["attributes"],
							"content"    => array()));
						$last = count($pointers[$depth]) - 1;
						$pointers[$depth + 1] = &$pointers[$depth++][$last]["content"];
						break;
					case "complete":
						array_push($pointers[$depth], array(
							"name"       => $item["tag"],
							"attributes" => $item["attributes"],
							"content"    => trim($item["value"] ?? "")));
						break;
					case "close":
						$depth--;
						break;
				}
			}

			return $result;
		}

		/* Perform XSL transformation
		 *
		 * INPUT:  string XSLT filename
		 * OUTPUT: string XSLT result
		 * ERROR:  false
		 */
		public function transform($xslt_file) {
			$xslt = new \DomDocument();
			$xml = new \DomDocument();

			if ((file_exists($xslt_file)) == false) {
				return false;
			} else if ($xslt->load($xslt_file) == false) {
				return false;
			}

			if ($xml->loadxml($this->document) == false) {
				return false;
			}

			$processor = new \XSLTprocessor();
			$processor->setsecurityprefs(XSL_SECPREF_DEFAULT | XSL_SECPREF_READ_FILE | XSL_SECPREF_READ_NETWORK);
			$processor->importstylesheet($xslt);

			foreach ($this->xslt_parameters as $key => $value) {
				$processor->setparameter("", $key, $value);
			}

			return $processor->transformtoxml($xml);
		}

		/* Start caching XML additions done after this call
		 *
		 * INPUT:  string cache key[, int cache timeout]
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function start_caching($key, $timeout = null) {
			if (($this->cache === null) || ($this->cache_key !== null)) {
				return false;
			}

			$this->cache_key = $key;
			$this->cache_timeout = $timeout;

			return true;
		}

		/* Stop XML caching
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function stop_caching() {
			if (($this->cache === null) || ($this->cache_key === null)) {
				return false;
			}

			$this->cache->store($this->cache_key, $this->cache_buffer, $this->cache_timeout);
			$this->cache_key = null;
			$this->cache_timeout = null;
			$this->cache_buffer = "";

			return true;
		}

		/* Abort XML caching
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function abort_caching() {
			if ($this->cache === null) {
				return false;
			}

			$this->cache_key = null;
			$this->cache_timeout = null;
			$this->cache_buffer = "";

			return true;
		}

		/* Fetch XML from cache and append to buffer
		 *
		 * INPUT:  string cache key
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function fetch_from_cache($key) {
			if ($this->cache === null) {
				return false;
			}

			if (($value = $this->cache->$key) == null) {
				return false;
			}

			$this->xml_data .= $value;

			return true;
		}

		/* Remote entry from XML cache
		 *
		 * INPUT:  string cache key
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function remove_from_cache($key) {
			if ($this->cache === null) {
				return false;
			}

			$this->cache->$key = null;

			return true;
		}
	}
?>
