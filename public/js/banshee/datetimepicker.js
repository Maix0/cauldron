$(document).ready(function() {
	$("input.datetimepicker").datetimepicker({
		dateFormat: "yy-mm-dd",
		timeFormat: "HH:mm:ss",
		firstDay: 1,
		showButtonPanel: true,
		showWeek: true,
	});
});
