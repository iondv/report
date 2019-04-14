'use strict';

window.sidebarSplitter = (function () {

  var KEY_SIDEBAR_WIDTH = 'main.sidebar.width';
  var $aside, $middle, $splitter, $mobile, $body;
  var dragged = false;
  var width = 300;

  function setWidth(w) {
    w = parseInt(w);
    if (w > 200 && w < 500) {
      $aside.width(w);
      $middle.css('margin-left', w + 'px');
      return true;
    } else {
      return false;
    }
  }

  function toggle(state) {
    if (state) {
      $splitter.show();
      setWidth(width);
    } else {
      width = $aside.width();
      $aside.css('width', '50px');
      $middle.css('margin-left', '0');
      $splitter.hide();
    }
  }

  function drag(event) {
    setWidth(event.pageX);
  }

  return {
    init: function () {
      $splitter = $('#aside-splitter');
      if ($splitter.length) {
        $body = $(document.body);
        $aside = $('#aside');
        $middle = $('#middle');
        setWidth(store.get(KEY_SIDEBAR_WIDTH) || 300);
        $aside.show();
        $splitter.mousedown(function () {
          $body.addClass('unselectable').mousemove(drag);
          dragged = true;
        });
        $body.mouseup(function () {
          if (dragged) {
            $body.removeClass('unselectable').off('mousemove', drag);
            store.set(KEY_SIDEBAR_WIDTH, $aside.width());
            $(window).trigger('resize');
            dragged = false;
          }
        });
      }
    },

    initMobile: function () {
      $mobile = $('#moreMenuBtn');
      $mobile.click(function () {
        toggle(!$mobile.hasClass('active'));
        $(window).trigger('resize');
      });
      $(window).width() <= 768 && $mobile.click();
    }
  };
})();
