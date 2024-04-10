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

<!--
//
//  Internal error template
//
//-->
<xsl:template match="internal_errors">
<div id="internal_errors" class="panel panel-danger">
<div class="panel-heading">
	<h3 class="panel-title">Internal errors <span title="Close message box" alt="Close" class="close" onClick="javascript:$(this).parent().parent().parent().remove()">x</span></h3>
</div>
<div class="panel-body">
	<xsl:value-of disable-output-escaping="yes" select="/output/internal_errors" />
</div>
</div>
</xsl:template>

<!--
//
//  Result template
//
//-->
<xsl:template match="result">
<p><xsl:value-of select="." /></p>
<xsl:choose>
	<xsl:when test="@url and @seconds">
		<xsl:call-template name="redirect">
			<xsl:with-param name="url" select="@url" />
			<xsl:with-param name="seconds" select="@seconds" />
		</xsl:call-template>
	</xsl:when>
	<xsl:when test="@url">
		<xsl:call-template name="redirect"><xsl:with-param name="url" select="@url" /></xsl:call-template>
	</xsl:when>
	<xsl:when test="@seconds">
		<xsl:call-template name="redirect"><xsl:with-param name="seconds" select="@seconds" /></xsl:call-template>
	</xsl:when>
	<xsl:otherwise>
		<xsl:call-template name="redirect" />
	</xsl:otherwise>
</xsl:choose>
</xsl:template>

<!--
//
//  Redirect page template
//
//-->
<xsl:template name="redirect">
<xsl:param name="url" select="/output/page" />
<xsl:param name="seconds">3</xsl:param>
<xsl:if test="$seconds>0">
<p>Click <a href="/{$url}">here</a> to continue or wait <xsl:value-of select="$seconds" /> seconds to be redirected.</p>
</xsl:if>
<xsl:if test="$seconds>=0">
<script type="text/javascript">
	setTimeout(function() {
		document.location = '/<xsl:value-of select="$url" />';
	}, <xsl:value-of select="$seconds" />000);
</script>
</xsl:if>
</xsl:template>

<!--
//
//  Show system messages
//
//-->
<xsl:template match="system_messages">
<div class="alert alert-info" role="alert">
<xsl:for-each select="message">
	<p>&#187; <xsl:value-of select="." /></p>
</xsl:for-each>
</div>
</xsl:template>

<!--
//
//  Show system warnings
//
//-->
<xsl:template match="system_warnings">
<div class="alert alert-danger" role="alert">
<xsl:for-each select="warning">
	<p>&#187; <xsl:value-of select="." /></p>
</xsl:for-each>
</div>
</xsl:template>

<!--
//
//  Show messages template
//
//-->
<xsl:template name="show_messages">
<xsl:if test="/output/messages/message">
<div class="alert alert-warning">
<xsl:for-each select="/output/messages/message">
	<div><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
</xsl:if>
</xsl:template>

<!--
//
//  Website error template
//
//-->
<xsl:template match="website_error">
<xsl:choose>
	<xsl:when test=".=200">Although no error occurred, you ended up at the error page.</xsl:when>
	<xsl:when test=".=401">Your character's level is too low to access this page.</xsl:when>
	<xsl:when test=".=403">You tried to visit a page, but the Dungeon Master doesn't allow you access.</xsl:when>
	<xsl:when test=".=404">You searched for a web page, but failed on your perception check.</xsl:when>
	<xsl:otherwise>An internal error has occurred.</xsl:otherwise>
</xsl:choose>
</xsl:template>

</xsl:stylesheet>
