<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="includes/cauldron.xslt" />

<!--
//
//  Adventures template
//
//-->
<xsl:template match="adventures">
<xsl:if test="count(adventure)=0">
<xsl:if test="@is_dm='no'">
<p>There are no adventures available yet.</p>
</xsl:if>
<xsl:if test="@is_dm='yes'">
<img src="/images/cauldron.png" class="cauldron" />
<p>This is the page where you and your players will see an overview of the adventures you have created. All that's needed to create an adventure is explained in the <a href="/manual">manual</a>, but here's a short list to make it even more easy to get you started.</p>
<ul>
<li>Go to the DM's Vault (see top menu bar) and click on the Adventures icon to create a new adventure.</li>
<li>Add one or more maps to your adventure.</li>
<li>Create accounts for your players via the <a href="/vault/user">DM's Vault Users section</a> or send them an <a href="/vault/invite">invite code</a> so they can create their account themselves.</li>
<li>Let your players create their own character.</li>
<li>Add those characters to your adventure via the <a href="/vault/players">DM's Vault Players section</a>.</li>
<li>Start the adventure and have fun!</li>
</ul>
<p><a href="/vault/adventure/new" class="btn btn-primary">Create your adventure!</a></p>
</xsl:if>
</xsl:if>
<div class="row">
<xsl:for-each select="adventure">
<div class="col-sm-6">
<div class="well" style="background-image:url({image})">
<h2><xsl:value-of select="title" /></h2>
<span>Dungeon Master: <xsl:value-of select="dm" /></span>
<div class="btn-group">
<xsl:if test="story!=''"><button class="btn btn-primary btn-sm show_story{@id}">Introduction</button></xsl:if>
<xsl:if test="(access='yes' or dm_id=/output/user/@id) and type='play'"><a href="/{/output/page}/{@id}" class="btn btn-success btn-sm">Start adventure</a></xsl:if>
<xsl:if test="type='spectate'"><a href="/spectate/{@id}" class="btn btn-success btn-sm">Spectate adventure</a></xsl:if>
</div>
</div>
</div>
</xsl:for-each>
</div>

<xsl:for-each select="adventure">
<div class="story" id="story{@id}" title="{title}" style="display:none"><xsl:value-of disable-output-escaping="yes" select="story" /></div>
</xsl:for-each>
</xsl:template>

<!--
//
//  Adventure template
//
//-->
<xsl:template match="adventure">
<!-- Menu -->
<div class="topbar">
<span id="infobar"></span>
<xsl:if test="map">
<div class="btn-group">
<button class="btn btn-primary btn-xs open_menu">Menu</button>
</div>
</xsl:if>
<div class="menu">
<div class="row">
<div class="col-sm-6">
<button class="btn btn-default btn-sm show_dice">Roll dice</button>
<button class="btn btn-default btn-sm show_journal">Journal</button>
<button class="btn btn-default btn-sm show_collectables">Inventory</button>
<xsl:if test="@is_dm='yes'">
<h2>Dungeon Master options</h2>
<xsl:if test="map/dm_notes!=''">
<button class="btn btn-default btn-sm show_dm_notes">DM notes</button>
</xsl:if>
<button class="btn btn-default btn-sm start_combat">Combat</button>
<button class="btn btn-default btn-sm play_audio">Audio</button>
</xsl:if>
</div>
<div class="col-sm-6">
<a href="/{/output/page}" class="btn btn-default btn-sm">Leave session</a>
<button id="center_char" class="btn btn-primary btn-sm center_character">Center character</button>
<button id="itfcol" class="btn btn-default btn-sm interface_color">Dark interface</button>
<xsl:if test="map/type='video'"><button class="btn btn-default btn-sm playvideo">Play video</button></xsl:if>
<xsl:if test="@is_dm='yes'">
<h2>Map switching</h2>
<select class="form-control map-selector">
<xsl:if test="traveled_from"><xsl:attribute name="style">display:none</xsl:attribute></xsl:if>
<xsl:for-each select="maps/map"><option value="{@id}"><xsl:if test="@current='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option></xsl:for-each>
</select>
<xsl:if test="map/type='image'">
<button class="btn btn-default btn-sm map_image">Change map image</button>
</xsl:if>
</xsl:if>
</div>
</div>
<xsl:if test="@is_dm='yes'">
<h2>Drawing</h2>
<div class="draw-explain">Hold CTRL to draw, SHIFT to erase and ALT to align to grid.</div>
<div class="draw-colors">
<span style="background-color:#000000"></span>
<span style="background-color:#808080"></span>
<span style="background-color:#ffffff"></span>
<span style="background-color:#804000"></span>
<span style="background-color:#ff0000"></span>
<span style="background-color:#ff8000"></span>
<span style="background-color:#ffff00"></span>
<span style="background-color:#00ff00"></span>
<span style="background-color:#00a000"></span>
<span style="background-color:#005000"></span>
<span style="background-color:#00ffff"></span>
<span style="background-color:#0000ff"></span>
<span style="background-color:#0000a0"></span>
<span style="background-color:#ff00ff"></span>
<span style="background-color:#800080"></span>
</div>
<div class="row">
<div class="col-sm-6">
<div id="draw_width"><div class="ui-slider-handle"></div></div>
</div>
<div class="col-sm-6">
<button id="draw_clear" class="btn btn-default btn-sm">Remove drawings</button>
</div>
</div>
</xsl:if>
</div>
</div>
<xsl:if test="not(map)">
<input id="adventure_id" type="hidden" name="adventure_id" value="{@id}" />
<p class="nomap">This adventure has no maps yet. <xsl:if test="@is_dm='yes'">Add maps to this adventure via the <a href="/vault/map">Dungeon Masters' Vault Map Administration</a> page.</xsl:if></p>
<div class="btn-group">
<a href="/adventure" class="btn btn-default">Back</a>
</div>
</xsl:if>
<!-- Windows -->
<xsl:if test="map">
<div class="loading"><span>Loading...</span></div>
<!-- Journal -->
<div class="journal" style="display:none">
<div class="entries">
<xsl:for-each select="journal/entry">
<xsl:if test="session"><div class="session"><xsl:value-of select="session" /></div></xsl:if>
<xsl:if test="content"><div class="entry"><span class="writer"><xsl:value-of select="writer" /></span><span class="content"><xsl:value-of select="content" /></span></div></xsl:if>
</xsl:for-each>
</div>
<div class="row">
<div class="col-xs-10"><textarea class="form-control"></textarea></div>
<div class="col-xs-2"><button class="btn btn-default journal_write">Add</button></div>
</div>
<!-- DM notes -->
<xsl:if test="map/dm_notes!=''">
<div class="dm_notes"><xsl:value-of disable-output-escaping="yes" select="map/dm_notes" /></div>
</xsl:if>
<!-- Conditions -->
<div class="conditions">
<xsl:for-each select="conditions/condition">
<div con_id="{@id}"><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
</div>
<!-- Script -->
<xsl:call-template name="script_editor" />
<xsl:call-template name="script_manual" />
<!-- Zone create -->
<xsl:call-template name="zone_create" />
<!-- Effects -->
<div class="effect_create" style="display:none">
<xsl:for-each select="effects/effect">
<img src="/{.}" title="{@name}" style="width:{../../@grid_cell_size}px; height:{../../@grid_cell_size}px;" class="effect" /><xsl:text>
</xsl:text></xsl:for-each>
</div>
<!-- Play area -->
<div class="playarea" version="{/output/cauldron/version}" ws_host="{websocket/host}" ws_port="{websocket/port}" group_key="{@group_key}" adventure_id="{@id}" map_id="{map/@id}" user_id="{/output/user/@id}" resources_key="{/output/cauldron/resources_key}" is_dm="{@is_dm}" grid_cell_size="{@grid_cell_size}" show_grid="{map/show_grid}" drag_character="{map/drag_character}" fog_of_war="{map/fog_of_war}" fow_distance="{map/fow_distance}" name="{characters/@name}">
<xsl:if test="characters/@mine"><xsl:attribute name="my_char"><xsl:value-of select="characters/@mine" /></xsl:attribute></xsl:if>
<xsl:if test="map/audio!=''"><xsl:attribute name="audio"><xsl:value-of select="map/audio" /></xsl:attribute></xsl:if>
<div id="map_background">
<xsl:if test="map/type='image'"><xsl:attribute name="style">background-image:url(<xsl:value-of select="map/url" />); background-size:<xsl:value-of select="map/width" />px <xsl:value-of select="map/height" />px; width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute></xsl:if>
<xsl:if test="map/type='video'"><xsl:attribute name="style">width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute>
<video width="{map/width}" height="{map/height}" autoplay="true" loop="true"><source src="{map/url}" /></video><xsl:text>
</xsl:text></xsl:if>
<!-- Night mode -->
<div class="night"></div>
<!-- Grid -->
<div class="grid"></div>
<!-- Drawing -->
<div class="drawing"></div>
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
<!-- Blinders -->
<div class="blinders">
<xsl:for-each select="blinders/blinder">
<div id="blinder{@id}" class="blinder" pos1_x="{pos1_x}" pos1_y="{pos1_y}" pos2_x="{pos2_x}" pos2_y="{pos2_y}" />
</xsl:for-each>
</div>
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
<span class="name"><xsl:value-of select="name" /></span>
</xsl:if>
</div>
</xsl:for-each>
</div>
<!-- Effects -->
<div class="effects"></div>
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
<xsl:if test="@is_dm='yes'">
<div class="filter"><input class="form-control" placeholder="Filter" /></div>
<div class="library">
<xsl:for-each select="library/token">
<div class="well well-sm">
<img src="/resources/{/output/cauldron/resources_key}/tokens/{@id}.{extension}" title="{name}" style="max-width:{../../@grid_cell_size}px; max-height:{../../@grid_cell_size}px;" class="icon" token_id="{@id}" obj_width="{width}" obj_height="{height}" armor_class="{armor_class}" hitpoints="{hitpoints}" />
<div class="name"><xsl:value-of select="name" /></div>
<div>Size: <xsl:value-of select="width" /> &#215; <xsl:value-of select="height" /></div>
<div>HP: <xsl:value-of select="hitpoints" /></div>
</div>
</xsl:for-each>
</div>
</xsl:if>
<div class="sidebar" name="{/output/user}"></div>
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
<xsl:apply-templates select="adventures" />
<xsl:apply-templates select="adventure" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
