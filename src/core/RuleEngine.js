import { GameState } from './GameState.js';

export class RuleEngine {
  constructor(gameState) {
    this.state = gameState;
    this.listeners = [];
  }

  onRuleAccepted(callback) {
    this.listeners.push(callback);
  }

  acceptInterpretation(ruleId, interpretation, consequence) {
    const rule = this.state.getRule(ruleId);
    if (rule) {
      rule.addResidual(consequence);
    }
    this.state.addFlag(`interpreted:${ruleId}:${interpretation}`);
    for (const cb of this.listeners) {
      cb(ruleId, interpretation, consequence);
    }
    return consequence;
  }

  canPass(requirement, playerClassification) {
    if (typeof requirement === 'string') {
      return requirement === playerClassification;
    }
    if (typeof requirement === 'function') {
      return requirement(this.state);
    }
    return false;
  }

  isObserved(objectId, observedSet) {
    return observedSet.has(objectId);
  }
}

export function createGameSystems() {
  const state = new GameState();
  const rules = new RuleEngine(state);
  return { state, rules };
}
