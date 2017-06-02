const _ = require('lodash');

module.exports = function(modelDescriptors) {

  let modelHooks = {};
   _.forOwn(modelDescriptors, function(value, key) {
    modelHooks[key] = value.hooks;
  });

  let beforeSaveHooks = {
    create: {}, update: {}
  };
  let afterSaveHooks = {
    create: {}, update: {}
  };

  _.forOwn(modelHooks, (hooks, table) => {
    if(hooks !== undefined) {
      if(hooks.beforeCreate !== undefined) {
        beforeSaveHooks.create[table] = hooks.beforeCreate;
      }
      if(hooks.afterCreate !== undefined) {
        afterSaveHooks.create[table] = hooks.afterCreate;
      }
      if(hooks.beforeUpdate !== undefined) {
        beforeSaveHooks.update[table] = hooks.beforeUpdate;
      }
      if(hooks.afterUpdate !== undefined) {
        afterSaveHooks.update[table] = hooks.afterUpdate;
      }
    }
  });

  function getHookKey(method) {
    if(method.toLowerCase() === 'post') {
      return 'create';
    }
    else if(['put', 'patch'].indexOf(method.toLowerCase()) !== -1) {
      return 'update';
    }
    else {
      throw new Error("Method '" + method + "' is neither a create nor an update method");
    }
  }

  function getBeforeSave(method) {
    const key = getHookKey(method);
    return (table, attributes) => {
      if(beforeSaveHooks[key][table] === undefined) return Promise.resolve(attributes);
      return beforeSaveHooks[key][table](attributes);
    }
  }

  function getAfterSave(method) {
    const key = getHookKey(method);
    return (table, attributes) => {
      if(afterSaveHooks[key][table] === undefined) return Promise.resolve(attributes);
      return afterSaveHooks[key][table](attributes);
    }
  }

  return {
  	getBeforeSave, getAfterSave
  };

}