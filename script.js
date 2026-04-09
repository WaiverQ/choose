const STORAGE_KEY = "valorant-custom-room-balancer-state";

const RANKS = [
  "黑铁1", "黑铁2", "黑铁3",
  "青铜1", "青铜2", "青铜3",
  "白银1", "白银2", "白银3",
  "黄金1", "黄金2", "黄金3",
  "铂金1", "铂金2", "铂金3",
  "钻石1", "钻石2", "钻石3",
  "超凡1", "超凡2", "超凡3",
  "神话1", "神话2", "神话3",
  "辐能战魂"
];

const DEFAULT_MEMBER_SEEDS = [
  { name: "十年王权", rank: "白银3", selected: true },
  { name: "鸭梨", rank: "白银3", selected: true },
  { name: "rainlove", rank: "青铜1", selected: true },
  { name: "妹妹", rank: "青铜1", selected: true },
  { name: "妻子", rank: "黑铁1", selected: true },
  { name: "吴站长", rank: "青铜1", selected: true }
];

// Based on the current official VALORANT maps page.
const MAP_POOL = [
  "Corrode",
  "Abyss",
  "Sunset",
  "Lotus",
  "Pearl",
  "Fracture",
  "Breeze",
  "Icebox",
  "Ascent",
  "Split",
  "Haven",
  "Bind"
];

const RANK_SCORE_MAP = Object.freeze(
  RANKS.reduce((map, rank, index) => {
    map[rank] = index + 1;
    return map;
  }, {})
);

const state = {
  members: [],
  result: null,
  searchKeyword: "",
  mobileView: "members",
  selectedMap: "",
  mapPickerTimer: null,
  isPickingMap: false
};

const elements = {
  mobileMessageBox: document.querySelector("#mobileMessageBox"),
  mobileViewButtons: Array.from(document.querySelectorAll("[data-mobile-view-target]")),
  mobileBalanceButton: document.querySelector("#mobileBalanceButton"),
  memberForm: document.querySelector("#memberForm"),
  editingMemberId: document.querySelector("#editingMemberId"),
  nameInput: document.querySelector("#nameInput"),
  rankSelect: document.querySelector("#rankSelect"),
  submitButton: document.querySelector("#submitButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  searchInput: document.querySelector("#searchInput"),
  memberList: document.querySelector("#memberList"),
  emptyState: document.querySelector("#emptyState"),
  messageBox: document.querySelector("#messageBox"),
  totalMemberCount: document.querySelector("#totalMemberCount"),
  selectedCount: document.querySelector("#selectedCount"),
  battleCount: document.querySelector("#battleCount"),
  selectionHint: document.querySelector("#selectionHint"),
  balanceButton: document.querySelector("#balanceButton"),
  resetSelectionButton: document.querySelector("#resetSelectionButton"),
  restoreDefaultButton: document.querySelector("#restoreDefaultButton"),
  clearMembersButton: document.querySelector("#clearMembersButton"),
  mapPickerCard: document.querySelector("#mapPickerCard"),
  mapPickerButton: document.querySelector("#mapPickerButton"),
  mapPickerResult: document.querySelector("#mapPickerResult"),
  mapChipList: document.querySelector("#mapChipList"),
  redTeamList: document.querySelector("#redTeamList"),
  blueTeamList: document.querySelector("#blueTeamList"),
  redTeamScore: document.querySelector("#redTeamScore"),
  blueTeamScore: document.querySelector("#blueTeamScore"),
  redTeamCount: document.querySelector("#redTeamCount"),
  blueTeamCount: document.querySelector("#blueTeamCount"),
  resultParticipantCount: document.querySelector("#resultParticipantCount"),
  scoreDiffValue: document.querySelector("#scoreDiffValue"),
  balanceLabelText: document.querySelector("#balanceLabelText"),
  balanceBadge: document.querySelector("#balanceBadge"),
  memberItemTemplate: document.querySelector("#memberItemTemplate"),
  teamMemberTemplate: document.querySelector("#teamMemberTemplate")
};

init();

function init() {
  renderRankOptions();
  loadState();
  renderMapPool();
  bindEvents();
  setMobileView(state.mobileView);
  resetForm();
  render();
}

function renderRankOptions() {
  elements.rankSelect.innerHTML = RANKS.map((rank) => `<option value="${rank}">${rank}</option>`).join("");
}

function bindEvents() {
  elements.mobileViewButtons.forEach((button) => {
    button.addEventListener("click", () => setMobileView(button.dataset.mobileViewTarget || "members"));
  });
  elements.memberForm.addEventListener("submit", handleSubmitMember);
  elements.cancelEditButton.addEventListener("click", resetForm);
  elements.searchInput.addEventListener("input", handleSearch);
  elements.balanceButton.addEventListener("click", handleBalanceTeams);
  elements.mobileBalanceButton.addEventListener("click", handleBalanceTeams);
  elements.mapPickerButton.addEventListener("click", handlePickMap);
  elements.resetSelectionButton.addEventListener("click", resetSelections);
  elements.restoreDefaultButton.addEventListener("click", restoreDefaultMembers);
  elements.clearMembersButton.addEventListener("click", clearMembers);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.members = createDefaultMembers();
    saveState();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.members = normalizeMembers(parsed.members);
    state.result = normalizeResult(parsed.result);

    if (!state.members.length) {
      state.members = createDefaultMembers();
      state.result = null;
      saveState();
    }
  } catch (error) {
    console.error("加载缓存失败：", error);
    state.members = createDefaultMembers();
    state.result = null;
    saveState();
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      members: state.members,
      result: state.result
    })
  );
}

function normalizeMembers(members) {
  if (!Array.isArray(members)) {
    return [];
  }

  return members
    .filter((member) => member && typeof member.name === "string" && isValidRank(member.rank))
    .map((member) => ({
      id: member.id || createMemberId(),
      name: member.name.trim(),
      rank: member.rank,
      selected: Boolean(member.selected)
    }))
    .filter((member) => member.name);
}

function createDefaultMembers() {
  return DEFAULT_MEMBER_SEEDS.map((member) => ({
    id: createMemberId(),
    name: member.name,
    rank: member.rank,
    selected: member.selected
  }));
}

function handleSubmitMember(event) {
  event.preventDefault();

  const editingId = elements.editingMemberId.value;
  const name = elements.nameInput.value.trim();
  const rank = elements.rankSelect.value;
  const validationError = validateMember(name, rank, editingId);

  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  if (editingId) {
    const member = state.members.find((item) => item.id === editingId);
    if (!member) {
      showMessage("未找到要编辑的成员。", "error");
      return;
    }
    member.name = name;
    member.rank = rank;
    showMessage(`已更新成员：${name}`, "success");
  } else {
    state.members.push({
      id: createMemberId(),
      name,
      rank,
      selected: false
    });
    showMessage(`已新增成员：${name}`, "success");
  }

  syncResultWithCurrentSelection();
  saveState();
  resetForm();
  setMobileView("members");
  render();
}

function validateMember(name, rank, editingId) {
  if (!name) {
    return "昵称不能为空。";
  }

  if (!isValidRank(rank)) {
    return "段位无效，请重新选择。";
  }

  const exists = state.members.some((member) => member.name === name && member.id !== editingId);
  if (exists) {
    return "昵称不能重复，请更换后重试。";
  }

  return "";
}

function handleSearch(event) {
  state.searchKeyword = event.target.value.trim();
  renderMemberList();
}

function render() {
  renderStats();
  renderMemberList();
  renderResult();
  renderMapPicker();
  renderMobileState();
}

function renderStats() {
  const selectedCount = getSelectedMembers().length;
  elements.totalMemberCount.textContent = String(state.members.length);
  elements.selectedCount.textContent = String(selectedCount);
  elements.battleCount.textContent = `${selectedCount} 人`;
  elements.mobileBalanceButton.textContent = `开始分队 · ${selectedCount} 人`;
  elements.selectionHint.textContent = selectedCount >= 6 && selectedCount <= 10
    ? "人数合法，可执行自动分队"
    : "请勾选 6-10 名玩家后自动分队";
}

function renderMemberList() {
  const keyword = state.searchKeyword.toLowerCase();
  const members = state.members.filter((member) => member.name.toLowerCase().includes(keyword));

  elements.memberList.innerHTML = "";

  if (!state.members.length) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "暂无成员，请先新增成员。";
    return;
  }

  if (!members.length) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "没有匹配的成员，请调整搜索关键字。";
    return;
  }

  elements.emptyState.hidden = true;

  members.forEach((member) => {
    const fragment = elements.memberItemTemplate.content.cloneNode(true);
    const checkbox = fragment.querySelector(".select-checkbox");
    const nameNode = fragment.querySelector(".member-name");
    const rankNode = fragment.querySelector(".member-rank");
    const scoreNode = fragment.querySelector(".member-score");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    checkbox.checked = member.selected;
    checkbox.addEventListener("change", () => toggleSelection(member.id, checkbox.checked));
    nameNode.textContent = member.name;
    rankNode.textContent = member.rank;
    scoreNode.textContent = String(rankToScore(member.rank));
    editButton.addEventListener("click", () => fillEditForm(member.id));
    deleteButton.addEventListener("click", () => removeMember(member.id));

    elements.memberList.appendChild(fragment);
  });
}

function renderResult() {
  if (!state.result) {
    renderTeamMembers(elements.redTeamList, []);
    renderTeamMembers(elements.blueTeamList, []);
    elements.redTeamScore.textContent = "0";
    elements.blueTeamScore.textContent = "0";
    elements.redTeamCount.textContent = "0 人";
    elements.blueTeamCount.textContent = "0 人";
    elements.resultParticipantCount.textContent = "0";
    elements.scoreDiffValue.textContent = "0";
    elements.balanceLabelText.textContent = "等待";
    setBalanceBadge("等待分队", "");
    return;
  }

  const result = state.result;
  renderTeamMembers(elements.redTeamList, result.redTeam);
  renderTeamMembers(elements.blueTeamList, result.blueTeam);
  elements.redTeamScore.textContent = String(result.redScore);
  elements.blueTeamScore.textContent = String(result.blueScore);
  elements.redTeamCount.textContent = `${result.redTeam.length} 人`;
  elements.blueTeamCount.textContent = `${result.blueTeam.length} 人`;
  elements.resultParticipantCount.textContent = String(result.participantCount);
  elements.scoreDiffValue.textContent = String(result.scoreDiff);
  elements.balanceLabelText.textContent = result.balanceLabel;
  setBalanceBadge(result.balanceLabel, result.balanceLevel);
}

function renderMobileState() {
  elements.mobileViewButtons.forEach((button) => {
    const isActive = button.dataset.mobileViewTarget === state.mobileView;
    button.classList.toggle("active", isActive);
  });
}

function renderMapPool() {
  elements.mapChipList.innerHTML = MAP_POOL
    .map((map) => `<span class="map-chip">${map}</span>`)
    .join("");
}

function renderMapPicker() {
  elements.mapPickerResult.textContent = state.selectedMap || "点击开始";
  elements.mapPickerCard.classList.toggle("is-picking", state.isPickingMap);
  elements.mapPickerButton.disabled = state.isPickingMap;
  elements.mapPickerButton.textContent = state.isPickingMap ? "抽取中..." : "自动选图";
}

function renderTeamMembers(container, members) {
  container.innerHTML = "";

  if (!members.length) {
    const tip = document.createElement("p");
    tip.className = "team-member-rank";
    tip.textContent = "等待生成分队结果";
    container.appendChild(tip);
    return;
  }

  members.forEach((member) => {
    const fragment = elements.teamMemberTemplate.content.cloneNode(true);
    fragment.querySelector(".team-member-name").textContent = member.name;
    fragment.querySelector(".team-member-rank").textContent = member.rank;
    fragment.querySelector(".team-member-score").textContent = String(rankToScore(member.rank));
    container.appendChild(fragment);
  });
}

function toggleSelection(memberId, selected) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    return;
  }

  member.selected = selected;
  syncResultWithCurrentSelection();
  saveState();
  render();
}

function fillEditForm(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    showMessage("未找到对应成员。", "error");
    return;
  }

  elements.editingMemberId.value = member.id;
  elements.nameInput.value = member.name;
  elements.rankSelect.value = member.rank;
  elements.submitButton.textContent = "保存修改";
  elements.cancelEditButton.hidden = false;
  setMobileView("form");
  elements.nameInput.focus();
}

function resetForm() {
  elements.memberForm.reset();
  elements.editingMemberId.value = "";
  elements.rankSelect.value = RANKS[0];
  elements.submitButton.textContent = "新增成员";
  elements.cancelEditButton.hidden = true;
}

function removeMember(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    showMessage("未找到要删除的成员。", "error");
    return;
  }

  if (!window.confirm(`确定删除成员“${member.name}”吗？`)) {
    return;
  }

  state.members = state.members.filter((item) => item.id !== memberId);
  syncResultWithCurrentSelection();
  saveState();
  render();
  showMessage(`已删除成员：${member.name}`, "success");

  if (elements.editingMemberId.value === memberId) {
    resetForm();
  }
}

function clearMembers() {
  if (!state.members.length) {
    showMessage("当前没有可清空的成员。", "error");
    return;
  }

  if (!window.confirm("确定清空全部成员吗？该操作会覆盖本地缓存。")) {
    return;
  }

  state.members = [];
  state.result = null;
  saveState();
  resetForm();
  render();
  showMessage("已清空全部成员。", "success");
}

function resetSelections() {
  state.members = state.members.map((member) => ({ ...member, selected: false }));
  state.result = null;
  saveState();
  render();
  showMessage("已重置本局参战选择。", "success");
}

function restoreDefaultMembers() {
  if (!window.confirm("恢复默认数据会覆盖当前缓存数据和分队结果，是否继续？")) {
    return;
  }

  state.members = createDefaultMembers();
  state.result = null;
  state.searchKeyword = "";
  elements.searchInput.value = "";
  saveState();
  resetForm();
  render();
  showMessage("已恢复默认成员数据。", "success");
}

function handlePickMap() {
  if (state.isPickingMap) {
    return;
  }

  state.isPickingMap = true;
  const totalSteps = 18;
  let step = 0;
  let lastMap = MAP_POOL[0];

  renderMapPicker();

  const spin = () => {
    const nextMap = MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)];
    lastMap = nextMap;
    elements.mapPickerResult.textContent = nextMap;
    step += 1;

    if (step >= totalSteps) {
      state.mapPickerTimer = null;
      state.isPickingMap = false;
      state.selectedMap = lastMap;
      renderMapPicker();
      showMessage(`本局随机地图：${lastMap}`, "success");
      return;
    }

    state.mapPickerTimer = window.setTimeout(spin, 65 + (step * 16));
  };

  spin();
}

function getSelectedMembers() {
  return state.members
    .filter((member) => member.selected)
    .map((member) => ({
      ...member,
      score: rankToScore(member.rank)
    }));
}

function handleBalanceTeams() {
  const participants = getSelectedMembers();

  if (participants.length < 6 || participants.length > 10) {
    showMessage("本局参战人数必须为 6-10 人，当前人数不符合要求。", "error");
    return;
  }

  const result = autoBalanceTeams(participants);
  if (!result) {
    showMessage("未能找到合法分队结果。", "error");
    return;
  }

  state.result = result;
  saveState();
  renderResult();
  setMobileView("result");
  showMessage(`分队完成，当前分差 ${result.scoreDiff}。`, "success");
}

function autoBalanceTeams(participants) {
  const count = participants.length;
  const totalMasks = 1 << count;
  const totalScore = participants.reduce((sum, member) => sum + member.score, 0);
  const preferredSizes = getPreferredTeamSizes(count);
  let bestScoreDiff = Number.POSITIVE_INFINITY;
  let bestSizeDiff = Number.POSITIVE_INFINITY;
  const bestSolutions = [];

  for (let mask = 1; mask < totalMasks - 1; mask += 1) {
    const redSize = countBits(mask);
    const blueSize = count - redSize;

    if (redSize > 5 || blueSize > 5) {
      continue;
    }

    if (!preferredSizes.has(redSize)) {
      continue;
    }

    let redScore = 0;
    for (let index = 0; index < count; index += 1) {
      if (mask & (1 << index)) {
        redScore += participants[index].score;
      }
    }

    const blueScore = totalScore - redScore;
    const scoreDiff = Math.abs(redScore - blueScore);
    const sizeDiff = Math.abs(redSize - blueSize);

    if (scoreDiff < bestScoreDiff || (scoreDiff === bestScoreDiff && sizeDiff < bestSizeDiff)) {
      bestScoreDiff = scoreDiff;
      bestSizeDiff = sizeDiff;
      bestSolutions.length = 0;
      bestSolutions.push(buildSolution(participants, mask, redScore, blueScore));
      continue;
    }

    if (scoreDiff === bestScoreDiff && sizeDiff === bestSizeDiff) {
      bestSolutions.push(buildSolution(participants, mask, redScore, blueScore));
    }
  }

  if (!bestSolutions.length) {
    return null;
  }

  const picked = bestSolutions[Math.floor(Math.random() * bestSolutions.length)];
  const scoreDiff = Math.abs(picked.redScore - picked.blueScore);

  return {
    redTeam: picked.redTeam,
    blueTeam: picked.blueTeam,
    redScore: picked.redScore,
    blueScore: picked.blueScore,
    participantCount: participants.length,
    scoreDiff,
    balanceLabel: getBalanceLabel(scoreDiff),
    balanceLevel: getBalanceLevel(scoreDiff)
  };
}

function buildSolution(participants, mask, redScore, blueScore) {
  const redTeam = [];
  const blueTeam = [];

  participants.forEach((member, index) => {
    if (mask & (1 << index)) {
      redTeam.push(stripMember(member));
    } else {
      blueTeam.push(stripMember(member));
    }
  });

  return {
    redTeam: sortTeam(redTeam),
    blueTeam: sortTeam(blueTeam),
    redScore,
    blueScore
  };
}

function getPreferredTeamSizes(count) {
  const sizes = new Set();
  if (count % 2 === 0) {
    sizes.add(count / 2);
    return sizes;
  }

  sizes.add(Math.floor(count / 2));
  sizes.add(Math.ceil(count / 2));
  return sizes;
}

function countBits(mask) {
  let bits = 0;
  let value = mask;

  while (value > 0) {
    bits += value & 1;
    value >>= 1;
  }

  return bits;
}

function sortTeam(team) {
  return [...team].sort((left, right) => {
    const diff = rankToScore(right.rank) - rankToScore(left.rank);
    return diff || left.name.localeCompare(right.name, "zh-CN");
  });
}

function stripMember(member) {
  return {
    id: member.id,
    name: member.name,
    rank: member.rank,
    selected: true
  };
}

function getBalanceLabel(scoreDiff) {
  if (scoreDiff <= 1) {
    return "非常均衡";
  }
  if (scoreDiff <= 3) {
    return "较均衡";
  }
  return "一般";
}

function getBalanceLevel(scoreDiff) {
  if (scoreDiff <= 1) {
    return "excellent";
  }
  if (scoreDiff <= 3) {
    return "good";
  }
  return "normal";
}

function setBalanceBadge(label, level) {
  elements.balanceBadge.textContent = label;
  elements.balanceBadge.style.background = "#edf2f8";
  elements.balanceBadge.style.color = "#66738a";

  if (level === "excellent") {
    elements.balanceBadge.style.background = "rgba(15, 118, 110, 0.14)";
    elements.balanceBadge.style.color = "#0a6c52";
  } else if (level === "good") {
    elements.balanceBadge.style.background = "rgba(185, 119, 14, 0.15)";
    elements.balanceBadge.style.color = "#8f5d08";
  } else if (level === "normal") {
    elements.balanceBadge.style.background = "rgba(45, 108, 223, 0.13)";
    elements.balanceBadge.style.color = "#2458b8";
  }
}

function syncResultWithCurrentSelection() {
  if (!state.result) {
    return;
  }

  const participants = getSelectedMembers();
  if (participants.length < 6 || participants.length > 10) {
    state.result = null;
    return;
  }

  state.result = autoBalanceTeams(participants);
}

function normalizeResult(result) {
  if (!result || !Array.isArray(result.redTeam) || !Array.isArray(result.blueTeam)) {
    return null;
  }

  const redTeam = result.redTeam.filter((member) => member && member.id && isValidRank(member.rank));
  const blueTeam = result.blueTeam.filter((member) => member && member.id && isValidRank(member.rank));
  const participantCount = redTeam.length + blueTeam.length;

  if (!participantCount) {
    return null;
  }

  const redScore = redTeam.reduce((sum, member) => sum + rankToScore(member.rank), 0);
  const blueScore = blueTeam.reduce((sum, member) => sum + rankToScore(member.rank), 0);
  const scoreDiff = Math.abs(redScore - blueScore);

  return {
    redTeam: sortTeam(redTeam),
    blueTeam: sortTeam(blueTeam),
    redScore,
    blueScore,
    participantCount,
    scoreDiff,
    balanceLabel: getBalanceLabel(scoreDiff),
    balanceLevel: getBalanceLevel(scoreDiff)
  };
}

function showMessage(message, type) {
  elements.messageBox.textContent = message;
  elements.messageBox.className = "message-box";
  if (type) {
    elements.messageBox.classList.add(type);
  }

  elements.mobileMessageBox.textContent = message;
  elements.mobileMessageBox.className = "mobile-message-box";
  if (type) {
    elements.mobileMessageBox.classList.add(type);
  }
}

function setMobileView(view) {
  state.mobileView = view;
  document.body.dataset.mobileView = view;
  renderMobileState();
}

function rankToScore(rank) {
  return RANK_SCORE_MAP[rank] || 0;
}

function isValidRank(rank) {
  return Object.prototype.hasOwnProperty.call(RANK_SCORE_MAP, rank);
}

function createMemberId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `member-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
