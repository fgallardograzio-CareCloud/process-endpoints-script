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

module.exports.getAllProcessModels = async function () {
  const {data} = await alfrescoApi.get('/enterprise/models', {
    params: {
      modelType: 0,
    },
  });

  return data.data;
};

module.exports.getAdminEndpoints = async function () {
  const {data} = await alfrescoApi.get('/enterprise/admin/endpoints', {
    params: {
      tenantId: 1,
    },
  });

  return data;
};

module.exports.getProcessBPMNFile = async function (processModelId) {
  const {data} = await alfrescoApi.get(`/enterprise/models/${processModelId}/bpmn20`);

  return data;
};

module.exports.publishApps = async function () {
  const {data} = await alfrescoApi.get(`/enterprise/models`, {
    params: {
      modelType: 3,
    },
  });
  const allApps = data.data;

  await Promise.all(allApps.map(async app => {
    await alfrescoApi.post(`/enterprise/app-definitions/${app.id}/publish`, {
      'comment': '[EAG-4951] Published automatically after updating variables and endpoints in related processes',
      'force': true
    });
  }));
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
