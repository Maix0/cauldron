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
<xsl:stylesheet	version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="layout[@name='site']">
<html lang="{language}">

<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<meta name="author" content="AUTHOR" />
<meta name="publisher" content="PUBLISHER" />
<meta name="copyright" content="COPYRIGHT" />
<meta name="description" content="{description}" />
<meta name="keywords" content="{keywords}" />
<meta name="generator" content="Banshee PHP framework v{/output/banshee/version} (https://www.banshee-php.org/)" />
<meta name="og:site_name" content="{title}" />
<meta name="og:title" content="{title/@page}" />
<meta name="og:description" content="{description}" />
<meta name="og:image" content="{/output/page/@base}/images/share.jpg" />
<meta name="og:url" content="{/output/page/@base}{/output/page/@url}" />
<meta name="twitter:site" content="{title}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="{title/@page}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{/output/page/@base}/images/share.jpg" />
<xsl:if test="/output/banshee/session_timeout">
<meta http-equiv="refresh" content="{/output/banshee/session_timeout}; url=/logout" />
</xsl:if>
<link rel="apple-touch-icon" href="/images/favicon.png" />
<link rel="icon" href="/images/favicon.png" />
<link rel="shortcut icon" href="/images/favicon.png" />
<title><xsl:if test="title/@page!='' and title/@page!=title"><xsl:value-of select="title/@page" /> - </xsl:if><xsl:value-of select="title" /></title>
<xsl:for-each select="alternates/alternate">
<link rel="alternate" title="{.}" type="{@type}" href="{@url}" />
</xsl:for-each>
<xsl:for-each select="styles/style">
<link rel="stylesheet" type="text/css" href="{.}" />
</xsl:for-each>
<xsl:if test="inline_css!=''">
<style type="text/css">
<xsl:value-of select="inline_css" />
</style>
</xsl:if>
<xsl:for-each select="javascripts/javascript">
<script type="text/javascript" src="{.}"></script><xsl:text>
</xsl:text></xsl:for-each>
</head>

<body>
<xsl:if test="javascripts/@onload">
	<xsl:attribute name="onLoad">javascript:<xsl:value-of select="javascripts/@onload" /></xsl:attribute>
</xsl:if>
<div class="wrapper">
	<div class="header">
		<div class="container">
			<div class="title"><xsl:value-of select="title" /></div>
		</div>
	</div>

	<nav class="navbar navbar-inverse">
		<div class="container">
			<div class="navbar-header">
				<xsl:if test="count(/output/menu/item)>0">
				<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
				</xsl:if>
			</div>

			<div id="navbar" class="collapse navbar-collapse">
				<ul class="nav navbar-nav">
				<xsl:for-each select="/output/menu/item">
				<li><a href="{link}" class="{class}"><xsl:value-of select="text" /></a></li>
				</xsl:for-each>
				</ul>
			</div>
		</div>
	</nav>

	<div class="content">
		<div class="container">
			<xsl:apply-templates select="/output/system_warnings" />
			<xsl:apply-templates select="/output/system_messages" />
			<xsl:apply-templates select="/output/content" />
		</div>
	</div>

	<div class="footer">
		<div class="container">
			<xsl:if test="/output/user">
			<span>Logged in as <a href="/profile"><xsl:value-of select="/output/user" /></a></span>
			<span><a href="/session">Session manager</a></span>
			</xsl:if>
			<span>Built upon the <a href="https://www.banshee-php.org/">Banshee PHP framework</a> v<xsl:value-of select="/output/banshee/version" /></span>
			<span><a href="/cms">CMS</a></span>
		</div>
	</div>

	<xsl:apply-templates select="/output/internal_errors" />
</div>
</body>

</html>
</xsl:template>

</xsl:stylesheet>
