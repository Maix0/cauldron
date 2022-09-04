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

<xsl:if test="../capacity">
<div class="progress">
	<div class="progress-bar" role="progressbar" aria-valuenow="{../resources}" aria-valuemin="0" aria-valuemax="100" style="width: {../capacity}%;">
		<xsl:value-of select="../capacity" />%<xsl:if test="../capacity>50"> (max <xsl:value-of select="../capacity/@max" /> MB)</xsl:if>
	</div>
	<xsl:if test="../capacity&lt;50"><div style="text-align:center">max <xsl:value-of select="../capacity/@max" /> MB</div></xsl:if>
</div>
</xsl:if>

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
<div class="panel-heading">Upload new file (max 20 MB)</div>
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
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>All images and sound files for your games are stored here. The files in the directories 'characters', 'collectables' and 'tokens' are maintained via other pages, so only change the files in those directories when you know what you are doing.</p>
<p>Cauldron VTT can use images from remote locations, but you can also upload them here when you have enough space left.</p>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/resources.png" class="title_icon" />
<h1>Resources</h1>
<xsl:apply-templates select="files" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
