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
<tr><th>ID</th><th>Title</th><th>Players</th><th>Access</th></tr>
</thead>
<tbody>
<xsl:for-each select="games/game">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="@id" /></td>
<td><xsl:value-of select="title" /></td>
<td><xsl:value-of select="players" /></td>
<td><xsl:value-of select="access" /></td>
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
<label for="image">Background image URL (optional):</label>
<input type="text" id="image" name="image" value="{game/image}" class="form-control" />
<label for="story">Introduction story (optional):</label>
<textarea id="story" name="story" class="form-control"><xsl:value-of select="game/story" /></textarea>
<label for="story">Access:</label>
<select id="access" name="access" class="form-control">
<xsl:for-each select="access/level">
<option value="{@value}"><xsl:if test="@value=../../game/access"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>

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
<img src="/images/icons/game.png" class="title_icon" />
<h1>Game administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
