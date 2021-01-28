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
//  Overview template
//
//-->
<xsl:template match="overview">
<div class="access">
<table class="table table-striped table-condensed table-xs">
<thead class="table-xs">
<tr><th class="user">User</th>
<xsl:for-each select="roles/role">
	<th class="access"><xsl:value-of select="." /></th>
</xsl:for-each>
</tr>
</thead>
<tbody>
<xsl:for-each select="users/user">
	<tr><td><span class="table-xs">User</span><xsl:value-of select="@name" /></td>
	<xsl:for-each select="role">
		<td class="access">
		<span class="table-xs">
			<xsl:variable name="position" select="position()" />
			<xsl:value-of select="../../../roles/role[position()=$position]" />
		</span>
		<xsl:choose>
			<xsl:when test=".=0">
				<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
			</xsl:when>
			<xsl:otherwise>
				<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>
			</xsl:otherwise>
		</xsl:choose>
		</td>
	</xsl:for-each>
	</tr>
</xsl:for-each>
</tbody>
</table>
</div>

<h2>Modules</h2>
<div class="access">
<table class="table table-striped table-condensed table-xs">
<thead class="table-xs">
<tr><th class="module">Module</th>
<xsl:for-each select="roles/role">
	<th class="access"><xsl:value-of select="." /></th>
</xsl:for-each>
</tr>
</thead>
<tbody>
<xsl:for-each select="modules/module">
	<tr><td><span class="table-xs">Module</span><xsl:value-of select="@url" /></td>
	<xsl:for-each select="access">
		<td class="access">
		<span class="table-xs">
			<xsl:variable name="position" select="position()" />
			<xsl:value-of select="../../../roles/role[position()=$position]" />
		</span>
		<xsl:choose>
			<xsl:when test=".=0">
				<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
			</xsl:when>
			<xsl:otherwise>
				<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>
			</xsl:otherwise>
		</xsl:choose>
		</td>
	</xsl:for-each>
	</tr>
</xsl:for-each>
</tbody>
</table>
</div>

<xsl:if test="pages/page">
	<h2>Pages</h2>
	<div class="access">
	<table class="table table-striped table-condensed table-xs">
	<thead class="table-xs">
	<tr><th class="module">URL</th>
	<xsl:for-each select="roles/role">
		<th class="access"><xsl:value-of select="." /></th>
	</xsl:for-each>
	</tr>
	</thead>
	<tbody>
	<xsl:for-each select="pages/page">
		<tr><td><span class="table-xs">URL:</span><xsl:value-of select="@url" /></td>
		<xsl:for-each select="access">
			<td class="access">
			<span class="table-xs">
				<xsl:variable name="position" select="position()" />
				<xsl:value-of select="../../../roles/role[position()=$position]" />:
			</span>
			<xsl:choose>
				<xsl:when test=".=0">
					<span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
				</xsl:when>
				<xsl:otherwise>
					<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>
				</xsl:otherwise>
			</xsl:choose>
			</td>
		</xsl:for-each>
		</tr>
	</xsl:for-each>
	</tbody>
	</table>
	</div>
</xsl:if>

<div class="btn-group">
<a href="/cms" class="btn btn-default">Back</a>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/access.png" class="title_icon" />
<h1>Access overview</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
