var express = require('express');
var cover = require('@mapbox/tile-cover');
var bodyParser = require('body-parser');

var app = express();

// parse application/json
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/clean', function (req, res){
	const limits = {
		min_zoom: req.body.zoom,
		max_zoom: req.body.zoom
	};
	let tiles = [];
	req.body.area.features.forEach(element => {
		const tiles_tmp = cover.tiles(element.geometry, limits);
		const tiles_filter =  tiles_tmp.filter(item => {
			let exist = false;
			tiles.forEach(tl => {
				if(tl[0] === item[0] && tl[1] === item[1] && tl[2] === item[2]){
					exist = true;
				}
			});
			return !exist;
		});
		tiles = tiles.concat(tiles_filter);
	});
	res.send(tiles);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});