export default function buildRoom() {
  const root = createElement("div", "room");
  const banner = createElement("div", "status-banner");
  const sidebar = createElement("div", "sidebar");

  const me = buildPlayerDisplay();
  const opponent = buildPlayerDisplay();
  sidebar.append(me.root, opponent.root);

  root.append(banner, sidebar);

  return {
    r: root,
    mainText: banner,
    me: me.elements,
    opp: opponent.elements
  };
}

function buildPlayerDisplay() {
  const root = createElement("div", "player-display-container");
  const header = createElement("div", "player-card-header");
  const badge = createElement("span", "player-mark-badge");
  const label = createElement("p", "player-label");
  header.append(badge, label);

  const name = createElement("p", "name");

  const chips = createElement("div", "player-chip-row");
  const connectionStatus = createElement("p", "player-chip player-chip-status");
  const mark = createElement("p", "player-chip player-chip-mark");
  chips.append(connectionStatus, mark);

  const timerPanel = createElement("div", "player-timer-panel");
  const timerLabel = createElement("p", "player-timer-label");
  const time = createElement("p", "timer player-timer-value");
  timerPanel.append(timerLabel, time);

  const elements = {
    root,
    header,
    badge,
    label,
    name,
    chips,
    connectionStatus,
    mark,
    timerPanel,
    timerLabel,
    time
  };

  root.append(
    header,
    name,
    chips,
    timerPanel
  );

  return { root, elements };
}

function createElement(tagName, className) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}
