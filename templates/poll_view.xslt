<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="banshee/poll.xslt" />

<xsl:template match="content">
<h1>Poll</h1>
<xsl:apply-templates select="poll" />
</xsl:template>

</xsl:stylesheet>
