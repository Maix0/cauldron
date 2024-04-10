<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<xsl:if test="type='Activate'">
<img src="/images/cauldey.png" class="cauldey" title="Cauldey the cat" />
</xsl:if>
<h1>Cauldey</h1>
<form action="/{/output/page}" method="post">
<p>Here you can activate and deactivate Cauldey the cat. Although Cauldey is just a CR 0 tiny beast, it will help you through all the steps of creating your first adventure. And please don't kill it, it's worth only 10 XP.</p>
<p>You can get back to this page via the Help button in the DM's Vault main menu.</p>
<input type="submit" name="submit_button" value="{type}" class="btn btn-default" />
</form>
</xsl:template>

</xsl:stylesheet>
