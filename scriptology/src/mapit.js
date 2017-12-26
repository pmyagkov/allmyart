#target photoshop
#include common.js

_evalDependencies([
  '../lib/es5-shim.js',
])

// TODO remove it, it's necessary for common.js work but is useless here
var LINE_SIDE_MARGIN = 8.7 // cm
var INSTRUCTIONS_LAYER_NAME = 'Instruction+level'
var HOOK_VERTICAL_MARGIN = 2.8 // cm
var MODULE_HORIZONTAL_INITIAL_MARGIN = 4.6
var MODULE_VERTICAL_INITIAL_MARGIN = 2.81

function cropModule (doc, innerFrameSize) {
  var margin = new UnitValue(config.sizes.outer_frame + innerFrameSize, 'cm')
  var region = [
    margin, // left
    margin, // top
    doc.width - margin, // right
    doc.height - margin, // bottom
  ]
  doc.crop(region)
}

function pictureDefinitionGotten (pictureDefinition, innerFrameSize) {
  var mapDoc = open(File(_normalizePath(config.paths.map_basis)))
  var instructionsLayer = mapDoc.artLayers.getByName(INSTRUCTIONS_LAYER_NAME)
  var instructionsLayerBounds = _getLayerBounds(instructionsLayer)

  // A hard coded path to a directory 'mac style'
  var processFolder = Folder(_normalizePath(config.paths.map_input))
  // Use folder object get files function with  mask 'a reg ex'
  var fileList = processFolder.getFiles(new RegExp(pictureDefinition.name + '-\\d.tif'))

  var initialOffsetX = new UnitValue(MODULE_HORIZONTAL_INITIAL_MARGIN, 'cm')
  var initialOffsetY = new UnitValue(MODULE_VERTICAL_INITIAL_MARGIN, 'cm')
  var offsetX = new UnitValue(initialOffsetX, 'cm')
  var offsetY = new UnitValue(initialOffsetY, 'cm')

  fileList.forEach(function (file, i) {
    // Only process the returned file objects
    // The filter 'should' have missed out any folder objects
    if (file instanceof File && !file.hidden) {
      // get a reference to the new document
      var doc = open(file)
      cropModule(doc, innerFrameSize)

      var croppedFileName = pictureDefinition.name + '-' + i + '_cropped'
      var croppedFileFolder = config.paths.map_input + '/'
      var croppedFilePath = croppedFileFolder + croppedFileName + '.psd'
      exportFile(croppedFileFolder, croppedFileName, 'PSD')
      doc.close(SaveOptions.DONOTSAVECHANGES)

      app.activeDocument = mapDoc

      _placeImageOnNewLayer(croppedFilePath)
      new File(croppedFilePath).remove()

      var layer = app.activeDocument.activeLayer
      layer.name = i + 1

      var layerBounds = _getLayerBounds(layer)
      if (i === 0) {
        // determine base offset
        if (offsetX + layerBounds.width / 2 < instructionsLayerBounds.right) {
          initialOffsetX = new UnitValue(instructionsLayerBounds.right - layerBounds.width / 2 + 2, 'cm')
          offsetX = new UnitValue(initialOffsetX)
        }
      }

      layer.translate(offsetX - layerBounds.left, offsetY - layerBounds.top)
      offsetX += layerBounds.width + (i < fileList.length - 1 ? pictureDefinition.margin : 0)
    }
  })

  selectModuleLayers(mapDoc, pictureDefinition)
  _duplicateLayers()
  _createGroupFromLayers()

  var layerGroup = mapDoc.layerSets[0]
  layerGroup.opacity = 30

  mapDoc.activeLayer = mapDoc.artLayers.getByName('style')
  executeAction(c('CpFX'), undefined, DialogModes.NO)

  selectModuleLayers(mapDoc, pictureDefinition)
  executeAction(c('PaFX'), undefined, DialogModes.NO)

  mapDoc.crop([
    0,
    0,
    new UnitValue(offsetX + initialOffsetX),
    new UnitValue(offsetY + getMaxModuleHeight(mapDoc, pictureDefinition) + initialOffsetY),
  ])

  mapDoc.artLayers.getByName(INSTRUCTIONS_LAYER_NAME).move(layerGroup, ElementPlacement.PLACEBEFORE)

  placeHooks(mapDoc, pictureDefinition)
}

function placeHooks (doc, pictureDefinition) {
  pictureDefinition.modules.forEach(function (moduleDefinition, i) {
    var hookLayer = doc.artLayers.getByName('hook-' + String(i + 1))
    var moduleLayer = doc.artLayers.getByName(String(i + 1))
    var hookBounds = _getLayerBounds(hookLayer)
    var moduleBounds = _getLayerBounds(moduleLayer)

    hookLayer.move(doc.layerSets[0], ElementPlacement.PLACEBEFORE)

    hookLayer.translate(
      new UnitValue(moduleBounds.left + moduleBounds.width / 2 - hookBounds.width / 2 - hookBounds.left, 'cm'),
      new UnitValue(moduleBounds.top + HOOK_VERTICAL_MARGIN - hookBounds.top, 'cm')
    )
  })
}

function getMaxModuleHeight (doc, pictureDefinition) {
  var height = _getLayerBounds(doc.artLayers.getByName('1')).height
   pictureDefinition.modules.slice(1).forEach(function (moduleDefinition, i) {
    var layerBounds = _getLayerBounds(doc.artLayers.getByName(String(i + 1)))
    height = layerBounds.height > height ? layerBounds.height : height
  })

  return height
}

function selectModuleLayers (doc, pictureDefinition) {
  doc.activeLayer = doc.artLayers.getByName('1')
  for (var i = 1; i < pictureDefinition.modules.length; i++) {
    _selectAdditionalLayer(String(i + 1))
  }
}

function _createGroupFromLayers () {
  var desc46 = new ActionDescriptor()
  var ref28 = new ActionReference()
  ref28.putClass(stringIDToTypeID('layerSection'))
  desc46.putReference(charIDToTypeID('null'), ref28)
  var ref29 = new ActionReference()
  ref29.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'))
  desc46.putReference(charIDToTypeID('From'), ref29)
  executeAction(charIDToTypeID('Mk  '), desc46, DialogModes.NO)
}

var config
function beginMagic () {
  config = _parseConfig()

  var prevRulerUnits, prevTypeUnits
  prevRulerUnits = app.preferences.rulerUnits
  prevTypeUnits = app.preferences.typeUnits
  app.preferences.rulerUnits = Units.CM
  app.preferences.typeUnits = TypeUnits.POINTS

  _showInfoDialog('', function (pictureDefinition, size) {
    try {
      pictureDefinitionGotten(pictureDefinition, size)
    } catch (e) {
      alert(e)
    }

    app.preferences.rulerUnits = prevRulerUnits
    app.preferences.typeUnits = prevTypeUnits
  })

}

beginMagic()
