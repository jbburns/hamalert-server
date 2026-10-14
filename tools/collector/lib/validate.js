const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('../schema/spot.schema.json');
const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);
const validateFn = ajv.compile(schema);
module.exports = function validate(spot) {
	if (validateFn(spot)) return [];
	return validateFn.errors.map(e => ({code: 'schema', severity: 'error', message: `${e.instancePath || '/'} ${e.message}`, field: e.instancePath, value: e.params && JSON.stringify(e.params).slice(0, 80)}));
};
