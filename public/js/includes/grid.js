var grid_width = 0;
var grid_height = 0;
var grid_canvas = null;
var grid_ctx = null

function grid_init(cell_size, color = 'rgba(0, 0, 0, 0.3)') {
	grid_width = Math.round($('div.playarea > div').first().width());
	grid_height = Math.round($('div.playarea > div').first().height());

	$('div.grid').append('<canvas id="grid" width="' + grid_width + '" height="' + grid_height + '" />');
	grid_canvas = document.getElementById('grid');

	grid_ctx = grid_canvas.getContext('2d');
	grid_ctx.lineWidth = 1;
	grid_ctx.strokeStyle = color;

	grid_draw(cell_size);
}

function grid_draw(cell_size) {
	grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height)

	for (var i = 0; i < grid_width; i += cell_size) {
		grid_ctx.beginPath();
		grid_ctx.moveTo(i, 0);
		grid_ctx.lineTo(i, grid_height);
		grid_ctx.lineTo(i - 1, grid_height);
		grid_ctx.lineTo(i - 1, 0);
		grid_ctx.stroke();
	}

	for (var i = 0; i < grid_height; i += cell_size) {
		grid_ctx.beginPath();
		grid_ctx.moveTo(0, i);
		grid_ctx.lineTo(grid_width, i);
		grid_ctx.lineTo(grid_width, i - 1);
		grid_ctx.lineTo(0, i - 1);
		grid_ctx.stroke();
	}
}
