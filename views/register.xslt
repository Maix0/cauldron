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
<xsl:import href="banshee/splitform.xslt" />


<!--
//
//  Layout templates
//
//-->
<xsl:template name="splitform_header">
<h1>Register</h1>
</xsl:template>

<xsl:template name="splitform_footer">
</xsl:template>

<xsl:template name="splitform_sidebar">
<p>Use this from to create a Cauldron VTT account. Only do so when you plan to be a Dungeon Master for your group. When creating an account, you gain the rights to create accounts for your players. Don't let your players create their own account via this form, otherwise they will create a new group for their own. Only people within the same group will be able to play together.</p>
<p>The group name is not used during games. You can use it as a reference when you contact the administrator of this website in case of an issue with this website or a question about this website.</p>
<p>When your account is created, it will contain a few free tokens by <a href="https://immortalnights.com/">Devin Night</a> to get you started.</p>
</xsl:template>

<!--
//
//  E-mail form template
//
//-->
<xsl:template match="splitform/form_email">
<label for="email">E-mail address:</label>
<input type="input" id="email" name="email" value="{email}" class="form-control" />
</xsl:template>

<!--
//
//  Code form template
//
//-->
<xsl:template match="splitform/form_code">
<p>An e-mail with a verification code has been sent to your e-mail address.</p>
<label for="code">Verification code:</label>
<input type="text" name="code" value="{code}" class="form-control" />
</xsl:template>

<!--
//
//  Account form template
//
//-->
<xsl:template match="splitform/form_account">
<label for="fullname">Full name:</label>
<input type="text" id="fullname" name="fullname" value="{fullname}" class="form-control" />
<label for="username">Username:</label>
<input type="text" id="username" name="username" value="{username}" class="form-control" style="text-transform:lowercase" />
<label for="password">Password:</label>
<input type="password" id="password" name="password" class="form-control" />
<xsl:if test="../../../ask_organisation='yes'">
<label for="organisation">Group name:</label>
<input type="text" id="organisation" name="organisation" value="{organisation}" class="form-control" />
</xsl:if>
</xsl:template>

<!--
//
//  Process template
//
//-->
<xsl:template match="submit">
<xsl:call-template name="splitform_header" />
<xsl:call-template name="progressbar" />
<p>Your account has been created. You can now log in.</p>
<xsl:call-template name="redirect"><xsl:with-param name="url" /></xsl:call-template>
</xsl:template>

</xsl:stylesheet>
