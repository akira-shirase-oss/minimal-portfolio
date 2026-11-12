// Trainable attention: forward pass plus one analytic backprop step.
// Shared token embeddings serve as query, key, and value vectors (identity
// projections). Declared position vectors are added constants: gradients pass
// straight through to the token rows. The output head stays frozen.
import { scoreBatch, scoreDistribution } from './next-token-scores.mjs';
import { attentionContext, addPositionVectors, headScores, dot } from './attention-context.mjs';

export function attentionForward(embeddings, positionVectorAt, head, ids) {
  const base = ids.map(id => [...embeddings[id]]);
  const vectors = positionVectorAt ? addPositionVectors(base, positionVectorAt) : base;
  const attention = attentionContext(vectors);
  const scores = headScores(attention.context, head);
  return { ids: [...ids], vectors, attention, scores, probabilities: scoreDistribution(scores) };
}

// One full-batch step over examples shaped [{ids, target_id}].
// Gradient path: loss -> output scores -> context -> attention weights and
// values -> attention scores -> query and keys -> shared embedding rows.
export function updateAttention(embeddings, positionVectorAt, head, examples, learningRate) {
  if (!Array.isArray(examples) || !examples.length) throw new TypeError('Expected training examples.');
  if (!Number.isFinite(learningRate) || learningRate <= 0) throw new RangeError('Expected a positive learning rate.');
  const width = embeddings[0].length;
  const gradients = embeddings.map(row => row.map(() => 0));
  const traces = [];
  let beforeLoss = 0;
  for (const example of examples) {
    const fwd = attentionForward(embeddings, positionVectorAt, head, example.ids);
    const batch = scoreBatch(fwd.scores, [example.target_id]);
    beforeLoss += batch.mean_loss / examples.length;
    // Output-score gradients flow through the frozen head into the context.
    const gradContext = fwd.attention.context.map((_, d) =>
      head.reduce((sum, row, outputId) => sum + row[d] * batch.gradient[outputId], 0));
    // Context is a weighted sum of values: split the gradient between the
    // weights (attention scores) and the value vectors.
    const { weights } = fwd.attention;
    const gradWeight = fwd.vectors.map(vector => dot(vector, gradContext));
    const weightDot = weights.reduce((sum, weight, i) => sum + weight * gradWeight[i], 0);
    // Softmax Jacobian: dL/ds_i = w_i * (dL/dw_i - sum_j w_j * dL/dw_j).
    const gradScore = weights.map((weight, i) => weight * (gradWeight[i] - weightDot));
    const last = fwd.vectors.length - 1;
    const gradQuery = fwd.vectors[0].map((_, d) =>
      fwd.vectors.reduce((sum, vector, i) => sum + gradScore[i] * vector[d], 0));
    for (let i = 0; i < fwd.vectors.length; i++) {
      const tokenId = example.ids[i];
      for (let d = 0; d < width; d++) {
        const valueRole = weights[i] * gradContext[d];
        const keyRole = gradScore[i] * fwd.vectors[last][d];
        const queryRole = i === last ? gradQuery[d] : 0;
        gradients[tokenId][d] += (valueRole + keyRole + queryRole) / examples.length;
      }
    }
    traces.push({ ids: example.ids, target_id: example.target_id, ...fwd });
  }
  const nextEmbeddings = embeddings.map((row, id) =>
    row.map((value, d) => value - learningRate * gradients[id][d]));
  let afterLoss = 0;
  for (const example of examples) {
    const fwd = attentionForward(nextEmbeddings, positionVectorAt, head, example.ids);
    afterLoss += scoreBatch(fwd.scores, [example.target_id]).mean_loss / examples.length;
  }
  return {
    learning_rate: learningRate, embedding_gradients: gradients,
    before: { embeddings: embeddings.map(row => [...row]), traces, mean_loss: beforeLoss },
    after: { embeddings: nextEmbeddings, mean_loss: afterLoss },
  };
}

// Same update plus head gradients: score_o = head_o . context, so each head row
// moves by the score gradient times the context it read.
export function updateAttentionAndHead(embeddings, positionVectorAt, head, examples, learningRate) {
  const update = updateAttention(embeddings, positionVectorAt, head, examples, learningRate);
  const headGradients = head.map(row => row.map(() => 0));
  for (const trace of update.before.traces) {
    const batch = scoreBatch(trace.scores, [trace.target_id]);
    for (let o = 0; o < head.length; o++) {
      for (let d = 0; d < head[0].length; d++) {
        headGradients[o][d] += batch.gradient[o] * trace.attention.context[d] / examples.length;
      }
    }
  }
  const nextHead = head.map((row, o) => row.map((value, d) => value - learningRate * headGradients[o][d]));
  let afterLoss = 0;
  for (const example of examples) {
    const fwd = attentionForward(update.after.embeddings, positionVectorAt, nextHead, example.ids);
    afterLoss += scoreBatch(fwd.scores, [example.target_id]).mean_loss / examples.length;
  }
  return {
    learning_rate: learningRate, embedding_gradients: update.embedding_gradients, head_gradients: headGradients,
    before: update.before,
    after: { embeddings: update.after.embeddings, head: nextHead, mean_loss: afterLoss },
  };
}
