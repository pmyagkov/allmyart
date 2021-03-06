﻿#target photoshop

#include common.js

/* global activeDocument, ElementPlacement, app, ActionDescriptor, executeAction, charIDToTypeID, DialogModes */

var CSV_ID = 'csv'

var WRITE_TO_CSV = true
//var MAKE_BACKGROUND = true
var DO_RESIZE = true

// разница между `y` нижней границы модуля и `y` верхней границы черного прямоугольника
var BOTTOM_RECT_UP = 20
// разница между `y` нижней границы модуля и `y` нижней границы черного прямоугольника
var BOTTOM_RECT_BOTTOM = 30

// разница между `x` правой границы модуля и `x` правой границы черногоs прямоугольника
var BOTTOM_RECT_RIGHT = 20

// разница между `x` правой границы модуля и `x` левой границы черного прямоугольника
var RIGHT_RECT_LEFT = 20
// разница между `x` правой границы модуля и `x` правой границы черного прямоугольника
var RIGHT_RECT_RIGHT = 20
// разница между `y` нижней границы модуля и `y` нижней границы черного прямоугольника
var RIGHT_RECT_BOTTOM = 40
// разница между `y` верхней границы модуля и `y` верхней границы черного прямоугольника
var RIGHT_RECT_UP = 10

var RIGHT_SIDE_WIDTH = 6
var BOTTOM_SIDE_HEIGHT = 8
var BOTTOM_LEFT_CORNER_WIDTH = 11
var TOP_SIDE_MARGIN = 2
var TOP_SIDE_HEIGHT = 2

var FEATHER_VALUE = 3


/**
 Требования:
 Cлои для обработки должны называться десятичной цифрой без букв.
 Слой с фоном должен называться `fon`.

 Нужно создать подпапку `_` в папке, где лежат PSD.
 */

var BG_LAYER_NAME = 'bg'
var CANVAS_LAYER_NAME = 'canvas'

var ORIENTATION = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3
}

// величина обрезки угла слоя
/*var LAYER_CORNER_CROP = 10;*/

function processBottomSide (mainLayer, rightLayer) {
  activeDocument.activeLayer = mainLayer
  /*
   (x, y) верхнего левого угла
   (x, y) нижнего правого угла
   */
  var mainBounds = mainLayer.boundsNoEffects
  var left = mainBounds[0].value
  var bottom = mainBounds[3].value

  var rightBounds = rightLayer.boundsNoEffects
  var right = rightBounds[2].value

  _selectAdditionalLayer(rightLayer)

  var bottomSideCords = [
    [left, bottom - BOTTOM_SIDE_HEIGHT],
    [right, bottom - BOTTOM_SIDE_HEIGHT],
    [right, bottom],
    [left, bottom]
  ]

  _select(bottomSideCords)

  _duplicateAndMerge()
  var mergedLayer = activeDocument.activeLayer
  mergedLayer.name = '_' + mainLayer.name

  var bottomParanjaLayer = activeDocument.artLayers.add()
  bottomParanjaLayer.name = mergedLayer.name + '_bottom'
  _createRectAndFillWithBlack(bottomParanjaLayer, bottomSideCords)

  bottomParanjaLayer.opacity = 54

  // обрезаем нижний угол
  _cropArea(bottomParanjaLayer, [
    [left, bottom],
    [left + BOTTOM_LEFT_CORNER_WIDTH, bottom],
    [left, bottom - BOTTOM_SIDE_HEIGHT],
  ])

  activeDocument.activeLayer = bottomParanjaLayer

  var paranjaBounds = _getLayerBounds(bottomParanjaLayer)
  _select([
    [paranjaBounds.right, paranjaBounds.top - 40],
    [paranjaBounds.right + 40, paranjaBounds.top - 40],
    [paranjaBounds.right + 40, paranjaBounds.bottom + 40],
    [paranjaBounds.right, paranjaBounds.bottom + 40],
  ])

  for (var i = 0; i < 4; i++) {
    _feather(10)
    _deleteSelection()
  }

  _cropArea(mergedLayer, [
    [left, bottom],
    [left + BOTTOM_LEFT_CORNER_WIDTH, bottom],
    [left, bottom - BOTTOM_SIDE_HEIGHT],
  ])

  activeDocument.activeLayer = mergedLayer

  mainLayer.visible = false
  rightLayer.visible = false

  return activeDocument.activeLayer
}

/**
 * Изменяем яркость слоя
 * @param layer
 * @param brightness
 * @param contrast
 */
function _adjustBrightness (layer, brightness, contrast) {
  var prevActiveLayer = activeDocument.activeLayer
  activeDocument.activeLayer = layer
  // уменьшаем яркость
  layer.adjustBrightnessContrast(brightness, contrast)

  activeDocument.activeLayer = prevActiveLayer
}

function processTopSide (options) {
  var mainLayer = options.mainLayer
  var mergedLayer = options.mergedLayer

  activeDocument.activeLayer = mergedLayer

  var mainBounds = _getLayerBounds(mainLayer)

  var topSideCords = [
    [mainBounds.right + TOP_SIDE_MARGIN, mainBounds.top],
    [mainBounds.left, mainBounds.top],
    [mainBounds.left, mainBounds.top + TOP_SIDE_HEIGHT],
    [mainBounds.right + TOP_SIDE_MARGIN, mainBounds.top + TOP_SIDE_HEIGHT]
  ]

  _select(topSideCords)

  // вырезаем слой из выделения и переназываем его
  var newLayer = _createLayerVia(LAYER_VIA_OPERATION.cut, '_top')
  // искажаем выделение
  // уменьшаем яркость
  _adjustBrightness(newLayer, 30, 0)
  _deselect()

  return newLayer
}

function processRightSide (layer) {
  activeDocument.activeLayer = layer

  var bounds = _getLayerBounds(layer)

  var rightSideCords = [
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.bottom]
  ]

  _select(rightSideCords)

  // вырезаем слой из выделения и переназываем его
  var rightLayer = _createLayerVia(LAYER_VIA_OPERATION.cut, '_right')
  // искажаем выделение
  _transformRightEdge(3)

  _skewSelection()
  _deselect()

  var rightSideCordsWithSkew = [
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom + 25],
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.bottom + 25]
  ]

  var featherLayer = _createLayerVia(LAYER_VIA_OPERATION.copy, '_shadow')
  featherLayer.name = '_' + layer.name + '_right'

  // уменьшаем яркость
  _adjustBrightness(featherLayer, -140, 0)

  var layers = [rightLayer, featherLayer]
  for (var i = 0; i < layers.length; i++) {
    // обрезаем нижний угол
    _cropArea(layers[i], [
      [bounds.right - RIGHT_SIDE_WIDTH - 5, bounds.bottom],
      [bounds.right + RIGHT_SIDE_WIDTH * 2 + 2, bounds.bottom],
      [bounds.right + RIGHT_SIDE_WIDTH * 2 + 2, bounds.bottom + 30]
    ])
    _deselect()
  }

  _featherAndDelete(featherLayer, FEATHER_VALUE)

  _deselect()

  return rightLayer
}

function _feather (radius) {
  var desc177 = new ActionDescriptor()
  desc177.putUnitDouble(c("Rds "), c("#Pxl"), radius)
  executeAction(c("Fthr"), desc177, DialogModes.NO)
}

function _featherAndDelete (layer, radius) {
  activeDocument.activeLayer = layer

  var bounds = _getLayerBounds(layer)

  var rightSideCords = [
    [bounds.left - 30, bounds.top - 10],
    [bounds.left, bounds.top - 10],
    [bounds.left, bounds.bottom + 10],
    [bounds.left - 30, bounds.bottom + 10]
  ]

  _select(rightSideCords)

  for (var i = 0; i < 2; i++) {
    _feather(radius)
    _deleteSelection()
  }
}

function _transformRightEdge (widthMultiplier) {
  const bounds = _getLayerBounds(activeDocument.activeLayer)

  const horizontalOffset = widthMultiplier / 2 * bounds.width
  const finalPercentageWidth = widthMultiplier * 100

  var desc8 = new ActionDescriptor()
  var ref5 = new ActionReference()
  ref5.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))
  desc8.putReference(c("null"), ref5)
  desc8.putEnumerated(c("FTcs"), c("QCSt"), c("Qcs7"))
  var desc9 = new ActionDescriptor()
  desc9.putUnitDouble(c("Hrzn"), c("#Pxl"), 0)
  desc9.putUnitDouble(c("Vrtc"), c("#Pxl"), 0)
  desc8.putObject(c("Ofst"), c("Ofst"), desc9)
  desc8.putUnitDouble(c("Wdth"), c("#Prc"), finalPercentageWidth)
  desc8.putEnumerated(c("Intr"), c("Intp"), c("Bcbc"))
  executeAction(c("Trnf"), desc8, DialogModes.NO)
}

function _skewSelection () {
  var SKEW_ANGLE = 60
  var VERTICAL_TRANSLATE = 16

  var desc22 = new ActionDescriptor()
  var ref13 = new ActionReference()

  ref13.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))
  desc22.putReference(c("null"), ref13)
  desc22.putEnumerated(c("FTcs"), c("QCSt"), c("Qcsa"))

  var desc23 = new ActionDescriptor()
  desc23.putUnitDouble(c("Hrzn"), c("#Pxl"), 0)
  desc23.putUnitDouble(c("Vrtc"), c("#Pxl"), VERTICAL_TRANSLATE)
  desc22.putObject(c("Ofst"), c("Ofst"), desc23)
  desc22.putUnitDouble(c("Wdth"), c("#Prc"), 100)

  var desc24 = new ActionDescriptor()
  desc24.putUnitDouble(c("Hrzn"), c("#Ang"), 0)
  desc24.putUnitDouble(c("Vrtc"), c("#Ang"), SKEW_ANGLE)
  desc22.putObject(c("Skew"), c("Pnt "), desc24)
  desc22.putEnumerated(c("Intr"), c("Intp"), c("Bcbc"))

  executeAction(c("Trnf"), desc22, DialogModes.NO)
}

function _duplicateAndMerge () {
  var ref7 = new ActionReference()
  ref7.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))

  var desc11 = new ActionDescriptor()
  desc11.putReference(c("null"), ref7)
  desc11.putInteger(c("Vrsn"), 5)
  executeAction(c("Dplc"), desc11, DialogModes.NO)

  _mergeSelectedLayers()
}

/**
 * Обрабатывает целевой слой: skew, яркость.
 * @param {ArtLayer} layer
 * @returns {ArtLayers[]} созданные в процессе слои
 */
function processModularLayer (layer) {
  var rightLayer = processRightSide(layer)

  var mergedLayer = processBottomSide(layer, rightLayer)

  var topSideLayer = processTopSide({
    mergedLayer: mergedLayer,
    mainLayer: layer
  })

  var shadowLayer = createBoxShadow({
    mergedLayer: mergedLayer,
    moduleLayer: layer
  })

  var mainLayer = _mergeLayersForModules(layer)

  var bgLayer = _getLayerByName('bg')
  shadowLayer.move(bgLayer, ElementPlacement.PLACEBEFORE)

  return {
    main: mainLayer,
    shadow: shadowLayer
  }
}

function _mergeLayersForModules (mainLayer) {
  var mainLayerName = mainLayer.name
  activeDocument.activeLayer = _getLayerByName('_' + mainLayerName)

  _addLayerToSelection('_' + mainLayerName + '_bottom')
  _addLayerToSelection('_' + mainLayerName + '_top')
  _addLayerToSelection('_' + mainLayerName + '_right')

  _mergeSelectedLayers()

  activeDocument.activeLayer.name = '_' + mainLayerName

  return activeDocument.activeLayer
}

function createBoxShadow (options) {
  var LEFT_OFFSET = 13
  var TOP_OFFSET = 5
  var RIGHT_OFFSET = 18
  var BOTTOM_OFFSET = 32

  var mergedLayer = options.mergedLayer
  var moduleLayer = options.moduleLayer

  var shadowLayer = activeDocument.artLayers.add()
  shadowLayer.name = '_' + moduleLayer.name + '_shadow'

  var layerBounds = _getLayerBounds(mergedLayer)

  var rightEdge = layerBounds.right + RIGHT_OFFSET
  var bottomEdge = layerBounds.bottom + BOTTOM_OFFSET
  var leftEdge = layerBounds.left + LEFT_OFFSET
  var topEdge = layerBounds.top + TOP_OFFSET

  var cords = [
    [leftEdge, topEdge],
    [rightEdge, topEdge],
    [rightEdge, bottomEdge],
    [leftEdge, bottomEdge]
  ]

  _createRectAndFillWithBlack(shadowLayer, cords)

  shadowLayer.move(moduleLayer, ElementPlacement.PLACEBEFORE)
  _moveLayer(shadowLayer, -6, 0)

  var RIGHT_SKEW = 60

  // обрезаем угол
  var shadowLayerBounds = _getLayerBounds(shadowLayer)
  cords = [
    [shadowLayerBounds.right - 13 - 9, shadowLayerBounds.top],
    [shadowLayerBounds.right, shadowLayerBounds.top + RIGHT_SKEW],
    [rightEdge + 1, shadowLayerBounds.top + RIGHT_SKEW],
    [rightEdge + 1, shadowLayerBounds.top - 10],
    [shadowLayerBounds.right - 13 - 9, shadowLayerBounds.top - 10],
  ]

  _select(cords)
  _deleteSelection()

  // прозрачность
  shadowLayer.opacity = 30

  // размытие
  _applyGaussianBlur(shadowLayer, 3)

  return shadowLayer
}

function _applyGaussianBlur (layer, value) {
  activeDocument.activeLayer = layer

  activeDocument.selection.selectAll()
  activeDocument.activeLayer.applyGaussianBlur(value)
}

/**
 Заливает область выделения черным.
 */
function _createRectAndFillWithBlack (layer, coords) {
  activeDocument.activeLayer = layer

  _select(coords)

  app.foregroundColor.rgb.hexColor = '000000'
  //app.foregroundColor.model = ColorModel.RGB
  activeDocument.selection.fill(app.foregroundColor, ColorBlendMode.COLOR, 100)
}

function _getLayerByName (name) {
  for (var i = 0; i < activeDocument.artLayers.length; i++) {
    var layer = activeDocument.artLayers[i]
    if (layer.name === name) {
      return layer
    }
  }

  alert('Layer ' + name + ' not found!')

  _deselect()
}

function processLayers (document) {
  var layer
  var fon
  var mLayer

  var layersToProcess = []
  var i, j, k
  for (j = 0; j < document.artLayers.length; j++) {
    layer = document.artLayers[j]

    if (LAYER_NAME_RE.test(layer.name)) {
      // обрабатываем слой с картинкой
      layersToProcess.push(layer)
    }

    if (M_LAYER_RE.test(layer.name)) {
      // запоминаем слой M_*
      mLayer = layer
    }

    if (layer.name === BG_LAYER_NAME) {
      fon = layer
    }
  }

  if (mLayer) {
    // отключаем слой M_*
    mLayer.visible = false
  }

  translateLayers(layersToProcess)

  for (j = 0; j < layersToProcess.length; j++) {
    layer = layersToProcess[j]
    // обрабатываем слой с картинкой
    result = processModularLayer(layer, fon)
  }

  var mergedLayer
  var mergedLayers = []
  for (i = 0; i < layersToProcess.length; i++) {
    layer = layersToProcess[i]
    mergedLayer = _getLayerByName('_' + layer.name)
    mergedLayers.push(mergedLayer)
  }

  _deselect()

  // move the entire picture to the right
  /*var layerName
  for (i = 0; i < layersToProcess.length; i++) {
    layerName = layersToProcess[i].name
    _translateLayerWithShadow('_' + layerName, -1 * overallTranslatedBy / 2, 0)
  }*/

  // накладывает canvas на модули с картинами для текстуры (linear burn mode)
  appendCanvasTextureToModules(mergedLayers)

  var pictureDimension = calculatePictureDimension(layersToProcess)


}

function calculatePictureDimension (layersToProcess) {
  var left = 1000000
  var right = -1
  var top = 100000
  var bottom = -1

  var bounds

  // calculating crop bounds
  for (i = 0; i < layersToProcess.length; i++) {
    layerName = layersToProcess[i].name
    bounds = _getLayerBounds('_' + layerName)
    left = bounds.left < left ? bounds.left : left
    top = bounds.top < top ? bounds.top : top

    bounds = _getLayerBounds('_' + layerName + '_shadow')
    right = bounds.right > right ? bounds.right : right
    bottom = bounds.bottom > bottom ? bounds.bottom : bottom
  }

  return {
    left: left,
    top: top,
    right: right,
    bottom: bottom,
    width: right - left,
    height: bottom - top,
  }
}

function translateLayers (layersToProcess) {
  var intersectionObj = null
  var compareLayer
  var rightLayer
  var leftLayer
  var moveDeclaration = {}
  var diff

  var j, k

  for (j = 0; j < layersToProcess.length; j++) {
    layer = layersToProcess[j]
    for (k = j + 1; k < layersToProcess.length; k++) {
      compareLayer = layersToProcess[k]
      intersectionObj = getIntersectionObject(layer, compareLayer)
      intersectionObj && $.writeln(
        'INTERSECTION',
        intersectionObj.left.name,
        intersectionObj.right.name
      )

      if (!intersectionObj) {
        continue
      }

      rightLayer = intersectionObj.right
      leftLayer = intersectionObj.left
      moveDeclaration[rightLayer.name] = {
        layers: ((moveDeclaration[rightLayer.name] || {}).layers || []).concat(leftLayer.name),
        diff: 0
      }
    }
  }

  var rightLayerName
  var moveSequence = []
  for (rightLayerName in moveDeclaration) {
    moveSequence.push(rightLayerName)
  }

  // sort layers from right to left
  moveSequence = moveSequence.sort(function (layer1Name, layer2Name) {
    var bounds1 = _getLayerBounds(layer1Name)
    var bounds2 = _getLayerBounds(layer2Name)
    return bounds1.right < bounds2.left ? 1 : -1
  })

  var leftLayerNames
  var leftLayerNamesToMove
  var layerToMoveName
  var movedLayers = {}
  var overallTranslatedBy = 0
  var translateBy
  for (i = 0; i < moveSequence.length; i++) {
    rightLayerName = moveSequence[i]
    leftLayerNames = moveDeclaration[rightLayerName].layers
    leftLayerNamesToMove = []

    // filter over `movedLayers`
    for (j = 0; j < leftLayerNames.length; j++) {
      layerToMoveName = leftLayerNames[j]
      if (!movedLayers[layerToMoveName]) {
        leftLayerNamesToMove.push(layerToMoveName)
      }
    }

    if (leftLayerNamesToMove.length === 0) {
      continue
    }

    var IDEAL_TRANSLATE_DISTANCE = -24

    // move layers to the left
    for (j = 0; j < leftLayerNamesToMove.length; j++) {
      layerToMoveName = leftLayerNamesToMove[j]
      movedLayers[layerToMoveName] = true

      diff = _getLayersHorizontalDiff(layerToMoveName, rightLayerName)

      translateBy = IDEAL_TRANSLATE_DISTANCE - diff
      _translateLayerWithShadow(layerToMoveName, translateBy, 0)
    }
    overallTranslatedBy = translateBy
  }
}

function _getLayersHorizontalDiff (leftLayerName, rightLayerName) {
  var rightBounds = _getLayerBounds(rightLayerName)
  var leftBounds = _getLayerBounds(leftLayerName)
  var diff = leftBounds.right - rightBounds.left

  return diff
}

function _translateLayerWithShadow (layerName, x, y) {
  _translateLayer(layerName, x, y)
  // _translateLayer(layerName + '_shadow', x, y)
}

function _translateLayer (layerName, x, y) {
  var layerToMove = _getLayerByName(layerName)
  activeDocument.activeLayer = layerToMove
  layerToMove.translate(x, y)
}

/**
 *
 * @param layer1
 * @param layer2
 * @returns {{left, right}} | null
 */
function getIntersectionObject (layer1, layer2) {
  var leftLayer, rightLayer, leftBounds, rightBounds
  var bounds1 = _getLayerBounds(layer1)
  var bounds2 = _getLayerBounds(layer2)

  var BOTTOM_TOP_CORRECTION = 50
  if (bounds1.top + BOTTOM_TOP_CORRECTION> bounds2.bottom ||
    bounds2.top + BOTTOM_TOP_CORRECTION > bounds1.bottom) {
    return null
  }

  /*
    1 t---------b
    2     t---------b
   */
  var option1 = bounds1.top <= bounds2.top && bounds1.bottom >= bounds2.top &&
    bounds1.bottom <= bounds2.bottom && bounds1.bottom >= bounds2.top

  /*
    1      t---------b
    2 t---------b
   */
  var option2 = bounds2.top <= bounds1.top && bounds2.bottom >= bounds1.top &&
    bounds2.bottom <= bounds1.bottom && bounds2.bottom >= bounds1.top

  /*
    1   t------b
    2 t-----------b
   */
  var option3 = bounds1.top >= bounds2.top && bounds1.top <= bounds2.bottom &&
    bounds1.bottom <= bounds2.bottom && bounds1.bottom >= bounds2.top

  /*
    1 t-----------b
    2   t------b
   */
  var option4 = bounds2.top >= bounds1.top && bounds2.top <= bounds1.bottom &&
    bounds2.bottom <= bounds1.bottom && bounds2.bottom >= bounds1.top

  if (!option1 && !option2 && !option3 && !option4) {
    return null
  }

  var layer1MoreLefty = bounds1.right <= bounds2.left
  leftLayer = layer1MoreLefty ? layer1 : layer2
  leftBounds = layer1MoreLefty ? bounds1 : bounds2
  rightLayer = layer1MoreLefty ? layer2 : layer1
  rightBounds = layer1MoreLefty ? bounds2 : bounds1

  // layers are too far
  if (leftBounds.right <= rightBounds.left - 100) {
    return null
  }

  if (
    leftBounds.top > rightBounds.bottom ||
    rightBounds.top > leftBounds.bottom
  ) {
    return null
  }

  return {
    left: leftLayer,
    right: rightLayer,
  }
}

function appendCanvasTextureToModules (modules) {
  var canvasLayer = makeCanvas()

  /**
   * Гра!
   * Это непрозрачность слоя текстуры, 0..100
   */
  canvasLayer.opacity = 45

  var layer
  for (var j = 0; j < modules.length; j++) {
    layer = modules[j]

    addLayerToSelection(layer, j === 0)
  }

  _invertSelection()
  _deleteSelection()
  linearBurn()

  _deselect()
}

function _selectWithEllipsis (selectionObj) {
  var desc36 = new ActionDescriptor()
  var ref31 = new ActionReference()
  ref31.putProperty(c("Chnl"), c("fsel"))
  desc36.putReference(c("null"), ref31)
  var desc37 = new ActionDescriptor()
  desc37.putUnitDouble(c("Top "), c("#Pxl"), selectionObj.top)
  desc37.putUnitDouble(c("Left"), c("#Pxl"), selectionObj.left)
  desc37.putUnitDouble(c("Btom"), c("#Pxl"), selectionObj.bottom)
  desc37.putUnitDouble(c("Rght"), c("#Pxl"), selectionObj.right)
  desc36.putObject(c("T   "), c("Elps"), desc37)
  desc36.putBoolean(c("AntA"), true)

  executeAction(c("setd"), desc36, DialogModes.NO)
}

function linearBurn () {
  var desc122 = new ActionDescriptor()
  var ref98 = new ActionReference()
  ref98.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"))
  desc122.putReference(c("null"), ref98)

  var desc123 = new ActionDescriptor()
  desc123.putEnumerated(c("Md  "), c("BlnM"), stringIDToTypeID("colorBurn"))
  desc122.putObject(c("T   "), c("Lyr "), desc123)
  executeAction(c("setd"), desc122, DialogModes.NO)
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

// =====================================================================================================

/**
 * Выбираем полигональное лассо
 */
function _selectLasso () {
  var select = new ActionDescriptor()

  var ref30 = new ActionReference()
  var idpolySelTool = stringIDToTypeID("polySelTool")
  ref30.putClass(idpolySelTool)
  select.putReference(c("null"), ref30)

  var iddontRecord = stringIDToTypeID("dontRecord")
  select.putBoolean(iddontRecord, true)
  var idforceNotify = stringIDToTypeID("forceNotify")
  select.putBoolean(idforceNotify, true)

  executeAction(c("slct"), select, DialogModes.NO)
}

/** ============================ RUN ================================ */


WRITE_TO_CSV && createFile(PSD_FOLDER_PATH + OUT_SUBFOLDER, 'pictures.csv', CSV_ID)
openFilesInDir(PSD_FOLDER_PATH)
WRITE_TO_CSV && closeFile(CSV_ID)

function getOutputFileName () {
  var origName = getFileNameWoExtension()
  var modulesSizes = getModulesSizes()

  var newName = '' + modulesSizes.layerSizes.length + '_'
  newName += (modulesSizes.overall.width > modulesSizes.overall.height ? 'h' : 'v') + '_'
  newName += origName

  return origName
}

function processDocument (doc) {

  DO_RESIZE && doc.resizeImage(1640)
  makeBackground()

  var error = false

  processLayers(doc)

  var outFileName = getOutputFileName()
  exportFile(PSD_FOLDER_PATH + OUT_SUBFOLDER, outFileName, 'JPEG')

  var moduleSizes = getModulesSizes()
  var str = outFileName + ','
  if (!moduleSizes.layerSizes.length) {
    str += 'ERROR'
    error = true
  } else {
    str += moduleSizes.overall.width + ',' + moduleSizes.overall.height + ','

    for (var i = 0; i < moduleSizes.layerSizes.length; i++) {
      var size = moduleSizes.layerSizes[i]

      str += size.width + ',' + size.height
      if (i !== moduleSizes.layerSizes.length - 1) {
        str += ','
      }
    }
  }

  WRITE_TO_CSV && writeToFile(str, CSV_ID)

  return !error
}

function _createTextureLayer (pathToTexture, layerName, firstOrLast) {
  var layer = _placeImageOnNewLayer(pathToTexture)
  layer.name = layerName

  var layerBounds = _getLayerBounds(layer)
  _moveLayer(layer, -layerBounds.left, -layerBounds.top)

  var traverseLayer
  var direction
  if (firstOrLast) {
    traverseLayer = activeDocument.artLayers[0]
    direction = ElementPlacement.PLACEBEFORE
  } else {
    traverseLayer = activeDocument.artLayers[activeDocument.artLayers.length - 1]
    direction = ElementPlacement.PLACEAFTER
  }

  layer.move(traverseLayer, direction)

  return layer
}

function makeCanvas () {
  return _createTextureLayer(PATH_TO_CANVAS, CANVAS_LAYER_NAME, true)
}

function makeBackground () {
  return _createTextureLayer(PATH_TO_BACKGROUND, BG_LAYER_NAME, false)
}
