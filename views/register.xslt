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
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Form template
//
//-->
<xsl:template match="form">
<div class="row">
<div class="col-sm-6">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<label for="fullname">Full name:</label>
<input type="input" id="fullname" name="fullname" value="{fullname}" class="form-control" />
<label for="username">Username:</label>
<input type="input" id="username" name="username" value="{username}" class="form-control" />
<label for="password">Password:</label>
<input type="password" id="password" name="password" class="form-control" />
<label for="email">E-mail address:</label>
<input type="input" id="email" name="email" value="{email}" class="form-control" />
<label for="organisation">Group name:</label>
<input type="input" id="organisation" name="organisation" value="{organisation}" class="form-control" />

<div class="btn-group">
<input type="submit" name="submit_button" value="Register" class="btn btn-default" />
<a href="/{@previous}" class="btn btn-default">Cancel</a>
</div>
</form>
</div>
<div class="col-sm-6">
<p>Use this from to create a Cauldron VTT account. Only do so when you plan to be a Dungeon Master for your group. When creating an account, you gain the rights to create accounts for your players. Don't let your players create their own account via this form, otherwise they will create a new group for their own. Only people within the same group will be able to play together.</p>
<p>The group name is not used during games. You can use it as a reference when you contact the administrator of this website in case of an issue with this website or a question about this website.</p>
<p>When your account is created, it will contain a few free tokens by <a href="https://immortalnights.com/">Devin Night</a> to get you started.</p>
</div>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Register</h1>
<xsl:apply-templates select="form" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
