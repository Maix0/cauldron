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
//  List template
//
//-->
<xsl:template match="list">
<table class="table table-striped table-xs list">
<thead class="table-xs">
<tr><th>Title</th><th>Adventure</th><th>Begin</th><th>End</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="appointment">
<tr>
<td><span class="table-xs">Title</span><xsl:value-of select="title" /></td>
<td><span class="table-xs">Adventure</span><xsl:value-of select="adventure" /></td>
<td><span class="table-xs">Begin</span><xsl:value-of select="begin" /></td>
<td><span class="table-xs">End</span><xsl:value-of select="end" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group">
<a href="/{/output/page}" class="btn btn-default">Back</a>
</div>
</xsl:template>

<!--
//
//  Month template
//
//-->
<xsl:template match="month">
<div class="row">
<div class="col-sm-4"><h2><xsl:value-of select="@title" /></h2></div>
<div class="col-sm-8"><div class="btn-group btn-responsive">
	<a href="/{/output/page}/list" class="btn btn-xs btn-primary">List view</a>
	<a href="/{/output/page}/{prev}" class="btn btn-xs btn-primary">Previous month</a>
	<a href="/{/output/page}" class="btn btn-xs btn-primary">Current month</a>
	<a href="/{/output/page}/{next}" class="btn btn-xs btn-primary">Next month</a>
</div></div>
</div>

<table class="month" cellspacing="0">
<thead>
<tr>
<xsl:for-each select="days_of_week/day">
<th><xsl:value-of select="." /></th>
</xsl:for-each>
</tr>
</thead>
<tbody>
<xsl:for-each select="week">
	<tr class="week">
	<xsl:for-each select="day">
		<td class="day dow{@dow}{@today}">
			<div class="nr"><xsl:value-of select="@nr" /></div>
			<xsl:for-each select="appointment">
				<div class="appointment" begin="{@begin}" end="{@end}" adventure="{@adventure}" onClick="javascript:show_appointment(this)"><img src="/images/d10.png" class="dice" /><xsl:value-of select="." /></div>
			</xsl:for-each>
		</td>
	</xsl:for-each>
	</tr>
</xsl:for-each>
</tbody>
</table>
</xsl:template>

<!--
//
//  Appointment template
//
//-->
<xsl:template match="appointment">
<div class="appointment">
<h2><xsl:value-of select="title" /></h2>
<h3><span><xsl:value-of select="begin" /></span><xsl:if test="end!=''"><span><xsl:value-of select="end" /></span></xsl:if></h3>
<p>Adventure: <xsl:value-of disable-output-escaping="yes" select="adventure" /></p>
</div>

<div class="btn-group">
<a href="/{/output/page}" class="btn btn-default">Back</a>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Agenda</h1>
<xsl:apply-templates select="list" />
<xsl:apply-templates select="month" />
<xsl:apply-templates select="appointment" />
<xsl:apply-templates select="result" />
<div id="help">
<p>The Dungeon Master can schedule sessions using this agenda. You can add this agenda to the agenda in your mobile phone via this iCal link:</p>
<p><a href="{link}" target="_blank"><xsl:value-of select="link" /></a></p>
</div>
</xsl:template>

</xsl:stylesheet>
