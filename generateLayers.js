const { type } = require('os');
const resources = require('./resources.json');
const rows = require('./rows.json');

// Map properties, don't forget to change if map changes!
const mapFile = "../RespTechLibrary/library.json";
// Hint: use a test map first when making big changes to avoid corrupting the main mapFile
const outputMapFile = mapFile; // "../RespTechLibrary/libraryTEST.json";
const outputObjectLayer = 'resourcesAreas';
const outputTileLayer = 'resourcesTiles';

let mapData = require(mapFile);

const mapWidth = 62;
const mapHeight = 40;

const tileSize = 32;

// Define row properties that we want to fill 
const areaWidth = 3;
const areaHeight = 1;

const tablesRow = 5;

// List of categories to populate; the same name is used in resources and rows files
const categories = ["accessibility", "bias", "diversity", "ethics", "sustainability"];

// Initialize a blank tile layer data array
var tileLayerData = [];
for (var tile = 0; tile < (mapHeight * mapWidth); tile++) {
    tileLayerData.push(0);
}

var tileIndex = 0;

// Figure out resource tile gids by looking at a tileResources layer.
// A more elegant way might be to look at tilesets object in the map 
// and the firstgid property of each tileset, but the tiles have to 
// be added to the map anyway, and this way you don't have to worry
// about which tilesets each tile belongs to.
let tileTool = 0;
let tileBook = 0;
let tileWebsite = 0;
let tileOther = 0;

for (let i = 0; i < mapData["layers"].length; i++) {
    var layerName = mapData["layers"][i].name;
    
    if (layerName === "tileResources") {
        var layerTiles = mapData["layers"][i].data;
        tileTool = layerTiles[0];
        tileBook = layerTiles[1];
        tileWebsite = layerTiles[2];
        tileOther = layerTiles[3];
        break;
    }    
}
// Just some debugging statements
console.log("Found resource tiles! Their IDs: ");
console.log(tileTool, tileBook, tileWebsite, tileOther);

// Initialize an empty objects array, which is used to store object areas with URLs
var objectLayersObjects = [];
let areaNew = {};

// Initialize some variables
var currentRow = 0;
var rowStarts = [];

var areaX = 0;
var areaY = 0;
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
        var resourceDesc = resources[category][i].description;
        var resourceUrl = resources[category][i].url;
        var resourceType = resources[category][i].type;

        // Define trigger message that appears as players walk on each website object area
        var triggerMessage = " ______________________________  Press SPACE to view website";
        if (resourceDesc) {
            triggerMessage = resourceName + ": " + resourceDesc + triggerMessage;
        } else {
            triggerMessage = resourceName + triggerMessage;
        }

        // console.log('Processing resource: ' + resourceName);
        
        // Calculate coordinates of each website object area and add to the objects layer
        // Note that area y coordinates are different depending on area type ("below" | "above")
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
                    },
                    {
                        "name": "openWebsiteTrigger",
                        "propertytype": "",
                        "type": "string",
                        "value": "onaction"
                    },
                    {
                        "name": "openWebsiteTriggerMessage",
                        "propertytype": "",
                        "type": "string",
                        "value": triggerMessage
                    },
                    {
                        "name": "openWebsiteWidth",
                        "propertytype": "",
                        "type": "string",
                        "value": "50"
                    }],
            "rotation":0,
            "type":"area",
            "visible":true,
            "x": areaX,
            "y": areaY
        };
        objectLayersObjects.push(areaNew);
        
        // Add the resource tile gid to the right square in the map
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
    
        // Check if we have space in the current row or move to the next row (if it exists)
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



// Update original map data 
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

// Also write layer data to output folder, purely for debugging purposes
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