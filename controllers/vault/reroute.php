<?php
	class vault_reroute_controller extends Banshee\tablemanager_controller {
		protected $name = "Reroute";
		protected $back = "vault";
		protected $icon = "reroute.png";
		protected $page_size = 25;
		protected $pagination_links = 7;
		protected $pagination_step = 1;
		protected $foreign_null = "---";
		protected $browsing = "pagination";
	}
?>
