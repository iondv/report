This page in [Russian](/README_RU.md)

# IONDV. Report

<h1 align="center"> <a href="https://www.iondv.com/"><img src="/report.png" alt="IONDV. Report" align="center"></a>
</h1>  

**Report** - is an IONDV. Framework module. It is used to build analytical reports based on data specified on the form of system objects.

## IONDV. Framework in brief

**IONDV. Framework** - is a node.js open source framework for developing accounting applications
or microservices based on metadata and individual modules. Framework is a part of 
instrumental digital platform to create enterprise 
(ERP) apps. This platform consists of the following open-source components: the [IONDV. Framework](https://github.com/iondv/framework), the
[modules](https://github.com/topics/iondv-module) и ready-made applications expanding it
functionality, visual development environment [Studio](https://github.com/iondv/studio) to create metadata for the app.

* For more details, see [IONDV. Framework site](https://iondv.com). 

* Documentation is available in the [Github repository](https://github.com/iondv/framework/blob/master/docs/en/index.md).

## Description

**IONDV. Report** -  is designed for the formation of analytical reports and reference information (on the basis of special metadata) in the form of graphs. Calculations can be performed on a schedule or the operator can initiate them. Calculations can be performed on a schedule or be initiated by the operator. Reports are displayed in accordance with the settings specified in the application meta, in a folder specially designated for them. When changing the data of the object for which you want to display a report, you need to update the data source to get new information about the system object. 

_Data source_ - is used to build a data mine that contains analytical information on data from the meta. The information is organized in the form of tables. In the meta of report module, the data sources are indicated, on the basis of which the information is generated to build a report. Further the report table columns are formed, indicating the resource for the data from the meta classes of the system. Meta report is located in the `bi` folder of the project in the YML format.

The system allows you to configure automatic updating of the data source according to the schedule in accordance with the specified time interval. The setting allows you to increase the speed of obtaining relevant information when accessing reports, due to the lack of the need to re-update the source data assembly.

The library for building reports of the Pivot type is PivotTable.js - [examples and description](https://pivottable.js.org).


## Module features

- [x] Formation of analytical reports on system objects.
- [x] Displaying data for an arbitrary period of time.
- [x] Grouping the displayed data by key field.
- [x] Export of generated report in formats _.xlsx_, _.pdf_ and _.html_.
- [x] Formulas for the automatic calculation of data from the registry at the stage of updating the source data of the report.
- [x] Formation of summary data for specified fields.
- [x] Building Pivot reports.
- [x] Formation of calculated forms, with the ability to filter by values.
- [x] Data filtering.
- [x] Mathematical operations on data.
- [x] Pivot tables.
- [x] REST API to report data.

## Intended use of the module using demo projects as an example

_Report_ module is used in several demo projects.

#### [telecom-ru.iondv.com](https://telecom-ru.iondv.com/geomap) project (russian version), [telecom-en.iondv.com](https://telecom-en.iondv.com/geomap) project (english version) 

Registry type software solution for organizing public sector project activities. The page of the _Report_ module contains analytical information on the availability of communication services in settlements. Which includes reports on each type of communication, grouped by locality and a summary report on communication in the region.

#### [pm-gov-ru.iondv.com](https://pm-gov-ru.iondv.com/geomap) project (only russian version)

The application displays the main features and functionality of systems implemented on IONDV.Framework. The _Report_ module page displays various kinds of analytical information on information about projects and events.

### Configuration of report

Documentation for configuring a report to use it in applications:

* [Setting of report metadata](docs/en/meta_report.md)
* [Configuration settings](docs/en/additional_settings.md)


--------------------------------------------------------------------------  


 #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.com) &ensp;   [Russian](/README_RU.md)    &ensp; [FAQs](/faqs.md)          


--------------------------------------------------------------------------  

Copyright (c) 2018 **LLC "ION DV"**.  
All rights reserved. 