import the area of interest shapefile from assest

// Load Area of Interest (AOI)

Map.addLayer(AOI, {}, 'West Bardhaman');
Map.centerObject(AOI,8);

// Import Landsat 5 Satellite Data (1991)

var L5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
           .filterDate('1991-01-01', '1991-09-30')
           .filter(ee.Filter.lt('CLOUD_COVER', 1))
           .filterBounds(AOI)
           .median()
           .clip(AOI);


// Load Satellite Image of Landsat 5

Map.addLayer(L5, imageVisParam, 'Landsat 5'); //import the visulazitaion paramiter for landsat 5 image

var training = (Waterbody).merge(Vegetation)
                          .merge(Buildup_Area)
                          .merge(Agricultural_Land)
                          .merge(Coal_Mine)
                          .merge(Sand)
                          .merge(Barren_Land)
print(training,'Training');

// Define Classification Parameters

var label = 'Class';
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4']; 
var input = L5.select(bands);

// Sample Training Data

var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});


// Split into Training (80%) and Testing (20%) Datasets

var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8));
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));

// Train CART Classifier

var classifier = ee.Classifier.smileCart().train(trainSet, label, bands);

// Apply Classification

var classified = input.classify(classifier)
print(classified);

// Load the Classified Image

Map.addLayer(classified, imageVisParam2, 'classification'); //Import the visualization parameters for Classification image as name imageVisParam2	

// Export the Classified Image to Google Drive
Export.image.toDrive({
  image: classified,
  description: 'West Bardhaman LULC 1991',
  scale: 10,
  region: AOI,
  maxPixels: 1e13});
