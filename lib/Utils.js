class Utils {
  static deepMerge (mergeTo, mergeWith) {
    for (const property in mergeWith) {
        if ((property === '__proto__' || property === 'constructor' || property === 'prototype')) {
            continue;
        }
  
        const mergeWithType = Object.prototype.toString.call(mergeWith[property]);
        const mergeToType = Object.prototype.toString.call(mergeTo[property]);
  
        if (mergeWithType === '[object Object]') {
            mergeTo[property] = Utils.deepMerge((mergeTo[property] || {}), mergeWith[property]);
        } else if (mergeWithType === '[object Array]') {
            if (!mergeTo[property]) {
              mergeTo[property] = [];
            }
  
            if (mergeToType === 'string') {
                mergeTo[property] = [mergeTo[property]].concat(mergeWith[property]);
            } else {
                mergeTo[property] = [].concat((mergeTo[property] || []), mergeWith[property]);
            }
        } else {
            mergeTo[property] = mergeWith[property];
        }
    }
  
    return mergeTo;
  }
}

module.exports = Utils;