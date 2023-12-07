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
<table class="table table-condensed table-striped table-hover groups">
<thead>
<tr>
<th>Name</th>
<th>Users</th>
<th>Characters</th>
<th>Tokens</th>
<th>Adventures</th>
<th>Maps</th>
<th>Tokens placed</th>
<th>Space (MB)</th>
<th>Days idle</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="organisations/organisation">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
<td><xsl:value-of select="users" /></td>
<td><xsl:value-of select="characters" /></td>
<td><xsl:value-of select="tokens" /></td>
<td><xsl:value-of select="adventures" /></td>
<td><xsl:value-of select="maps" /></td>
<td><xsl:value-of select="placed" /></td>
<td><xsl:value-of select="max_resources" /></td>
<td><xsl:value-of select="idle" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="right">
<xsl:apply-templates select="pagination" />
</div>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New group</a>
<a href="/vault" class="btn btn-default">Back</a>
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
<label for="max_resources">Max resource capacity:</label>
<div class="input-group">
	<span class="input-group-addon"><xsl:value-of select="organisation/usage" /> /</span>
	<input type="text" id="max_resources" name="max_resources" value="{organisation/max_resources}" class="form-control" />
	<span class="input-group-addon">MB</span>
</div>
<label for="name">Resources key:</label>
<input type="text" id="resources_key" readonly="readonly" value="{organisation/resources_key}" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Save group" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="organisation/@id">
<input type="submit" name="submit_button" value="Delete group" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<h4>Users within this group:</h4>
<table class="table table-striped table-condensed table-hover users">
<thead>
<tr><th>Name</th><th>E-mail address</th><th>DM</th></tr>
</thead>
<tbody>
<xsl:for-each select="users/user">
<tr onClick="javascript:location='/vault/user/{@id}'">
<td><xsl:value-of select="fullname" /></td>
<td><xsl:value-of select="email" /></td>
<td><xsl:value-of select="dm" /></td>
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
<h1>Group administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
