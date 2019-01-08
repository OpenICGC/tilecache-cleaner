var express = require('express');
var reload = require('express-reload');
var proj4 = require('proj4');
var  { reproject }  = require('reproject');
var { TileMatrix } = require('./tilematrix');

const fs = require('fs');


var turf = require('turf');


var cover = require('@mapbox/tile-cover');
var bodyParser = require('body-parser');

proj4.defs('EPSG:25831','+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

var app = express();

// parse application/json
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/clean', function (req, res) {
	const limits = {
		min_zoom: req.body.zoom,
		max_zoom: req.body.zoom
	};
	let tiles = [];
	
	if (req.body.layer.match(/noutm/)) {
		// NOUTM
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
	
	
	} else {
		let polyWGS84 = req.body.area.features[0];
		
		let boundsWGS84 = { 
				type: 'Feature',
				properties: {},
				geometry:
				{ type: 'Polygon',
					coordinates:
						[ [ [ req.body.bounds._southWest.lng, req.body.bounds._southWest.lat ],
								[ req.body.bounds._southWest.lng, req.body.bounds._northEast.lat ],
								[ req.body.bounds._northEast.lng, req.body.bounds._northEast.lat ],
								[ req.body.bounds._northEast.lng, req.body.bounds._southWest.lat ],
								[ req.body.bounds._southWest.lng, req.body.bounds._southWest.lat ] ] ] } 
			}; 

		let poly25831   = reproject(polyWGS84, proj4.WGS84, proj4('EPSG:25831'));
		let bounds25831 = reproject(boundsWGS84, proj4.WGS84, proj4('EPSG:25831'));

		let [ minX, minY, maxX, maxY ] = turf.bbox(bounds25831);
		let [ minPolyX, minPolyY, maxPolyX, maxPolyY ] = turf.bbox(poly25831);

		let gsd = { x: (maxX - minX) / req.body.size.x, 
								y: (maxY - minY) / req.body.size.y };
		
		let avgGSD = (gsd.x + gsd.y) / 2;
		
		tiles = req.app.locals.tm.getAllTilesForGSD(avgGSD, minPolyX, minPolyY, maxPolyX, maxPolyY);
		console.log({avgGSD: avgGSD, gsd: gsd, bbox: turf.bbox(poly25831)});
		console.log(tiles);
	}

	res.send(tiles);
});

var tm = null;


fs.readFile(__dirname + "/WMTSCapabilities.xml", function(err, data) {
	var tm = new TileMatrix(data);
	var t = tm.getTile(0, 258000.0, 4766600.0);
	console.log(t);

	t = tm.getTile(0, 258000.0 + 256*1101, 4766600.0 - 256*1101);
	console.log(t);
	app.locals.tm = tm;

	var levels = tm.findLevelsForGSD(3);

	console.log(levels);

	var allTiles = tm.getAllTiles(0, 258000.0, 4766600.0, 258000.0 + 3*256*1101, 4766600.0 + 3*256*1101);

	var allTilesGSD = tm.getAllTilesForGSD(900, 258000.0, 4766600.0, 258000.0 + 2*256*1101, 4766600.0 - 2*256*1101);

	console.log(allTilesGSD);

	app.listen(3000, function () {
		console.log('Example app listening on port 3000!');
	});

});

