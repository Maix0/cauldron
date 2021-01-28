<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../../banshee/main.xslt" />

<!--
//
//  Game template
//
//-->
<xsl:template match="game">
<!-- Menu -->
<div class="menu">
<div class="btn-group">
<xsl:if test="map/type='video'"><button onClick="javascript:$('video').get(0).play()" class="btn btn-default btn-xs">Play</button></xsl:if>
<a href="/cms/map" class="btn btn-default btn-xs">Back</a>
</div>
</div>
<!-- Play area -->
<div class="playarea" game_id="{@id}" map_id="{map/@id}" dm="{@dm}" grid_cell_size="{@grid_cell_size}" name="{characters/@name}">
<xsl:if test="characters/@mine"><xsl:attribute name="my_char"><xsl:value-of select="characters/@mine" /></xsl:attribute></xsl:if>
<div>
<xsl:if test="map/type='image'"><xsl:attribute name="style">background-image:url(<xsl:value-of select="map/url" />); background-size:<xsl:value-of select="map/width" />px <xsl:value-of select="map/height" />px; width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute></xsl:if>
<xsl:if test="map/type='video'"><video width="{map/width}" height="{map/height}" autoplay="true" loop="true"><source src="{map/url}"></source></video></xsl:if>
<!-- Tokens -->
<xsl:for-each select="tokens/token">
<div id="token{instance_id}" class="token" style="left:{pos_x}px; top:{pos_y}px; display:none;" is_hidden="{hidden}" rotation_point="{rotation_point}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}" name="{name}">
<img src="/files/tokens/{@id}.{extension}" style="width:{width}px; height:{height}px; transform:rotate({rotation}deg);" />
</div>
</xsl:for-each>
<!-- Characters -->
<xsl:for-each select="characters/character">
<div id="character{instance_id}" class="character" style="left:{pos_x}px; top:{pos_y}px;" is_hidden="{hidden}" hitpoints="{hitpoints}" damage="{damage}">
<img src="/files/portraits/{@id}.{extension}" style="width:{width}px; height:{height}px;" />
<span><xsl:value-of select="name" /></span>
</div>
</xsl:for-each>
</div>
</div>
<!-- Right bar -->
<div class="library">
<xsl:for-each select="library/token">
<div class="well well-sm">
<img src="/files/tokens/{@id}.{extension}" style="max-width:{../../@grid_cell_size}px; max-height:{../../@grid_cell_size}px;" class="icon" token_id="{@id}" obj_width="{width}" obj_height="{height}" />
<div><xsl:value-of select="name" /></div>
<div>Width: <xsl:value-of select="width" /></div>
<div>Height: <xsl:value-of select="height" /></div>
</div>
</xsl:for-each>
</div>
<div class="sidebar">
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1><xsl:value-of select="/output/layout/title/@page" /></h1>
<xsl:apply-templates select="game" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
