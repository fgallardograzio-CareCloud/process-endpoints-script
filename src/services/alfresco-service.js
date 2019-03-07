const axios = require('axios');
const FormData = require('form-data');
const {fs} = require('memfs');

const fileUtils = require('../utils/file-utils');

const config = require('../config');

const alfrescoApi = axios.create({
  baseURL: `${config.alfresco.host}/activiti-app/api/`,
  auth: {
    username: config.alfresco.user,
    password: config.alfresco.pass,
  },
});

async function getAllModels(modelType) {
  const {data} = await alfrescoApi.get('/enterprise/models', {
    params: {
      modelType,
    },
  });

  return data.data;
}

module.exports.getAllProcessModels = async function () {
  return getAllModels(0);
};

module.exports.getAdminEndpoints = async function () {
  const {data} = await alfrescoApi.get('/enterprise/admin/endpoints', {
    params: {
      tenantId: 1,
    },
  });

  return data;
};

module.exports.getAllApps = async function () {
  return getAllModels(3);
}

module.exports.getProcessBPMNFile = async function (processModelId) {
  const {data} = await alfrescoApi.get(`/enterprise/models/${processModelId}/bpmn20`);

  return data;
};

module.exports.publishApp = async function (appId) {
  const {data} = await alfrescoApi.post(`/enterprise/app-definitions/${appId}/publish`, {
    'comment': '[EAG-4951] Published automatically after updating variables and endpoints in related processes',
    'force': true
  });

  return data;
};

module.exports.updateProcessModel = async function (processModelId, bpmnXml) {
  const bpmnTmpFilename = `/${processModelId}.bpmn20.xml`;
  fs.writeFileSync(bpmnTmpFilename, bpmnXml);
  const bpmnFileStream = fs.createReadStream(bpmnTmpFilename);

  const form = new FormData();
  form.append('file', bpmnFileStream);

  const {data} = await alfrescoApi.post(`/enterprise/models/${processModelId}/newversion`, form, {
    headers: form.getHeaders(),
  });

  return data;
};
