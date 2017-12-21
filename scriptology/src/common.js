/* global app, Folder, File, activeDocument, Extension, MatteType, FormatOptions, JPEGSaveOptions, BitsPerChannelType */
_evalDependencies([
  // '../lib/es5-shim.js',
  '../lib/ini.js',
])

var FILENAME_REPLACE_EXT_RE = /\.[^.]+$/
var LAYER_NAME_RE = /^\d+$/ig
var M_LAYER_RE = /^M_.+$/ig
var PSD_FILENAME_PATTERN_RE = /\.(psd)$/i

/*
 * 1. В PS должны быть выставлены дефолтные единицы измерения в pixel.
 * 2. Папки `PSD_FOLDER_PATH`, `TEXTURES_PATH` и `PSD_FOLDER_PATH+OUT_SUBFOLDER` должны существовать.
 */
var PSD_FOLDER_PATH = '/Users/puelle/Projects/allmyart/scriptology/samples/'
var TEXTURES_PATH = "/Users/puelle/Projects/allmyart/scriptology/textures/"

var PATH_TO_BACKGROUND = TEXTURES_PATH + "concrete.jpg"
var PATH_TO_CANVAS = TEXTURES_PATH + "canvas_dark.jpg"

var OUT_SUBFOLDER = '_/'
var JPG_QUALITY = 10

var c = charIDToTypeID

var SLASH = $.os.indexOf('Macintosh') > -1 ? '/' : '\\'

/**
 * Возвращает имя файла без расширения.
 * @returns {string}
 */
function getFileNameWoExtension () {
  return activeDocument.name.replace(FILENAME_REPLACE_EXT_RE, '')
}

/**
 * Открывает все документы в папке.
 * @param folderPath
 */
function openFilesInDir (folderPath) {
  // A hard coded path to a directory 'mac style'
  var processFolder = Folder(folderPath)
  // Use folder object get files function with  mask 'a reg ex'
  var fileList = processFolder.getFiles(PSD_FILENAME_PATTERN_RE)

  for (var i = 0; i < fileList.length; i++) {
    // Only process the returned file objects
    // The filter 'should' have missed out any folder objects
    if (fileList[i] instanceof File && fileList[i].hidden == false) {
      // get a reference to the new document
      var doc = open(fileList[i])
      /*try {*/
        var result = processDocument(doc)
      /*} catch (e) {
        alert('С документом ' + doc.name + ' какая-то хуйня! Гра, разберись!\n' + e.toString())
        result = false
      }*/

      if (result) {
        doc.close(SaveOptions.DONOTSAVECHANGES)
      }
    }
  }
}

/**
 *
 * @param format JPEG
 */
function exportFile (filePath, fileName, format) {
  var doc = app.activeDocument
  if (doc.bitsPerChannel != BitsPerChannelType.EIGHT) {
    doc.bitsPerChannel = BitsPerChannelType.EIGHT
  }

  var exportOptions
  var extension
  var method
  var additionalArgs = []

  if (format === 'PNG') {
    method = 'exportDocument'
    extension = '.png'

    exportOptions = new ExportOptionsSaveForWeb()
    exportOptions.PNG8 = false
    exportOptions.transparency = true
    exportOptions.interlaced = false
    exportOptions.quality = 100
    exportOptions.includeProfile = false
    exportOptions.format = SaveDocumentType.PNG

    additionalArgs.push(ExportType.SAVEFORWEB, exportOptions)
  }
  if (format === 'JPEG') {
    method = 'exportDocument'
    extension = '.jpg'

    additionalArgs.push(ExportType.SAVEFORWEB)
  }
  if (format === 'PSD') {
    method = 'saveAs'
    extension = '.psd'

    exportOptions = new PhotoshopSaveOptions()
    exportOptions.layers = true
    exportOptions.embedColorProfile = true
    exportOptions.annotations = true
    exportOptions.alphaChannels = true
    exportOptions.spotColors = true

    additionalArgs.push(exportOptions, true)
  }
  if (format === 'TIF') {
    method = 'saveAs'
    extension = '.tif'

    exportOptions = new TiffSaveOptions()
    exportOptions.layers = true
    exportOptions.embedColorProfile = true
    exportOptions.alphaChannels = true
    exportOptions.imageCompression = TIFFEncoding.NONE
  }

  var file = new File(filePath + fileName + extension)
  var args = [file].concat(additionalArgs)

  doc[method].apply(doc, args)
}

/**
 * Возвращает размеры и координаты слоя.
 * @param layer
 * @returns {{name: *, left: (string|Number), top: (string|Number), right: (string|Number), bottom: (string|Number), width: number, height: number}}
 */
function getLayerDims (layer) {
  /*
   (x, y) верхнего левого угла
   (x, y) нижнего правого угла
   */
  var bounds = layer.boundsNoEffects

  var left = bounds[0].value
  var top = bounds[1].value
  var right = bounds[2].value
  var bottom = bounds[3].value

  return {
    name: layer.name,

    left: left,
    top: top,
    right: right,
    bottom: bottom,

    width: right - left,
    height: bottom - top
  }
}

/**
 * Возвращает общую длину и ширину слоев и координаты каждого конкретного слоя.
 * @returns {{layerSizes: Array, overall: {height: number, width: number}}}
 */
function getModulesSizes () {
  var layers = activeDocument.artLayers
  var layerSizes = [], layerSize

  var minTop
  var maxBottom
  var minLeft
  var maxRight

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i]
    if (/^\d+$/.test(layer.name)) {
      layerSizes.push(layerSize = getLayerDims(layer))

      if (typeof minTop === 'undefined') {
        minTop = layerSize.top
        maxBottom = layerSize.bottom
        minLeft = layerSize.left
        maxRight = layerSize.right
      }

      if (layerSize.top < minTop) {
        minTop = layerSize.top
      }
      if (layerSize.bottom > maxBottom) {
        maxBottom = layerSize.bottom
      }
      if (layerSize.left < minLeft) {
        minLeft = layerSize.left
      }
      if (layerSize.right > maxRight) {
        maxRight = layerSize.right
      }
    }
  }

  return {
    layerSizes: layerSizes,
    overall: {
      height: maxBottom - minTop,
      width: maxRight - minLeft
    }
  }
}

var FILES = {}

function createFile (filePath, fileNameWithExtension, fileId) {
  var file = File(filePath + fileNameWithExtension)

  if (file.exists) {
    file.remove()
  }

  FILES[fileId] = file

  file.encoding = "UTF8"
  file.open("e", "TEXT", "????")
}

function writeToFile (text, fileId) {
  if (FILES[fileId]) {
    FILES[fileId].writeln(text)
  }
}

function closeFile (fileId) {
  if (FILES[fileId]) {
    FILES[fileId].close()
    delete FILES[fileId]
  }
}

/**
 *
 * @param layer ArtLayer obj or a layer name
 * @returns {{left, top, right, bottom, width, height}}
 * @private
 */
function _getLayerBounds (layer) {
  if (!layer.boundsNoEffects) {
    layer = _getLayerByName(layer)
  }

  var bounds = layer.boundsNoEffects

  var boundsObj = {
    left: bounds[0].value,
    top: bounds[1].value,
    right: bounds[2].value,
    bottom: bounds[3].value,
  }

  boundsObj.height = boundsObj.bottom - boundsObj.top
  boundsObj.width = boundsObj.right - boundsObj.left

  return boundsObj
}

function _getLayerUnitBounds (layer) {
  if (!layer.boundsNoEffects) {
    layer = _getLayerByName(layer)
  }

  var bounds = layer.boundsNoEffects

  var boundsObj = {
    left: bounds[0],
    top: bounds[1],
    right: bounds[2],
    bottom: bounds[3],
  }

  boundsObj.height = boundsObj.bottom - boundsObj.top
  boundsObj.width = boundsObj.right - boundsObj.left

  return boundsObj
}


function _placeImageOnNewLayer (imageFile) {
  var desc2 = new ActionDescriptor()
  desc2.putPath(c("null"), new File(imageFile))
  desc2.putEnumerated(c("FTcs"), c("QCSt"), c("Qcsa"))

  var desc3 = new ActionDescriptor()
  desc3.putUnitDouble(c("Hrzn"), c("#Pxl"), 0)
  desc3.putUnitDouble(c("Vrtc"), c("#Pxl"), 0)

  desc2.putObject(c("Ofst"), c("Ofst"), desc3)

  executeAction(c("Plc "), desc2, DialogModes.NO)

  return _rasterizeLayer()
}

function _addLayerToSelection (layerName) {
  var desc54 = new ActionDescriptor()
  var ref53 = new ActionReference()
  ref53.putName(c("Lyr "), layerName)
  desc54.putReference(c("null"), ref53)
  desc54.putEnumerated(
    stringIDToTypeID("selectionModifier"),
    stringIDToTypeID("selectionModifierType"),
    stringIDToTypeID("addToSelection")
  )
  desc54.putBoolean(c("MkVs"), false)
  executeAction(c("slct"), desc54, DialogModes.NO)
}

function _deleteSelection () {
  var idDlt = c("Dlt ")
  executeAction(idDlt, undefined, DialogModes.NO)
}

function _invertSelection () {
  activeDocument.selection.invert()
}

function _rasterizeLayer () {
  var desc116 = new ActionDescriptor()
  var ref87 = new ActionReference()
  ref87.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))
  desc116.putReference(c("null"), ref87)
  executeAction(stringIDToTypeID("rasterizeLayer"), desc116, DialogModes.NO)

  return activeDocument.activeLayer
}

function _moveLayer (layer, offsetX, offsetY) {
  var desc26 = new ActionDescriptor()
  var ref25 = new ActionReference()
  ref25.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))
  desc26.putReference(c("null"), ref25)

  var desc27 = new ActionDescriptor()
  desc27.putUnitDouble(c("Hrzn"), c("#Pxl"), offsetX)
  desc27.putUnitDouble(c("Vrtc"), c("#Pxl"), offsetY)
  desc26.putObject(c("T   "), c("Ofst"), desc27)
  executeAction(c("move"), desc26, DialogModes.NO)
}

function addLayerToSelection (layer, isFirst) {
  var layerName = layer.name

  if (isFirst) {
    var desc98 = new ActionDescriptor()
    var ref66 = new ActionReference()

    ref66.putProperty(c("Chnl"), c("fsel"))
    desc98.putReference(c("null"), ref66)

    var ref67 = new ActionReference()
    ref67.putEnumerated(c("Chnl"), c("Chnl"), c("Trsp"))
    ref67.putName(c("Lyr "), layerName)
    desc98.putReference(c("T   "), ref67)
    executeAction(c("setd"), desc98, DialogModes.NO)

  } else {
    var desc99 = new ActionDescriptor()
    var ref68 = new ActionReference()

    ref68.putEnumerated(c("Chnl"), c("Chnl"), c("Trsp"))
    ref68.putName(c("Lyr "), layerName)
    desc99.putReference(c("null"), ref68)

    var ref69 = new ActionReference()
    ref69.putProperty(c("Chnl"), c("fsel"))
    desc99.putReference(c("T   "), ref69)
    executeAction(c("Add "), desc99, DialogModes.NO)
  }

}

function _deselect () {
  activeDocument.selection.deselect()
}

function _select (coords) {
  activeDocument.selection.select(coords)
}

function _deleteArea () {
  var idDlt = c("Dlt ")
  executeAction(idDlt, undefined, DialogModes.NO)
}

function _readFile (filePath) {
  var fileDescriptor = new File(filePath)
  fileDescriptor.open('r')

  var content = '';
  while (!fileDescriptor.eof) {
    content += fileDescriptor.readln() + '\n'
  }

  fileDescriptor.close()

  return content
}

function _normalizePath (path) {
  var isMacOS = $.os.indexOf('Macintosh') > -1
  var normalizedPath = path.replace(/\\/g, '/')
  var split = normalizedPath.split('/')
  var i = split.length - 1
  while (i >= 0) {
    var part = split[i]
    if (part === '.') {
      split.splice(i, 1)
    }
    if (part === '..') {
      split.splice(i - 1, 2)
      i--
    }
    i--
  }
  normalizedPath = split.join('/')

  if (!isMacOS) {
    normalizedPath = normalizedPath.replace(/\//g, '\\')
  }

  return normalizedPath
}

function _parseConfig () {
  const scriptDirPath = File($.fileName).parent.fsName + '/'
  const CONFIG_PATH = '../config/config.ini'

  var rawConfig = $.ini.parse(_readFile(_normalizePath(scriptDirPath + CONFIG_PATH)))
  rawConfig.sizes.outer_frame = parseInt(rawConfig.sizes.outer_frame, 10)

  return rawConfig
}

var EVALED_SCRIPTS = {}
function _evalDependencies (dependencies) {
  var scriptDirPath = File($.fileName).parent.fsName + '/'
  EVALED_SCRIPTS = EVALED_SCRIPTS || {}
  for (var i = 0; i < dependencies.length; i++) {
    var normalizedPath = _normalizePath(scriptDirPath + dependencies[i])
    if (!EVALED_SCRIPTS[normalizedPath]) {
      $.writeln(_normalizePath(scriptDirPath + dependencies[i]))
      $.evalFile(_normalizePath(scriptDirPath + dependencies[i]))
      EVALED_SCRIPTS[normalizedPath] = true
    }
  }
}

function _parsePictureDefinition (line) {
  if (!line) {
    return null
  }

  var split = line.split(';')
  if (split.length === 1) {
    alert('Something wrong with a line from the sheet: `' + line + '`')
    return null
  }

  // the first chunk is a name
  var name = split[0]
  split = split.slice(1)

  var MAX_MODULES_NUMBER = 6

  // others — modules width and height
  var moduleIndex = 0
  var modules = []
  var w, h
  while (moduleIndex < MAX_MODULES_NUMBER) {
    w = parseInt(split[2 * moduleIndex], 10)
    h = parseInt(split[2 * moduleIndex + 1], 10)
    if (w === 0 || h === 0) {
      break
    }

    modules.push([w, h])
    moduleIndex++
  }
  split = split.slice(2 * MAX_MODULES_NUMBER)
  var margin = parseInt(split[0], 10)
  var orientation = split[1]

  return {
    name: name,
    modules: modules,
    margin: margin,
    orientation: orientation,
  }
}

function _findPictureInTable (fileName) {
  var fileDescriptor = new File(config.paths.table)
  fileDescriptor.open('r')

  var line = '';
  while (!fileDescriptor.eof) {
    line = fileDescriptor.readln()
    if (line.indexOf(fileName) > -1) {
      break
    }
  }

  fileDescriptor.close()

  if (!line) {
    alert('No file `' + fileName + '` found in the sheet.')
    return null
  }

  return _parsePictureDefinition(line)
}

function _drawLine (startXY, endXY, width) {
  var desc = new ActionDescriptor()
  var lineDesc = new ActionDescriptor()
  var startDesc = new ActionDescriptor()
  startDesc.putUnitDouble(c('Hrzn'), c('#Pxl'), startXY[0])
  startDesc.putUnitDouble(c('Vrtc'), c('#Pxl'), startXY[1])
  lineDesc.putObject(c('Strt'), c('Pnt '), startDesc)
  var endDesc = new ActionDescriptor()
  endDesc.putUnitDouble(c('Hrzn'), c('#Pxl'), endXY[0])
  endDesc.putUnitDouble(c('Vrtc'), c('#Pxl'), endXY[1])
  lineDesc.putObject(c('End '), c('Pnt '), endDesc)
  lineDesc.putUnitDouble(c('Wdth'), c('#Pxl'), width)
  desc.putObject(c('Shp '), c('Ln  '), lineDesc)
  desc.putBoolean(c('AntA'), true)
  executeAction(c('Draw'), desc, DialogModes.NO)
}

function _selectWithEllipse (bounds) {
  var desc171 = new ActionDescriptor()
  var ref79 = new ActionReference()
  ref79.putProperty(c('Chnl'), c('fsel'))
  desc171.putReference(c('null'), ref79)
  var desc172 = new ActionDescriptor()
  desc172.putUnitDouble(c('Top '), c('#Pxl'), bounds.top)
  desc172.putUnitDouble(c('Left'), c('#Pxl'), bounds.left)
  desc172.putUnitDouble(c('Btom'), c('#Pxl'), bounds.bottom)
  desc172.putUnitDouble(c('Rght'), c('#Pxl'), bounds.right)
  desc171.putObject(c('T   '), c('Elps'), desc172)
  desc171.putBoolean(c('AntA'), true)
  executeAction(c('setd'), desc171, DialogModes.NO)
}

function _showInfoDialog (defaultPicture, callback, secondAttempt) {
  var dialogTitle = secondAttempt
    ? 'Are you dump?'
    : 'Give me the info bitch!'

  var win = new Window ('dialog', dialogTitle)
  win.alignChildren = 'left'
  win.orientation = 'column'
  win.size = { width: 245, height: 170 }

  var skuPanel = win.skuPanel = win.add('panel')
  skuPanel.orientation = 'row'
  var skuLabel = win.skuLabel = skuPanel.add('statictext', [0, 0, 35, 20], 'Sku:')
  var skuField = win.skuField = skuPanel.add('edittext', [0, 0, 70, 20], defaultPicture)
  skuField.active = true
  skuField.minimalSize = [80, 20]

  skuLabel.location = [10, 10]
  skuField.location = [60, 10]

  var sizePanel = win.sizePanel = win.add('panel')
  sizePanel.orientation = 'row'
  var sizeLabel = win.sizeLabel = sizePanel.add('statictext', [0, 0, 35, 20], 'Size:')
  var size1Field = win.size1Field = sizePanel.add('radiobutton', [0, 0, 50, 20], '3cm')
  win.size1Field.value = true
  var size2Field = win.size2Field = sizePanel.add('radiobutton', [0, 0, 80, 20], '3.5cm')

  win.okButton = win.add('button', undefined, 'OK')

  win.okButton.onClick = function() {
    win.hide()

    LINE_SIDE_MARGIN = size1Field.value ? LINE_SIDE_MARGIN : LINE_SIDE_MARGIN + 0.5
    var size = new UnitValue(size1Field.value ? 3 : 3.5, 'cm')
    var sku = skuField.text

    if (!sku) {
      _showInfoDialog(defaultPicture, callback, true)
    }

    var pictureDefinition = _findPictureInTable(sku)
    if (pictureDefinition) {
      callback(pictureDefinition, size)
    }

    return false
  }

  win.show()

  return win
}

/**
 @param {[x,y][]]} points
 */
function _cropArea (layer, points) {
  var prevLayer = activeDocument.activeLayer
  activeDocument.activeLayer = layer

  _selectLasso()
  _selectPoints(points)
  _deleteArea()

  activeDocument.activeLayer = prevLayer
}

function _selectAdditionalLayer (layer) {
  var desc2 = new ActionDescriptor()
  var ref1 = new ActionReference()

  ref1.putName(c("Lyr "), layer.name ? layer.name : layer)
  desc2.putReference(c("null"), ref1)
  desc2.putEnumerated(
    stringIDToTypeID("selectionModifier"),
    stringIDToTypeID("selectionModifierType"),
    stringIDToTypeID("addToSelection")
  )
  desc2.putBoolean(c("MkVs"), false)
  executeAction(c("slct"), desc2, DialogModes.NO)
}

function _duplicateLayers () {
  var desc45 = new ActionDescriptor()
  var ref27 = new ActionReference()
  ref27.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'))
  desc45.putReference(c('null'), ref27)
  desc45.putInteger(c('Vrsn'), 5)
  executeAction(c('Dplc'), desc45, DialogModes.NO)
}
