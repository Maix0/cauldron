<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  PHP extensions template
//
//-->
<xsl:template match="php_extensions">
<p>The following required PHP extensions are missing:</p>
<ul>
<xsl:for-each select="extension"><li><xsl:value-of select="." /></li></xsl:for-each>
</ul>
<p>Install and/or enable them and refresh this page.</p>

<div class="btn-group">
<a href="/{/output/page}" class="btn btn-default">Refresh</a>
</div>
</xsl:template>

<!--
//
//  Database settings template
//
//-->
<xsl:template match="db_settings">
<p>Enter your database settings in the file settings/website.conf and refresh this page.</p>
<p>If the specified database and database user do not exist, this setup will create them for you.</p>

<div class="btn-group">
<a href="/{/output/page}" class="btn btn-default">Refresh</a>
</div>
</xsl:template>

<!--
//
//  Create database template
//
//-->
<xsl:template match="create_db">
<xsl:call-template name="show_messages" />

<p>Enter the MySQL root credentials to create a database and a database user for your website as specified in settings/website.conf.</p>
<form action="/{/output/page}" method="post">
<label for="username">Username:</label>
<input type="text" id="username" name="username" value="{username}" class="form-control" autofocus="autofocus" />
<label for="password">Password:</label>
<input type="password" id="password" name="password" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Create database" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Proceed if you created them manually.</a>
</div>
</form>
</xsl:template>

<!--
//
//  Import SQL template
//
//-->
<xsl:template match="import_sql">
<xsl:call-template name="show_messages" />

<p>The next step is to import the file database/mysql.sql into your database.</p>
<form action="/{/output/page}" method="post">
<input type="submit" name="submit_button" value="Import SQL" class="btn btn-default" />
</form>
</xsl:template>

<!--
//
//  Update database template
//
//-->
<xsl:template match="update_db">
<xsl:call-template name="show_messages" />

<p>Your database is outdated. Update your database to continue.</p>
<form action="/{/output/page}" method="post">
<input type="submit" name="submit_button" value="Update database" class="btn btn-default" />
</form>
</xsl:template>

<!--
//
//  Create directories template
//
//-->
<xsl:template match="create_dirs">
<xsl:call-template name="show_messages" />

<p>Some directores in public/resources are missing. Make sure that public/resources is writable for the webserver. Create the missing directories to continue.</p>
<form action="/{/output/page}" method="post">
<input type="submit" name="submit_button" value="Create directories" class="btn btn-default" />
</form>
</xsl:template>

<!--
//
//  Credentials template
//
//-->
<xsl:template match="credentials">
<xsl:call-template name="show_messages" />

<form action="/{/output/page}" method="post">
<label for="username">Enter the username for the administrator:</label>
<input type="username" id="username" name="username" value="{username}" class="form-control" />
<label for="password">Enter new password for this user:</label>
<input type="password" id="password" name="password" class="form-control" autofocus="autofocus" />
<label for="repeat">Repeat the password:</label>
<input type="password" id="repeat" name="repeat" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Set password" class="btn btn-default" />
</div>
</form>
</xsl:template>

<!--
//
//  Done template
//
//-->
<xsl:template match="done">
<xsl:call-template name="show_messages" />

<p>Done! You can now login with your username and password.</p>
<p>Don't forget to disable this setup module by removing it from settings/public_modules.conf.</p>

<div class="btn-group">
<a href="/" class="btn btn-default">Continue</a>
</div>
</xsl:template>

<!--
//
//  Denied template
//
//-->
<xsl:template match="denied">
<p>You are not allowed to use this module. Follow the instructions in the INSTALL file to gain access.</p>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Cauldron VTT setup</h1>
<xsl:apply-templates />
</xsl:template>

</xsl:stylesheet>
