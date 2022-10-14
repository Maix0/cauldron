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

<!--
//
//  Invitation form template
//
//-->
<xsl:template match="splitform/form_invitation">
<p>If you've received an invitation code from your Dungeon Master to join an existing group, enter it here. If you don't specify an invitation code, a new group will be created and you will become the Dungeon Master for that group. Only people within the same group will be able to play together.</p>
<label for="code">Invitation code:</label>
<input type="text" name="invitation" value="{invitation}" class="form-control" />
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
</xsl:template>

<!--
//
//  Process template
//
//-->
<xsl:template match="submit">
<xsl:call-template name="splitform_header" />
<xsl:call-template name="progressbar" />
<p>Your account has been created. You can now log in. Your account contains a few free tokens by <a href="https://immortalnights.com/">Devin Night</a> to get you started.</p>
<xsl:call-template name="redirect"><xsl:with-param name="url" /></xsl:call-template>
</xsl:template>

</xsl:stylesheet>
