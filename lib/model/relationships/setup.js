const lineLogger = require('console-line-logger');
const _ = require('lodash');

function setupRelationships(models) {
  // try {
    _.forOwn(models, checkModelRelationships);
    _.forOwn(models, model => {
      delete model._relationships;
    });
    // return models;
  // } catch(e) {
  //   // lineLogger(e);
  //   reject(e);
  //   }
}

function checkModelRelationships(model, key, models) {
  const { _relationships } = model;
  let relationships = {};
  _.forOwn(_relationships, (relationship, key, allRelationships) => {
    relationships[key] = checkModelRelationship(relationship, key, allRelationships, model, models);
    // lineLogger('\n\n# rels for model', model, key, relationships);
  });
  model.relationships = relationships;
  return model;
}

function checkModelRelationship(relationship, key, relationships, model, models) {
  // lineLogger('\n### ' + key, relationship, relationships, model, models);
  const { relatedModel } = relationship;
  let inverseRelationship;
  let inverseRelationships;
  if(! models[relatedModel]) {
    throw new Error('Could not find related model "' + relatedModel + '" for model "' + model._name + '"');
  }
  const relatedModelRels = models[relatedModel]._relationships;
  if(relationship.inverse) {
    inverseRelationship = _.find(relatedModelRels, (r, k) => {
      const found = relationship.inverse === k;
      if(! found) {
        return false;
      }
      if(! r.inverse) {
        throw new Error(
          'Inverse relationship "' + relationship.inverse + '" found for ' + model._name +
          '.' + key + ', but the inverse was not explicitally set on ' + models[relatedModel]._name + '.' + k
        );
      }
      return true;
    });
    if(inverseRelationship === undefined) {
      throw new Error(
        'Inverse relationship "' + relationship.inverse + '" has been set on ' +
        model._name + '.' + key + ', but the inverse was not found on ' + models[relatedModel]._name
      );
    }
  }
  else {
    let matchingKeys = [];
    inverseRelationships = _.filter(relatedModelRels, (r, k) => {
      matchingKeys.push(k);
      return r.relatedModel === model._name;
    });
    if(inverseRelationships.length > 1) {
      throw new Error(
        'More than one relationship found for "' + model._name + '" on the same related model "' +
        relationship.relatedModel + '", but no explicit inverses have been specified for key "' + key + '"');
    }
    inverseRelationship = inverseRelationships[0];
    inverseRelationship.inverse = key;
    relationship.inverse = matchingKeys.pop();
  }
  // lineLogger(relationship.type, inverseRelationship.type, relationship.isOwner, inverseRelationship.isOwner);
  if(relationship.type === 'belongsTo' && inverseRelationship.type === 'belongsTo') {
    if(! relationship.isOwner && ! inverseRelationship.isOwner) {
      throw new Error('No member of the 1-to-1 relationship ' + model._name + '-' + relationship.relatedModel + ' has isOwner=true');
    }
    if(relationship.isOwner && inverseRelationship.isOwner) {
      throw new Error('Only one member of the 1-to-1 relationship ' + model._name + '-' + relationship.relatedModel + ' should have isOwner=true');
    }
  }
  // lineLogger('\n## inverse for', model._name, key, '\n', relationship, inverseRelationship);
  return relationship;
}

module.exports = setupRelationships;

