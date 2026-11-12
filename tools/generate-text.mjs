// The generation loop: predict -> select -> append -> repeat, until a stop rule fires.
// Each generated token becomes part of the prefix for the next prediction.
export function generateText(model, encode, decode, seedText, {
  select, maxSteps, stopTokenId,
} = {}) {
  if (typeof select !== 'function') throw new TypeError('Expected a selection function.');
  if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new RangeError('Expected a positive step limit.');
  let ids = encode(seedText);
  const steps = [];
  let haltReason = 'MAX_STEPS_REACHED';
  for (let step = 0; step < maxSteps; step++) {
    const prediction = model.predict(ids);
    if (!prediction.known_prefix) {
      haltReason = prediction.reason;
      break;
    }
    const choice = select(prediction.probabilities, steps);
    if (!Number.isInteger(choice) || choice < 0 || choice >= prediction.probabilities.length
      || prediction.probabilities[choice] <= 0) {
      throw new RangeError(`Selection rule returned an invalid token ID: ${choice}`);
    }
    steps.push({
      step, prefix: decode(ids),
      probabilities: prediction.probabilities,
      selected_id: choice, selected_token: decode([choice]),
    });
    ids = [...ids, choice];
    if (choice === stopTokenId) { haltReason = 'STOP_TOKEN'; break; }
  }
  return { seed: seedText, steps, generated_ids: ids, generated_text: decode(ids), halt_reason: haltReason };
}
