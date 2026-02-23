export function createUndoToastController({
  container,
  messageElement,
  undoButton,
  dismissButton,
  defaultDurationMs = 6000
}) {
  let undoHandler = null;
  let timeoutId = null;

  function clearTimer() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function hide() {
    clearTimer();
    undoHandler = null;
    if (container) {
      container.classList.add("hidden");
    }
    if (messageElement) {
      messageElement.textContent = "";
    }
  }

  function runUndo() {
    if (!undoHandler) {
      hide();
      return;
    }
    const action = undoHandler;
    hide();
    action();
  }

  function show({
    message = "",
    onUndo = null,
    durationMs = defaultDurationMs
  } = {}) {
    if (!container || !messageElement) {
      return;
    }
    clearTimer();
    undoHandler = typeof onUndo === "function" ? onUndo : null;
    messageElement.textContent = String(message || "");
    if (undoButton) {
      undoButton.hidden = !undoHandler;
    }
    container.classList.remove("hidden");
    timeoutId = setTimeout(() => {
      hide();
    }, Math.max(Number(durationMs) || defaultDurationMs, 1500));
  }

  if (undoButton) {
    undoButton.addEventListener("click", () => {
      runUndo();
    });
  }

  if (dismissButton) {
    dismissButton.addEventListener("click", () => {
      hide();
    });
  }

  return {
    show,
    hide
  };
}
