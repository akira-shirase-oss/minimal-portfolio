// Embedding lookup -> fixed linear output head -> softmax, using only the last token.
import { scoreBatch, scoreDistribution } from './next-token-scores.mjs';

function validate(embeddings, head, tokenId) {
  if (!Array.isArray(embeddings) || !embeddings.length || !Array.isArray(embeddings[0]) || !embeddings[0].length) throw new TypeError('Expected embedding rows.');
  const width = embeddings[0].length;
  for (const matrix of [embeddings, head]) {
    if (!Array.isArray(matrix) || matrix.length !== embeddings.length
      || Array.from(matrix).some(row => !Array.isArray(row) || row.length !== width || Array.from(row).some(value => !Number.isFinite(value)))) {
      throw new TypeError('Embedding and head matrices must share vocabulary size and vector width.');
    }
  }
  if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId >= embeddings.length) throw new RangeError('Unknown input token ID.');
}

export function embeddingPrediction(embeddings, head, tokenId) {
  validate(embeddings, head, tokenId);
  const vector = [...embeddings[tokenId]];
  const scores = head.map(row => row.reduce((sum, weight, dimension) => sum + weight * vector[dimension], 0));
  return { input_token_id: tokenId, embedding: vector, scores, probabilities: scoreDistribution(scores) };
}

export function updateEmbeddings(embeddings, head, examples, learningRate) {
  if (!Array.isArray(examples) || !examples.length) throw new TypeError('Expected training examples.');
  if (!Number.isFinite(learningRate) || learningRate <= 0) throw new RangeError('Expected a positive learning rate.');
  const beforePredictions = examples.map(example => embeddingPrediction(embeddings, head, example.input_token_id));
  const gradients = embeddings.map(row => row.map(() => 0));
  let beforeLoss = 0;
  for (let index = 0; index < examples.length; index++) {
    const example = examples[index];
    const result = scoreBatch(beforePredictions[index].scores, [example.target_id]);
    beforeLoss += result.mean_loss / examples.length;
    for (let dimension = 0; dimension < embeddings[0].length; dimension++) {
      const gradient = head.reduce((sum, row, outputId) => sum + row[dimension] * result.gradient[outputId], 0);
      gradients[example.input_token_id][dimension] += gradient / examples.length;
    }
  }
  const nextEmbeddings = embeddings.map((row, id) => row.map((value, dimension) => value - learningRate * gradients[id][dimension]));
  const afterPredictions = examples.map(example => embeddingPrediction(nextEmbeddings, head, example.input_token_id));
  const afterLoss = afterPredictions.reduce((sum, prediction, index) => sum + scoreBatch(prediction.scores, [examples[index].target_id]).mean_loss / examples.length, 0);
  return {
    learning_rate: learningRate, embedding_gradients: gradients,
    before: { embeddings: embeddings.map(row => [...row]), predictions: beforePredictions, mean_loss: beforeLoss },
    after: { embeddings: nextEmbeddings, predictions: afterPredictions, mean_loss: afterLoss },
  };
}
