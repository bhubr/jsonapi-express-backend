const fs            = require('fs');
const path          = require('path');
const extend        = require('xtend');
const _             = require('lodash');
const eventHub      = require('../eventHub');
const winston       = require('winston');
const modelFinder   = require('./modelFinder');
const relationships = require('./relationships/index');

let models;

function getModels() {
  return models;
};

function mapModelToTableNames() {
  let mapModelTable = {};
  _.forOwn(models, (model, modelKey) => {
    mapModelTable[modelKey] = model._tableName;
  });
  return mapModelTable;
}

function store(modelsDir, dbConfig) {
  models = modelFinder(modelsDir, dbConfig);
  relationships.setup(models);
  const mapModelTable = mapModelToTableNames();
  return { mapModelTable, getModels };
}

module.exports = store;