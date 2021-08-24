<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class cms_file_controller extends Banshee\controller {
		public function execute() {
			$base_dir = FILES_PATH."/".$this->user->files_key;
			if (($sub_dir = implode("/", $this->page->parameters)) != "") {
				$sub_dir = "/".$sub_dir;
				if ($this->model->valid_path($sub_dir) == false) {
					$this->page->set_http_code(403);
					return false;
				}
			}
			$directory = $base_dir.$sub_dir;

			if ($this->page->ajax_request) {
				if ($_POST["submit_button"] == "Rename") {
					if ($this->model->rename_file($_POST["filename_current"], $_POST["filename_new"], $directory) == false) {
						$this->view->add_tag("result", "Error renaming file.");
						$this->page->set_http_code(403);
					} else {
						$this->user->log_action("file / directory '%s' renamed to '%s'", $_POST["filename_current"], $_POST["filename_new"]);
					}
				} else if ($_POST["submit_button"] == "Delete") {
					if (is_dir($directory."/".$_POST["filename"])) {
						if ($this->model->directory_empty($_POST["filename"], $directory) == false) {
							$this->view->add_tag("result", "Directory not empty.");
							$this->page->set_http_code(403);
							return;
						}
					}
					if ($this->model->delete_file($_POST["filename"], $directory) == false) {
						$this->view->add_tag("result", "Error deleting file.");
						$this->page->set_http_code(403);
					} else {
						$this->user->log_action("file / directory '%s' deleted", $_POST["filename"]);
					}
				}

				return;
			}

			$this->view->add_javascript("banshee/jquery.contextMenu.js");
			$this->view->add_javascript("cms/file.js");

			$this->view->add_css("banshee/context-menu.css");

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Create") {
					/* Create directory
					 */
					if ($this->model->directory_oke($_POST["create"], $directory) == false) {
						$this->view->add_tag("create", $_POST["create"]);
					} else if ($this->model->create_directory($_POST["create"], $directory) == false) {
						$this->view->add_tag("create", $_POST["create"]);
						$this->view->add_message("Error creating directory.");
					} else {
						$this->user->log_action("directory '%s' created", $_POST["create"]);
					}
				} else if ($_POST["submit_button"] == "Upload") {
					/* Upload file
					 */
					if ($this->model->upload_oke($_FILES["file"], $directory)) {
						if ($this->model->import_uploaded_file($_FILES["file"], $directory) == false) {
							$this->view->add_message("Error while importing file.");
						} else {
							$this->user->log_action("file '%s' uploaded", $_FILES["file"]["name"]);
						}
					}
				}
			}

			if (($files = $this->model->directory_listing($directory)) === false) {
				$this->view->add_tag("result", "Error reading directory");
			} else {
				$this->view->open_tag("files", array("dir" => $sub_dir));

				/* Directories bread crumbs
				 */
				$this->view->open_tag("current");
				$path = "";
				$this->view->add_tag("path", "", array("label" => "files"));
				foreach ($this->page->parameters as $dir) {
					$path .= "/".$dir;
					$this->view->add_tag("path", $path, array("label" => $dir));
				}
				$this->view->close_tag();

				/* Directories
				 */
				foreach ($files["dirs"] as $filename) {
					$file = array(
						"name"   => $filename,
						"link"   => "/".$this->page->module.$sub_dir."/".$filename,
						"size"   => $this->model->get_file_size($directory."/".$filename));
					$this->view->record($file, "directory");
				}

				/* Files
				 */
				foreach ($files["files"] as $filename) {
					$file = array(
						"name"   => $filename,
						"link"   => "/".$directory."/".rawurlencode($filename),
						"size"   => $this->model->get_file_size($directory."/".$filename));
					$this->view->record($file, "file");
				}

				$this->view->close_tag();
			}
		}
	}
?>
