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
<xsl:import href="../banshee/tablemanager.xslt" />

<xsl:template match="tablemanager/label">
<div class="labels">
<label>Key:</label>
<div class="form-control" disabled="disabled"><xsl:value-of select="key" /></div>
<label>Type:</label>
<div class="form-control" disabled="disabled"><xsl:value-of select="type" /></div>
</div>
</xsl:template>

<xsl:template match="content">
<xsl:apply-templates select="tablemanager" />
<xsl:apply-templates select="tablemanager/label" />
</xsl:template>

</xsl:stylesheet>
