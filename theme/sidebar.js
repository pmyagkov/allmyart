(function ($) {
  $('.scrollable').mCustomScrollbar({
    autoHideScrollbar: true
  });

  var $aside = $('.aside');
  var $searchWrapper = $('.search-wrapper');

  $searchWrapper.find('input').focus(function () {
    var wrapperLeft = $searchWrapper.offset().left;
    var width = $aside.width();
    var marginLeft = -wrapperLeft + 15;
    if (marginLeft < 0) {
      $searchWrapper.css({width: width - 35, 'margin-left': -wrapperLeft + 15});
    }
  }).blur(function () {
    $searchWrapper.attr('style', '');
  });

})(jQuery);
