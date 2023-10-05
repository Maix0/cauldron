<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<!--
//
//  Adventures pulldown
//
//-->
<xsl:template match="adventures_pulldown">
<form action="/{/output/page}" method="post" class="adventures_pulldown">
<input type="hidden" name="submit_button" value="Change adventure" />
<select name="adventure" class="form-control" onChange="javascript:submit()">
<xsl:for-each select="adventure">
<option value="{@id}"><xsl:if test="@selected='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</form>
</xsl:template>

</xsl:stylesheet>
