var _ = require('lodash');

function tableOnly(req) {
  let table = req.params.table;
  if(table === undefined) {
    throw new Error('table param is undefined');
  }
  const type = _.kebabCase(table);
  table = (_.camelCase(table)).toLowerCase();
  return { table, type };
}

function tableAndId(req, id) {
  let table = typeof req === 'string' ? req : req.params.table;
  id = id !== undefined ? id : req.params.id;
  if(table === undefined) {
    throw new Error('table param is undefined');
  }
  const type = _.kebabCase(table);
  table = (_.camelCase(table)).toLowerCase();
  if(isNaN(id)) {
    throw new Error('id ' + id + ' is NaN');
  }
  return { table, type, id: parseInt(id, 10) };
}

module.exports = { tableOnly, tableAndId };