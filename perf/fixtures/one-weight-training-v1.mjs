// One training pair: input 2 should produce target 6.
export function train(startingWeight = 2, learningRate = 0.1, updates = 3) {
  const input = 2;
  const target = 6;
  const probe = 0.5;
  const lossAt = (weight) => (input * weight - target) ** 2;
  let weight = startingWeight;
  const history = [];

  for (let step = 0; step <= updates; step += 1) {
    const prediction = input * weight;
    const loss = lossAt(weight);
    const gradient = (lossAt(weight + probe) - lossAt(weight - probe)) / (2 * probe);
    history.push({ step, weight, prediction, loss, gradient });

    // Record the final result without taking an extra update.
    if (step < updates) weight = weight - learningRate * gradient;
  }
  return history;
}
