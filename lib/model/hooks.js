const lineLogger   = require('console-line-logger');
const _            = require('lodash');
const Promise      = require('bluebird');
const bcrypt       = Promise.promisifyAll(require('bcrypt'));
const queryBuilder = require('../queryBuilder');

const SALT_WORK_FACTOR = 10;

module.exports = function(store, config) {
  const modelDescriptors = store.getModels();

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
    lineLogger('adding hooks for model', model, hooks);
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

  function hashPasswordAsync(password) {
    return bcrypt.genSaltAsync(SALT_WORK_FACTOR)
    .then(salt => bcrypt.hashAsync(password, salt));
  }

  function assignHashedPassword(attributes) {
    return attributes.password ?
      hashPasswordAsync(attributes.password)
      .then(password => Object.assign(attributes, { password })) :
      Promise.resolve(attributes);
  }

  function assignDefaultRole(req, attributes) {
    const { defaultUserRole } = config.security.permissions;
    if(! defaultUserRole) {
      return Promise.reject(new Error('Set defaultUserRole in your config.security.permissions if you set enabled to true'));
    }
    const roleQuery = queryBuilder.selectWhere('roles', { name: defaultUserRole });
    return store.query(roleQuery)
    .then(roles => {
      if(! roles.length) {
        return Promise.reject(new Error('Role with name "' + defaultUserRole + '" was not found is role list'));
      }
      const roleId = roles[0].id;
      return Promise.resolve(Object.assign(attributes, { roleId }));
    });
  }

  function mustAssignRole(req, config) {
    lineLogger('#### mustAssignRole', req.method, config.security);
    return req.method === 'POST' && config.security.permissions && config.security.permissions.enabled;
  }

  const builtinHooks = {
    user: function(req, attributes) {
      return (mustAssignRole(req, config) ?
        assignDefaultRole(req, attributes) : Promise.resolve(attributes)
      )
      .then(assignHashedPassword);
    }
  }

  function getBuiltin(camelSingular, req) {
    builtinHook = builtinHooks[camelSingular];
    lineLogger('getBuiltinHook', camelSingular, req.method, builtinHook);
    return builtinHook ?
      attributes => builtinHook(req, attributes) :
      attributes => Promise.resolve(attributes);
  }

  return {
    getBeforeSave, getAfterSave, getBuiltin, addHooks
  };

};