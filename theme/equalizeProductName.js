function equalizeProductNameHeight() {
  var $lis = $('.thumbs li');
  var liWidth = $lis.width();
  var contentWidth = $('.maincontent').width();

  var columnsCount = Math.floor(contentWidth / liWidth);
  var changeHeightObj = {};

  $lis.each(function (i, e) {
    var $elem = $(this);
    var $productName = $elem.find('.product-name');
    $productName.css('height', 'auto');

    var height = $productName.height();
    var modulo = i % columnsCount;
    // значит, название продукта занимает 2 строчки
    var traverse;
    var elems = [], i;
    if (height > 20) {
      i = modulo;
      traverse = $elem;
      while (++i < columnsCount) {
        elems.push(traverse = traverse.next());
      }
      i = modulo;
      traverse = $elem;
      while (--i >= 0) {
        elems.push(traverse = traverse.prev());
      }
    }

    if (elems) {
      height = String(height);
      changeHeightObj[height] = changeHeightObj[height] || [];
      changeHeightObj[height].push.apply(changeHeightObj[height], elems);
    }
  });

  var height;
  for (var key in changeHeightObj) {
    height = +key;
    if (!isNaN(height)) {
      changeHeightObj[key].forEach(function ($elem) {
        $elem.find('.product-name').height(height);
      });
    }
  }
}

jQuery(function($) {
  equalizeProductNameHeight();

  $(window).on('resize', $.debounce(100, false, equalizeProductNameHeight));

  $(document).on('equalize', equalizeProductNameHeight);
});
