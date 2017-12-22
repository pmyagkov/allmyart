#target photoshop
#include common.js

_evalDependencies([
  '../lib/es5-shim.js',
  '../lib/json.js',
])

var LINE_SIDE_MARGIN = 8.7 // cm
var DOTS_SIDE_MARGIN = 0.5 // cm
var DOT_RADIUS = 4 // px

var OUTER_FRAME_LAYER_NAME = 'all black'
var INNER_FRAME_LAYER_NAME = 'all princess'
var LINES_DOTS_LAYER_NAME = 'lines & dots'

var COLORS = {}
function initColors () {
  var whiteColor = new SolidColor()
  whiteColor.cmyk.cyan = 0
  whiteColor.cmyk.magenta = 0
  whiteColor.cmyk.yellow = 0
  whiteColor.cmyk.black = 0

  COLORS['white'] = whiteColor

  var blackColor = new SolidColor()
  blackColor.cmyk.cyan = 75
  blackColor.cmyk.magenta = 68
  blackColor.cmyk.yellow = 67
  blackColor.cmyk.black = 90

  COLORS['black'] = blackColor

  var princess1Color = new SolidColor()
  princess1Color.cmyk.cyan = 55
  princess1Color.cmyk.magenta = 1
  princess1Color.cmyk.yellow = 1
  princess1Color.cmyk.black = 1

  var princess2Color = new SolidColor()
  princess2Color.cmyk.cyan = 20
  princess2Color.cmyk.magenta = 66
  princess2Color.cmyk.yellow = 1
  princess2Color.cmyk.black = 1

  var princess3Color = new SolidColor()
  princess3Color.cmyk.cyan = 1
  princess3Color.cmyk.magenta = 14
  princess3Color.cmyk.yellow = 88
  princess3Color.cmyk.black = 1

  COLORS['princess'] = [princess1Color, princess2Color, princess3Color]
}

function pictureDefinitionGotten (pictureDefinition, size) {
  createModulesFrames(pictureDefinition, size)

  return

  var masterFileName = pictureDefinition.name.substr(0, pictureDefinition.name.length - 1)

  var masterPath = config.paths['pp_input']
  if (!masterPath) {
    alert('Не указан путь к исходникам картин `paths.pp_input` в конфиге')
    return null
  }

  // A hard coded path to a directory 'mac style'
  var processFolder = Folder(_normalizePath(masterPath))
  // Use folder object get files function with  mask 'a reg ex'
  var fileList = processFolder.getFiles(new RegExp(masterFileName + '.psd'))
  var masterDocument
  fileList.forEach(function (file, i) {
    // Only process the returned file objects
    // The filter 'should' have missed out any folder objects
    if (file instanceof File && !file.hidden) {
      masterDocument = open(file)
    }
  })

  if (!masterDocument) {
    alert('Не найден мастер-psd файл `' + masterFileName + '.psd` в `paths.pp_input`')
    return null
  }

  insertMasterModules(masterDocument, pictureDefinition, size)
}

function insertMasterModules (masterDocument, pictureDefinition, innerFrameSize) {
  var pictureName = pictureDefinition.name
  var frameDocument, layer, bounds, cropRegion, beforeCropHistory
  /*
  history = doc.historyStates.length - 1;
  doc.activeHistoryState = doc.historyStates[history];
   */

  var entireFrameSize = new UnitValue(config.sizes.outer_frame + innerFrameSize, 'cm')

  pictureDefinition.modules.forEach(function (module, i) {
    frameDocument = documents.getByName(pictureName + '-' + (i + 1))
    app.activeDocument = masterDocument
    layer = masterDocument.artLayers.getByName(i + 1)
    bounds = _getLayerBounds(layer)
    var percentage = (module[0] + 0.1) / bounds.width * 100
    layer.resize(percentage, percentage)

    beforeCropHistory = masterDocument.historyStates.length - 1
    bounds = _getLayerBounds(layer)
    var left = new UnitValue(bounds.left, 'cm').as('px')
    var top = new UnitValue(bounds.top, 'cm').as('px')
    cropRegion = [
      left + 3,
      top + 3,
      left + new UnitValue(bounds.width, 'cm').as('px') - 3,
      top + new UnitValue(bounds.height, 'cm').as('px') - 3,
    ]
    cropRegion = cropRegion.map(function (value) {
      return new UnitValue(value, 'px').as('cm')
    })
    masterDocument.crop(cropRegion)

    var moduleFileName = pictureName + '-' + (i + 1) + '_module'
    var moduleFileFolder = config.paths.pp_input + '/'
    var moduleFilePath = moduleFileFolder + moduleFileName + '.psd'
    exportFile(moduleFileFolder, moduleFileName, 'PSD')

    masterDocument.activeHistoryState = masterDocument.historyStates[beforeCropHistory]

    app.activeDocument = frameDocument

    layer = _placeImageOnNewLayer(moduleFilePath)
    bounds = _getLayerBounds(layer)
    layer.translate(
      entireFrameSize - bounds.left,
      entireFrameSize - bounds.top
    )
    new File(moduleFilePath).remove()
  })
}

function drawBorder (bounds, size, color, opacity) {
  _select([
    [bounds.left.as('px'), bounds.top.as('px')],
    [bounds.left.as('px'), bounds.bottom.as('px')],
    [bounds.right.as('px'), bounds.bottom.as('px')],
    [bounds.right.as('px'), bounds.top.as('px')],
  ])

  activeDocument.selection.fill(color, ColorBlendMode.COLOR, opacity)

  var borderSizeCm = new UnitValue(size, 'cm')

  _select([
    [(bounds.left + borderSizeCm).as('px'), (bounds.top + borderSizeCm).as('px')],
    [(bounds.left + borderSizeCm).as('px'), (bounds.bottom - borderSizeCm).as('px')],
    [(bounds.right - borderSizeCm).as('px'), (bounds.bottom - borderSizeCm).as('px')],
    [(bounds.right - borderSizeCm).as('px'), (bounds.top + borderSizeCm).as('px')],
  ])

  _deleteArea()
  _deselect()
}


function drawFramesInDocument (frameDocument, innerFrameSize) {
  var blackBounds = {
    left: new UnitValue(0, 'cm'),
    top: new UnitValue(0, 'cm'),
    right: frameDocument.width,
    bottom: frameDocument.height,
  }

  var blackLayer = frameDocument.artLayers.add()
  blackLayer.name = OUTER_FRAME_LAYER_NAME

  drawBorder(blackBounds, config.sizes.outer_frame, COLORS['black'], 100)

  var princessLayer = frameDocument.artLayers.add()
  princessLayer.name = INNER_FRAME_LAYER_NAME

  var princessBounds = {
    left: blackBounds.left + config.sizes.outer_frame,
    top: blackBounds.top + config.sizes.outer_frame,
    right: blackBounds.right - config.sizes.outer_frame,
    bottom: blackBounds.bottom - config.sizes.outer_frame,
  }

  var princessColor = COLORS['princess'][Math.floor(Math.random() * COLORS['princess'].length)]
  drawBorder(princessBounds, innerFrameSize, princessColor, 40)

  drawCornerLines(frameDocument)

  drawDots(frameDocument)
}

function drawCornerLines (frameDocument) {
  var linesLayer = frameDocument.artLayers.add()
  linesLayer.name = LINES_DOTS_LAYER_NAME

  var blackBounds = {
    left: new UnitValue(0, 'cm'),
    top: new UnitValue(0, 'cm'),
    right: frameDocument.width,
    bottom: frameDocument.height,
  }

  app.foregroundColor = COLORS['white']

  var strokeWidth = new UnitValue(2, 'px')

  // top-left
  _drawLine([
      (blackBounds.left + LINE_SIDE_MARGIN).as('px'),
      (blackBounds.top).as('px')
    ], [
      (blackBounds.left).as('px'),
      (blackBounds.top + LINE_SIDE_MARGIN).as('px')
    ],
    strokeWidth
  )

  // top-right
  _drawLine([
      (blackBounds.right - LINE_SIDE_MARGIN).as('px'),
      (blackBounds.top).as('px')
    ], [
      (blackBounds.right).as('px'),
      (blackBounds.top + LINE_SIDE_MARGIN).as('px')
    ],
    strokeWidth
  )

  // bottom-right
  _drawLine([
      (blackBounds.right - LINE_SIDE_MARGIN).as('px'),
      (blackBounds.bottom).as('px')
    ], [
      (blackBounds.right).as('px'),
      (blackBounds.bottom - LINE_SIDE_MARGIN).as('px')
    ],
    strokeWidth
  )

  // bottom-left
  _drawLine([
      (blackBounds.left + LINE_SIDE_MARGIN).as('px'),
      (blackBounds.bottom).as('px')
    ], [
      (blackBounds.left).as('px'),
      (blackBounds.bottom - LINE_SIDE_MARGIN).as('px')
    ],
    strokeWidth
  )
}

function drawDot (centerX, centerY) {
  _selectWithEllipse({
    left: new UnitValue(centerX - DOT_RADIUS, 'px'),
    top: new UnitValue(centerY - DOT_RADIUS, 'px'),
    right: new UnitValue(centerX + DOT_RADIUS, 'px'),
    bottom: new UnitValue(centerY + DOT_RADIUS, 'px'),
  })

  activeDocument.selection.fill(app.foregroundColor, ColorBlendMode.COLOR, 100)
  _deselect()
}

function drawDots (frameDocument) {
  var blackBounds = {
    left: new UnitValue(0, 'cm'),
    top: new UnitValue(0, 'cm'),
    right: frameDocument.width,
    bottom: frameDocument.height,
  }

  var verticalCenterY = blackBounds.bottom / 2
  var horizontalCenterY = blackBounds.right / 2

  var dotsSideMarginCm = new UnitValue(DOTS_SIDE_MARGIN, 'cm')

  var addition = new UnitValue(0, 'cm')
  var leftX = (blackBounds.left + dotsSideMarginCm).as('px')
  var rightX = (blackBounds.right - dotsSideMarginCm).as('px')
  while (verticalCenterY + addition < blackBounds.bottom) {
    drawDot(leftX, (verticalCenterY + addition).as('px'))
    drawDot(rightX, (verticalCenterY + addition).as('px'))
    if (addition.value !== 0) {
      drawDot(leftX, (verticalCenterY - addition).as('px'))
      drawDot(rightX, (verticalCenterY - addition).as('px'))
    }

    addition += 6
  }

  addition = new UnitValue(0, 'cm')
  var topY = (blackBounds.top + dotsSideMarginCm).as('px')
  var bottomY = (blackBounds.bottom - dotsSideMarginCm).as('px')
  while (horizontalCenterY + addition < blackBounds.right) {
    drawDot((horizontalCenterY + addition).as('px'), topY)
    drawDot((horizontalCenterY + addition).as('px'), bottomY)
    if (addition.value !== 0) {
      drawDot((horizontalCenterY - addition).as('px'), topY)
      drawDot((horizontalCenterY - addition).as('px'), bottomY)
    }

    addition += 6
  }
}

/**
 *
 * @param pictureDefinition
 * @param [pictureDefinition.name]
 * @param [pictureDefinition.modules] Array<Array<number, number>>
 */
function createModulesFrames (pictureDefinition, innerFrameSize) {
  var frames = pictureDefinition.modules
  var frame, frameName
  var resolution = 150
  var w, h;
  for (var i = 0; i < frames.length; i++) {
    frame = frames[i]
    frameName = pictureDefinition.name + '-' + (i + 1)
    $.writeln('Creating frame ', frameName + ' ', frame[0] + 'cm' + ' ', frame[1] + 'cm')

    UnitValue.baseUnit = UnitValue (1 / resolution, 'in')

    w = new UnitValue(frame[0] + config.sizes.outer_frame * 2 + innerFrameSize * 2, 'cm')
    h = new UnitValue(frame[1] + config.sizes.outer_frame * 2 + innerFrameSize * 2, 'cm')
    var frameDocument = documents.add(
      w,                          // width
      h,                          // height
      resolution,                 // resolution
      frameName,                  // name
      NewDocumentMode.CMYK,       // mode
      DocumentFill.TRANSPARENT,   // initialFill
      1.0,                        // pixelAspectRatio
      BitsPerChannelType.SIXTEEN  // bitsPerChannel
    )

    drawFramesInDocument(frameDocument, innerFrameSize)
    insertModuleNumber(frameDocument, i + 1)
    insertLogo(frameDocument)
  }
}

function insertModuleNumber (frameDocument, moduleNumber) {
  var layer = frameDocument.artLayers.add()
  layer.kind = LayerKind.TEXT
  layer.name = 'module number'
  layer.rotate(180)

  var textItem = layer.textItem
  textItem.contents = moduleNumber.toString()
  textItem.size = new UnitValue(40, 'pt')
  textItem.font = 'MuseoSansCyrl-300'
  textItem.justification = Justification.CENTER;
  textItem.kind = TextType.PARAGRAPHTEXT;
  textItem.color = COLORS['white']

  var layerBounds = _getLayerBounds(layer)
  layer.translate(
    frameDocument.width / 2 - layerBounds.left - layerBounds.width / 2,
    - layerBounds.top + new UnitValue(1.3, 'cm')
  )
}

function insertLogo (doc) {
  var logoLayer = _placeImageOnNewLayer(config.paths.logo)
  var logoLayerBounds = _getLayerBounds(logoLayer)

  // place the layer 1cm below the upper edge of bottom outer border side
  var deltaY = doc.height
    - logoLayerBounds.bottom
    - config.sizes.outer_frame
    + 1
    + logoLayerBounds.height

  _moveLayer(logoLayer, 0, deltaY.as('px'))
}

var config
function beginMagic () {
  initColors()
  config = _parseConfig()

  var prevRulerUnits, prevTypeUnits
  prevRulerUnits = app.preferences.rulerUnits
  prevTypeUnits = app.preferences.typeUnits
  app.preferences.rulerUnits = Units.CM
  app.preferences.typeUnits = TypeUnits.POINTS

  _showInfoDialog('100041', function (pictureDefinition, size) {
    // try {
      pictureDefinitionGotten(pictureDefinition, size)
    // } catch (e) {}

    app.preferences.rulerUnits = prevRulerUnits
    app.preferences.typeUnits = prevTypeUnits
  })
}

beginMagic()
