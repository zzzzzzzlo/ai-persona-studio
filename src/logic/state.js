(function (A) {
  'use strict';
  A.initialState = function () { return { version: A.config.version, view: 'home', index: 0, answers: Array(A.questions.length).fill(null), result: null }; };
  A.snapshot = function (state) {
    return { version: A.config.version, view: state.view, index: state.index, answers: state.answers.slice(), result: state.result ? { vector: state.result.vector.slice(), mode: state.result.mode, primaryId: state.result.primary.id, secondaryId: state.result.secondary.id } : null };
  };
  A.restoreState = function (raw) {
    var initial = A.initialState();
    if (!raw || raw.version !== A.config.version || !A.validAnswers(raw.answers)) return initial;
    initial.answers = raw.answers.slice();
    var firstEmpty = initial.answers.indexOf(null);
    var savedIndex = Number.isInteger(raw.index) ? raw.index : 0;
    var last = A.questions.length - 1;
    initial.index = Math.max(0, Math.min(last, savedIndex, firstEmpty === -1 ? last : firstEmpty));
    // Derived values are always recalculated, never trusted from saved data.
    if (firstEmpty === -1) {
      initial.result = A.evaluateAnswers(initial.answers);
      initial.view = raw.view === 'home' ? 'home' : raw.view === 'quiz' ? 'quiz' : raw.view === 'transition' ? 'transition' : 'result';
    } else initial.view = raw.view === 'quiz' ? 'quiz' : raw.view === 'transition' && firstEmpty >= A.config.personalityQuestionCount ? 'transition' : 'home';
    if (initial.view === 'transition') initial.index = A.config.personalityQuestionCount;
    return initial;
  };
})(window.HeartTest);
