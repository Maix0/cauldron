<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />
<xsl:import href="../banshee/pagination.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<table class="table table-condensed table-striped table-hover">
<thead>
<tr>
<th>Name</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="organisations/organisation">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="right">
<xsl:apply-templates select="pagination" />
</div>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New organisation</a>
<a href="/cms" class="btn btn-default">Back</a>
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
<xsl:if test="organisation/@id">
<input type="hidden" name="id" value="{organisation/@id}" />
</xsl:if>

<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{organisation/name}" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Save organisation" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="organisation/@id">
<input type="submit" name="submit_button" value="Delete organisation" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<h4>Users for this organisation:</h4>
<table class="table table-striped table-condensed table-hover">
<thead>
<tr><th>Name</th><th>E-mail address</th></tr>
</thead>
<tbody>
<xsl:for-each select="users/user">
<tr onClick="javascript:location='/cms/user/{@id}'">
<td><xsl:value-of select="fullname" /></td>
<td><xsl:value-of select="email" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/organisations.png" class="title_icon" />
<h1>Organisation administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
