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

  _.forOwn(modelHooks, (hooks, model) => {
    if(hooks !== undefined) {
      addHooks(model, hooks);
    }
  });

  function addHooks(model, hooks) {
    console.log('adding hooks for model', model, hooks);
    if(hooks.beforeCreate !== undefined) {
      beforeSaveHooks.create[model] = hooks.beforeCreate;
    }
    if(hooks.afterCreate !== undefined) {
      afterSaveHooks.create[model] = hooks.afterCreate;
    }
    if(hooks.beforeUpdate !== undefined) {
      beforeSaveHooks.update[model] = hooks.beforeUpdate;
    }
    if(hooks.afterUpdate !== undefined) {
      afterSaveHooks.update[model] = hooks.afterUpdate;
    }
  }

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

  function getBeforeSave(req) {
    const key = getHookKey(req.method);
    return (model, attributes) => {
      if(beforeSaveHooks[key][model] === undefined) return Promise.resolve(attributes);
      return beforeSaveHooks[key][model](attributes, req);
    };
  }

  function getAfterSave(req) {
    const key = getHookKey(req.method);
    return (model, attributes) => {
      if(afterSaveHooks[key][model] === undefined) return Promise.resolve(attributes);
      return afterSaveHooks[key][model](attributes, req);
    };
  }

  return {
    getBeforeSave, getAfterSave, addHooks
  };

};