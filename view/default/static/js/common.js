'use strict';

$(function () {
  window.sidebarSplitter && sidebarSplitter.initMobile();
});

// COMMON HELPER

window.commonHelper = {
  formatFileSize: function (size) {
    if (size > 1048576) return parseInt(size / 1048576) + __('js.common.mb');
    if (size > 1024) return parseInt(size / 1024) + __('js.common.mb');
    return size + __('js.common.byte');
  }
};

// OBJECT HELPER

window.objectHelper = {

  indexArray: function (items, key) {
    var index = {};
    if (items instanceof Array) {
      for (var i = 0; i < items.length; ++i) {
        index[items[i][key]] = items[i];
      }
    } else if (items && typeof items === 'object') {
      index[items[key]] = items;
    }
    return index;
  },

  unsetKeys: function (object, keys) {
    for (var i = 0; i < keys.length; ++i) {
      delete object[keys[i]];
    }
  },

  removeByKeyValues: function (objects, key, values) {
    for (var i = objects.length - 1; i >= 0; --i) {
      if (values.indexOf(objects[i][key]) > -1) {
        objects.splice(i, 1);
      }
    }
  },

  replaceInArray: function (objects, target, key) {
    for (var i = 0; i < objects.length; ++i) {
      if (objects[i][key] == target[key]) {
        objects.splice(i, 1, target);
        break;
      }
    }
  },
  // get [ key: value, ... ] from object array
  mapArray: function (items, key, value) {
    var maps = [];
    if (items instanceof Array) {
      for (var i = 0; i < items.length; ++i) {
        var map = {};
        map[items[i][key]] = items[i][value];
        maps.push(map);
      }
    } else {
      throw new Error("mapArray");
    }
    return maps;
  }
};

// MESSAGE CALLOUT

window.messageCallout = (function () {

  var $callout = $("#message-callout");

  function show (type, message, title) {
    var $title = $callout.find('.message-callout-title');
    title ? $title.html(title).show() : $title.hide();
    $callout.removeClass('alert-info alert-success alert-warning alert-danger').addClass('alert-'+ type);
    var $content = $callout.find('.message-callout-content');
    message ? $content.html(message).show() : $content.hide();
    $callout.show();
  }
  return {
    info: function (message, title) {
      show("info", message, title);
    },

    success: function (message, title) {
      show("success", message, title);
    },

    warning: function (message, title) {
      show("warning", message, title);
    },

    error: function (message, title) {
      show("danger", message, title);
    },

    hide: function () {
      $callout.hide();
    }
  };
})();

// DATE PICKER

if ($.fn.datepicker) {
  $.extend($.fn.datepicker.defaults, {
    autoclose: true,
    format: 'dd.mm.yyyy',
    language: 'ru',
    todayHighlight: true
  });
}

if ($.fn.datetimepicker) {
  $.fn.datetimepicker.defaultOpts = {
    locale: 'ru',
    sideBySide: false,
    showClear: true,
    showClose: true,
    ignoreReadonly: true
  };
}

// DATA TABLES

if ($.fn.dataTable) {
  $.extend($.fn.dataTable.defaults, {
    paging: true,
    scrollX: true,
    lengthChange: true,
    searching: true,
    ordering: true,
    info: true,
    autoWidth: false,
    sDom: "<'row'<'col-sm-6'f><'col-sm-6'l>r>t<'row'<'col-sm-6'i><'col-sm-6'p>>",
    language: {
      processing: __('js.common.dt.processing'),
      search: __('js.common.dt.search'),
      lengthMenu: __('js.common.dt.lengthMenu'),
      info: __('js.common.dt.info'),
      infoEmpty: __('js.common.dt.infoEmpty'),
      infoFiltered: __('js.common.dt.infoFiltered'),
      infoPostFix: "", // infoPostFix: __('js.common.dt.infoPostFix'),
      loadingRecords: __('js.common.dt.loadingRecords'),
      zeroRecords: __('js.common.dt.zeroRecords'),
      emptyTable: __('js.common.dt.emptyTable'),
      paginate: {
        first: __('js.common.dt.paginate.first'),
        previous: __('js.common.dt.paginate.previous'),
        next: __('js.common.dt.paginate.next'),
        last: __('js.common.dt.paginate.last')
      },
      aria: {
        sortAscending: __('js.common.dt.aria.sortAscending'),
        sortDescending: __('js.common.dt.aria.sortDescending')
      }
    }
  });
}

// SIDEBAR MENU

function initSelect(element, sub_nav, caption) {
  var dt = [];
  for(var i = 0; i < sub_nav.length; i++){
    dt[dt.length] = {"id":sub_nav[i].id, "text": (sub_nav[i].hint || sub_nav[i].caption), "nav_element": sub_nav[i]};
  }
  element.select2({
    data: dt,
    placeholder: caption,
    tags: false
  });
  var selected = element.data("selected");
  if (selected) {
    element.val(selected).trigger("change");
  }
  element.on("select2:select", function (e) {
    element.nextAll('.menu-select').each(function(index, element){
      $(element).select2("destroy").remove();
    });
    var nav_element = e.params.data.nav_element;
    if(nav_element.nodes.length) {
      var new_sel = $('<select id="n_'+nav_element.id.replace('.', '_')+'" class="menu-select" style="width: 95%"><option></option></select>').insertAfter(element.next(".select2"));
      initSelect(new_sel, nav_element.nodes, nav_element.hint || nav_element.caption);
    } else if (nav_element.url) {
      window.open(nav_element.url, '_self');
    }
  });
}

(function () {
  var $sidenav = $("#sideBarNav");
  var url = decodeURIComponent(location.pathname + location.search).substring(1);
  var hasDefaultUrl = false;
  $sidenav.find('.menu-link').each(function () {
    var $item = $(this);
    if ($item.attr('href') === url) {
      hasDefaultUrl = true;
      $item = $item.parent();
      if (!$item.hasClass('active')) {
        $item.addClass('active').parents('.treeview').addClass('menu-open');
      }
    }
  });
  $sidenav.find('.menu-select').each(function () {
    var sel = $(this), nd = sel.data('selection');
    initSelect(sel, nd.nodes, nd.hint || nd.caption);
  });
  var items = {};
  if (!hasDefaultUrl) {
    $sidenav.find('.treeview-link').each(function (index) {
      items[this.id] = index === 0;
    });
  }
  $sidenav.on('click', '.treeview-link', function () {
    items[this.id] = !items[this.id];
    store.set('sideBarNav', items);
  });
  var stored = store.get('sideBarNav') || {};
  if (Object.keys(stored).join() === Object.keys(items).join()) {
    items = stored;
  }
  for (var id in items) {
    // items[id] && $('#'+id).parent().addClass("menu-open");
  }

  $("#moreMenuBtn").click(function (event) {
    event.preventDefault();
    $(this).toggleClass('active');
    if ($('body').hasClass('min')) {
      $('body').removeClass('min');
      $sidenav.find('> h3').show();
      $("#middle").css({"margin-left": ""});
    } else {
      $("#middle").css({"margin-left": "0"});
      $('body').addClass('min');
      var $items = $('#aside nav li.el_primary.menu-open');
      var style = $items.find('.treeview-menu').prop('style');
      if (style) {
        style.removeProperty("display");
      }
      $sidenav.find('> h3').hide();
      $items.removeClass('menu-open');
    }
  });

  $('#aside ul.nav > li').each(function (index) {
    $(this).addClass('el_primary').attr('id', 'el_' + index);
  });

  $('#aside ul.nav li a').click(function (event) {
    var $item = $(this);
    var href = $item.attr('href');
    if(href === '#') {
      event.preventDefault();
    }
    var $li = $item.closest('li');
    if (!$li.hasClass('always-open')) {
      var id = $li.attr('id');
      if ($li.hasClass('el_primary')) {
        $("#aside ul.nav li > ul").each(function () {
          var id2 = $(this).closest('li').attr('id');
          if (id !== id2) {
            $(this).slideUp(200, function () {
              $(this).parent().removeClass('menu-open');
            });
          }
        });
      }
      $item.next().slideToggle(200, function() {
        if($(this).is(":visible")) {
          $li.addClass('menu-open');
        } else {
          $li.removeClass('menu-open active');
        }
      });
    }
  }); //*/
})();

// IMODAL

(function () {
  var EVENT_PREFIX = 'imodal:';
  var $overlay = $('#global-overlay');
  var $frame = $('#imodal-frame');
  var $imodal = $('#imodal');
  var params = {};
  var imodalWindow = null;

  $imodal.find('.imodal-close').click(function () {
    parent.imodal.close();
  });

  function setHistory () {
    imodalWindow.history.pushState(null, imodalWindow.document.title, imodalWindow.location.href + '#imodal');
    $(imodalWindow).off('popstate').on('popstate', function (event) {
      imodal.forceClose();
    });
  }

  window.imodal = {

    getParams: function (key) {
      return key ? params[key] : params;
    },

    setParams: function (key, value) {
      params[key] = value;
    },

    getFrame: function () {
      return $frame.get(0);
    },

    getDocument: function () {
      return $frame.get(0).contentDocument || $frame.get(0).contentWindow.document;
    },

    getWindow: function () {
      return imodalWindow;
    },

    getEventId: function (name) {
      return EVENT_PREFIX + name;
    },

    init: function (params) {
      imodal.trigger('init', params);
    },

    load: function (url, data, cb) {
      cb = typeof data === 'function' ? data : cb;
      url = imodal.getDataUrl(data, url);
      $frame.addClass('active').detach().attr('src', url);
      $(document.body).append($frame);
      return $frame.off('load').load(function () {
        $overlay.hide();
        $frame.removeClass('transparent');
        $frame.parent().addClass('hidden-overflow');
        imodalWindow = $frame.addClass('loaded').get(0).contentWindow;
        setHistory();
        if (typeof cb === 'function') {
          cb(imodalWindow);
        }
      });
    },

    close: function () {
      var event = imodal.createEvent('beforeClose');
      $frame.trigger(event);
      if (event.isPropagationStopped()) {
        return false;
      } else {
        imodalWindow.history.back();
        imodal.forceClose();
        return true;
      }
    },

    forceClose: function () {
      if (imodalWindow) {
        if (imodal.getParams('reopen')) {
          $frame.addClass('transparent');
          $overlay.show();
        }
        setTimeout(function () {
          $frame.trigger(imodal.getEventId('close'));
          $frame.off('load').removeClass('active loaded').detach().attr('src', $frame.data('blank'));
          $(document.body).append($frame);
          $frame.parent().removeClass('hidden-overflow');
          imodalWindow = null;
          params = {};
        }, 0);
      }
    },

    createEvent: function (name) {
      return $.Event(imodal.getEventId(name));
    },

    on: function (name, handler) {
      $frame.on(imodal.getEventId(name), handler);
    },

    off: function (name, handler) {
      $frame.off(imodal.getEventId(name), handler);
    },

    getDataUrl: function (data, url) {
      data = typeof data !== 'object' ? {} : data;
      data = $.param(data);
      return data ? (url + (url.indexOf('?') > 0 ? '&' : '?') + data) : url;
    }
  };
})();

$('.default-icheck').iCheck({
  checkboxClass: 'icheckbox_flat',
  radioClass: 'iradio_flat',
  indeterminateClass: 'indeterminate-checkbox'
});

// INPUTMASK ALIASES

if (window.Inputmask) {
  Inputmask.extendAliases({
    email: {
      definitions: {
        "*": {
          validator: "[\w!#$%&'*+/=?^_`{|}~-]",
          cardinality: 1,
          casing: "lower"
        },
        "-": {
          validator: "[\w-]",
          cardinality: 1,
          casing: "lower"
        }
      }
    }
  });
}
//

function processAjaxError (xhr) {
  var $loader = $('#global-loader');
  var frame = imodal.getFrame();
  if (xhr.status === 401) {
    messageCallout.hide();
    imodal.load('/auth').load(function (event) {
      var doc = imodal.getDocument();
      if (doc.getElementById('authbutton')) {
        doc.forms[0].addEventListener('submit', function (event) {
          event.preventDefault();
          $loader.show();
          $(frame).addClass('imodal-frame-transparent');
          setTimeout(function () {
            doc.forms[0].submit();
          }, 0);
        });
      } else {
        imodal.close();
      }
      $(frame).removeClass('imodal-frame-transparent');
      $loader.hide();
    });
  }
}

// TOP MENU

$('#top-menu').each(function () {
  var $menu = $(this);
  var $items = $menu.children('.top-menu-item');
  var $more = $items.filter('.more-menu-item').hide();
  var $moreMenu = $more.children('.dropdown-menu');
  var $header = $('#header');
  var $siblings = $menu.nextAll();

  $items = $items.not($more);

  function align() {
    $more.show();
    $more.before($moreMenu.children());
    var maxWidth = getMaxMenuWidth();
    var moreWidth = $more.width();
    var sizes = getSizes(), total = 0, visible = 0;

    for (var i = 0; i < sizes.length; ++i) {
      if (total + sizes[i] > maxWidth) {
        if (total + moreWidth > maxWidth) {
          visible -= 1;
        }
        break;
      }
      total += sizes[i];
      visible += 1;
    }
    var $hidden = visible < 0 ? $items : $items.slice(visible);
    if ($hidden.length) {
      $moreMenu.append($hidden);
    } else {
      $more.hide();
    }
  }

  function getMaxMenuWidth() {
    var width = 10;
    $siblings.each(function () {
      width += $(this).outerWidth();
    });
    return $header.width() - $menu.offset().left - width;
  }

  function getSizes() {
    var sizes = [];
    $items.each(function () {
      sizes.push($(this).width());
    });
    return sizes;
  }

  $menu.show();
  align();

  $(window).on("resize", align);

  $menu.on('click', '.top-menu-section', function (event) {
    event.preventDefault();
    $items.filter('.active').removeClass('active');
    $(this).parent().addClass('active');
  });
});
