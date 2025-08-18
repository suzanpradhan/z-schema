import { ZodString, ZodNumber} from "zod"; 

/**
 * Adds a `.sortable()` method to ZodString.
 * Marks this field as sortable in Redis schema.
 * @param {boolean} [isSortable=true] - Whether this field should be sortable
 * @returns {ZodString} The same ZodString instance (for chaining)
 */
ZodString.prototype.sortable = function(isSortable = true) {
  this._def.describe = isSortable ? "sortable" : undefined;
  return this;
};

/**
 * Adds a `.sortable()` method to ZodNumber.
 * Marks this field as sortable in Redis schema.
 * @param {boolean} [isSortable=true] - Whether this field should be sortable
 * @returns {ZodNumber} The same ZodNumber instance (for chaining)
 */
ZodNumber.prototype.sortable = function(isSortable = true) {
  this._def.describe = isSortable ? "sortable" : undefined;
  return this;
};