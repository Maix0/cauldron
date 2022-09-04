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
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Result template
//
//-->
<xsl:template match="result">
<pre class="result"><xsl:value-of select="." /></pre>
<h2>Form</h2>
</xsl:template>

<!--
//
//  Form template
//
//-->
<xsl:template match="form">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<label for="method">Method:</label>
<select id="method" name="method" class="form-control"><xsl:for-each select="methods/method">
<option><xsl:if test=".=../../method"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each></select>
<label for="type">Type:</label>
<select id="type" name="type" class="form-control"><xsl:for-each select="types/type">
<option><xsl:if test=".=../../type"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each></select>
<label for="url">URL:</label>
<input type="text" id="url" name="url" value="{url}" class="form-control" />
<label for="postdata">POST data:</label>
<textarea id="postdata" name="postdata" class="form-control"><xsl:value-of select="postdata" /></textarea>
<label for="username">Username:</label>
<input type="text" id="username" name="username" value="{username}" class="form-control" />
<label for="password">Password:</label>
<input type="password" id="password" name="password" value="{password}" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Submit" class="btn btn-default" />
<a href="/vault" class="btn btn-default">Back</a>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/apitest.png" class="title_icon" />
<h1>API test</h1>
<xsl:apply-templates select="result" />
<xsl:apply-templates select="form" />
</xsl:template>

</xsl:stylesheet>
