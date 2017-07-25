const lineLogger = require('console-line-logger');
const _      = require('lodash');
const naming = require('../../naming');
let store;

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

function throwIfFalsyOrEmpty(label) {
  return function falsyOrEmptyErr(obj) {
    if(
      ! obj ||
      (Array.isArray(obj) && obj.length === 0) ||
      (typeof obj === 'object' && (Object.keys(obj)).length === 0)
    ) {
      throw new Error(label);
    }
    return obj;
  };
}

// what do we do when payload contains payload for belongsTo/belongsTo relationship
// e.g. POST to /api/v1/users. With a relationship: owner: { data: { type: 'passports', id: 1} }
// Passport belongs to user
// We need to:
// - check that the type in payload matches the type in relationship
// - FIND the model to be updated if it's post
// - ensure that the relatee exists => find it => store.findRecord('passport', 1)
// - HANDLE the case where relatee DOESN'T CHANGE
// - check who actually owns the relationship
// - ensure that the possibly existing relatee (passport) for user... doesn't exist or is gonna be deleted!
// - ensure that we can set it as relatee (permissions). e.g. a user can't associate a post
//   to another user.
function extractBelongsToBelongsTo(relationship, inverseRelationship) {
  const { isOwner, relatedModel } = relationship;
  const expectedType = naming.toKebabPlural(relatedModel);
  return function(relationshipData) {
    // return new Promise((resolve, reject) => {
      const { type, id } = relationshipData;
      if(type === undefined || id === undefined) {
        Promise.reject(new Error('Incoming payload for belongsTo/belongsTo ' + relatedModel + ' has no type or id'));
      }
      // lineLogger(relatedModel, expectedType, type, id);
      if(type !== expectedType) {
        Promise.reject(new Error('Incoming type "' + type + '" does not match expected type "' + expectedType + '"'));
      }
      return store.findRecord(relatedModel, id)
      .then(throwIfFalsyOrEmpty('no record found for "' + relatedModel + '" with id ' + id))
      .then(relateeRecord => {
        lineLogger('pouet #1', relateeRecord, inverseRelationship.relatedModel, relateeRecord[inverseRelationship.column]);
        return relateeRecord;
      })
      // DIFFERENTIATE UPDATE OR CREATE: there will be no relateeRelateeRecord if it's POST
      .then(relateeRecord => store.findRecord(inverseRelationship.relatedModel, relateeRecord[inverseRelationship.column]))
      .then(relateeRelateeRecord => {
        lineLogger('pouet #2', relateeRelateeRecord);
      })
      .then(() => (true));
    // });
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

function getExtractionFunc(relationship, inverseRelationship) {
  const funcName = 'extract' +
    naming.capitalizeFirst(relationship.type) +
    naming.capitalizeFirst(inverseRelationship.type);
  return extractors[funcName](relationship, inverseRelationship);
}

function setupExtractForRelationship(relationship, key, relationships, models) {
  const { relatedModel, inverse } = relationship;
  const inverseRelationship = models[relatedModel].relationships[inverse];
  relationship.extractor = getExtractionFunc(relationship, inverseRelationship);
  // lineLogger('\n\n# after setup', key, relationship, inverseRelationship);
}

setupExtract.setStore = function(_store) {
  store = _store;
};

module.exports = setupExtract;