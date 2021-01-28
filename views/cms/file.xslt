<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Files template
//
//-->
<xsl:template match="files">
<div class="current_path">
<xsl:for-each select="current/path">
/<a href="/{/output/page}{.}/"><xsl:value-of select="@label" /></a>
</xsl:for-each>
</div>

<table class="table table-striped table-condensed files">
<thead>
<tr><th></th><th>Filename</th><th>Filesize</th></tr>
</thead>
<tbody>
<xsl:if test="count(current/path)>1">
<tr class="directory"><td><img src="/images/directory.png" /></td><td onClick="javascript:click_anchor(this)"><a href="..">..</a></td><td colspan="3"></td></tr>
</xsl:if>
<xsl:for-each select="directory">
<tr class="directory alter">
<td><img src="/images/directory.png" /></td>
<td onClick="javascript:click_anchor(this)"><a href="{link}/"><xsl:value-of select="name" /></a></td>
<td></td>
</tr>
</xsl:for-each>
<xsl:for-each select="file">
<tr class="file alter">
<td><img src="/images/file.png" /></td>
<td onClick="javascript:click_anchor(this)"><a href="{link}"><xsl:value-of select="name" /></a></td>
<td><xsl:value-of select="size" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<xsl:call-template name="show_messages" />

<div class="row">

<div class="col-sm-6">
<div class="panel panel-default">
<div class="panel-heading">Upload new file</div>
<div class="panel-body">
<form action="/{/output/page}{@dir}/" method="post" enctype="multipart/form-data">
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="file" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name)" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
<span class="input-group-btn"><input type="submit" name="submit_button" value="Upload" class="btn btn-default" /></span>
</div>
</form>
</div>
</div>
</div>

<div class="col-sm-6">
<div class="panel panel-default">
<div class="panel-heading">Create directory</div>
<div class="panel-body">
<form action="/{/output/page}{@dir}/" method="post">
<div class="input-group">
<input type="text" name="create" value="{../create}" class="form-control" />
<span class="input-group-btn"><input type="submit" name="submit_button" value="Create" class="btn btn-default" /></span>
</div>
</form>
</div>
</div>
</div>

</div>

<div class="btn-group">
<a href="/cms" class="btn btn-default">Back</a>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/file.png" class="title_icon" />
<h1>File administration</h1>
<xsl:apply-templates select="files" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
