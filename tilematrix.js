'use strict';
var _ = require('lodash');

const xml2js = require('xml2js');

class TileMatrix {
    constructor(xmlString) {
        var parser = xml2js.Parser();
        var self = this;
        parser.parseString(xmlString, function(err, res) {
            var tm = res.Capabilities.Contents[0].TileMatrixSet[0].TileMatrix;
            self.tileMatrix = tm.map(function(m) {
                var f = m.TopLeftCorner[0].split(' ');
                m.Left = f[0];
                m.Top  = f[1];
                return m;
            });

        });
    }

    getLevelById(id) {
        var res =  this.tileMatrix.find((x) => x['ows:Identifier'][0] == id);
 
        return res;
    }

    getTile(matrixIndex, groundX, groundY) {
        var layer = this.getLevelById(matrixIndex); //this.tileMatrix[matrixIndex];
        var tileXSize = layer.TileWidth * layer.ScaleDenominator * (0.28e-3);
        var tileX = (groundX - layer.Left) / tileXSize;

        var tileYSize = layer.TileHeight * layer.ScaleDenominator * (0.28e-3);
        var tileY = (layer.Top - groundY) / tileYSize;

        return [matrixIndex, Math.floor(tileX), Math.ceil(tileY)];
    }

    getAllTiles(matrixIndex, minX, minY, maxX, maxY) {
        var [_idx, minTileX, minTileY] = this.getTile(matrixIndex, minX, minY);
        var [_idx, maxTileX, maxTileY] = this.getTile(matrixIndex, maxX, maxY);

        var Xs = _.range(minTileX, maxTileX + 1);
        var Ys = _.range(minTileY, maxTileY + 1);

        console.log([minTileX, minTileY, maxTileX, maxTileY]);

        var res = Xs.map((x) => Ys.map((y) => [matrixIndex, x, y])).flat();

        return res;
    }

  

    findLevelsForGSD(gsd) {
        var scaleDenoms = this.tileMatrix
            .map((m) => { return { gsd: m.ScaleDenominator[0] * 0.28e-3, i: m['ows:Identifier'][0] } } )
            .sort((a,b) => a.gsd > b.gsd);
        var maxIdx = scaleDenoms.findIndex((n) => gsd >= n.gsd);
        console.log(scaleDenoms);

        if(maxIdx < 0) {
            return [ scaleDenoms[gsd.length() - 1].i ]; 
        }

        if(maxIdx == 0) 
            return [ scaleDenoms[0].i ];

        return [ scaleDenoms[maxIdx - 1].i, scaleDenoms[maxIdx].i ];

    }

    getAllTilesForGSD(gsd, minX, minY, maxX, maxY) {
        var levels = this.findLevelsForGSD(gsd);
        console.log(levels);
        return levels.map((l) => this.getAllTiles(l, minX, minY, maxX, maxY)).flat();
    }

};


module.exports = { TileMatrix: TileMatrix }