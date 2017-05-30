#target photoshop

#include common.js

var PATH_TO_EDGE_CANVAS = TEXTURES_PATH + "edge.png"
var c = charIDToTypeID

function processDocument (doc) {
  var error = false
  processLayers(doc)
  return !error
}

function processLayers (document) {
  var layer
  for (j = 0; j < document.artLayers.length; j++) {
    layer = document.artLayers[j]

    if (LAYER_NAME_RE.test(layer.name)) {
      // обрабатываем слой с картинкой
      processModularLayer(layer)
      break;
    }
  }
}

function processModularLayer (layer) {
  var doc = activeDocument
  var EDGE_HEIGHT = 44

  var bounds = _getLayerBounds(layer)

  // [left, top, right, bottom]
  doc.crop([bounds.left, bounds.top, bounds.right, bounds.bottom])
  doc.resizeImage(426)

  bounds = _getLayerBounds(layer)

  doc.crop([bounds.left, bounds.top, bounds.right, bounds.top + EDGE_HEIGHT])

  skewEdge(layer)

  var canvasLayer = createCanvasLayer()
  addLayerToSelection(canvasLayer, true)
  doc.activeLayer = layer
  _invertSelection()
  _deleteSelection()
  activeDocument.selection.deselect()

  doc.activeLayer = canvasLayer
  coverWithCanvas()

  var outFileName = getFileNameWoExtension() + '_edge'
  exportFile(PSD_FOLDER_PATH + OUT_SUBFOLDER, outFileName, 'PNG')
}

function createCanvasLayer () {
  var canvasLayer = _placeImageOnNewLayer(PATH_TO_EDGE_CANVAS)
  canvasLayer.name = 'canvas'

  return canvasLayer
}

function skewEdge (layer) {
  activeDocument.selection.selectAll()

  var desc12 = new ActionDescriptor()
  var ref5 = new ActionReference()
  ref5.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'))
  desc12.putReference(c('null'), ref5)
  desc12.putEnumerated(c('FTcs'), c('QCSt'), c('Qcsa'))
  var desc13 = new ActionDescriptor()
  desc13.putUnitDouble(c('Hrzn'), c('#Pxl'), 0.195148)
  desc13.putUnitDouble(c('Vrtc'), c('#Pxl'), 0.539320)
  desc12.putObject(c('Ofst'), c('Ofst'), desc13)
  desc12.putUnitDouble(c('Wdth'), c('#Prc'), 97.548546)
  var desc14 = new ActionDescriptor()
  desc14.putUnitDouble(c('Hrzn'), c('#Ang'), 0.058151)
  desc14.putUnitDouble(c('Vrtc'), c('#Ang'), 0.000000)
  desc12.putObject(c('Skew'), c('Pnt '), desc14)
  var desc15 = new ActionDescriptor()
  desc15.putUnitDouble(c('Hrzn'), c('#Prc'), -0.000000)
  desc15.putUnitDouble(c('Vrtc'), c('#Prc'), 0.111430)
  desc12.putObject(c('Usng'), c('Pnt '), desc15)
  desc12.putEnumerated(c('Intr'), c('Intp'), c('Bcbc'))
  executeAction(c('Trnf'), desc12, DialogModes.NO)

  activeDocument.selection.deselect()
}

function coverWithCanvas () {
  var desc20 = new ActionDescriptor()
  var ref15 = new ActionReference()
  ref15.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'))
  desc20.putReference(charIDToTypeID('null'), ref15)
  var desc21 = new ActionDescriptor()
  desc21.putEnumerated(charIDToTypeID('Md  '), charIDToTypeID('BlnM'), charIDToTypeID('Mltp'))
  desc20.putObject(charIDToTypeID('T   '), charIDToTypeID('Lyr '), desc21)
  executeAction(charIDToTypeID('setd'), desc20, DialogModes.NO)

  var desc22 = new ActionDescriptor()
  var ref16 = new ActionReference()
  ref16.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'))
  desc22.putReference(charIDToTypeID('null'), ref16)
  var desc23 = new ActionDescriptor()
  desc23.putUnitDouble(charIDToTypeID('Opct'), charIDToTypeID('#Prc'), 60.000000)
  desc22.putObject(charIDToTypeID('T   '), charIDToTypeID('Lyr '), desc23)
  executeAction(charIDToTypeID('setd'), desc22, DialogModes.NO)
}

openFilesInDir(PSD_FOLDER_PATH)
