const { type } = require('os');
const resources = require('./resources.json');
const rows = require('./rows.json');

// Map properties, don't forget to change if map changes!
const mapFile = "../RespTechLibrary/library.json";
// Hint: use a test map first when making big changes to avoid corrupting the main mapFile
const outputMapFile = "../RespTechLibrary/libraryTEST.json"; // mapFile; // 
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
let resourceTileBelow = {};
let resourceTileAbove = {};
const resourceTypes = ["tool", "book", "website", "org", "other"];

// Same for tiles with carpets that are drawn below or above resource tables 
let tileCarpetBelow = {};
let tileCarpetAbove = {};
const carpetNeeds = ["practice", "challenge", "observation", "community", "other"];

for (let i = 0; i < mapData["layers"].length; i++) {
    var layerName = mapData["layers"][i].name;
    
    if (layerName === "tileResources") {
        var layerTiles = mapData["layers"][i].data;
        // Resource tiles are in row 1 and row 2 of the tileResources layer
        for (let i = 0; i < resourceTypes.length; i++) {
            resourceTileBelow[resourceTypes[i]] = layerTiles[i];
            resourceTileAbove[resourceTypes[i]] = layerTiles[mapWidth+i]; 
        }
        // Carpet tiles are in row 3 and 4 of the tileResources layer 
        // and we're using mapWidth to calculate the tile index.
        // For each 3-tile carpet we're saving just the gid of the middle tile, 
        // so we're adding 1 in addition to carpet areaWidth (=3)
        for (let i = 0; i < carpetNeeds.length; i++) {
            tileCarpetBelow[carpetNeeds[i]] = layerTiles[(2*mapWidth)+(i*areaWidth)+1];
            tileCarpetAbove[carpetNeeds[i]] = layerTiles[(3*mapWidth)+(i*areaWidth)+1];
        }
        break;
    }    
}
// Just some debugging statements
console.log("Below row tile gids:");
console.log(resourceTileBelow);
console.log("Above row tile gids:");
console.log(resourceTileAbove);
console.log("Below carpet middle tile gids:");
console.log(tileCarpetBelow);
console.log("Below carpet middle tile gids:");
console.log(tileCarpetAbove);
console.log("===")

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
    currentRow = 0;
    var firstX = rowStarts[0].x;
    var firstY = rowStarts[0].y;
    populateCategory(category, rowStarts, firstX, firstY);
}

function populateCategory(category, rowStarts, nextX, nextY) {
    for (let i = 0; i < resources[category].length; i++) {
        var rowType = rowStarts[currentRow].type;
        var resourceName = resources[category][i].name;
        var resourceDesc = resources[category][i].description;
        var resourceUrl = resources[category][i].url;
        var resourceType = resources[category][i].type;
        var resourceNeed = resources[category][i].need;

        // Display warning & set type/need to "other" to catch typos or unsupported types/needs
        if (!resourceTypes.includes(resourceType)) {
            console.log("! FYI: " + resourceName + " has a new resource type: " + resourceType);
            resourceType = "other";
        }
        if (resourceNeed && !carpetNeeds.includes(resourceNeed)) {
            console.log("! FYI: " + resourceName + " has an unknown need: " + resourceNeed);
            resourceNeed = "other";
        }

        // console.log('Processing resource: ' + resourceName);

        // Define trigger message that appears as players walk on each website object area
        var triggerMessage = " ______________________________  Press SPACE to view website";
        if (resourceDesc) {
            triggerMessage = resourceName + ": " + resourceDesc + triggerMessage;
        } else {
            triggerMessage = resourceName + triggerMessage;
        }

        // CHANGE TILE LAYER FOR EACH RESOURCE BASED ON ROW TYPE

        // Add the resource tile gid to the right square in the map
        tileIndex = nextY * mapWidth + nextX + 1;

        // Add resource tile based on resource type and carpet tile gid 
        // based on whether the row is type above or below 
        // tileCarpetBelow and tileCarpetAbove store the middle tile gid
        if (rowType === "below") {
            tileLayerData[tileIndex] = resourceTileBelow[resourceType];
            if (resourceNeed) {
                tileLayerData[tileIndex+mapWidth] = tileCarpetBelow[resourceNeed];
                tileLayerData[tileIndex+mapWidth-1] = tileCarpetBelow[resourceNeed] - 1;
                tileLayerData[tileIndex+mapWidth+1] = tileCarpetBelow[resourceNeed] + 1;
            } else {
                tileLayerData[tileIndex+mapWidth] = tileCarpetBelow["other"];
                tileLayerData[tileIndex+mapWidth-1] = tileCarpetBelow["other"] - 1;
                tileLayerData[tileIndex+mapWidth+1] = tileCarpetBelow["other"] + 1;
            }
        } else if (rowType === "above") {
            tileLayerData[tileIndex] = resourceTileAbove[resourceType];
            if (resourceNeed) {
                tileLayerData[tileIndex-mapWidth] = tileCarpetAbove[resourceNeed];
                tileLayerData[tileIndex-mapWidth-1] = tileCarpetAbove[resourceNeed] - 1;
                tileLayerData[tileIndex-mapWidth+1] = tileCarpetAbove[resourceNeed] + 1;
            } else {
                tileLayerData[tileIndex-mapWidth] = tileCarpetAbove["other"];
                tileLayerData[tileIndex-mapWidth-1] = tileCarpetAbove["other"] - 1;
                tileLayerData[tileIndex-mapWidth+1] = tileCarpetAbove["other"] + 1;
            }
        }        
        
        // ADD NEW OBJECT TO THE OBJECT LAYER
        // Calculate coordinates of each website object area and add to the objects layer
        // Note that area y coordinates are different depending on area type ("below" | "above")
        areaX = nextX * tileSize;
        if (rowType === "below") {
            areaY = (nextY + 1) * tileSize;
        } else if (rowType === "above") {
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
    
        // Check if we have space in the current row or move to the next row (if it exists)
        if ((nextX + areaWidth) < (rowStarts[currentRow].x + rowWidth)) {
            nextX += areaWidth;
        } else if ((currentRow + 1) < rowStarts.length) {
            currentRow += 1;
            nextX = rowStarts[currentRow].x;
            nextY = rowStarts[currentRow].y;
        } else {
            if (resources[category][i+1]) {
                console.log('! Ran out of available spots in row with index ' + currentRow);
                console.log('! Resource "' + resources[category][i+1].name + '" and following not added.');
            }
            break;
        }
    }
    console.log("Populated " + resources[category].length + " resources in category " + category);
}

console.log("===");

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