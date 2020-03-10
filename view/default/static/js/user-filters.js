(function () {


  $('.user-filters-modal').each(function() {

    var $modal = $(this),

      mine = $modal.data('mine'),
      report = $modal.data('report'),
      sheet = $modal.data('sheet'),
      format = $modal.data('format'),
      
      $assign = $modal.find('.assign-filter'),
      $save = $modal.find('.save-filter'),
      $filterName = $modal.find('.filter-name'),
      $filterSelect = $modal.find('.select-filter'),
      $filterReset = $modal.find('.reset-filter'),
      $filterRemove = $modal.find('.remove-filter'),


      $filterEditor = $modal.find('.filter-editor'),
      $rangeFilters = $modal.closest('.range-filters'),
      $rangeInputs = $rangeFilters.find('.range-filters-inputs'),
      $applyFilters = $rangeFilters.find('.apply-filters'),

      currentFilter;

    function copyVal(val) {
      return function() {
        $(this).val(val).trigger('change');
      };
    }

    function getAllFilters() {
      var filters;
      if (localStorage && localStorage.ionReportFilters) {
        try {
          filters = JSON.parse(localStorage.ionReportFilters) || {};
        } catch (err) {
          // do nothing
        }
      }
      filters = filters || {};
      filters[mine] = filters[mine] || {};
      filters[mine][report] = filters[mine][report] || {};
      filters[mine][report][sheet] = filters[mine][report][sheet] || {};
      return filters;
    }

    function saveFilters(filters) {
      localStorage.ionReportFilters = JSON.stringify(filters);
    }

    function getSheetFilters() {
      var filters = getAllFilters();
      return filters[mine][report][sheet];
    }

    function saveSheetFilters(filterName, filterParams) {
      var filters = getAllFilters();
      filters[mine][report][sheet][filterName] = filterParams;
      saveFilters(filters);
    }

    function deleteSheetFilters(filterName) {
      var filters = getAllFilters();
      delete filters[mine][report][sheet][filterName];
      saveFilters(filters);
    }

    function copyParams($from, $to) {
      $('.range-filter, .fetch-param', $from).each(function () {
        var inputs = $(':input', this);
        inputs.each(function(){
          var $input = $(this);
          var $rangeInput = $('[data-id="'  + $input.data('id') + '"]', $to);
          $rangeInput.each(copyVal($input.val()));
        });
      });
    }

    function setFilterParams(params) {
      $('.range-filter, .fetch-param', $filterEditor).each(function () {
        var inputs = $(':input', this);
        inputs.each(function(){
          var $input = $(this);
          var id = $input.data('id');
          if ($input.hasClass('date')) {
            $input.val(moment(params[id]).format(format));
          } else {
            $input.val(params[id]);
          }

        });
      });
    }

    function getFilterParams() {
      var params = {};
      $('.range-filter, .fetch-param', $filterEditor).each(function () {
        var inputs = $(':input', this);
        inputs.each(function(){
          var $input = $(this);
          var dtpicker, inputDate;
          if ($input.hasClass('date')) {
            dtpicker = $input.data("DateTimePicker");
            inputDate = dtpicker && dtpicker.viewDate();
            if (inputDate) {
              params[$input.data('id')] = inputDate.toDate();
            }
          } else {
            params[$input.data('id')] = $input.val();
          }
        });
      });
      return params;
    }

    function enrichSelectFilter() {
      var filters = getSheetFilters();
      var name;
      $filterSelect.html('');
      $filterSelect.append($('<option/>', { value: null, text: __('js.userFilters.select'), selected: true, disabled: true }));
      for (name in filters) {
        $filterSelect.append($('<option/>', { value: name, text: name }));
      }
    }

    function onFilterSelect() {
      var filters = getSheetFilters();
      var selected = $('option:selected', this)[0];
      var name = selected && $(selected).val();
      if (name && filters[name]) {
        currentFilter = name;
        $filterName.val(name);
        setFilterParams(filters[name]);
      }
    }

    function onReset() {
      currentFilter = null;
      $filterSelect.val([]);
      $filterName.val('');
      copyParams($rangeInputs, $filterEditor);
    }

    function onRemove() {
      var name = $filterName.val();
      if (name) {
        $("option[value='" + name + "']", $filterSelect).remove();
        deleteSheetFilters(name);
        onReset();
      }
    }

    function assign() {
      copyParams($filterEditor, $rangeInputs);
      $applyFilters.click();
      $modal.modal('hide');
    }

    function onSave() {
      var params,
        filters = getSheetFilters(),
        name = $filterName.val();
      if (name) {
        params = getFilterParams();
        if (!filters[name]) {
          $filterSelect.append($('<option/>', { value: name, text: name }));
        }
        $filterSelect.val(name);
        saveSheetFilters(name, params);
      }
    }

    function onOpen() {
      var filters = getSheetFilters();
      if (currentFilter && filters[currentFilter]) {
        $filterSelect.val(currentFilter);
        $filterName.val(currentFilter);
        setFilterParams(filters[currentFilter]);
      } else {
        copyParams($rangeInputs, $filterEditor);
      }
    }

    enrichSelectFilter();

    $filterSelect.change(onFilterSelect);
    $filterReset.click(onReset);
    $filterRemove.click(onRemove);
    $assign.click(assign);
    $save.click(onSave);
    $modal.on('show.bs.modal', onOpen);
  });

})();
