const alfrescoService = require('./services/alfresco-service');
const bpmnUtils = require('./utils/bpmn-utils');

const validWorkflowEndpoints = require('./data/valid-workflow-endpoints');

async function run() {
  const processModels = await alfrescoService.getAllProcessModels();

  for (const processModel of processModels) {
    const workflowName = processModel.name;

    let xml;
    try {
      xml = await alfrescoService.getProcessBPMNFile(processModel.id);
    } catch (error) {
      console.error(`Failed to get BPMN file for process "${workflowName}" with ID ${processModel.id}`, error);
      continue;
    }

    const model = bpmnUtils.getObjectFromXML(xml);
    const modelDefinitionProcessNode = bpmnUtils.getProcessDefinitionNode(model);

    let modelRestCallTasksNodes;
    try {
      modelRestCallTasksNodes = bpmnUtils.getRestCallTasksNodes(modelDefinitionProcessNode);
    } catch (error) {
      console.info(`Workflow REST call tasks not found for process "${workflowName}" with ID ${processModel.id}`, error);
      continue;
    }

    for (const modelServiceTaskNode of modelRestCallTasksNodes) {
      let taskName;
      try {
        taskName = bpmnUtils.getTaskNameFromRestCallTaskNode(modelServiceTaskNode);
      } catch (error) {
        console.info(`REST call task name not found in process "${workflowName}" with ID ${processModel.id}`, error);
        continue;
      }

      const hasBaseEndpoint = bpmnUtils.checkBaseEndpointInRestCallTaskNode(modelServiceTaskNode);
      if (hasBaseEndpoint) {
        console.error(`[DEPRECATED BASE] Base endpoint found in task "${taskName}" for process "${workflowName}" with ID ${processModel.id}`);
        continue;
      }

      try {
        const restUrlValue = bpmnUtils.getRestUrlInRestCallTaskNode(modelServiceTaskNode);
        const endpointInterpolationMatch = restUrlValue.match(/\$\{(.*?Endpoint)\}/i);
        const restUrlEndpointName = endpointInterpolationMatch && endpointInterpolationMatch[1];
        if (!restUrlEndpointName) {
          console.error(`[NO ENDPOINT] Rest URL does not use any endpoint in "${taskName}" for process "${workflowName}" with ID ${processModel.id}`);
          continue;
        }

        const restUrlVariableIsValid = validWorkflowEndpoints.includes(restUrlEndpointName);
        if (!restUrlVariableIsValid) {
          console.error(`[INVALID ENDPOINT] Rest URL uses an invalid endpoint "${restUrlEndpointName}" in "${taskName}" for process "${workflowName}" with ID ${processModel.id}`);
          continue;
        }
      } catch (error) {
        console.error(`[NO REST URL] Rest URL not found in task "${taskName}" for process "${workflowName}" with ID ${processModel.id}`);
      }
    }
  }
}

run();
