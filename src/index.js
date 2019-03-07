const alfrescoService = require('./services/alfresco-service');
const bpmnUtils = require('./utils/bpmn-utils');
const fileUtils = require('./utils/file-utils');
const variableUtils = require('./utils/variable-utils');

const config = require('./config');

async function run() {
  const alfrescoEndpoints = await alfrescoService.getAdminEndpoints();
  const processModels = await alfrescoService.getAllProcessModels();
  const envVariableDeclarations = [];

  await Promise.all(processModels.map(async processModel => {
    // Get workflow name (use model name instead of process name)
    const workflowName = processModel.name;

    let xml;
    try {
      xml = await alfrescoService.getProcessBPMNFile(processModel.id);
    } catch (error) {
      console.error(`Failed to get BPMN file for process "${workflowName}" with ID ${processModel.id}`, error);
      return;
    }

    const model = bpmnUtils.getObjectFromXML(xml);
    const modelDefinitionProcessNode = bpmnUtils.getProcessDefinitionNode(model);

    // Get endpoints from every REST call task
    let modelRestCallTasksNodes;
    try {
      // Get all REST call tasks
      modelRestCallTasksNodes = bpmnUtils.getRestCallTasksNodes(modelDefinitionProcessNode);
    } catch (error) {
      console.info(`Workflow REST call tasks not found for process "${workflowName}" with ID ${processModel.id}`, error);
      return;
    }

    modelRestCallTasksNodes.forEach(modelServiceTaskNode => {
      // Get REST call task name
      let taskName;
      try {
        taskName = bpmnUtils.getTaskNameFromRestCallTaskNode(modelServiceTaskNode);
      } catch (error) {
        console.info(`REST call task name not found in process "${workflowName}" with ID ${processModel.id}`, error);
        return;
      }

      // Get REST call task's base endpoint
      let baseEndpoint;
      try {
        baseEndpoint = bpmnUtils.getBaseEndpointFromRestCallTaskNode(modelServiceTaskNode, alfrescoEndpoints);
      } catch (error) {
        console.info(`Base endpoint not found in task "${taskName}" for process "${workflowName}" with ID ${processModel.id}`, error);
        return;
      }

      // Generate environment variable declaration
      let envVariableSegmentNames;
      if (config.separateVarsForEveryWorkflowTask) {
        envVariableSegmentNames = [workflowName, taskName];
      } else {
        envVariableSegmentNames = [baseEndpoint.name];
      }

      const envVariableDeclaration = variableUtils.getEnvVariableDeclaration(baseEndpoint.url, ...envVariableSegmentNames);
      if (!envVariableDeclarations.includes(envVariableDeclaration)) {
        envVariableDeclarations.push(envVariableDeclaration);
      }

      if (config.updateProcessesContent) {
        // Update XML model
        try {
          let envVariableSegmentNames;
          if (config.separateVarsForEveryWorkflowTask) {
            envVariableSegmentNames = [workflowName, taskName];
          } else {
            envVariableSegmentNames = [baseEndpoint.name];
          }

          const variableName = variableUtils.getWorkflowVariableName(...envVariableSegmentNames);
          bpmnUtils.addWorkflowVariableDeclarationNode(modelDefinitionProcessNode, variableName);
          bpmnUtils.updateRestUrlInRestCallTaskNode(modelServiceTaskNode, variableName);
          bpmnUtils.removeBaseEndpointNodesInRestCallTaskNode(modelServiceTaskNode);
        } catch (error) {
          console.error(`Failed to update XML model in task "${taskName}" for process "${workflowName}" with ID ${processModel.id}`, error);
        }
      }
    });

    if (config.updateProcessesContent) {
      // Upload updated process model
      try {
        const updatedXml = bpmnUtils.getXMLFromObject(model);
        await alfrescoService.updateProcessModel(processModel.id, updatedXml);
        console.log(`Updated and uploaded workflow model for process "${workflowName}" with ID ${processModel.id}`);
      } catch (error) {
        console.error(`Failed to upload the updated process model for process "${workflowName}" with ID ${processModel.id}`, error);
      }
    }
  }));

  if (config.publishAppsAfterProcessUpdate) {
    // Publish all apps
    try {
      await alfrescoService.publishApps();
      console.log('Published all apps');
    } catch (error) {
      console.error('Failed to publish apps', error);
    }
  }

  // Save environment variables to configured file
  try {
    const envVariableDeclarationsText = envVariableDeclarations.sort().join('\n');
    await fileUtils.writeEnvFile(config.envOutputFile, envVariableDeclarationsText);
    console.log(`Saved environment variables file to ${config.envOutputFile}`);
  } catch (error) {
    console.error(`Error when trying to save environment variables file to ${config.envOutputFile}`, error);
  }
}

run();
