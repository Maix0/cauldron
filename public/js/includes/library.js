function array_remove(arr, val) {
	arr = arr.filter(function(item) {
		return item !== val
	});

	return arr;
}
