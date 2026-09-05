/* Runtime facade for the framework-agnostic scenes exported by the visual
 * library. A scene is mounted into one canvas at a time and receives the same
 * three input channels as the upstream contract. */
const AUDIO_METHODS = ['setAudioData', 'setAudioFrame'];
const callFirst = (target, names, ...args) => {
  for (const name of names) {
    if (typeof target?.[name] === 'function') { target[name](...args); return true; }
  }
  return false;
};

export function createVisualSceneAPI({ factories = {}, initialScene = null } = {}) {
  let current = null;
  let currentId = null;
  let culture = '';
  let audioData = { amplitude: 0, bass: 0, mid: 0, high: 0, beat: 0, energy: 0, drone: 0 };
  let disposed = false;

  async function disposeCurrent() {
    const old = current;
    current = null;
    currentId = null;
    if (!old) return;
    if (typeof old.dispose === 'function') await old.dispose();
  }

  async function loadScene(sceneId, options = {}) {
    if (disposed) throw new Error('VisualScene API has been disposed');
    const factory = factories[sceneId];
    if (typeof factory !== 'function') throw new Error(`No visual scene factory: ${sceneId}`);
    await disposeCurrent();
    current = await factory(options);
    currentId = sceneId;
    callFirst(current, AUDIO_METHODS, audioData);
    if (culture) callFirst(current, ['setCulture'], culture);
    return current;
  }

  function setAudioData(next = {}) {
    audioData = { ...audioData, ...next };
    callFirst(current, AUDIO_METHODS, audioData);
    return audioData;
  }
  function triggerEvent(event = {}) { return callFirst(current, ['triggerEvent', 'event', 'trigger'], event); }
  function triggerStar(star = {}) { return callFirst(current, ['triggerStar', 'star', 'tap'], star); }
  function setCulture(next = '') { culture = String(next || ''); callFirst(current, ['setCulture'], culture); return culture; }
  async function dispose() { disposed = true; await disposeCurrent(); }

  const api = {
    loadScene, setAudioData, triggerEvent, triggerStar, setCulture, dispose,
    get scene() { return currentId; },
    get instance() { return current; },
  };
  if (initialScene) api.loadScene(initialScene);
  return api;
}
