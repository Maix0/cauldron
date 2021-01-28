<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	abstract class dynamic_blocks extends model {
		private $system_view = null;
		private $class = null;
		protected $xslt_path = "views/banshee";

		/* Constructor
		 *
		 * INPUT:  object database, object settings
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($database, $settings, $user, $page, $view, $language = null) {
			$this->system_view = $view;

			$xml = new Core\xml($db, is_true(SECURE_XML_DATA));
			$arguments = array($database, $settings, $user, $page, $xml, $language);
			call_user_func_array(array("parent", "__construct"), $arguments);

			$this->class = array_pop(explode("\\", static::class));
		}

		/* Available sections
		 *
		 * INPUT:  -
		 * OUTPUT: array available sections
		 * ERROR:  -
		 */
		static public function available_sections() {
			$methods = get_class_methods(static::class);
			$remove = array("__construct", "borrow", "available_sections",
			               "get_dynamic_content", "execute");
			$methods = array_diff($methods, $remove);
			sort($methods);

			return $methods;
		}

		/* Execute
		 *
		 * INPUT:  string content with dynamic tags
		 * OUTPUT: string content with dynamic content
		 * ERROR:  -
		 */
		private function get_dynamic_content($section, $parameters) {
			if (in_array($section, $this->available_sections()) == false) {
				return null;
			}

			$this->view->clear_buffer();

			$this->view->open_tag($section);
			if (($result = call_user_func_array(array($this, $section), $parameters)) !== null) {
				return htmlentities($result);
			}
			$this->view->close_tag();

			return $this->view->transform(__DIR__."/../../".$this->xslt_path."/".$this->class.".xslt");
		}

		/* Execute
		 *
		 * INPUT:  string content with dynamic tags
		 * OUTPUT: string content with dynamic content
		 * ERROR:  -
		 */
		public function execute($content) {
			$tags_replaced = 0;

			while (($begin = strrpos($content, "<dynamic ")) !== false) {
				if (($end = strpos($content, "</dynamic>", $begin)) !== false) {
					$end += 10;
					$tag_has_content = true;

					if (($end_tag = strpos($content, ">", $begin)) === false) {
						break;
					}
					$end_tag++;
					
					if ($end_tag == $end) {
						break;
					}
				} else if (($end = strpos($content, "/>", $begin)) !== false) {
					$end += 2;
					$tag_has_content = false;
					$end_tag = $end;
				} else {
					break;
				}

				$tag = substr($content, $begin, $end_tag - $begin);
				$parameters = trim($tag, "< />");
				$parameters = explode(" ", $parameters);
				array_shift($parameters);
				$section = array_shift($parameters);

				if ($tag_has_content) {
					if ($this->$section($parameters) == true) {
						$block = substr($content, $end_tag, $end - 10 - $end_tag);
					} else {
						$block = "";
					}
				} else if (($block = $this->get_dynamic_content($section, $parameters)) !== null) {
					$block = rtrim($block);
					$tags_replaced++;
				}

				$content = substr($content, 0, $begin) . $block . substr($content, $end);
			}

			if ($tags_replaced > 0) {
				$this->system_view->add_css("banshee/".$this->class.".css");
			}

			return $content;
		}
	}
?>
