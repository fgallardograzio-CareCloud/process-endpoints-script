const xmlJs = require('xml-js');

function getXMLElementNodeByName(xmlObj, nodeName) {
  return xmlObj.elements && xmlObj.elements.find(node => node.type === 'element' && node.name === nodeName);
}

function getXMLCdataValue(xmlObj) {
  return xmlObj.elements && xmlObj.elements.find(node => node.type === 'cdata').cdata;
}

function filterXMLElementNodesByName(xmlObj, nodeName) {
  return xmlObj.elements && xmlObj.elements.filter(node => node.type === 'element' && node.name === nodeName);
}

function setXMLCdataValue(xmlObj, value) {
  return xmlObj.elements && (xmlObj.elements.find(node => node.type === 'cdata').cdata = value);
}

module.exports.addWorkflowVariableDeclarationNode = function (modelDefinitionProcessNode, variableName) {
  let modelExtensionElementsNode = getXMLElementNodeByName(modelDefinitionProcessNode, 'extensionElements');

  if (!modelExtensionElementsNode) {
    modelExtensionElementsNode = {
      type: 'element',
      name: 'extensionElements',
      elements: []
    };
    modelDefinitionProcessNode.elements.unshift(modelExtensionElementsNode);
  }

  const existing = modelExtensionElementsNode.elements.filter(element => {
    return element.attributes && element.attributes['modeler:variableName'] === variableName;
  });
  if (existing.length) return;

  modelExtensionElementsNode.elements.push({
    type: 'element',
    name: 'modeler:executionvariables',
    attributes: {
      'xmlns:modeler': 'http://activiti.com/modeler',
      'modeler:variableName': variableName,
      'modeler:variableType': 'string',
    }
  });
};

module.exports.getBaseEndpointFromRestCallTaskNode = function (modelServiceTaskNode, alfrescoEndpoints) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFields = filterXMLElementNodesByName(extensionElements, 'activiti:field');
  const baseEndpointNode = activitiFields.find(node => node.attributes && node.attributes.name === 'baseEndpoint');
  const baseEndpointValueNode = getXMLElementNodeByName(baseEndpointNode, 'activiti:string');
  const baseEndpointId = parseInt(getXMLCdataValue(baseEndpointValueNode), 10);
  const baseEndpointData = alfrescoEndpoints.find(endpoint => endpoint.id === baseEndpointId);
  const baseEndpointUrl = new URL(
    `${baseEndpointData.protocol}://${baseEndpointData.host}:${baseEndpointData.port}/${baseEndpointData.path}`
  ).href.replace(/[:/]+$/, '');

  return {
    ...baseEndpointData,
    url: baseEndpointUrl,
  };
};

module.exports.getObjectFromXML = function (xml) {
  return xmlJs.xml2js(xml);
};

module.exports.getProcessDefinitionNode = function (modelNode) {
  const modelDefinitionNode = getXMLElementNodeByName(modelNode, 'definitions');

  return getXMLElementNodeByName(modelDefinitionNode, 'process');
};

module.exports.getRestCallTasksNodes = function (modelDefinitionProcessNode) {
  const serviceTaskNodes = filterXMLElementNodesByName(modelDefinitionProcessNode, 'serviceTask')
  return serviceTaskNodes.filter(node => node.attributes['activiti:delegateExpression'] === '${activiti_restCallDelegate}');
};

module.exports.getTaskNameFromRestCallTaskNode = function (modelServiceTaskNode) {
  return modelServiceTaskNode.attributes.name;
};

module.exports.getXMLFromObject = function (obj) {
  return xmlJs.js2xml(obj, {
    spaces: 2
  });
};

module.exports.removeBaseEndpointNodesInRestCallTaskNode = function (modelServiceTaskNode) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFieldsToDelete = filterXMLElementNodesByName(extensionElements, 'activiti:field')
    .filter(node => node.attributes && ['baseEndpoint', 'baseEndpointName'].includes(node.attributes.name));

  activitiFieldsToDelete.forEach(nodeToDelete => {
    extensionElements.elements.splice(extensionElements.elements.findIndex(node => node === nodeToDelete), 1);
  });
};

module.exports.updateRestUrlInRestCallTaskNode = function (modelServiceTaskNode, variableName) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFields = filterXMLElementNodesByName(extensionElements, 'activiti:field');
  const restUrlNode = activitiFields.find(node => node.attributes && node.attributes.name === 'restUrl');
  const restUrlValueNode = getXMLElementNodeByName(restUrlNode, 'activiti:string');
  const restUrl = getXMLCdataValue(restUrlValueNode);
  const newRestUrl = `\${${variableName}}/${restUrl}`;

  setXMLCdataValue(restUrlValueNode, newRestUrl);
};
