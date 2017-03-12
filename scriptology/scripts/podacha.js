#target photoshop

#include common.js

/* global activeDocument, ElementPlacement, app, ActionDescriptor, executeAction, charIDToTypeID, DialogModes */

var c = charIDToTypeID;

var LAYER_VIA_OPERATION = {
  'copy': 'copy',
  'cut': 'cut'
};

var CSV_ID = 'csv';

var WRITE_TO_CSV = true;
//var MAKE_BACKGROUND = true;
var DO_RESIZE = true;

// разница между `y` нижней границы модуля и `y` верхней границы черного прямоугольника
var BOTTOM_RECT_UP = 20;
// разница между `y` нижней границы модуля и `y` нижней границы черного прямоугольника
var BOTTOM_RECT_BOTTOM = 30;

// разница между `x` правой границы модуля и `x` правой границы черногоs прямоугольника
var BOTTOM_RECT_RIGHT = 20;

// разница между `x` правой границы модуля и `x` левой границы черного прямоугольника
var RIGHT_RECT_LEFT = 20;
// разница между `x` правой границы модуля и `x` правой границы черного прямоугольника
var RIGHT_RECT_RIGHT = 20;
// разница между `y` нижней границы модуля и `y` нижней границы черного прямоугольника
var RIGHT_RECT_BOTTOM = 40;
// разница между `y` верхней границы модуля и `y` верхней границы черного прямоугольника
var RIGHT_RECT_UP = 10;

var RIGHT_SIDE_WIDTH = 6;
var BOTTOM_SIDE_HEIGHT = 8;
var BOTTOM_LEFT_CORNER_WIDTH = 11;
var TOP_SIDE_MARGIN = 2;
var TOP_SIDE_HEIGHT = 2;

var FEATHER_VALUE = 3;


/**
 Требования:
 Cлои для обработки должны называться десятичной цифрой без букв.
 Слой с фоном должен называться `fon`.

 Нужно создать подпапку `_` в папке, где лежат PSD.
 */

var BG_LAYER_NAME = 'bg';
var CANVAS_LAYER_NAME = 'canvas';

var ORIENTATION = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3
};

// величина обрезки угла слоя
/*var LAYER_CORNER_CROP = 10;*/

function processBottomSide (mainLayer, rightLayer) {
  activeDocument.activeLayer = mainLayer;
  /*
   (x, y) верхнего левого угла
   (x, y) нижнего правого угла
   */
  var mainBounds = mainLayer.boundsNoEffects;
  var left = mainBounds[0].value;
  var bottom = mainBounds[3].value;

  var rightBounds = rightLayer.boundsNoEffects;
  var right = rightBounds[2].value;

  _selectAdditionalLayer(rightLayer);

  var bottomSideCords = [
    [left, bottom - BOTTOM_SIDE_HEIGHT],
    [right, bottom - BOTTOM_SIDE_HEIGHT],
    [right, bottom],
    [left, bottom]
  ];

  _select(bottomSideCords);

  _duplicateAndMerge();
  var mergedLayer = activeDocument.activeLayer;
  mergedLayer.name = mainLayer.name + '_merged';


  var bottomParanjaLayer = activeDocument.artLayers.add();
  bottomParanjaLayer.name = mainLayer.name + '_bottom-paranja';
  _createRectAndFillWithBlack(bottomParanjaLayer, bottomSideCords);

  bottomParanjaLayer.opacity = 54;

  // обрезаем нижний угол
  _cropArea(bottomParanjaLayer, [
    [left, bottom],
    [left + BOTTOM_LEFT_CORNER_WIDTH, bottom],
    [left, bottom - BOTTOM_SIDE_HEIGHT],
  ]);

  activeDocument.activeLayer = bottomParanjaLayer;

  var paranjaBounds = _getLayerBounds(bottomParanjaLayer);
  _select([
    [paranjaBounds.right, paranjaBounds.top - 40],
    [paranjaBounds.right + 40, paranjaBounds.top - 40],
    [paranjaBounds.right + 40, paranjaBounds.bottom + 40],
    [paranjaBounds.right, paranjaBounds.bottom + 40],
  ]);

  for (var i = 0; i < 4; i++) {
    _feather(10);
    _deleteSelection();
  }

  _cropArea(mergedLayer, [
    [left, bottom],
    [left + BOTTOM_LEFT_CORNER_WIDTH, bottom],
    [left, bottom - BOTTOM_SIDE_HEIGHT],
  ]);

  activeDocument.activeLayer = mergedLayer;

  mainLayer.visible = false;
  rightLayer.visible = false;

  return activeDocument.activeLayer;
}

/**
 * Изменяем яркость слоя
 * @param layer
 * @param brightness
 * @param contrast
 */
function _adjustBrightness (layer, brightness, contrast) {
  var prevActiveLayer = activeDocument.activeLayer;
  activeDocument.activeLayer = layer;
  // уменьшаем яркость
  layer.adjustBrightnessContrast(brightness, contrast);

  activeDocument.activeLayer = prevActiveLayer;
}

function processTopSide (options) {
  var mainLayer = options.mainLayer;
  var mergedLayer = options.mergedLayer;

  activeDocument.activeLayer = mergedLayer;

  var mainBounds = _getLayerBounds(mainLayer);

  var topSideCords = [
    [mainBounds.right + TOP_SIDE_MARGIN, mainBounds.top],
    [mainBounds.left, mainBounds.top],
    [mainBounds.left, mainBounds.top + TOP_SIDE_HEIGHT],
    [mainBounds.right + TOP_SIDE_MARGIN, mainBounds.top + TOP_SIDE_HEIGHT]
  ];

  _select(topSideCords);

  // вырезаем слой из выделения и переназываем его
  var newLayer = createLayerVia(LAYER_VIA_OPERATION.cut, '_top');
  // искажаем выделение
  // уменьшаем яркость
  _adjustBrightness(newLayer, 30, 0);
  _deselect();

  return newLayer;
}

function _getLayerBounds (layer) {
  var bounds = layer.boundsNoEffects;

  var boundsObj = {
    left: bounds[0].value,
    top: bounds[1].value,
    right: bounds[2].value,
    bottom: bounds[3].value,
  };

  boundsObj.height = boundsObj.bottom - boundsObj.top;
  boundsObj.width = boundsObj.right - boundsObj.left;

  return boundsObj;
}

function processRightSide (layer) {
  activeDocument.activeLayer = layer;

  var bounds = _getLayerBounds(layer);

  var rightSideCords = [
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.bottom]
  ];

  _select(rightSideCords);

  // вырезаем слой из выделения и переназываем его
  var rightLayer = createLayerVia(LAYER_VIA_OPERATION.cut, '_right');
  // искажаем выделение
  _transformRightEdge(3);

  _skewSelection();
  _deselect();

  var rightSideCordsWithSkew = [
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom + 15],
    [bounds.right - RIGHT_SIDE_WIDTH, bounds.bottom + 15]
  ];

  var featherLayer = createLayerVia(LAYER_VIA_OPERATION.copy, '_shadow');

  // уменьшаем яркость
  _adjustBrightness(featherLayer, -140, 0);

  var layers = [rightLayer, featherLayer];
  for (var i = 0; i < layers.length; i++) {
    // обрезаем нижний угол
    _cropArea(layers[i], [
      [bounds.right - RIGHT_SIDE_WIDTH - 5, bounds.bottom],
      [bounds.right + RIGHT_SIDE_WIDTH * 2 + 2, bounds.bottom],
      [bounds.right + RIGHT_SIDE_WIDTH * 2 + 2, bounds.bottom + 30]
    ]);
    _deselect();
  }

  _featherAndDelete(featherLayer, FEATHER_VALUE);

  _deselect();

  return rightLayer;
}

function _feather (radius) {
  var desc177 = new ActionDescriptor();
  desc177.putUnitDouble(c("Rds "), c("#Pxl"), radius);
  executeAction(c("Fthr"), desc177, DialogModes.NO);
}

function _featherAndDelete (layer, radius) {
  activeDocument.activeLayer = layer;

  var bounds = _getLayerBounds(layer);

  var rightSideCords = [
    [bounds.left - 30, bounds.top - 10],
    [bounds.left, bounds.top - 10],
    [bounds.left, bounds.bottom + 10],
    [bounds.left - 30, bounds.bottom + 10]
  ];

  _select(rightSideCords);

  for (var i = 0; i < 2; i++) {
    _feather(radius);
    _deleteSelection();
  }
}

function _transformRightEdge (widthMultiplier) {
  const bounds = _getLayerBounds(activeDocument.activeLayer);

  const horizontalOffset = widthMultiplier / 2 * bounds.width;
  const finalPercentageWidth = widthMultiplier * 100;

  var desc8 = new ActionDescriptor();
  var ref5 = new ActionReference();
  ref5.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));
  desc8.putReference(c("null"), ref5);
  desc8.putEnumerated(c("FTcs"), c("QCSt"), c("Qcs7"));
  var desc9 = new ActionDescriptor();
  desc9.putUnitDouble(c("Hrzn"), c("#Pxl"), 0);
  desc9.putUnitDouble(c("Vrtc"), c("#Pxl"), 0);
  desc8.putObject(c("Ofst"), c("Ofst"), desc9);
  desc8.putUnitDouble(c("Wdth"), c("#Prc"), finalPercentageWidth);
  desc8.putEnumerated(c("Intr"), c("Intp"), c("Bcbc"));
  executeAction(c("Trnf"), desc8, DialogModes.NO);
}

function _skewSelection () {
  var desc22 = new ActionDescriptor();
  var ref13 = new ActionReference();

  ref13.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));
  desc22.putReference(c("null"), ref13);
  desc22.putEnumerated(c("FTcs"), c("QCSt"), c("Qcsa"));

  var desc23 = new ActionDescriptor();
  desc23.putUnitDouble(c("Hrzn"), c("#Pxl"), 0);
  desc23.putUnitDouble(c("Vrtc"), c("#Pxl"), 9);
  desc22.putObject(c("Ofst"), c("Ofst"), desc23);
  desc22.putUnitDouble(c("Wdth"), c("#Prc"), 100);

  var desc24 = new ActionDescriptor();
  desc24.putUnitDouble(c("Hrzn"), c("#Ang"), 0);
  desc24.putUnitDouble(c("Vrtc"), c("#Ang"), 45);
  desc22.putObject(c("Skew"), c("Pnt "), desc24);
  desc22.putEnumerated(c("Intr"), c("Intp"), c("Bcbc"));

  executeAction(c("Trnf"), desc22, DialogModes.NO);
}

function _selectAdditionalLayer (layer) {
  var desc2 = new ActionDescriptor();
  var ref1 = new ActionReference();

  ref1.putName(c("Lyr "), layer.name);
  desc2.putReference(c("null"), ref1);
  desc2.putEnumerated(
    stringIDToTypeID("selectionModifier"),
    stringIDToTypeID("selectionModifierType"),
    stringIDToTypeID("addToSelection")
  );
  desc2.putBoolean(c("MkVs"), false);
  executeAction(c("slct"), desc2, DialogModes.NO);
}

function _duplicateAndMerge () {
  var ref7 = new ActionReference();
  ref7.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));

  var desc11 = new ActionDescriptor();
  desc11.putReference(c("null"), ref7);
  desc11.putInteger(c("Vrsn"), 5);
  executeAction(c("Dplc"), desc11, DialogModes.NO);

  var desc12 = new ActionDescriptor();
  executeAction(c("Mrg2"), desc12, DialogModes.NO);
}

function createVinietkaShadow (layer) {
  activeDocument.activeLayer = layer;

  var copiedLayer = createLayerVia(LAYER_VIA_OPERATION.copy, '_vinietka');
  copiedLayer.opacity = 40;

  _adjustBrightness(copiedLayer, -48, -11);

  var boundsObj = _getLayerBounds(copiedLayer);
  var diameter = boundsObj.height < boundsObj.width ? boundsObj.height : boundsObj.width;
  var radius = diameter / 2;
  var center = {
    x: boundsObj.left + boundsObj.width / 2,
    y: boundsObj.top + boundsObj.height / 2
  };

  _selectWithEllipsis({
    left: center.x - radius,
    top: center.y - radius,
    right: center.x + radius,
    bottom: center.y + radius
  });

  _feather(150);

  _deleteSelection();
}

/**
 * Обрабатывает целевой слой: skew, яркость.
 * @param {ArtLayer} layer
 * @returns {ArtLayers[]} созданные в процессе слои
 */
function processModularLayer (layer) {
  var rightLayer = processRightSide(layer);

  var mergedLayer = processBottomSide(layer, rightLayer);

  processTopSide({
    mergedLayer: mergedLayer,
    mainLayer: layer
  });


  /**
   * Гра!
   * Это виньетка, если хочешь её оставить — убери //
   */
    //createVinietkaShadow(mergedLayer);

  var shadowLayer = createBoxShadow({
      mergedLayer: mergedLayer,
      moduleLayer: layer
    });

  var bgLayer = _getLayerByName('bg');
  shadowLayer.move(bgLayer, ElementPlacement.PLACEBEFORE);
}

function createBoxShadow (options) {
  var mergedLayer = options.mergedLayer;
  var moduleLayer = options.moduleLayer;

  var shadowLayer = activeDocument.artLayers.add();
  shadowLayer.name = moduleLayer.name + '_shadow';

  var layerBounds = _getLayerBounds(mergedLayer);

  var rightEdge = layerBounds.right + 19 + 9;
  var bottomEdge = layerBounds.bottom + 32 + 17;

  var cords = [
    [layerBounds.left + 13, layerBounds.top + 11],
    [rightEdge, layerBounds.top + 11],
    [rightEdge, bottomEdge],
    [layerBounds.left + 13, bottomEdge]
  ];

  _createRectAndFillWithBlack(shadowLayer, cords);

  shadowLayer.move(moduleLayer, ElementPlacement.PLACEBEFORE);
  _moveLayer(shadowLayer, -6, 0);

  // обрезаем угол
  var shadowLayerBounds = _getLayerBounds(shadowLayer);
  cords = [
    [shadowLayerBounds.right - 13 - 9, shadowLayerBounds.top],
    [shadowLayerBounds.right, shadowLayerBounds.top + 43],
    [rightEdge + 1, shadowLayerBounds.top + 43],
    [rightEdge + 1, shadowLayerBounds.top - 10],
    [shadowLayerBounds.right - 13 - 9, shadowLayerBounds.top - 10],
  ];

  _select(cords);
  _deleteSelection();

  // прозрачность
  shadowLayer.opacity = 30;

  // размытие
  _applyGaussianBlur(shadowLayer, 3);

  return shadowLayer;
}

function _applyGaussianBlur (layer, value) {
  activeDocument.activeLayer = layer;

  activeDocument.selection.selectAll();
  activeDocument.activeLayer.applyGaussianBlur(value);
}

function createLayerVia (method, layerSuffix) {
  var operation = method === 'copy' ? "CpTL" : "CtTL";

  var layerName = activeDocument.activeLayer.name;
  executeAction(c(operation), undefined, DialogModes.NO);

  if (layerSuffix) {
    activeDocument.activeLayer.name = layerName + layerSuffix;
  }

  return activeDocument.activeLayer;
}


/**
 Заливает область выделения черным.
 */
function _createRectAndFillWithBlack (layer, coords) {
  activeDocument.activeLayer = layer;

  _select(coords);

  app.foregroundColor.rgb.hexColor = '000000';
  //app.foregroundColor.model = ColorModel.RGB;
  activeDocument.selection.fill(app.foregroundColor, ColorBlendMode.COLOR, 100);
}

function _getLayerByName (name) {
  for (var i = 0; i < activeDocument.artLayers.length; i++) {
    var layer = activeDocument.artLayers[i];
    if (layer.name === name) {
      return layer;
    }
  }

  alert('Layer ' + name + ' not found!');

  _deselect();
}

function processLayers (document) {
  var layer;
  var fon;
  var mLayer;

  var layersToProcess = [];
  for (var j = 0; j < document.artLayers.length; j++) {
    layer = document.artLayers[j];

    if (LAYER_NAME_RE.test(layer.name)) {
      // обрабатываем слой с картинкой
      layersToProcess.push(layer);
    }

    if (M_LAYER_RE.test(layer.name)) {
      // запоминаем слой M_*
      mLayer = layer;
    }

    if (layer.name === BG_LAYER_NAME) {
      fon = layer;
    }
  }

  if (mLayer) {
    // отключаем слой M_*
    mLayer.visible = false;
  }

  for (j = 0; j < layersToProcess.length; j++) {
    layer = layersToProcess[j];
    // обрабатываем слой с картинкой
    processModularLayer(layer, fon);
  }

  var mergedLayer;
  var mergedLayers = [];
  for (var i = 0; i < layersToProcess.length; i++) {
    layer = layersToProcess[i];
    mergedLayer = _getLayerByName(layer.name + '_merged');
    mergedLayers.push(mergedLayer);
  }

  // накладывает canvas на модули с картинами для текстуры (linear burn mode)
  appendCanvasTextureToModules(mergedLayers);
}

function appendCanvasTextureToModules (modules) {
  var canvasLayer = makeCanvas();

  /**
   * Гра!
   * Это непрозрачность слоя текстуры, 0..100
   */
  canvasLayer.opacity = 45;

  var layer;
  for (var j = 0; j < modules.length; j++) {
    layer = modules[j];

    addLayerToSelection(layer, j === 0);
  }

  _invertSelection();
  _deleteSelection();
  linearBurn();

  _deselect();
}

function _deselect () {
  activeDocument.selection.deselect();
}

function _select (coords) {
  activeDocument.selection.select(coords);
}

function _selectWithEllipsis (selectionObj) {
  var desc36 = new ActionDescriptor();
  var ref31 = new ActionReference();
  ref31.putProperty(c("Chnl"), c("fsel"));
  desc36.putReference(c("null"), ref31);
  var desc37 = new ActionDescriptor();
  desc37.putUnitDouble(c("Top "), c("#Pxl"), selectionObj.top);
  desc37.putUnitDouble(c("Left"), c("#Pxl"), selectionObj.left);
  desc37.putUnitDouble(c("Btom"), c("#Pxl"), selectionObj.bottom);
  desc37.putUnitDouble(c("Rght"), c("#Pxl"), selectionObj.right);
  desc36.putObject(c("T   "), c("Elps"), desc37);
  desc36.putBoolean(c("AntA"), true);

  executeAction(c("setd"), desc36, DialogModes.NO);
}

function linearBurn () {
  var desc122 = new ActionDescriptor();
  var ref98 = new ActionReference();
  ref98.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));
  desc122.putReference(c("null"), ref98);

  var desc123 = new ActionDescriptor();
  desc123.putEnumerated(c("Md  "), c("BlnM"), stringIDToTypeID("colorBurn"));
  desc122.putObject(c("T   "), c("Lyr "), desc123);
  executeAction(c("setd"), desc122, DialogModes.NO);
}

function _deleteSelection () {
  var idDlt = c("Dlt ");
  executeAction(idDlt, undefined, DialogModes.NO);
}

function addLayerToSelection (layer, isFirst) {
  var layerName = layer.name;

  if (isFirst) {
    var desc98 = new ActionDescriptor();
    var ref66 = new ActionReference();

    ref66.putProperty(c("Chnl"), c("fsel"));
    desc98.putReference(c("null"), ref66);

    var ref67 = new ActionReference();
    ref67.putEnumerated(c("Chnl"), c("Chnl"), c("Trsp"));
    ref67.putName(c("Lyr "), layerName);
    desc98.putReference(c("T   "), ref67);
    executeAction(c("setd"), desc98, DialogModes.NO);

  } else {
    var desc99 = new ActionDescriptor();
    var ref68 = new ActionReference();

    ref68.putEnumerated(c("Chnl"), c("Chnl"), c("Trsp"));
    ref68.putName(c("Lyr "), layerName);
    desc99.putReference(c("null"), ref68);

    var ref69 = new ActionReference();
    ref69.putProperty(c("Chnl"), c("fsel"));
    desc99.putReference(c("T   "), ref69);
    executeAction(c("Add "), desc99, DialogModes.NO);
  }

}

// =====================================================================================================

/**
 @param {[x,y][]]} points
 */
function _cropArea (layer, points) {
  var prevLayer = activeDocument.activeLayer;
  activeDocument.activeLayer = layer;

  _selectLasso();
  _selectPoints(points);
  _deleteArea();

  activeDocument.activeLayer = prevLayer;
}

function _deleteArea () {
  var idDlt = c("Dlt ");
  executeAction(idDlt, undefined, DialogModes.NO);
}

/**
 * Выбираем полигональное лассо
 */
function _selectLasso () {
  var select = new ActionDescriptor();

  var ref30 = new ActionReference();
  var idpolySelTool = stringIDToTypeID("polySelTool");
  ref30.putClass(idpolySelTool);
  select.putReference(c("null"), ref30);

  var iddontRecord = stringIDToTypeID("dontRecord");
  select.putBoolean(iddontRecord, true);
  var idforceNotify = stringIDToTypeID("forceNotify");
  select.putBoolean(idforceNotify, true);

  executeAction(c("slct"), select, DialogModes.NO);
}

function _selectPoints (points) {
  var mainAction = new ActionDescriptor();

  var ref31 = new ActionReference();
  var idChnl = c("Chnl");
  var idfsel = c("fsel");
  ref31.putProperty(idChnl, idfsel);
  mainAction.putReference(c("null"), ref31);

  var pointsDescripts = new ActionDescriptor();
  var pointsList = new ActionList();

  var pointD;
  var currentPoint;

  for (var i = 0; i < points.length; i++) {
    pointD = new ActionDescriptor();
    currentPoint = points[i];
    pointD.putUnitDouble(c("Hrzn"), c("#Pxl"), currentPoint[0]);
    pointD.putUnitDouble(c("Vrtc"), c("#Pxl"), currentPoint[1]);

    pointsList.putObject(c("Pnt "), pointD);
  }

  pointsDescripts.putList(c("Pts "), pointsList);

  mainAction.putObject(c("T   "), c("Plgn"), pointsDescripts);
  mainAction.putBoolean(c("AntA"), true);
  executeAction(c("setd"), mainAction, DialogModes.NO);
}


/** ============================ RUN ================================ */


WRITE_TO_CSV && createFile(PSD_FOLDER_PATH + OUT_SUBFOLDER, 'pictures.csv', CSV_ID);
openFilesInDir(PSD_FOLDER_PATH);
WRITE_TO_CSV && closeFile(CSV_ID);

function getOutputFileName () {
  var origName = getFileNameWoExtension();
  var modulesSizes = getModulesSizes();

  var newName = '' + modulesSizes.layerSizes.length + '_';
  newName += (modulesSizes.overall.width > modulesSizes.overall.height ? 'h' : 'v') + '_';
  newName += origName;

  return origName;
}

function processDocument (doc) {

  DO_RESIZE && doc.resizeImage(1640);
  makeBackground();

  var error = false;

  processLayers(doc);

  var outFileName = getOutputFileName();
  exportJPEG(PSD_FOLDER_PATH + OUT_SUBFOLDER, outFileName);

  var moduleSizes = getModulesSizes();
  var str = outFileName + ',';
  if (!moduleSizes.layerSizes.length) {
    str += 'ERROR';
    error = true;
  } else {
    str += moduleSizes.overall.width + ',' + moduleSizes.overall.height + ',';

    for (var i = 0; i < moduleSizes.layerSizes.length; i++) {
      var size = moduleSizes.layerSizes[i];

      str += size.width + ',' + size.height;
      if (i != moduleSizes.layerSizes.length - 1) {
        str += ',';
      }
    }
  }

  WRITE_TO_CSV && writeToFile(str, CSV_ID);

  return !error;
}

function _rasterizeLayer () {
  var desc116 = new ActionDescriptor();
  var ref87 = new ActionReference();
  ref87.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));
  desc116.putReference(c("null"), ref87);
  executeAction(stringIDToTypeID("rasterizeLayer"), desc116, DialogModes.NO);

  return activeDocument.activeLayer;
}

function _placeImageOnNewLayer (imageFile) {
  var desc2 = new ActionDescriptor();
  desc2.putPath(c("null"), new File(imageFile));
  desc2.putEnumerated(c("FTcs"), c("QCSt"), c("Qcsa"));

  var desc3 = new ActionDescriptor();
  desc3.putUnitDouble(c("Hrzn"), c("#Pxl"), 0.000000);
  desc3.putUnitDouble(c("Vrtc"), c("#Pxl"), 0.000000);

  desc2.putObject(c("Ofst"), c("Ofst"), desc3);

  executeAction(c("Plc "), desc2, DialogModes.NO);

  var canvasLayer = _rasterizeLayer();

  var canvasLayerBounds = _getLayerBounds(canvasLayer);
  _moveLayer(canvasLayer, -canvasLayerBounds.left, -canvasLayerBounds.top);

  return activeDocument.activeLayer;
}

function _moveLayer (layer, offsetX, offsetY) {
  var desc26 = new ActionDescriptor();
  var ref25 = new ActionReference();
  ref25.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt"));
  desc26.putReference(c("null"), ref25);

  var desc27 = new ActionDescriptor();
  desc27.putUnitDouble(c("Hrzn"), c("#Pxl"), offsetX);
  desc27.putUnitDouble(c("Vrtc"), c("#Pxl"), offsetY);
  desc26.putObject(c("T   "), c("Ofst"), desc27);
  executeAction(c("move"), desc26, DialogModes.NO);
}

function _invertSelection () {
  activeDocument.selection.invert();
}


function _createTextureLayer (pathToTexture, layerName, firstOrLast) {
  var layer = _placeImageOnNewLayer(pathToTexture);

  layer.name = layerName;

  var traverseLayer;
  var direction;
  if (firstOrLast) {
    traverseLayer = activeDocument.artLayers[0];
    direction = ElementPlacement.PLACEBEFORE;
  } else {
    traverseLayer = activeDocument.artLayers[activeDocument.artLayers.length - 1];
    direction = ElementPlacement.PLACEAFTER;
  }

  layer.move(traverseLayer, direction);

  return layer;
}

function makeCanvas () {
  return _createTextureLayer(PATH_TO_CANVAS, CANVAS_LAYER_NAME, true);
}

function makeBackground () {
  return _createTextureLayer(PATH_TO_BACKGROUND, BG_LAYER_NAME, false);
}


