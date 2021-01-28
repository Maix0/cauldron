<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Games template
//
//-->
<xsl:template match="games">
<table class="table table-striped table-hover">
<thead>
<tr><th>Title</th><th>Dungeon Master</th></tr>
</thead>
<tbody>
<xsl:for-each select="game">
<tr onClick="document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="title" /></td>
<td><xsl:value-of select="dm" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>
</xsl:template>

<!--
//
//  Game template
//
//-->
<xsl:template match="game">
<div class="menu">
<!-- Menu -->
<xsl:if test="maps">
<select class="form-control map-selector" onChange="javascript:change_map()">
<xsl:if test="traveled_from"><xsl:attribute name="style">display:none</xsl:attribute></xsl:if>
<xsl:for-each select="maps/map"><option value="{@id}"><xsl:if test="@current='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option></xsl:for-each>
</select>
</xsl:if>
<div class="btn-group">
<xsl:if test="map/type='video'"><button onClick="javascript:$('video').get(0).play()" class="btn btn-default btn-xs">Play</button></xsl:if>
<a href="/game" class="btn btn-default btn-xs">Back</a>
</div>
</div>
<xsl:if test="not(map)">
<input id="game_id" type="hidden" name="game_id" value="{@id}" />
<p>No map has been selected yet.</p>
</xsl:if>
<!-- Play area -->
<xsl:if test="map">
<div class="playarea" game_id="{@id}" map_id="{map/@id}" dm="{@dm}" grid_cell_size="{@grid_cell_size}" show_grid="{map/show_grid}" name="{characters/@name}">
<xsl:if test="characters/@mine"><xsl:attribute name="my_char"><xsl:value-of select="characters/@mine" /></xsl:attribute></xsl:if>
<div>
<xsl:if test="map/type='image'"><xsl:attribute name="style">background-image:url(<xsl:value-of select="map/url" />); background-size:<xsl:value-of select="map/width" />px <xsl:value-of select="map/height" />px; width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute></xsl:if>
<xsl:if test="map/type='video'"><xsl:attribute name="style">width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute>
<video width="{map/width}" height="{map/height}" autoplay="true" loop="true"><source src="{map/url}"></source></video></xsl:if>
<!-- Tokens -->
<xsl:for-each select="tokens/token">
<div id="token{instance_id}" class="token" style="left:{pos_x}px; top:{pos_y}px; display:none;" is_hidden="{hidden}" rotation_point="{rotation_point}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}">
<xsl:if test="perc">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
</xsl:if>
<img src="/files/tokens/{@id}.{extension}" style="width:{width}px; height:{height}px; transform:rotate({rotation}deg);" />
<xsl:if test="name!=''">
<span><xsl:value-of select="name" /></span>
</xsl:if>
</div>
</xsl:for-each>
<!-- Characters -->
<xsl:for-each select="characters/character">
<div id="character{instance_id}" char_id="{@id}" class="character" style="left:{pos_x}px; top:{pos_y}px;" is_hidden="{hidden}" initiative="{initiative}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
<img src="/files/portraits/{@id}.{extension}" style="width:{width}px; height:{height}px;" />
<span><xsl:value-of select="name" /></span>
</div>
</xsl:for-each>
</div>
</div>
<!-- Right bar -->
<div class="sidebar">
</div>
<div class="input">
<input type="text" class="form-control" />
</div>
</xsl:if>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1><xsl:value-of select="/output/layout/title/@page" /></h1>
<xsl:apply-templates select="games" />
<xsl:apply-templates select="game" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
