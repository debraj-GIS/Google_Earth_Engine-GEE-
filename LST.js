//import the area of interest shapefile from assest

// Define the region of interest (AOI) 
Map.addLayer(AOI, {}, "Purba Bardhaman");
Map.centerObject(AOI, 10);

// Load Landsat 8 imagery
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1')
  .filterDate('2024-04-01', '2024-07-30')
  .filter(ee.Filter.lt('CLOUD_COVER', 10))
  .median()
  .clip(AOI);

// Function to calculate NDVI
var calculateNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

// Function to calculate emissivity
var calculateEmissivity = function(image) {
  var ndvi = image.select('NDVI');
  var emissivity = ndvi.multiply(0.0003342).add(0.1); // Simple emissivity estimation
  return image.addBands(emissivity.rename('EMISSIVITY'));
};

// Function to calculate LST
var calculateLST = function(image) {
  var thermalBand = image.select('B10');
  
  // Constants for Landsat 8
  var K1 = 774.8853; // Calibration constant 1
  var K2 = 1321.0789; // Calibration constant 2
  
  // Convert DN to TOA radiance
  var toaRadiance = thermalBand.multiply(0.0003342).add(0.1);
  
  // Convert TOA radiance to brightness temperature
  var brightnessTemp = toaRadiance.expression(
    '(K2 / (log((K1 / L) + 1))) - 273.15', {
      'K1': K1,
      'K2': K2,
      'L': toaRadiance
    }
  ).rename('BRIGHTNESS_TEMP');
  
  // Calculate LST
  var emissivity = image.select('EMISSIVITY');
  var lst = brightnessTemp.expression(
    '(BT / (1 + (0.00115 * BT / 1.4388) * log(emissivity)))', {
      'BT': brightnessTemp,
      'emissivity': emissivity
    }
  ).rename('LST');
  
  return image.addBands(lst);
};

// Apply the functions
var ndviImage = calculateNDVI(landsat8);
var emissivityImage = calculateEmissivity(ndviImage);
var lstImage = calculateLST(emissivityImage);

// Display the results

Map.addLayer(lstImage.select('LST'), LST_VIS, 'LST'); //import the visulazitaion paramiter for lstImage from layer
print('LST Image:', lstImage);

var lstValue = lstImage.select('LST').reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: AOI,
  scale: 30,
  maxPixels: 1e13
});
print("Mean Value of LST :", lstValue);

// Sample the pixel values of LST and NDVI
var sample = lstImage.select(['LST', 'NDVI']).sample({
  region: AOI, // Use AOI instead of roi
  scale: 30, // Adjust scale based on resolution
  numPixels: 1000 // Number of pixels to sample
});

// Calculate correlation
var correlation = sample.reduceColumns({
  reducer: ee.Reducer.pearsonsCorrelation(),
  selectors: ['LST', 'NDVI']
});

// Print the correlation result
print('Correlation between LST and NDVI:', correlation);


// Create a scatter plot
var chart = ui.Chart.feature.byFeature({
  features: sample,
  xProperty: 'NDVI',
  yProperties: 'LST'
})
.setChartType('ScatterChart')
.setOptions({
  title: 'Correlation between LST and NDVI:',
  hAxis: {title: 'NDVI'},
  vAxis: {title: 'LST (°C)'},
  pointSize: 1,
  trendlines: {0: {color: 'red'}} 
});

// Print the chart
print(chart);

// Export the LST image
Export.image.toDrive({
  image: lstImage.select('LST'),
  description: 'LST_Export',
  scale: 30,
  region: AOI,
  fileFormat: 'GeoTIFF'
});
