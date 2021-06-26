-- MySQL dump 10.16  Distrib 10.1.48-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tabletop
-- ------------------------------------------------------
-- Server version	10.1.48-MariaDB-0ubuntu0.18.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(100) NOT NULL,
  `value` mediumtext NOT NULL,
  `timeout` datetime NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `character_icons`
--

DROP TABLE IF EXISTS `character_icons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `character_icons` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `character_id` int(10) unsigned NOT NULL,
  `name` varchar(25) NOT NULL,
  `size` tinyint(3) unsigned NOT NULL,
  `extension` varchar(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `characters`
--

DROP TABLE IF EXISTS `characters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `characters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(20) NOT NULL,
  `initiative` smallint(6) NOT NULL,
  `armor_class` tinyint(3) unsigned NOT NULL,
  `hitpoints` smallint(5) unsigned NOT NULL,
  `damage` smallint(5) unsigned NOT NULL,
  `extension` varchar(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collectables`
--

DROP TABLE IF EXISTS `collectables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `collectables` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` int(10) unsigned NOT NULL,
  `map_token_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `image` tinytext NOT NULL,
  `found` tinyint(1) NOT NULL,
  `hide` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `game_map_token_id` (`map_token_id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `collectables_ibfk_1` FOREIGN KEY (`map_token_id`) REFERENCES `map_token` (`id`),
  CONSTRAINT `collectables_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conditions`
--

DROP TABLE IF EXISTS `conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conditions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doors`
--

DROP TABLE IF EXISTS `doors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `doors` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `length` smallint(3) unsigned NOT NULL,
  `direction` enum('horizontal','vertical') NOT NULL,
  `state` enum('open','closed','locked') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `doors_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_character`
--

DROP TABLE IF EXISTS `game_character`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_character` (
  `game_id` int(10) unsigned NOT NULL,
  `character_id` int(10) unsigned NOT NULL,
  `alternate_icon_id` int(10) unsigned DEFAULT NULL,
  KEY `game_id` (`game_id`),
  KEY `character_id` (`character_id`),
  KEY `alternate_icon_id` (`alternate_icon_id`),
  CONSTRAINT `game_character_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`),
  CONSTRAINT `game_character_ibfk_2` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`),
  CONSTRAINT `game_character_ibfk_3` FOREIGN KEY (`alternate_icon_id`) REFERENCES `character_icons` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `games` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `image` tinytext NOT NULL,
  `story` text NOT NULL,
  `dm_id` int(10) unsigned NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active_map_id` int(10) unsigned DEFAULT NULL,
  `player_access` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dm_id` (`dm_id`),
  KEY `active_map_id` (`active_map_id`),
  CONSTRAINT `games_ibfk_1` FOREIGN KEY (`dm_id`) REFERENCES `users` (`id`),
  CONSTRAINT `games_ibfk_2` FOREIGN KEY (`active_map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `journal`
--

DROP TABLE IF EXISTS `journal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `content` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `journal_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`),
  CONSTRAINT `journal_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lights`
--

DROP TABLE IF EXISTS `lights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lights` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `radius` decimal(4,1) unsigned NOT NULL,
  `state` enum('off','on') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `lights_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `map_character`
--

DROP TABLE IF EXISTS `map_character`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `map_character` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `character_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `rotation` smallint(5) unsigned NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `character_id` (`character_id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `map_character_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`),
  CONSTRAINT `map_character_ibfk_2` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `map_token`
--

DROP TABLE IF EXISTS `map_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `map_token` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `token_id` int(10) unsigned NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `rotation` smallint(5) unsigned NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  `armor_class` tinyint(3) unsigned NOT NULL,
  `hitpoints` smallint(5) unsigned NOT NULL,
  `damage` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token_id` (`token_id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `map_token_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`),
  CONSTRAINT `map_token_ibfk_2` FOREIGN KEY (`token_id`) REFERENCES `tokens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maps`
--

DROP TABLE IF EXISTS `maps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` int(10) unsigned NOT NULL,
  `title` varchar(50) NOT NULL,
  `url` varchar(500) NOT NULL,
  `audio` tinytext NOT NULL,
  `type` enum('image','video') NOT NULL,
  `width` smallint(5) unsigned NOT NULL,
  `height` smallint(3) unsigned NOT NULL,
  `grid_size` tinyint(3) unsigned NOT NULL,
  `show_grid` tinyint(1) NOT NULL,
  `drag_character` tinyint(1) NOT NULL,
  `fog_of_war` tinyint(1) NOT NULL,
  `fow_distance` tinyint(3) unsigned NOT NULL,
  `start_x` smallint(5) unsigned NOT NULL,
  `start_y` smallint(5) unsigned NOT NULL,
  `dm_notes` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `maps_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `menu` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(10) unsigned NOT NULL,
  `text` varchar(100) NOT NULL,
  `link` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--
-- ORDER BY:  `id`

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (1,0,'Games','/game'),(2,0,'Characters','/character'),(3,0,'Manual','/manual'),(4,0,'CMS','/cms'),(5,0,'Logout','/logout');
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organisations`
--

DROP TABLE IF EXISTS `organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organisations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `name_2` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organisations`
--
-- ORDER BY:  `id`

LOCK TABLES `organisations` WRITE;
/*!40000 ALTER TABLE `organisations` DISABLE KEYS */;
INSERT INTO `organisations` VALUES (1,'TableTop');
/*!40000 ALTER TABLE `organisations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `page_access`
--

DROP TABLE IF EXISTS `page_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `page_access` (
  `page_id` int(10) unsigned NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `level` int(10) unsigned NOT NULL,
  PRIMARY KEY (`page_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `page_access_ibfk_1` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`),
  CONSTRAINT `page_access_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `page_access`
--
-- ORDER BY:  `page_id`,`role_id`

LOCK TABLES `page_access` WRITE;
/*!40000 ALTER TABLE `page_access` DISABLE KEYS */;
INSERT INTO `page_access` VALUES (1,2,1),(1,3,1);
/*!40000 ALTER TABLE `page_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(100) NOT NULL,
  `language` varchar(2) NOT NULL,
  `layout` varchar(100) DEFAULT NULL,
  `private` tinyint(1) NOT NULL,
  `style` text,
  `title` varchar(100) NOT NULL,
  `description` varchar(200) NOT NULL,
  `keywords` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `visible` tinyint(1) NOT NULL,
  `back` tinyint(1) NOT NULL,
  `form` tinyint(1) NOT NULL,
  `form_submit` varchar(32) DEFAULT NULL,
  `form_email` varchar(100) DEFAULT NULL,
  `form_done` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`url`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pages`
--
-- ORDER BY:  `id`

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,'/manual','en','tabletop',1,'div.well li {\r\n  color:#337ab7;\r\n  cursor:pointer;\r\n}\r\ndiv.well li:hover {\r\n  text-decoration:underline;\r\n}\r\n\r\nh2 {\r\n  color: #5385c1;\r\n  padding-bottom:3px;\r\n  border-bottom:1px solid #ff7900;\r\n}\r\n\r\ndiv.row h3 {\r\n  margin-top:10px;\r\n}\r\n\r\ndiv.section {\r\n  display:none;\r\n}','Manual','','','<script type=\"text/javascript\">\r\nfunction show_section(section) {\r\n  $(\'div.section\').hide();\r\n  $(\'div.\' + section).show();\r\n}\r\n</script>\r\n\r\n<div class=\"well\">\r\n<div class=\"row\">\r\n<div class=\"col-sm-6\">\r\n<h3>For players</h3>\r\n<ul>\r\n<li onClick=\"javascript:show_section(\'character\')\">Creating a character</li>\r\n<li onClick=\"javascript:show_section(\'playing\')\">Playing a game</li>\r\n</ul>\r\n</div>\r\n\r\n<div class=\"col-sm-6\">\r\n<h3>For Dungeon Masters</h3>\r\n<ul>\r\n<li onClick=\"javascript:show_section(\'creating\')\">Creating a game</li>\r\n<li onClick=\"javascript:show_section(\'running\')\">Running a game</li>\r\n</ul>\r\n</div>\r\n</div>\r\n</div>\r\n\r\n<div class=\"section character\">\r\n<h2>Creating a character</h2>\r\n<p>Click on \'Characters\' in the menu bar to go to the character page. Here you can add and edit your characters. TableTop isn\'t a tool for complete character creation. So, besides the character name and an icon, you only need to enter the values that are needed to do battle calculations. When you upload a character image, make sure that it\'s a top view image of your character and that it\'s looking down.</p>\r\n<p>When you\'ve created a character, you can add alternate icons for that character, by clicking on the small face icon in the upper right corner of your character panel. You can use this, for example, for characters with shape changing abilities. Alternate icons can be normal (1x1) or large (2x2).</p>\r\n</div>\r\n\r\n<div class=\"section playing\">\r\n<h2>Playing a game</h2>\r\n<p>You can move your character via the keys w, a, s and d and rotate it via q and e. Optionally, you can drag your character via the mouse, but its up to the Dungeon Master to allow that. Right clicking with the mouse on your or another character, a token or the map opens a menu with options. Most options should explain themselves enough, but here is some information to make your understanding of TableTop easier and faster.</p>\r\n<p><span class=\"fa fa-warning\"></span> Damage: The amount of damage points that you enter, are added to your current damage.</p>\r\n<p><span class=\"fa fa-medkit\"></span> Healing: The same as damage, but the points are of course subtracted from your current damage.</p>\r\n<p><span class=\"fa fa-lock\"></span> Stick to / unstick: Sticking to a token means that your character moves automatically relative to that token when that token moves.</p>\r\n<p><span class=\"fa fa-shield\"></span> Attack: This rolls a D20 dice. The attack bonus you enter is added to the result of the dice roll.</p>\r\n<p><span class=\"fa fa-map-marker\"></span> Set marker: You can use a marker to point out spots on the map to all other players and the Dungeon Master.</p>\r\n<p><span class=\"fa fa-map-signs\"></span> Measure distance: The distance is shown in the top bar of the screen. Left clicking with the mouse will stop the measuring.</p>\r\n<p>The input field at the right bottom corner of the screen can be used to enter commands. Type \'/help\' to see all available commands.</p>\r\n<p>Use the journal to log notes during a session. The journal is shared between all players and the Dungeon Master.</p>\r\n<p>The Inventory shows items you have found during the game. Items can be found when you right click on a token and select View. You have to be close to that token, otherwise the token itself is shown.</p>\r\n</div>\r\n\r\n<div class=\"section creating\">\r\n<h2>Creating a game</h2>\r\n<p>All that is needed to create a game, can be found in the Content Management System (CMS). To enter the CMS, click on the CMS link in the menu bar. The CMS also has all that is needed for user and website administration. A user needs the Dungeon Master or Administrator role for CMS access. The game creation section has the following options.</p>\r\n<h3>Files administration</h3>\r\n<p>Each game and map uses multiple resources, which can be stored within the TableTop tool. The following directories are available by default:</p>\r\n<ul>\r\n<li><b>audio</b>: Here you can store audio files that can be played during a game. Store audios file for a game in a subdirectory which name equals the ID of that game. The game ID can be found in the Game administration page. Audio files can be played via the command line or via a zone script.</li>\r\n<li><b>characters</b>: TableTop uses this directory for player character tokens. Only change its content if you know what you\'re doing.</li>\r\n<li><b>collectables</b>: TableTop uses this directory for collectables. Only change its content if you know what you\'re doing.</li>\r\n<li><b>effects</b>: Here you can store icons that will be used for map effects. A Dungeon Master can create a map effect via a right click on the map and selecting Create effect.</li>\r\n<li><b>maps</b>: Here you can store map background images. You can create a subdirectory per game if you like.</li>\r\n<li><b>tokens</b>: TableTop uses this directory for monster, NPC and object tokens. Only change its content if you know what you\'re doing.</li>\r\n</ul>\r\n<h3>Condition administration</h3>\r\n<p>During a game, players or monsters can have several conditions. TableTop contains the D&D 5e conditions by default. Since there is no real need for every Dungeon Master to change the conditions, only an Administrator can access this page by default. You can change this in the Role administration page.</p>\r\n<h3>Token administration</h3>\r\n<p>This page allows you to add monster, NPC and object tokens to TableTop. Be aware that tokes are available for every map you create in TableTop. Since tokens are shared between games, make sure that all Dungeon Masters only make changes to an existing token if all other Dungeon Masters agree. Otherwise, a change made to a token could affect another Dungeon Master\'s game!</p>\r\n<p>When you upload an image for a token, make sure that it\'s a top view image. When it\'s a token for a monster or NPC, make sure that it\'s looking down. Otherwise, setting the orientation for that token during map building won\'t work properly.</p>\r\n<h3>Game administration</h3>\r\n<p>Before you can build maps, you need to create a game first. The background image and introduction story are shown in the main menu screen.</p>\r\n<h3>Map administration</h3>\r\n<p>Creating maps is the most important part of the game building. In TableTop, you can use images and videos as a map background. They can be stored in TableTop via File administration, but you can also use resources from other websites. A background audio is played repeatedly when that map is active during a game. When a player drags its character via the mouse, doors, walls and windows that would otherwise block the character\'s path, will be ignored. The default Fog of War distance only applies to the Dark / Night type Fog of War. During a game, the map notes are available to the Dungeon Master via the \'DM notes\' button at the top of the screen.</p>\r\n<p>When a map is created, you can change its settings via the \'Edit\' button or build the map itself via a click on the map\'s title.</p>\r\n<p>In the map building screen, right click on the map to create doors, lights, walls, windows and zones. You can add tokens by dragging them from your token collection on the right side of the screen onto the map. Right click on a token to change its settings. Via \'Change presence\', you can hide a token for the players. When you duplicate a token, the new token will have the same hitpoints, armor class, rotation and presence. Lowering a token allows you to access another token underneath it.</p>\r\n<p>A door can be opened (green) and closed (brown) by all players and the Dungeon Master. It can only be locked (red) and unlocked (brown) by the Dungeon Master.</p>\r\n<p>A zone is mainly a visual marker on the map, but you can use a non-transparent zone to cover an area for players. A zone is always at least a bit transparent for a Dungeon Master. A 100% transparent zone is also always a bit visible for the Dungeon Master. You can automate several simple tasks via a script, which can be attached to a zone. What a script can do, is explained via the help button in the script editing window.</p>\r\n<h3>Collectable administration</h3>\r\n<p>Throughout the map, you can hide items for players to find. Here you can create those items. Items can only be placed \'inside\' a token that is placed on the map. A player can find an item when its player is nearby the containing token and selects \'View\' via a right click on that token. An item that is found, is shown in every player\'s inventory. When an item is found, you can optionally let TableTop automatically hide the containing token.</p>\r\n<h3>Player administration</h3>\r\n<p>The last step before you can start running your game, is to add player characters. Player\'s don\'t receive a notification about this. Characters will be placed on the maps at or near the \'Player start\' marker. Make sure all your players have created the right character for your game, as this step can only be done once!</p>\r\n</div>\r\n\r\n<div class=\"section running\">\r\n<h2>Running a game</h2>\r\n<p>Right clicking with the mouse on a character, a token or the map opens a menu with options. Most options should explain themselves enough, but here is some information to make your understanding of TableTop easier and faster.</p>\r\n<p><span class=\"fa fa-warning\"></span> Create effect: An effect is a temporary visual marker on the map. When de Dungeon Master reloads the map, they are gone.</p>\r\n<p><span class=\"fa fa-lightbulb-o\"></span> Create light: A light only has effect on a map with Fog of War type set to night / dark.</p>\r\n<p><span class=\"fa fa-binoculars\"></span> Focus: Focusing on a character or token allows you to move that object via the keys w, a, s and d and to rotate it via q and e.</p>\r\n<p><span class=\"fa fa-hand-stop-o\"></span> Hand over: Give control over this object to the player of the character you are focusing on. That player is now able to move and rotate that object.</p>\r\n<p><span class=\"fa fa-hand-grab-o\"></span> Take back: Take back the control over this object from all other players.</p>\r\n<p><span class=\"fa fa-shield\"></span> Attack: This rolls a D20 dice. The attack bonus you enter is added to the result of the dice roll. Only the outcome of the roll is shared with the players.</p>\r\n<p><span class=\"fa fa-compass\"></span> Send to map: Makes the character invisible and sends it to another map. That map will also open in the Dungeon Master\'s browser.</p>\r\n<p>As a Dungeon Master, you are allowed to do more in a game than players. Because a zone scripts needs to be able to do what a Dungeon Master is allowed to do, a zone script is executed by the Dungeon Master\'s computer. If no Dungeon Master is in the game, zone scripts will not be executed. Dungeon Masters need to be sure that they open a map only once. Otherwise, a script will be executed more than once!</p>\r\n<p>A battle is started by entering /init in the command line field. It rolls initiative for all players using their initiative bonus. You can add monsters or monster groups by entering its name and optionally its initiative bonus separated by a comma in the dialog box that appears. You can add monsters via the /add command and remove them via the /remove command. Change the player\'s turn via the /next command. Optionally, you can provide a name (or the first part of its name as long as it\'s unique) to change the battle order. When the battle is over, enter the command /done.</p>\r\n</div>',1,0,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reroute`
--

DROP TABLE IF EXISTS `reroute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reroute` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `original` varchar(100) NOT NULL,
  `replacement` varchar(100) NOT NULL,
  `type` tinyint(3) unsigned NOT NULL,
  `description` tinytext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `non_admins` smallint(6) NOT NULL,
  `profile` tinyint(1) NOT NULL,
  `session` tinyint(1) NOT NULL,
  `cms` tinyint(1) NOT NULL,
  `cms/access` tinyint(1) NOT NULL,
  `cms/action` tinyint(1) NOT NULL,
  `cms/file` tinyint(1) NOT NULL,
  `cms/menu` tinyint(1) NOT NULL,
  `cms/organisation` tinyint(1) NOT NULL,
  `cms/page` tinyint(1) NOT NULL,
  `cms/role` tinyint(1) NOT NULL,
  `cms/settings` tinyint(1) NOT NULL,
  `cms/switch` tinyint(1) NOT NULL,
  `cms/user` tinyint(1) NOT NULL,
  `cms/reroute` tinyint(4) DEFAULT '0',
  `character` tinyint(4) DEFAULT '0',
  `cms/token` tinyint(4) DEFAULT '0',
  `game` tinyint(4) DEFAULT '0',
  `cms/game` tinyint(4) DEFAULT '0',
  `cms/map` tinyint(4) DEFAULT '0',
  `cms/map/arrange` tinyint(4) DEFAULT '0',
  `object` tinyint(4) DEFAULT '0',
  `cms/collectable` tinyint(4) DEFAULT '0',
  `cms/condition` tinyint(4) DEFAULT '0',
  `cms/players` tinyint(4) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--
-- ORDER BY:  `id`

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrator',0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1),(2,'Player',1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0),(3,'Dungeon Master',1,1,1,1,0,0,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,1);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` varchar(128) NOT NULL,
  `login_id` varchar(128) DEFAULT NULL,
  `content` text,
  `expire` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` int(10) unsigned DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `bind_to_ip` tinyint(1) NOT NULL,
  `name` tinytext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(32) NOT NULL,
  `type` varchar(8) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--
-- ORDER BY:  `id`

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'admin_page_size','integer','25'),(2,'database_version','integer','14'),(3,'default_language','string','en'),(8,'head_description','string','Online Tabletop Platform'),(9,'head_keywords','string','tabletop, game, roleplaying'),(10,'head_title','string','TableTop'),(11,'hiawatha_cache_default_time','integer','3600'),(12,'hiawatha_cache_enabled','boolean','false'),(27,'secret_website_code','string','ovIEN5r3TSbl7mNYsJ1BDacwaVOkzOdg'),(28,'session_persistent','boolean','true'),(29,'session_timeout','integer','15552000'),(30,'start_page','string','game'),(33,'webmaster_email','string','hugo@leisink.net'),(36,'screen_grid_size','integer','50');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `width` tinyint(3) unsigned NOT NULL,
  `height` tinyint(3) unsigned NOT NULL,
  `extension` varchar(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_role`
--

DROP TABLE IF EXISTS `user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_role` (
  `user_id` int(10) unsigned NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  KEY `role_id` (`role_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role`
--

LOCK TABLES `user_role` WRITE;
/*!40000 ALTER TABLE `user_role` DISABLE KEYS */;
INSERT INTO `user_role` VALUES (1,1);
/*!40000 ALTER TABLE `user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `organisation_id` int(10) unsigned NOT NULL,
  `username` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
  `password` tinytext NOT NULL,
  `one_time_key` varchar(128) DEFAULT NULL,
  `cert_serial` int(10) unsigned DEFAULT NULL,
  `status` tinyint(4) unsigned NOT NULL DEFAULT '0',
  `authenticator_secret` varchar(16) DEFAULT NULL,
  `fullname` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--
-- ORDER BY:  `id`

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'admin','none',NULL,NULL,1,NULL,'Administrator','root@localhost');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `walls`
--

DROP TABLE IF EXISTS `walls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `walls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `length` smallint(5) unsigned NOT NULL,
  `direction` enum('horizontal','vertical') NOT NULL,
  `transparent` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `walls_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `zones`
--

DROP TABLE IF EXISTS `zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `zones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `width` tinyint(3) unsigned NOT NULL,
  `height` tinyint(3) unsigned NOT NULL,
  `color` varchar(7) NOT NULL,
  `opacity` decimal(3,1) NOT NULL,
  `script` text NOT NULL,
  `group` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `zones_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-06-26 10:05:45
