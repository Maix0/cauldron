<?php
	class vault_condition_controller extends \Banshee\tablemanager_controller {
		protected $name = "Condition";
		protected $back = "vault";
		protected $icon = "conditions.png";
		protected $page_size = 25;
		protected $pagination_links = 7;
		protected $pagination_step = 1;
		protected $foreign_null = "---";
		protected $browsing = null;
		protected $prevent_repost = false;
	}
?>
