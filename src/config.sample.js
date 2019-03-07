module.exports = {
  alfresco: {
    host: 'http://localhost:8080',
    user: 'admin@app.activiti.com',
    pass: 'admin'
  },
  envOutputFile: './out/env.txt',
  separateVarsForEveryWorkflowTask: false,
  envWorkflowEndpointPrefix: 'WORKFLOW_ENDPOINT',
  varWorkflowEndpointSuffix: 'Endpoint',
  updateProcessesContent: false,
  publishAppsAfterProcessUpdate: false,
};
