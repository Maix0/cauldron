<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<table class="table table-condensed table-striped table-hover">
<thead>
<tr>
<th>Name</th>
<th>Hitpoints</th>
<th>Armor class</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="characters/character">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
<td><xsl:value-of select="hitpoints" /></td>
<td><xsl:value-of select="armor_class" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New character</a>
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
<xsl:if test="character/@id">
<input type="hidden" name="id" value="{character/@id}" />
<img src="/files/portraits/{character/@id}.{character/extension}" class="portrait" />
</xsl:if>

<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{character/name}" class="form-control" />
<label for="hitpoints">Hitpoints:</label>
<input type="text" id="hitpoints" name="hitpoints" value="{character/hitpoints}" class="form-control" />
<label for="armor_class">Armor class:</label>
<input type="text" id="armor_class" name="armor_class" value="{character/armor_class}" class="form-control" />
<label for="initiative">Initiative:</label>
<input type="text" id="initiative" name="initiative" value="{character/initiative}" class="form-control" />
<label for="portrait">Portrait:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="portrait" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name)" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save character" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="character/@id">
<input type="submit" name="submit_button" value="Delete character" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
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
<h1>Characters</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
