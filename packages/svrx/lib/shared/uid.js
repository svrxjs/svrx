// FAKE UID
let _id = 0;
module.exports = function uid() {
  if (_id > 100000000) _id = 0;
  _id += 1;
  return _id;
};
