// A small exact-prefix frequency model. It has no neural layers or trainable weights.
export function fitPrefixCounts(documents, vocabularySize) {
  if (!Number.isInteger(vocabularySize) || vocabularySize < 1) throw new RangeError('Invalid vocabulary size.');
  function validateIds(ids) {
    if (!Array.isArray(ids) || Array.from(ids).some(id => !Number.isInteger(id) || id < 0 || id >= vocabularySize)) {
      throw new RangeError('Expected valid vocabulary IDs.');
    }
  }
  if (!Array.isArray(documents) || !documents.length) throw new TypeError('Expected training documents.');
  const table = new Map();
  let observations = 0;
  for (const ids of documents) {
    validateIds(ids);
    // Restart the prefix inside each document; never count a cross-document target.
    for (let position = 1; position < ids.length; position++) {
      const prefix = ids.slice(0, position);
      const key = JSON.stringify(prefix);
      if (!table.has(key)) table.set(key, { prefix_ids: prefix, counts: Array(vocabularySize).fill(0) });
      table.get(key).counts[ids[position]]++;
      observations++;
    }
  }
  function predict(prefixIds) {
    validateIds(prefixIds);
    const entry = table.get(JSON.stringify(prefixIds));
    if (!entry) return { known_prefix: false, observations: 0, counts: null, probabilities: null, reason: 'UNSEEN_PREFIX' };
    const counts = [...entry.counts];
    const total = counts.reduce((sum, count) => sum + count, 0);
    return { known_prefix: true, observations: total, counts, probabilities: counts.map(count => count / total) };
  }
  function snapshot() {
    return Array.from(table.values(), entry => ({ prefix_ids: [...entry.prefix_ids], counts: [...entry.counts] }));
  }
  return Object.freeze({ predict, snapshot, training_observations: observations, distinct_prefixes: table.size });
}

function probabilityTotal(probabilities) {
  if (!Array.isArray(probabilities) || !probabilities.length
    || Array.from(probabilities).some(p => !Number.isFinite(p) || p < 0)) throw new RangeError('Invalid probabilities.');
  const total = probabilities.reduce((sum, p) => sum + p, 0);
  if (Math.abs(total - 1) > 1e-12) throw new RangeError('Probabilities must sum to one.');
  return total;
}

// In a tie, the first maximum (lowest vocabulary ID) wins by an explicit convention.
export function greedyToken(probabilities) {
  probabilityTotal(probabilities);
  return probabilities.indexOf(Math.max(...probabilities));
}

// Supply a draw in [0, 1). A real sampler would supply a random draw; our lesson records fixed draws.
export function tokenFromDraw(probabilities, draw) {
  const total = probabilityTotal(probabilities);
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new RangeError('Draw must be in [0, 1).');
  const target = draw * total;
  let cumulative = 0;
  let lastPositive;
  for (let id = 0; id < probabilities.length; id++) {
    cumulative += probabilities[id];
    if (probabilities[id] > 0) lastPositive = id;
    if (target < cumulative) return id;
  }
  return lastPositive; // Covers rounding at the final positive interval.
}
