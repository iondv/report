This page in [Русском](/docs/ru/additional_settings.md)

### The previous page: [Report metadata settings (data mine, navigation)](/docs/en/meta_report.md)

# Configuration settings

A typical setting of the _report_ module in the application configuration file includes the following sections::

- [x] [Automatic assembly of data mine `jobs`](/docs/en/additional_settings.md#automatic-assembly-of-data-mine-jobs)
- [x] [Namespace of the project `namespaces`](/docs/en/additional_settings.md#namespace-of-the-project-namespaces)
- [x] [Display navigation by default `defaultNav`](/docs/en/additional_settings.md#display-navigation-by-default-defaultnav)
- [x] [Builder setting for the data source `mineBuilders`](/docs/en/additional_settings.md#builder-setting-for-the-data-source-minebuilders)
- [x] [Setting of jobs in work `di`](/docs/en/additional_settings.md#setting-of-tasks-in-work-di)
- [x] [Defining static templates `statics`](/docs/en/additional_settings.md#defining-static-templates-statics)
- [x] [Logo on the report page `logo`](/docs/en/additional_settings.md#logo-on-the-report-page-logo)
- [x] [Path to the metadata reports `import`](/docs/en/additional_settings.md#path-to-the-metadata-reports-import)

The structure of the sections is as follows:

```javascript
"globals": {
  "jobs": {}
},
"modules": {
  "report": {
    "globals": {
      "namespaces": {...},
      "defaultNav": {...},
      "mineBuilders": {...},
      "di": {...},
      "statics": {...},
      "logo": "..."
    },
    "import": {...}
  }
}
```

## Automatic assembly of data mine `jobs`

Add the `jobs.enabled=true` setting in the *config.ini* file for automatic assembly of data mine. You can set the interval for automatic assembly of data mine in the *deploy.json* file of the app. For example, if you want to start the job every six hours after the first run of the app, you need to set the `"jobs"` parameter in the deploy.json file as follows:

```javascript
"jobs": {
      "report-builder": {
        "description": "Data mine build service of the Report module",
        "launch": {
          "hour": 21600000
        }
      }

```

## Namespace of the project `namespaces`

Set the namespace of the application: 

```javascript
"namespaces": {
  "namespaceApp": "Project"
}
```

## Display navigation by default `defaultNav`

If you want to display the navigation by default when opening the report module page, you need to set the parameters as follows:

```javascript
"defaultNav": {
  "namespace": "namespaceApp", // project namespace
  "mine": "reportName", // report name
  "report": "reportTest" // name of the report table, based on data from the source
}
```

## Builder setting for the data source `mineBuilders`

This setting is used to connect builder and data source to aggregate from different sources. Use the standart `mineBuilder`. 

```javascript
"mineBuilders": {
  "namespaceApp": {
    "reportName": {
      "dataTest": "mineBuilder"
    }
  }
}
```

## Setting of tasks in work `di`

```javascript
"di": {},
```

## Defining static templates `statics`

Here, you can set the static template as a variable, which defines the path to the folder containing the data for the module. A static template is used in the settings of other sections of the module.
```javascript
"statics": {
  "geoicons": "applications/namespaceApp/templates/icons"
}
```

## Logo on the report page `logo`

The logo will be displayed in the upper left corner on the report module page. The path to the logo consists of a static template variable, defined in the `"statics"` section and icon name for the logo.

```javascript
"logo": "geoicons/logo.png"
```

## Path to the metadata reports `import`

Here you can define the path (relative to platform) to the configuration file with the report metadata. Additionally, you must specify the application namespace.

```javascript
"import": {
  "src": "applications/namespaceApp/bi",
  "namespace": "namespaceApp"
}
```
