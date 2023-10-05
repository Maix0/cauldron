<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="banshee/pagination.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<form action="/{/output/page}" method="post" class="search">
<div class="input-group">
<input type="text" id="search" name="search" value="{@search}" class="form-control" placeholder="Search" />
<span class="input-group-btn">
<input type="button" class="btn btn-default" value="x" onClick="javascript:$('input#search').val(''); submit();" />
</span>
</div>
<input type="hidden" name="submit_button" value="search" />
</form>

<table class="table table-condensed table-striped table-hover">
<thead>
<tr>
<th><a href="?order=yyy">YYY</a></th>
</tr>
</thead>
<tbody>
<xsl:for-each select="XXXs/XXX">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="XXX" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="right">
<xsl:apply-templates select="pagination" />
</div>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New XXX</a>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="XXX/@id">
<input type="hidden" name="id" value="{XXX/@id}" />
</xsl:if>

<label for="YYY">...:</label>
<input type="text" id="YYY" name="YYY" value="{XXX/...}" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Save XXX" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="XXX/@id">
<input type="submit" name="submit_button" value="Delete XXX" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Page title</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
