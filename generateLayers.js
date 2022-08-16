const { type } = require('os');
const resources = require('./resources.json');
const rows = require('./rows.json');

// Map properties, don't forget to change if map changes!
const mapFile = "../RespTechLibrary/library.json";
const outputMapFile = mapFile; //"../RespTechLibrary/libraryTEST.json"; // Change this when adding new functionality
const outputObjectLayer = 'resourcesAreas';
const outputTileLayer = 'resourcesTiles';

const mapWidth = 62;
const mapHeight = 40;

const tileSize = 32;

// Row properties that we want to fill 
const areaWidth = 3;
const areaHeight = 1;

const tablesRow = 4;

// List of categories to populate; use same name in resources and rows files
const categories = ["accessibility", "bias", "diversity", "ethics", "sustainability"];

// Initializing blank tile data array
var tileLayerData = [];
for (var tile = 0; tile < (mapHeight * mapWidth); tile++) {
    tileLayerData.push(0);
}

// TODO Be smarter about defining tiles, IDs change!!
var tileIndex = 0;
const tileWebsite = 5005;
const tileTool = 5003;
const tileBook = 5004;
const tileOther = 2149;

// Initializing blank objects array, used to store object areas with URLs
var objectLayersObjects = [];
let areaNew = {};

// Initializing variables
var currentRow = 0;
var rowStarts = [];

var areaX = 0;
var areaY = 0;
var nextX = 0;
var nextY = 0;
var areaID = 100;

const rowWidth = tablesRow * areaWidth;

// This is where the fun begins: we'll populate rows for each category
for (let i = 0; i < categories.length; i++) {
    var category = categories[i];
    rowStarts = rows[category];
    var firstX = rowStarts[0].x;
    var firstY = rowStarts[0].y;
    populateCategory(category, rowStarts, firstX, firstY);
}

function populateCategory(category, rowStarts, nextX, nextY) {
    for (let i = 0; i < resources[category].length; i++) {
        var resourceName = resources[category][i].name;
        var resourceUrl = resources[category][i].url;
        var resourceType = resources[category][i].type;

        console.log('Processing resource: ' + resourceName);
    
        // Area y coordinates are different depending on area type
        areaX = nextX * tileSize;
        if (rowStarts[currentRow].type === "below") {
            areaY = (nextY + 1) * tileSize;
        } else if (rowStarts[currentRow].type === "above") {
            areaY = (nextY - areaHeight) * tileSize;
        }
        areaNew = {
            "width": areaWidth * tileSize,
            "height": areaHeight * tileSize,
            "id":areaID,
            "name":resourceName,
            "properties":[
                    {
                    "name":"openWebsite",
                    "type":"string",
                    "value":resourceUrl
                    }],
            "rotation":0,
            "type":"area",
            "visible":true,
            "x": areaX,
            "y": areaY
        };
        objectLayersObjects.push(areaNew);
    
        tileIndex = nextY * mapWidth + nextX + 1;
        if (resourceType === 'tool') {
            tileLayerData[tileIndex] = tileTool;
        } else if (resourceType === 'website') {
            tileLayerData[tileIndex] = tileWebsite;
        } else if (resourceType === 'book') {
            tileLayerData[tileIndex] = tileBook;
        } else {
            tileLayerData[tileIndex] = tileOther;
        }
    
        // Check if we have space in the current row
        if ((nextX + areaWidth) < (rowStarts[currentRow].x + rowWidth)) {
            nextX += areaWidth;
        } else if ((currentRow + 1) < rowStarts.length) {
            currentRow += 1;
            nextX = rowStarts[currentRow].x;
            nextY = rowStarts[currentRow].y;
        } else {
            if (resources[category][i+1]) {
                console.log('Ran out of available spots in row with index ' + currentRow);
                console.log('Resource "' + resources[category][i+1].name + '" and following not added.');
            }
            break;
        }
        
    }
    currentRow = 0;
    console.log("Populated " + resources[category].length + " resources in category " + category);
}



// Read and update original map data 
let mapData = require(mapFile);

for (let i = 0; i < mapData["layers"].length; i++) {
    var layerName = mapData["layers"][i].name;
    var layerTiles = mapData["layers"][i].data;
    var layerObjects = mapData["layers"][i].objects;
    if (layerName === outputObjectLayer) {
        layerObjects = Object.assign(layerObjects, objectLayersObjects);
        console.log("Updated layer: " + layerName);
    } else if (layerName === outputTileLayer) {
        layerTiles = Object.assign(layerTiles, tileLayerData);
        console.log("Updated layer: " + layerName);
    }    
}

// Write output to file
require('fs').writeFile(outputMapFile, JSON.stringify(mapData), (error) => {
    if (error) {
        throw error;
    }
});

// Leaving these here for debugging purposes
require('fs').writeFile('./output/objectLayer.json', JSON.stringify(objectLayersObjects), (error) => {
    if (error) {
        throw error;
    }
});
require('fs').writeFile('./output/tileLayer.json', JSON.stringify(tileLayerData), (error) => {
    if (error) {
        throw error;
    }
});