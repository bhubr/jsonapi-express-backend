const fs            = require('fs');
const path          = require('path');
const extend        = require('xtend');
const _             = require('lodash');
const eventHub      = require('../eventHub');
const winston       = require('winston');
const modelFinder   = require('./modelFinder');
const relationships = require('./relationships/index');
let store = null;

let models;

function getModels() {
  return models;
};

function store(modelsDir, dbConfig) {
  models = modelFinder.findInDir(modelsDir, dbConfig);
  relationships.setup(models);
  return { getModels };
}

module.exports = store;