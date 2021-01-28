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
//  request form template
//
//-->
<xsl:template match="request">
<p>Enter your username and e-mail address to reset your password.</p>
<form action="/{/output/page}" method="post">
<label for="username">Username:</label>
<input type="text" id="username" name="username" class="form-control" />
<label for="email">E-mail:</label>
<input type="text" id="email" name="email" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Reset password" class="btn btn-default" />
<a href="/{@previous}" class="btn btn-default">Cancel</a>
</div>
</form>
</xsl:template>

<!--
//
//  Link sent template
//
//-->
<xsl:template match="link_sent">
<p>If you have entered an existing username and e-mail address, a link to reset your password has been sent to the supplied e-mail address.</p>
<p>Don't close your browser!!</p>
</xsl:template>

<!--
//
//  Reset form template
//
//-->
<xsl:template match="reset">
<p>Enter a new password for your account:</p>
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<input type="hidden" name="key" value="{key}" />
<input type="hidden" id="username" value="{username}" />
<input type="hidden" id="password_hashed" name="password_hashed" value="no" />
<label for="password">Password:</label>
<input type="password" id="password" name="password" class="form-control" />
<label for="repeat">Repeat:</label>
<input type="password" id="repeat" name="repeat" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Save password" class="btn btn-default" />
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Forgot password</h1>
<xsl:apply-templates select="request" />
<xsl:apply-templates select="link_sent" />
<xsl:apply-templates select="reset" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
