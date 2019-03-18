## How to use

### Configuration
Create the config file in `src/config.js`.

You can see a sample configuration in `src/config.sample.js`, with the required properties and their values.

| Setting | Type | Description |
| ------- | ---- | ----------- |
| `alfresco.host`<br>`alfresco.user`<br>`alfresco.pass` | String | Config to use to connect to the target Alfresco instance. |
| `envOutputFile` | String | Location to save a text file with the required environment variables, for every endpoint that is being used by a REST call task in all Workflows. |
| `separateVarsForEveryWorkflowTask` | Boolean | If `true`, separate variables for every task in every workflow will be generated, otherwise there will only be one variable for every endpoint. |
| `envWorkflowEndpointPrefix` | String | Prefix for the environment variable. |
| `varWorkflowEndpointSuffix` | String | Suffix for the Workflow variable. |
| `updateProcessesContent` | Boolean | If `true`, the Alfresco process model will be updated to receive and use the new variables in all REST call tasks, instead of the existing admin endpoint. |
| `publishAppsAfterProcessUpdate` | Boolean | If `true`, all Alfresco apps will be published, and linked to the latest version of the updated processes. |


### Run the update script
Get a sample environment file with variable definitions for all base endpoints being used and, if enabled in the configuration file, also update and publish all processes and apps.
```
node src/index.js
```

### Run the check script
Check all processes and see if there's still a base endpoint set, a missing url, an invalid url, or an invalid endpoint.
```
node src/check.js
```
