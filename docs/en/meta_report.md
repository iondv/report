This page in [Русском](/docs/ru/meta_report.md)

# Report metadata settings

Reports are generated based on the data of the class specified for the `className` property. Initial data source `dataSource` retrieves data from the meta of the corresponding class. The report is built on the basis of attribute values specified in the property `results`. 
```yml
- name: dataSource # system name of the data source
    caption: Data source 
    load:
      - className: sourceClass # class, based on which the report is generated
        filter: # filter according to which the data source objects are selected
          ne:
            - $archive
            - true
        results: # class attribute
          - field: id # define the system name at the report level
            expr: $id # system name of the meta class attribute
          - field: date
            expr: $dateCreate
          - field: name
            expr: $nameObject
    index: # data source identifier
      - id
```
For the *source* filters are specified in *Conditions* based on classes.

Next, we create the resulting source, which (based on the data received by the original source from the class meta) generates and converts (if necessary) the data to correctly display it in the report tables. The initial source is specified in the property. `source`. The `joins` property sets the attribute, which is the identifier for building the report (in this case, the id of the object).

```yml
- name: test # system name of the resulting data source
    caption: Test report
    load:
      - source: dataTest # initial data source is determined
        joins: # report identifier
          - table: date
            alias: da
            left: id
            right: id
        results:
          - field: id
            expr: $id
          - field: date
            expr: $date
          - field: name
            expr: $name
```

Further, in the `reports` section the report table is formed, based on converted data from source. The `rangeFilters` property contains information about the filters that are customizable for the report. The `columns` property allows to form table columns (actual serial numbers).
```yml
reports: # report tables building
  - name: reportTest
    caption: Test report
    sheets:
      - name: reportTest
        caption: Test report
        type: aggregation
        source: test # data source for report table
        fetch: # attributes involved in reporting
          date: $date
          name: $name
        rangeFilters: # date range filter
          date:
            caption: For the period from|to
            format: date
            inclusive: both
        columns: #  forming the columns of the report table
          - field: date # attribute system name at the report level
            caption: Creation date # columns name of the report table
          - field: name
            caption: Name
```

As a result, the report consists of a table with two columns (Date and Name). The table displays the class objects from _"dataSource"_ , according to the filter by dates configured in `rangeFilters:`. The number of objects in the table will be equal to the number of identifier values configured in the `joins:` property.

Range filter is set via query parameters `?rangeFld[]=0&rangeFld[]=5`, where `rangeFld` - is the field we are looking for. If there is a search by dates, then it is necessary to transfer it in the locale format, which is transfered in the http-header `'accept-language'`, or in the `ISO8601` format. 

Description of **comparison parameter  `inclusive`** at the borders of the `rangeFilters` interval in report:

```yml
"rangeFilters": {
  "date": {
    "caption": "For the period from|to",
    "format": "date",
    "inclusive": "both" | "left" | "right"
  }
}
```
`both` - both boundaries can be equal to the desired values

`left` - the left border (smaller) may be equal to the desired values

`right` - the right border (large) may be equal to the desired values

If `inclusive` is not specified - the comparison is strict at both borders.

On the report page, the filter fields indicate the range that includes the date specified for the **"date"** attribute. 

See an example of a simple full report [here](/docs/en/2_system_description/metadata_structure/meta_report/example.md).

## Additional settings in the report

1. **Hierarchical assembly in a data mine setting**. It is used for processing the initial data during the assembly of the mine to:

* make data export in a single data source throughout the hierarchy in the database;
* display data on the first column with indenture depending on the nesting depth.

In the source configuration, the `"hierarchyBy"` setting is an object with a set of properties: `id`, `parent`, `level`, `order`.

 ```
   hierarchyBy: 
          id: guidProj
          parent: basicobj1.guidObj
          level: objLevel
          order: objOrder
 ```
where `id` - attribute in the data identifying the hierarchy element,

`parent` - attribute in the data containing the identifier of the parent element,

`level` -attribute in the resulting source, where the nesting level of the element will be written,

`order` - attribute in the resulting source where the value will be written to organize the hierarchy when displayed.

`objLevel` and `objOrder` are the fields for writing values (they do not need to be read, aggregated, etc.):

```yml
reports: 
  - name: roadmap
    caption: Road map
    sheets: 
      - name: roadmap
        caption: >-
          Road map
        type: aggregation
        needFilterSet: true
        needFilterMessage: Choose project
        styles: 
          objLevel: 
            1: text-indent-1
            2: text-indent-2
            3: text-indent-3
          nameObjIndex: 
            "3": level2
            "2": level1
            "1": level0
            "0": level0
        source: roadmapSource
        fetch: 
          objLevel: $objLevel
          guidObj: $guidObj
          numLevelObj: $numLevelObj
...
```

**NB:** Hierarchical assembly is possible only on the basis of the source and is impossible on the basis of the class.

_Assembley algorithm:_

* Create the resulting source.

* Make a selection of root elements with an empty `parent` field. 

* Sort out and write elements to the data source (in the `element_id` attribute - the object id, in the `level` - 0 value, in the `order` - the serial number of the element in the sample, added to the length of 6 characters with zeros).

* Iteratively make selections of the following nesting levels (starting from 0) until 0 objects will be extracted at the another iteration. Samples are made by combining the original source with the resulting link `parent = element_id` and `level=current level` nesting restriction. 

* At each iteration, sort out and write the elements to the resulting source, that said:
** write the object id to the special attribute - `element_id`, 
** write the curent nesting level to `level`, 
** `order` - write the concatenation of the sequence number of the parent element. It should be reduced to the string of the element sequence number in the sample and added to the length of 6 characters with zeros.

2. **Setting to hide all objects**, if table filters are not set. The setting is applied when it is necessary to hide all objects until a value is selected from the list in the filter (when opening the report):
```
needFilterSet: true
```

3. **Display the selection parameters in the report title**
```yml
...
          byPeriod:
            sum:
              - if:
                  - and:
                      - gte:
                          - $date
                          - ':since' # params->since
                      - lte:
                          - $date
                          - ':till' # params->till
                  - $amount
                  - 0
          byMonth:
            sum:
              - if:
                  - and:
                      - eq:
                          - month: 
                              - dateAdd:
                                  - $date
                                  - 10
                                  - h
                          - ':month' # params->month
                      - eq:
                          - year: 
                              - dateAdd:
                                  - $date
                                  - 10
                                  - h
                          - ':year' # params->year
                  - $amount
                  - 0
          byYear:
            sum:
              - if:
                  - eq:
                      - year: 
                          - dateAdd:
                              - $date
                              - 10
                              - h
                      - ':year' # params->year
                  - $amount
                  - 0
...
        params:
          year:
            caption: Year
            format: int
          month:
            caption: Month
            format: int
            select: # drop-down list
              '1': january
              '2': february
              '3': march
              '4': april
              '5': may
              '6': june
              '7': july
              '8': august
              '9': september
              '10': october
              '11': november
              '12': december
          since:
            caption: from
            format: date
          till:
            caption: to
            format: date
...
        columns:
          - field: title
            caption: Indicator
          - field: dimension
            align: center # header title in the center of the cell header
            caption: unit of measure
          - caption: '{$year}' # name of the header from the year parameter
            align: center
            columns: # column in the header - a group of nested columns
              - field: byPeriod
                # title in header from since and till parameters
                caption: 'from {$since} to {$till}'
                align: center
                format: number
              - field: byMonth
                # name of the header from the month parameter
                caption: 'For {$month}'
                align: center
                format: number
              - field: byYear
                caption: For year
                align: center
                format: number
```

4. **Переопределение значений атрибута для вывода в колоноке таблицы отчета.**

When displaying attribute value of the ["Drop-down list"](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_class/atr_selectionprovider.md) type in the column of the report table - the system name of the predefined attribute value will be displayed. You can redefine the value for output in the report using the following setting for the resulting data source:
```yml
...
        fetch:
          category: $category
          title: # report column system name
            case: # redefinition
              - eq: # operation (equal)
                  - $category # attribute
                  - AA4 # attribute value
              - 'Conclusions issued, total:' # redefining value
              - eq:
                  - $category
                  - AB5
              - '1. State expertise, total:'
              - eq:
                  - $category
                  - AC6
              - '- positive'
              - eq:
                  - $category
                  - AD7
              - '- negative'
...
          dimension:
            case:
              - eq:
                  - $category
                  - AA4
              - pieces
              - eq:
                  - $category
                  - AB5
              - pieces
```

Further, you can set the display style of the attribute value in the column of the report table. The example below sets the level for each value:
```
...
        styles:
          category:
            AA4: level0
            AB5: level1
            AC6: level2
            AD7: level2
```

5. **Drop-down list in parameters and filters.**
```yml
...
        params:
          year:
            caption: Year
            format: int
          month:
            caption: Month
            format: int
            select: # drop-down list
              '1': january
              '2': february
              '3': march
              '4': april
              '5': may
              '6': june
              '7': july
              '8': august
              '9': september
              '10': october
              '11': november
              '12': december
          since:
            caption: from
            format: date
          till:
            caption: to
            format: date
...
```

6. **Processing parameters in a filter on a report page.**
```yml
reports:
  ...
  filter:
    eq:
      - $yearStart
      - year:
        - ':dateSelect'
  ...
```
Attribute year value `$yearStart` equals to the year value from the date in the `:dateSelect` attribute.

7. **Paginator setting "pageSize".**

**NB:** Used for reports with `type: list` type.

It's used in cases when the report contains a lot of objects and pages need to be displayed page by page so as not to load the browser with heavy data processing.
```yml
reports:
 - name: test
    caption: Test report
    sheets:
      - name: main
        caption: Test report
        type: list
        pageSize: 100
```

8. **Output of nested data line by line.**

Setting the output of nested data line-by-line in the report is configured as follows: 
```yml
reports:
  - name: testReport
  ...
      columns:
        - caption: Grouping field
          columns: # fields for grouping
            - field: columns1
              caption: Field1
              format: string
            - field: columns2
              caption: Field2
              format: string
    ...
```

9. **Incremental load setting.**

_Incremental load — is defined as the activity of loading only new or updated records from the database._
To configure incremental data loading to the source when assembling the data mine, you must set the parameter:

```
append: true
```
It is necessary to upload daily statistics to the data mine so as not to recalculate the entire volume of the source data and to have a history of the periods.

10. **Features of sorting objects**

To configure the sorting of objects by the column of the report table, you must set the `sort` property. The system name of the column used for sorting should correspond to the system name of the report attribute specified in the data source.

```yml
reports:
  - name: sors
    caption: Source
    sheets:
      ...
        rangeFilters:
          ...
        sort:
          date: asc
        columns:
          ...
```


### The next page: [Configuration settings](/docs/en/additional_settings.md)