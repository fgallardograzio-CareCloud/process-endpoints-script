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

module.exports.checkBaseEndpointInRestCallTaskNode = function (modelServiceTaskNode) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFields = filterXMLElementNodesByName(extensionElements, 'activiti:field');
  const baseEndpointNode = activitiFields.find(node => node.attributes && node.attributes.name === 'baseEndpoint');

  return !!baseEndpointNode;
}

module.exports.getBaseEndpointFromRestCallTaskNode = function (modelServiceTaskNode, alfrescoEndpoints) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFields = filterXMLElementNodesByName(extensionElements, 'activiti:field');
  const baseEndpointNode = activitiFields.find(node => node.attributes && node.attributes.name === 'baseEndpoint');
  const baseEndpointValueNode = getXMLElementNodeByName(baseEndpointNode, 'activiti:string');
  const baseEndpointId = parseInt(getXMLCdataValue(baseEndpointValueNode), 10);

  const baseEndpointNameNode = activitiFields.find(node => node.attributes && node.attributes.name === 'baseEndpointName');
  const baseEndpointNameValueNode = getXMLElementNodeByName(baseEndpointNameNode, 'activiti:string');
  const baseEndpointName = getXMLCdataValue(baseEndpointNameValueNode);

  const baseEndpointData = alfrescoEndpoints.find(endpoint => endpoint.id === baseEndpointId);
  if (!baseEndpointData) {
    console.log(`Base endpoint "${baseEndpointName}" with ID ${baseEndpointId} is used in task but not found defined in Alfresco Admin. Falling back to using its name directly`);
    return {
      name: baseEndpointName,
    };
  }

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

module.exports.getRestCallTasksNodes = function (rootNode) {
  const serviceTaskNodes = filterXMLElementNodesByName(rootNode, 'serviceTask');
  const subProcessTaskNodes = filterXMLElementNodesByName(rootNode, 'subProcess');
  const restCallTaskNodes = serviceTaskNodes ?
    serviceTaskNodes.filter(serviceTaskNode =>
      serviceTaskNode.attributes['activiti:delegateExpression'] === '${activiti_restCallDelegate}'
    ) : [];
  const subProcessRestCallTaskNodes = subProcessTaskNodes ?
    subProcessTaskNodes.reduce((accumulator, nonRestTaskNode) => ([
      ...accumulator,
      ...module.exports.getRestCallTasksNodes(nonRestTaskNode),
    ]), []) : [];

  return [
    ...restCallTaskNodes,
    ...subProcessRestCallTaskNodes
  ];
};

module.exports.getRestUrlInRestCallTaskNode = function (modelServiceTaskNode) {
  const extensionElements = getXMLElementNodeByName(modelServiceTaskNode, 'extensionElements');
  const activitiFields = filterXMLElementNodesByName(extensionElements, 'activiti:field');
  let restUrlNode = activitiFields.find(node => node.attributes && node.attributes.name === 'restUrl');
  if (!restUrlNode) {
    throw new Error('no restUrl node found');
  }

  const restUrlValueNode = getXMLElementNodeByName(restUrlNode, 'activiti:string');
  const restUrl = getXMLCdataValue(restUrlValueNode).replace(/^\/+/, '');

  return restUrl;
}

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
  let restUrlNode = activitiFields.find(node => node.attributes && node.attributes.name === 'restUrl');
  if (!restUrlNode) {
    restUrlNode = {
      type: 'element',
      name: 'activiti:field',
      attributes: {name: 'restUrl'},
      elements: [{
        type: 'element',
        name: 'activiti:string',
        elements: [{
          type: 'cdata',
          cdata: '',
        }],
      }],
    };
    extensionElements.elements.push(restUrlNode);
  }
  const restUrlValueNode = getXMLElementNodeByName(restUrlNode, 'activiti:string');
  const restUrl = getXMLCdataValue(restUrlValueNode).replace(/^\/+/, '');
  const newRestUrl = `\${${variableName}}/${restUrl}`.replace(/\/+$/, '');

  setXMLCdataValue(restUrlValueNode, newRestUrl);
};
