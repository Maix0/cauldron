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
<tr><th>Title</th><th></th></tr>
</thead>
<tbody>
<xsl:for-each select="maps/map">
<tr class="click">
<td onClick="javascript:document.location='/{/output/page}/arrange/{@id}'"><xsl:value-of select="title" /></td>
<td><button class="btn btn-primary btn-xs" onClick="javscript:document.location='/{/output/page}/{@id}'">Edit</button></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New map</a>
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
<xsl:if test="map/@id">
<input type="hidden" name="id" value="{map/@id}" />
</xsl:if>

<label for="title">Title:</label>
<input type="text" id="title" name="title" value="{map/title}" class="form-control" />
<label for="url">Image/video URL:</label>
<div class="input-group">
<input type="text" id="url" name="url" value="{map/url}" class="form-control" />
<span class="input-group-btn"><input type="button" value="Local maps" class="btn btn-default" onClick="javascript:browse_local()" /></span>
</div>
<label for="url">Map type:</label>
<select name="type" class="form-control">
<xsl:for-each select="map_types/type">
<option><xsl:if test=".=../../map/type"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
<label for="audio">Background audio URL:</label>
<input type="text" id="audio" name="audio" value="{map/audio}" class="form-control" />
<label for="width">Width:</label>
<input type="text" id="width" name="width" value="{map/width}" placeholder="For image map, leave empty for automatic detection" class="form-control" />
<label for="height">Height:</label>
<input type="text" id="height" name="height" value="{map/height}" placeholder="For image map, leave empty for automatic detection" class="form-control" />
<label for="grid_size">Grid size:</label>
<input type="text" id="grid_size" name="grid_size" value="{map/grid_size}" class="form-control" />
<div><b>Show grid:</b><input type="checkbox" name="show_grid"><xsl:if test="map/show_grid='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
<div><b>Players can drag own character:</b><input type="checkbox" name="drag_character"><xsl:if test="map/drag_character='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
<label for="dm_notes">Notes:</label>
<textarea id="dm_notes" name="dm_notes" class="form-control"><xsl:value-of select="map/dm_notes" /></textarea>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save map" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="map/@id">
<input type="submit" name="submit_button" value="Delete map" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Arrange template
//
//-->
<xsl:template match="arrange">
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/map.png" class="title_icon" />
<h1>Map administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="arrange" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
