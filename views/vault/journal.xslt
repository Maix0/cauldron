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
<form action="/{/output/page}" method="post" class="game-selector">
<input type="hidden" name="submit_button" value="Change game" />
<select name="game" class="form-control" onChange="javascript:submit()">
<xsl:for-each select="games/game">
<option value="{@id}"><xsl:if test="@selected='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</form>

<table class="table table-condensed table-striped table-hover">
<thead>
<tr>
<th>Player</th><th>Timestamp</th><th>Entry</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="journal/entry">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="fullname" /></td>
<td><xsl:value-of select="timestamp" /></td>
<td><xsl:value-of select="content" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group">
<a href="/{/output/page}/new" class="btn btn-default">New entry</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>The journal entries that have been added during a game session can be edited or removed here.</p>
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
<xsl:if test="entry/game_id">
<input type="hidden" name="game_id" value="{entry/game_id}" />
</xsl:if>
<xsl:if test="entry/@id">
<input type="hidden" name="id" value="{entry/@id}" />
</xsl:if>

<label for="content">Player:</label>
<input type="input" readonly="readonly" name="fullname" value="{entry/fullname}" class="form-control" />
<label for="content">Entry:</label>
<textarea id="content" name="content" class="form-control"><xsl:value-of select="entry/content" /></textarea>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save entry" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="entry/@id">
<input type="submit" name="submit_button" value="Delete entry" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
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
<img src="/images/icons/journal.png" class="title_icon" />
<h1>Journal entries</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
