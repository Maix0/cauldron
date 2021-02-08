<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

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
<tr><th>Name</th><th>Found</th><th>Hide</th><th>Placed</th></tr>
</thead>
<tbody>
<xsl:for-each select="collectables/collectable">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
<td><xsl:value-of select="found" /></td>
<td><xsl:value-of select="hide" /></td>
<td><xsl:value-of select="placed" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New collectable</a>
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
<form action="/{/output/page}" method="post" enctype="multipart/form-data">
<xsl:if test="collectable/@id">
<input type="hidden" name="id" value="{collectable/@id}" />
<img src="/files/collectables/{collectable/image}" class="collectable" />
</xsl:if>

<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{collectable/name}" class="form-control" />
<label for="image">Image:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="image" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name)" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>
<div>Collectable has been found: <input type="checkbox" name="found"><xsl:if test="collectable/found='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
<div>Hide containing token when found: <input type="checkbox" name="hide"><xsl:if test="collectable/hide='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save collectable" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="collectable/@id">
<input type="submit" name="submit_button" value="Delete collectable" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
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
<h1>Collectable administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
