/* global app, Folder, File, activeDocument, Extension, MatteType, FormatOptions, JPEGSaveOptions, BitsPerChannelType */

var FILENAME_REPLACE_EXT_RE = /\.[^.]+$/;
var LAYER_NAME_RE = /^\d+$/ig;
var PSD_FILENAME_PATTERN_RE = /\.(psd)$/i;

var PSD_FOLDER_PATH = '~/Documents/Photoshop TZ/';
var OUT_SUBFOLDER = '_/';
var JPG_QUALITY = 10;

/**
 * Возвращает имя файла без расширения.
 * @returns {string}
 */
function getFileNameWoExtension() {
  return activeDocument.name.replace(FILENAME_REPLACE_EXT_RE, '');
}

/**
 * Открывает все документы в папке.
 * @param folderPath
 */
function openFilesInDir(folderPath) {
  // A hard coded path to a directory 'mac style'
  var processFolder = Folder(folderPath);
  // Use folder object get files function with mask 'a reg ex'
  var fileList = processFolder.getFiles(PSD_FILENAME_PATTERN_RE);

  for (var i = 0; i < fileList.length; i++) {
    // Only process the returned file objects
    // The filter 'should' have missed out any folder objects
    if (fileList[i] instanceof File && fileList[i].hidden == false) {
      // get a reference to the new document
      open(fileList[i]);
    }
  }
}

/**
 Обрабатывает все открытые документы.
 */
function processAllDocuments() {
  var doc;

  for (var i = 0; i < app.documents.length; i++) {
    doc = app.documents[i];
    app.activeDocument = doc;
    try {
      processDocument(doc);
    } catch (e) {
      alert('С документом ' + doc.name + ' какая-то хуйня! Гра, разберись!\n' + e.toString());
    }
  }
}

/**
 * Сохраняет активный документ в JPG.
 */
function saveJPEG(filePath, fileName) {
  var doc = app.activeDocument;
  if (doc.bitsPerChannel != BitsPerChannelType.EIGHT) {
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
  }

  var file = new File(filePath + fileName + '.jpg');

  var jpgSaveOptions = new JPEGSaveOptions();
  jpgSaveOptions.embedColorProfile = false;
  jpgSaveOptions.formatOptions = FormatOptions.STANDARDBASELINE;
  jpgSaveOptions.matte = MatteType.NONE;
  jpgSaveOptions.quality = JPG_QUALITY;
  activeDocument.saveAs(file, jpgSaveOptions, true, Extension.LOWERCASE);
}

/**
 * Возвращает размеры и координаты слоя.
 * @param layer
 * @returns {{name: *, left: (string|Number), top: (string|Number), right: (string|Number), bottom: (string|Number), width: number, height: number}}
 */
function getLayerDims(layer) {
  /*
   (x, y) верхнего левого угла
   (x, y) нижнего правого угла
   */
  var bounds = layer.boundsNoEffects;

  var left = bounds[0].value;
  var top = bounds[1].value;
  var right = bounds[2].value;
  var bottom = bounds[3].value;

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
function getModulesSizes() {
  var layers = activeDocument.artLayers;
  var layerSizes = [], layerSize;

  var minTop;
  var maxBottom;
  var minLeft;
  var maxRight;

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if (/^\d+$/.test(layer.name)) {
      layerSizes.push(layerSize = getLayerDims(layer));

      if (typeof minTop === 'undefined') {
        minTop = layerSize.top;
        maxBottom = layerSize.bottom;
        minLeft = layerSize.left;
        maxRight = layerSize.right;
      }

      if (layerSize.top < minTop) { minTop = layerSize.top; }
      if (layerSize.bottom > maxBottom) { maxBottom = layerSize.bottom; }
      if (layerSize.left < minLeft) { minLeft = layerSize.left; }
      if (layerSize.right > maxRight) { maxRight = layerSize.right; }
    }
  }

  return {
    layerSizes: layerSizes,
    overall: {
      height: maxBottom - minTop,
      width: maxRight - minLeft
    }
  };
}

var FILES = {};

function createFile(filePath, fileNameWithExtension, fileId) {
  var file = File(filePath + fileNameWithExtension);

  if (file.exists) {
    file.remove();
  }

  FILES[fileId] = file;

  file.encoding = "UTF8";
  file.open("e", "TEXT", "????");
}

function writeToFile(text, fileId) {
  if (FILES[fileId]) {
    FILES[fileId].writeln(text);
  }
}

function closeFile(fileId) {
  if (FILES[fileId]) {
    FILES[fileId].close();
    delete FILES[fileId];
  }
}

