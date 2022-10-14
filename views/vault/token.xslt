<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<div class="row filter">
<div class="col-md-3 col-sm-4 col-xs-6">
<div class="btn-group">
<a href="/{/output/page}/new" class="btn btn-default">New token</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>
</div>
<div class="col-md-9 col-sm-8 col-xs-6">
<input id="filter" type="text" placeholder="Filter tokens" class="form-control" onKeyUp="javascript:filter_tokens()" />
</div>
</div>

<div class="row">
<xsl:for-each select="tokens/token">
<div class="col-xs-12 col-sm-4 col-md-3 token">
<div class="well well-sm" onClick="javascript:document.location='/{/output/page}/{@id}'">
<img src="/resources/{/output/cauldron/resources_key}/tokens/{@id}.{extension}" title="{name}" class="icon" />
<div class="name"><xsl:value-of select="name" /></div>
<div>Size: <xsl:value-of select="width" /> &#215; <xsl:value-of select="height" /></div>
<div>Hit points: <xsl:value-of select="hitpoints" /></div>
</div>
</div>
</xsl:for-each>
</div>

<div id="help">
<p>Here you maintain your tokens, which can represent an NPC or a player's enemy. These tokens are available for all your adventures.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post" enctype="multipart/form-data">
<xsl:if test="token/@id">
<input type="hidden" name="id" value="{token/@id}" />
<input type="hidden" name="extension" value="{token/extension}" />
<img src="/resources/{/output/cauldron/resources_key}/tokens/{token/@id}.{token/extension}" class="token" />
</xsl:if>

<div class="row">
<div class="col-sm-6">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{token/name}" placeholder="The name of this NPC/monster/object." class="form-control" />
<label for="width">Width:</label>
<input type="text" id="width" name="width" value="{token/width}" class="form-control" />
<label for="height">Height:</label>
<input type="text" id="height" name="height" value="{token/height}" class="form-control" />
<label for="image">Image (make sure the token is facing down):</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="image" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name)" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>
<label for="armor_class">Default armor class:</label>
<input type="text" id="armor_class" name="armor_class" value="{token/armor_class}" class="form-control" />
<label for="hitpoints">Default hit points:</label>
<input type="text" id="hitpoints" name="hitpoints" value="{token/hitpoints}" class="form-control" />
<div><b>Available for shape change:</b><input type="checkbox" name="shape_change"><xsl:if test="token/shape_change='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
</div>
<div class="col-sm-6 monsters">
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save token" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="token/@id">
<input type="submit" name="submit_button" value="Delete token" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<div id="help">
<p>When a token is available for shape change, you can change a player's token into this appearance. Right-click a player's token and select 'Change shape'.</p>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/token.png" class="title_icon" />
<h1>Token collection</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
