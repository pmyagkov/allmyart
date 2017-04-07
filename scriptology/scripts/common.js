/* global app, Folder, File, activeDocument, Extension, MatteType, FormatOptions, JPEGSaveOptions, BitsPerChannelType */

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
        // doc.close(SaveOptions.DONOTSAVECHANGES)
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

