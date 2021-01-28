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

<xsl:template match="content">
<h1>Website administration</h1>
<div class="row">
<xsl:for-each select="menu/section">
	<div class="{@class}">
	<div class="panel panel-default">
		<div class="panel-heading"><xsl:value-of select="@title" /></div>
		<ul class="panel-body">
		<xsl:for-each select="entry">
			<li><a href="/{.}"><img src="/images/icons/{@icon}" class="icon" /><xsl:value-of select="@text" /></a></li>
		</xsl:for-each>
		</ul>
	</div>
	</div>
</xsl:for-each>
</div>
</xsl:template>

</xsl:stylesheet>
