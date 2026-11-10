// A deliberately small character tokenizer, not a predictive language model.
export function makeCharacterTokenizer(trainingTexts) {
  if (!Array.isArray(trainingTexts) || !trainingTexts.length || trainingTexts.some(text => typeof text !== 'string')) {
    throw new TypeError('Expected a nonempty array of training strings.');
  }
  const tokens = Object.freeze([...new Set(trainingTexts.flatMap(text => Array.from(text)))]
    .sort((left, right) => left.codePointAt(0) - right.codePointAt(0)));
  if (!tokens.length) throw new RangeError('Training text contains no characters.');
  const toId = new Map(tokens.map((token, id) => [token, id]));
  function encode(text) {
    if (typeof text !== 'string') throw new TypeError('Expected text to encode.');
    return Array.from(text, (token, position) => {
      const id = toId.get(token);
      // ID 0 is valid. Check for undefined rather than treating zero as missing.
      if (id === undefined) {
        const error = new RangeError(`Unknown character at code-point index ${position}: ${JSON.stringify(token)}`);
        error.code = 'UNKNOWN_CHARACTER'; error.character = token; error.position = position;
        throw error;
      }
      return id;
    });
  }
  function decode(ids) {
    if (!Array.isArray(ids)) throw new TypeError('Expected an array of token IDs.');
    return Array.from(ids, id => {
      if (!Number.isInteger(id) || id < 0 || id >= tokens.length) throw new RangeError(`Invalid token ID: ${id}`);
      return tokens[id];
    }).join('');
  }
  return Object.freeze({ tokens, encode, decode });
}
