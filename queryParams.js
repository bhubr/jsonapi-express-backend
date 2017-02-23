function tableOnly(req) {
  const table = req.params.table;
  if(table === undefined) {
    throw new Error('table param is undefined');
  }
  return { table };
}

function tableAndId(req, id) {
  const table = typeof req === 'string' ? req : req.params.table;
  id = id !== undefined ? id : req.params.id;
  if(table === undefined) {
    throw new Error('table param is undefined');
  }
  if(isNaN(id)) {
    throw new Error('id ' + id + ' is NaN');
  }
  return { table, id: parseInt(id, 10) };
}

module.exports = { tableOnly, tableAndId };