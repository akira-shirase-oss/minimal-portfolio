// Whole-prefix context: attention weights over positions -> weighted-sum context -> scores.
// Identity query/key/value projections; position vectors are optional and declared, not learned.
import { scoreDistribution } from './next-token-scores.mjs';

export function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function validateVectors(vectors) {
  if (!Array.isArray(vectors) || !vectors.length || !Array.isArray(vectors[0]) || !vectors[0].length) {
    throw new TypeError('Expected nonempty position vectors.');
  }
  const width = vectors[0].length;
  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== width || vector.some(value => !Number.isFinite(value))) {
      throw new TypeError('All position vectors must share a width of finite numbers.');
    }
  }
}

// The last position queries every position, including itself.
// scores_i = query . key_i; softmax turns scores into weights; context = sum of weight_i * value_i.
export function attentionContext(vectors) {
  validateVectors(vectors);
  const query = vectors[vectors.length - 1];
  const scores = vectors.map(key => dot(query, key));
  const weights = scoreDistribution(scores);
  const context = vectors[0].map((_, dimension) =>
    vectors.reduce((sum, value, index) => sum + weights[index] * value[dimension], 0));
  return { query_index: vectors.length - 1, scores, weights, context };
}

export function addPositionVectors(vectors, positionVectorAt) {
  validateVectors(vectors);
  return vectors.map((vector, position) => {
    const offset = positionVectorAt(position);
    if (!Array.isArray(offset) || offset.length !== vector.length) {
      throw new TypeError('Position vectors must share the token-vector width.');
    }
    return vector.map((value, dimension) => value + offset[dimension]);
  });
}

export function headScores(vector, head) {
  validateVectors([vector]);
  if (!Array.isArray(head) || !head.length || head.some(row => !Array.isArray(row) || row.length !== vector.length)) {
    throw new TypeError('Head rows must share the context width.');
  }
  return head.map(row => dot(row, vector));
}
