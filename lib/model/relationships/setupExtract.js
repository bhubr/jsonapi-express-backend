const _      = require('lodash');
const naming = require('../../naming');

function setupExtract(models) {
  return new Promise((resolve, reject) => {
    _.forOwn(models, setupExtractForModel);
    resolve(models);
  });
}

function setupExtractForModel(model, key, models) {
  const { relationships } = model;
  _.forOwn(relationships,
    (relationship, key) => setupExtractForRelationship(relationship, key, relationships, models)
  );
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// what do we do when payload contains payload for belongsTo/belongsTo relationship
// e.g. POST to /api/v1/passports. With a relationship: owner: { data: { type: 'users', id: 1} }
// Passport belongs to user
// We need to:
// - check that the type in payload matches the type in relationship
// - ensure that the relatee exists => find it => store.findRecord('user', 1)
// - check who actually owns the relationship
// - ensure that the possibly existing relatee (passport) for user... doesn't exist or is gonna be deleted!
// - ensure that we can set it as relatee (permissions). e.g. a user can't associate a post
//   to another user.
function extractBelongsToBelongsTo(relatedModel) {
  const expectedType = naming.toKebabPlural(relatedModel);
  return function(relationshipData) {
    const { type, id } = relationshipData;
    if(type === undefined || id === undefined) {
      throw new Error('Incoming payload for belongsTo/belongsTo ' + relatedModel + ' has no type or id');
    }
    // console.log(relatedModel, expectedType, type, id);
    if(type !== expectedType) {
      throw new Error('Incoming type "' + type + '" does not match expected type "' + expectedType + '"');
    }
  };
}

function extractBelongsToHasMany() {

}

function extractHasManyBelongsTo() {

}

function extractHasManyHasMany() {

}


const extractors = {
  extractBelongsToBelongsTo,
  extractBelongsToHasMany,
  extractHasManyBelongsTo,
  extractHasManyHasMany
};

function getExtractionFunc(relatedModel, thisType, inverseType) {
  const funcName = 'extract' + capitalizeFirst(thisType) + capitalizeFirst(inverseType);
  console.log(funcName);
  return extractors[funcName](relatedModel);
}

function setupExtractForRelationship(relationship, key, relationships, models) {
  const { relatedModel, type, inverse } = relationship;
  const inverseRelationship = models[relatedModel].relationships[inverse];
  relationship.extractor = getExtractionFunc(relatedModel, relationship.type, inverseRelationship.type);
  console.log('\n\n# after setup', key, relationship, inverseRelationship);
}

module.exports = setupExtract;