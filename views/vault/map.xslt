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
<tr><th>Title</th></tr>
</thead>
<tbody>
<xsl:for-each select="maps/map">
<tr class="click">
<td onClick="javascript:document.location='/{/output/page}/arrange/{@id}'"><xsl:value-of select="title" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New map</a>
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
<xsl:if test="map/@id">
<input type="hidden" name="id" value="{map/@id}" />
</xsl:if>
<input type="hidden" name="grid_size" value="{map/grid_size}" />
<input type="hidden" name="mode" value="{map/mode}" />
<xsl:if test="map/show_grid='yes'"><input type="hidden" name="show_grid" value="on" /></xsl:if>

<label for="title">Map title:</label>
<input type="text" id="title" name="title" value="{map/title}" class="form-control" />
<label for="url">Map image/video URL:</label>
<div class="input-group">
<input type="text" id="url" name="url" value="{map/url}" class="form-control" onKeyDown="javascript:reset_dimension()" />
<span class="input-group-btn"><input type="button" value="Browse resources" class="btn btn-default browser" /></span>
</div>
<label for="audio">Background audio URL (optional):</label>
<input type="text" id="audio" name="audio" value="{map/audio}" class="form-control" />
<label for="width">Width:</label>
<input type="text" id="width" name="width" value="{map/width}" placeholder="Leave empty for automatic detection" class="form-control" />
<label for="height">Height:</label>
<input type="text" id="height" name="height" value="{map/height}" placeholder="Leave empty for automatic detection" class="form-control" />
<div><b>Players can drag own character:</b><input type="checkbox" name="drag_character"><xsl:if test="map/drag_character='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
<label for="url">Fog of war:</label>
<select name="fog_of_war" class="form-control">
<xsl:for-each select="fog_of_war/type">
<option value="{@value}"><xsl:if test="@value=../../map/fog_of_war"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
<label for="fow_distance">Default nightly Fog of War distance:</label>
<input type="text" id="fow_distance" name="fow_distance" value="{map/fow_distance}" class="form-control" />
<label for="dm_notes">Dungeon Master notes:</label>
<textarea id="dm_notes" name="dm_notes" class="form-control"><xsl:value-of select="map/dm_notes" /></textarea>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save map" class="btn btn-default" />
<xsl:if test="not(map/@id)">
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
</xsl:if>
<xsl:if test="map/@id">
<a href="/{/output/page}/arrange/{map/@id}" class="btn btn-default">Cancel</a>
</xsl:if>
<xsl:if test="map/@id">
<input type="submit" name="submit_button" value="Delete map" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<div id="help">
<p>This is where you add a map to your game. Specify at least the title of your map and the URL to the map image or video.</p>
<p>The map image/video URL can point to a resource at another website. Click the 'Browse resources' to list all the available maps in the '<a href="/vault/resources/maps">maps</a>' directory in your Resources section.</p>
</div>
</xsl:template>

<!--
//
//  Grid template
//
//-->
<xsl:template match="grid">
<form action="/{/output/page}" method="post">
<input type="hidden" name="id" value="{@id}" />
<input type="hidden" name="url" value="{url}" />
<input type="hidden" name="mode" value="{mode}" />

<label>Grid size:</label>
<div id="slider"><div id="grid-handle" class="ui-slider-handle" /></div>
<input type="hidden" name="grid_size" value="{grid_size}" />
<div><b>Possible grid sizes:</b><span class="sizes"></span></div>
<div><b>Show grid on map:</b><input type="checkbox" name="show_grid"><xsl:if test="show_grid='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input> (will not be red, but semi-transparent black)</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Set grid size" class="btn btn-default" />
<a href="/{/output/page}/arrange/{@id}" class="btn btn-default">Cancel</a>
</div>
<xsl:if test="type='video'">
<div class="btn-group right">
<input type="button" value="Play video" onClick="javascript:$('video').get(0).play();" class="btn btn-default" />
</div>
</xsl:if>
</form>

<div class="playarea">
<div class="map" style="width:{width}px; height:{height}px;">
<xsl:if test="type='image'"><img src="{url}" class="map" /></xsl:if>
<xsl:if test="type='video'"><video width="{width}" height="{height}" loop="true" class="map"><source src="{url}" /></video></xsl:if>
</div>
<div class="grid"></div>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/map.png" class="title_icon" />
<h1>Game maps</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="grid" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
