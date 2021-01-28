<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_access_controller extends Banshee\controller {
		public function execute() {
			if (($users = $this->model->get_all_users()) === false) {
				$this->view->add_tag("result", "Database error.");
			} else if (($modules = $this->model->get_private_modules()) === false) {
				$this->view->add_tag("result", "Database error.");
			} else if (($pages = $this->model->get_private_pages()) === false) {
				$this->view->add_tag("result", "Database error.");
			} else if (($roles = $this->model->get_all_roles()) === false) {
				$this->view->add_tag("result", "Database error.");
			} else {
				$this->view->open_tag("overview");

				/* Roles
				 */
				$this->view->open_tag("roles");
				foreach ($roles as $role) {
					$this->view->add_tag("role", $role["name"]);
				}
				$this->view->close_tag();

				/* Users
				 */
				$this->view->open_tag("users");
				foreach ($users as $user) {
					$this->view->open_tag("user", array("name" => $user["username"]));
					foreach ($roles as $role) {
						$this->view->add_tag("role", in_array($role["id"], $user["roles"]) ? YES : NO);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();

				/* Modules
				 */
				$this->view->open_tag("modules");
				foreach ($modules as $module) {
					$this->view->open_tag("module", array("url" => $module));
					foreach ($roles as $role) {
						$this->view->add_tag("access", $role[$module]);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();

				/* Pages
				 */
				$this->view->open_tag("pages");
				foreach ($pages as $page) {
					$this->view->open_tag("page", array("url" => $page["url"]));
					foreach ($roles as $role) {
						$level = $page["access"][$role["id"]];
						$this->view->add_tag("access", isset($level) ? $level : 0);
					}
					$this->view->close_tag();
				}
				$this->view->close_tag();

				$this->view->close_tag();
			}
		}
	}
?>
