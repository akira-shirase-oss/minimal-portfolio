// One fixed context, one adjustable score per vocabulary token. No hidden layers.
export function scoreDistribution(scores) {
  if (!Array.isArray(scores) || !scores.length || Array.from(scores).some(score => !Number.isFinite(score))) {
    throw new TypeError('Expected a nonempty array of finite scores.');
  }
  const maximum = Math.max(...scores);
  const positive = scores.map(score => Math.exp(score - maximum));
  const total = positive.reduce((sum, value) => sum + value, 0);
  return positive.map(value => value / total);
}

export function scoreBatch(scores, targetIds) {
  const probabilities = scoreDistribution(scores);
  if (!Array.isArray(targetIds) || !targetIds.length
    || Array.from(targetIds).some(id => !Number.isInteger(id) || id < 0 || id >= scores.length)) {
    throw new RangeError('Expected target IDs inside the vocabulary.');
  }
  const targetDistribution = scores.map(() => 0);
  for (const id of targetIds) targetDistribution[id] += 1 / targetIds.length;
  const maximum = Math.max(...scores);
  const logTotal = Math.log(scores.reduce((sum, score) => sum + Math.exp(score - maximum), 0));
  // This log-space form avoids taking the log of an underflowed probability.
  const meanLoss = targetIds.reduce((sum, id) => sum + logTotal - (scores[id] - maximum), 0) / targetIds.length;
  const gradient = probabilities.map((p, id) => p - targetDistribution[id]);
  return { probabilities, target_distribution: targetDistribution, mean_loss: meanLoss, gradient };
}

export function updateScoreBatch(scores, targetIds, learningRate) {
  if (!Number.isFinite(learningRate) || learningRate <= 0) throw new RangeError('Expected a positive learning rate.');
  const before = scoreBatch(scores, targetIds);
  const nextScores = scores.map((score, id) => score - learningRate * before.gradient[id]);
  const after = scoreBatch(nextScores, targetIds);
  return { learning_rate: learningRate, before: { scores: [...scores], ...before }, after: { scores: nextScores, ...after } };
}
