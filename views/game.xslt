<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="includes/cauldron.xslt" />

<!--
//
//  Games template
//
//-->
<xsl:template match="games">
<xsl:if test="count(game)=0">
<p>No games available yet.</p>
<xsl:if test="@is_dm='yes'">
<p>If this is your first time using Cauldron, read the <a href="/manual">online manual</a> first.</p>
<p>Create a game by clicking the <a href="/cms">CMS</a> link in the top menu bar and then the Games icon.</p>
<p>Add maps to your game via the Maps icon.</p>
</xsl:if>
</xsl:if>
<div class="row">
<xsl:for-each select="game">
<div class="col-sm-6">
<div class="well" style="background-image:url({image})">
<h2><xsl:value-of select="title" /></h2>
<span>Dungeon Master: <xsl:value-of select="dm" /></span>
<div class="btn-group">
<xsl:if test="story!=''"><button class="btn btn-primary btn-sm" onClick="javascript:show_story({@id})">Introduction</button></xsl:if>
<xsl:if test="(access='yes' or dm_id=/output/user/@id) and type='play'"><a href="/{/output/page}/{@id}" class="btn btn-success btn-sm">Start game</a></xsl:if>
<xsl:if test="type='spectate'"><a href="/spectate/{@id}" class="btn btn-success btn-sm">Spectate game</a></xsl:if>
</div>
</div>
</div>
</xsl:for-each>
</div>

<div class="overlay stories" onClick="javascript:close_story()">
<xsl:for-each select="game">
<div id="story{@id}" class="panel panel-primary story" onClick="javascript:event.stopPropagation()">
<div class="panel-heading"><xsl:value-of select="title" /><span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:close_story()"></span></div>
<div class="panel-body"><xsl:value-of disable-output-escaping="yes" select="story" /></div>
</div>
</xsl:for-each>
</div>
</xsl:template>

<!--
//
//  Game template
//
//-->
<xsl:template match="game">
<div class="loading"><span>Loading...</span></div>
<!-- Menu -->
<div class="menu">
<span id="infobar"></span>
<xsl:if test="maps">
<select class="form-control map-selector" onChange="javascript:change_map()">
<xsl:if test="traveled_from"><xsl:attribute name="style">display:none</xsl:attribute></xsl:if>
<xsl:for-each select="maps/map"><option value="{@id}"><xsl:if test="@current='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option></xsl:for-each>
</select>
</xsl:if>
<!--
<div class="btn-group zoom">
<button class="btn btn-default btn-xs" onClick="javascript:zoom_in()">+</button>
<button class="btn btn-default btn-xs" onClick="javascript:zoom_playarea(1)">o</button>
<button class="btn btn-default btn-xs" onClick="javascript:zoom_out()">-</button>
</div>
//-->
<div class="btn-group">
<button class="btn btn-default btn-xs" onClick="javascript:journal_show()">Journal</button>
<xsl:if test="map/dm_notes!=''">
<button class="btn btn-default btn-xs" onClick="javascript:$('div.notes').show()">DM notes</button>
</xsl:if>
<button class="btn btn-default btn-xs" onClick="javascript:collectables_show()">Inventory</button>
<button class="btn btn-default btn-xs" onClick="javascript:center_character(this)">Center character</button>
<xsl:if test="map/type='video'"><button id="playvideo" onClick="javascript:$('video').get(0).play();" class="btn btn-default btn-xs">Play video</button></xsl:if>
<a href="/{/output/page}" class="btn btn-default btn-xs">Back</a>
</div>
</div>
<xsl:if test="not(map)">
<input id="game_id" type="hidden" name="game_id" value="{@id}" />
<p class="nomap">This game has no maps yet. <xsl:if test="@is_dm='yes' and not(maps)">Add maps to your game via the <a href="/cms/map">CMS Map Administration</a> page.</xsl:if></p>
</xsl:if>
<!-- Windows -->
<xsl:if test="map">
<div class="windows">
<!-- Journal -->
<div class="journal overlay" onClick="javascript:$(this).hide()">
<div class="panel panel-info" onClick="javascript:event.stopPropagation()">
<div class="panel-heading">Journal<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$('div.journal').hide()"></span></div>
<div class="panel-body">
<div class="entries">
<xsl:for-each select="journal/entry">
<xsl:if test="session"><div class="session"><xsl:value-of select="session" /></div></xsl:if>
<xsl:if test="content"><div class="entry"><span class="writer"><xsl:value-of select="writer" /></span><span class="content"><xsl:value-of select="content" /></span></div></xsl:if>
</xsl:for-each>
</div>
<div class="row">
<div class="col-xs-10"><textarea class="form-control"></textarea></div>
<div class="col-xs-2"><button onClick="javascript:journal_write()" class="btn btn-default">Add</button></div>
</div>
</div>
</div>
</div>
<!-- DM notes -->
<xsl:if test="map/dm_notes!=''">
<div class="notes overlay" onClick="javascript:$(this).hide()">
<div class="panel panel-danger" onClick="javascript:event.stopPropagation()">
<div class="panel-heading">DM notes<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$('div.notes').hide()"></span></div>
<div class="panel-body"><xsl:value-of disable-output-escaping="yes" select="map/dm_notes" /></div>
</div>
</div>
</xsl:if>
<!-- Conditions -->
<div class="conditions">
<xsl:for-each select="conditions/condition">
<div con_id="{@id}"><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
<!-- Collectables -->
<div class="collectables overlay" onClick="javascript:$(this).hide()">
<div class="panel panel-success" onClick="javascript:event.stopPropagation()">
<div class="panel-heading">Inventory<span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$('div.collectables').hide()"></span></div>
<div class="panel-body"></div>
</div>
</div>
<!-- Script -->
<xsl:call-template name="script_editor" />
<xsl:call-template name="script_manual" />
<!-- Zone create -->
<xsl:call-template name="zone_create" />
<!-- Effects -->
<div class="effect_create overlay" onClick="javascript:$(this).hide()">
<div class="panel panel-default" onClick="javascript:event.stopPropagation();">
<div class="panel-heading">Effects<span class="size">width: <input id="effect_width" type="number" value="1" /> height: <input id="effect_height" type="number" value="1" /></span><span class="glyphicon glyphicon-remove close" aria-hidden="true" onClick="javascript:$('div.effect_create').hide()"></span></div>
<div class="panel-body">
<xsl:for-each select="effects/effect">
<img src="/{.}" title="{@name}" style="width:{../../@grid_cell_size}px; height:{../../@grid_cell_size}px;" class="effect" onClick="javascript:effect_create($(this))" /><xsl:text>
</xsl:text></xsl:for-each>
</div>
</div>
</div>
</div>
<!-- Play area -->
<div class="playarea" version="{/output/cauldron/version}" ws_host="{websocket/host}" ws_port="{websocket/port}" group_key="{@group_key}" game_id="{@id}" map_id="{map/@id}" user_id="{/output/user/@id}" resources_key="{/output/cauldron/resources_key}" is_dm="{@is_dm}" grid_cell_size="{@grid_cell_size}" show_grid="{map/show_grid}" drag_character="{map/drag_character}" fog_of_war="{map/fog_of_war}" fow_distance="{map/fow_distance}" name="{characters/@name}">
<xsl:if test="characters/@mine"><xsl:attribute name="my_char"><xsl:value-of select="characters/@mine" /></xsl:attribute></xsl:if>
<xsl:if test="map/audio!=''"><xsl:attribute name="audio"><xsl:value-of select="map/audio" /></xsl:attribute></xsl:if>
<div>
<xsl:if test="map/type='image'"><xsl:attribute name="style">background-image:url(<xsl:value-of select="map/url" />); background-size:<xsl:value-of select="map/width" />px <xsl:value-of select="map/height" />px; width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute></xsl:if>
<xsl:if test="map/type='video'"><xsl:attribute name="style">width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute>
<video width="{map/width}" height="{map/height}" autoplay="true" loop="true"><source src="{map/url}" /></video><xsl:text>
</xsl:text></xsl:if>
<!-- Grid -->
<div class="grid"><div class="glass" style="width:{map/width}px; height:{map/height}px" /></div>
<!-- Zones -->
<div class="zones">
<xsl:for-each select="zones/zone">
<div id="zone{@id}" class="zone" altitude="{altitude}" style="left:{pos_x}px; top:{pos_y}px; background-color:{color}; width:{width}px; height:{height}px; opacity:{opacity};"><xsl:if test="group!=''"><xsl:attribute name="group"><xsl:value-of select="group" /></xsl:attribute></xsl:if><xsl:if test="script!=''"><div class="script"><xsl:value-of select="script" /></div></xsl:if></div>
</xsl:for-each>
</div>
<!-- Walls -->
<div class="walls">
<xsl:for-each select="walls/wall">
<div id="wall{@id}" class="wall" pos_x="{pos_x}" pos_y="{pos_y}" length="{length}" direction="{direction}" transparent="{transparent}" />
</xsl:for-each>
</div>
<!-- Doors -->
<div class="doors">
<xsl:for-each select="doors/door">
<div id="door{@id}" class="door" pos_x="{pos_x}" pos_y="{pos_y}" length="{length}" direction="{direction}" state="{state}" />
</xsl:for-each>
</div>
<!-- Lights -->
<div class="lights">
<xsl:for-each select="lights/light">
<div id="light{@id}" class="light" radius="{radius}" state="{state}" style="left:{pos_x}px; top:{pos_y}px; width:{../../@grid_cell_size}px; height:{../../@grid_cell_size}px;" />
</xsl:for-each>
</div>
<!-- Effects -->
<div class="effects"></div>
<!-- Tokens -->
<div class="tokens">
<xsl:for-each select="tokens/token">
<div id="token{instance_id}" class="token" style="left:{pos_x}px; top:{pos_y}px; display:none;" type="{type}" is_hidden="{hidden}" rotation="{rotation}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}">
<xsl:if test="c_id!='' and c_found='no'">
<xsl:attribute name="c_id"><xsl:value-of select="c_id" /></xsl:attribute>
<xsl:attribute name="c_name"><xsl:value-of select="c_name" /></xsl:attribute>
<xsl:attribute name="c_src"><xsl:value-of select="c_src" /></xsl:attribute>
<xsl:attribute name="c_hide"><xsl:value-of select="c_hide" /></xsl:attribute>
</xsl:if>
<xsl:if test="perc">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
</xsl:if>
<img src="/resources/{/output/cauldron/resources_key}/tokens/{@id}.{extension}" title="token{instance_id}" style="width:{width}px; height:{height}px;" />
<xsl:if test="name!=''">
<span><xsl:value-of select="name" /></span>
</xsl:if>
</div>
</xsl:for-each>
</div>
<!-- Shape change -->
<div class="shape_change">
<xsl:for-each select="shape_change/token">
<div shape_id="{@id}" size="{size}" extension="{extension}" ><xsl:value-of select="name" /></div>
</xsl:for-each>
</div>
<!-- Characters -->
<div class="characters">
<xsl:for-each select="characters/character">
<div id="character{instance_id}" char_id="{@id}" class="character" style="left:{pos_x}px; top:{pos_y}px;" is_hidden="{hidden}" rotation="{rotation}" initiative="{initiative}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
<img src="/resources/{/output/cauldron/resources_key}/{src}" orig_src="{orig_src}" style="width:{width}px; height:{height}px;" />
<span class="name"><xsl:value-of select="name" /></span>
</div>
</xsl:for-each>
</div>
<!-- Fog of war -->
<div class="fog_of_war"></div>
<!-- Markers -->
<div class="markers"></div>
</div>
<!-- Alternate icons -->
<div class="alternates">
<xsl:for-each select="alternates/alternate">
<div icon_id="{@id}" size="{size}" filename="{filename}"><xsl:value-of select="name" /></div>
</xsl:for-each>
</div>
</div>
<!-- Right bar -->
<div class="sidebar">
</div>
<div class="input">
<input type="text" class="form-control" placeholder="Enter command" />
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
