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
<xsl:import href="functions.xslt" />
<xsl:import href="layout_cauldron.xslt" />
<xsl:import href="layout_adventure.xslt" />

<xsl:output method="html" doctype-system="about:legacy-compat" />

<xsl:template match="/output">
<xsl:apply-templates select="layout" />
</xsl:template>

</xsl:stylesheet>
