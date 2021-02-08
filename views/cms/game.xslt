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
<tr><th>Title</th><th>Players</th></tr>
</thead>
<tbody>
<xsl:for-each select="games/game">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="title" /></td>
<td><xsl:value-of select="players" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New game</a>
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
<xsl:if test="game/@id">
<input type="hidden" name="id" value="{game/@id}" />
</xsl:if>

<label for="title">Title:</label>
<input type="text" id="title" name="title" value="{game/title}" class="form-control" />

<xsl:if test="count(characters/user)>0">
<label for="title">Characters:</label>
<div class="row">
<xsl:for-each select="characters/user">
<div class="col-xs-6 col-sm-4 col-md-3">
<div class="panel panel-default">
<div class="panel-heading"><xsl:value-of select="@name" /></div>
<div class="panel-body">
<xsl:for-each select="character">
<div><input type="checkbox" name="characters[]" value="{@id}"><xsl:if test="@checked='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
</div>
</div>
</xsl:for-each>
</div>
</xsl:if>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save game" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="game/@id">
<input type="submit" name="submit_button" value="Delete game" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
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
<h1>Game administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
