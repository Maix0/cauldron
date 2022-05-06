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
//  Progressbar template
//
//-->
<xsl:template name="progressbar">
<xsl:param name="progress">100</xsl:param>
<div class="progress">
<div class="progress-bar progress-bar-striped" role="progressbar" aria-valuenow="{$progress}" aria-valuemin="0" aria-valuemax="100" style="width:{$progress}%;">
<span><xsl:value-of select="$progress" />%</span>
</div>
</div>
</xsl:template>

<!--
//
//  Splitforms template
//
//-->
<xsl:template match="splitforms">
<xsl:call-template name="splitform_header" />
<xsl:call-template name="progressbar"><xsl:with-param name="progress" select="current/@percentage" /></xsl:call-template>

<div class="row">
<div class="col-sm-6">
<xsl:call-template name="show_messages" />

<form action="/{/output/page}" method="post">
<xsl:apply-templates select="splitform/*" />
<input type="hidden" name="splitform_current" value="{current}" />

<div class="btn-group">
<input type="submit" name="submit_button" value="{buttons/previous}" class="previous btn btn-default">
<xsl:if test="current=0"><xsl:attribute name="disabled">disabled</xsl:attribute></xsl:if>
</input>

<xsl:choose>
	<xsl:when test="current/@max>current">
		<input type="submit" name="submit_button" value="{buttons/next}" class="next btn btn-default" />
	</xsl:when>
	<xsl:otherwise>
		<input type="submit" name="submit_button" value="{buttons/submit}" class="submit btn btn-default" />
	</xsl:otherwise>
</xsl:choose>
</div>

<xsl:if test="buttons/back">
<div class="btn-group">
<a href="/{buttons/back/@link}" class="btn btn-default"><xsl:value-of select="buttons/back" /></a>
</div>
</xsl:if>
</form>
</div>
<div class="col-sm-6">
<xsl:call-template name="splitform_sidebar" />
</div>
</div>

<xsl:call-template name="splitform_footer" />
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<xsl:apply-templates select="splitforms" />
<xsl:apply-templates select="submit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
