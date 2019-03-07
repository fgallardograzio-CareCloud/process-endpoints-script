const _ = require('lodash');

const config = require('./../config');

module.exports.getEnvVariableDeclaration = function (baseEndpointUrl, ...names) {
  const segments = [config.envWorkflowEndpointPrefix, ...names].filter(element => element);
  const key = segments.map(segment => _.snakeCase(segment).toUpperCase()).join('__');
  return `${key}='${baseEndpointUrl}'`;
};

module.exports.getWorkflowVariableName = function (...names) {
  const segments = [...names, config.varWorkflowEndpointSuffix].filter(element => element);
  return _.camelCase(segments.join(' '));
};
