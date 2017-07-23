const _ = require('lodash');

function checkRelationships(models) {
  return new Promise((resolve, reject) => {
    try {
      _.forOwn(models, checkModelRelationships);
      _.forOwn(models, model => {
        delete model._relationships;
      });
      resolve(models);
    } catch(e) {
      console.log(e);
      reject(e);
    }
  });
}

function checkModelRelationships(model, key, models) {
  const { _relationships } = model;
  let relationships = {};
  _.forOwn(_relationships, (relationship, key, allRelationships) => {
    relationships[key] = checkModelRelationship(relationship, key, allRelationships, model, models);
    // console.log('\n\n# rels for model', model, key, relationships);
  });
  model.relationships = relationships;
  return model;
}

function checkModelRelationship(relationship, key, relationships, model, models) {
  // console.log('\n### ' + key, relationship, relationships, model, models);
  const { relatedModel } = relationship;
  let inverseRelationship;
  let inverseRelationships;
  if(! models[relatedModel]) {
    throw new Error('Could not find related model "' + relatedModel + '" for model "' + model._name + '"');
  }
  const relatedModelRels = models[relatedModel]._relationships;
  // let inverseRelationship = _.find(relatedModelRels, r => (r.inverse === key));
  // let inverseRelationship = _.find(relatedModelRels, r => {
  //   console.log(model._name, key, 'find inverse?', r);
  //   return r.inverse === key;
  // });
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
  // console.log('\n## inverse for', model._name, key, '\n', relationship, inverseRelationship);
  return relationship;
}

module.exports = {
  check: checkRelationships
};

// module.exports = function(modelDescriptors) {

//   let modelRelationships = {};
//    _.forOwn(modelDescriptors, function(value, key) {
//     modelRelationships[key] = value.relationships;
//   });

//   return modelRelationships;
// }