// State
const state = {
  status: 'disconnected',
  user: null,
  qr: null,
  groups: [],
  allMembers: [],
  activeView: 'groups', // 'groups' | 'members'
  activeFilter: 'all',
  searchQuery: '',
  allMembersSearchQuery: '',
  allMembersTagFilter: '',
  selectedGroup: null,
  selectedGroupDetails: null,
  participantSearchQuery: ''
};

// Socket.io connection
const socket = io();

// Top Navigation Tabs
const tabGroupsBtn = document.getElementById('tabGroupsBtn');
const tabMembersBtn = document.getElementById('tabMembersBtn');
const groupsCardSection = document.querySelector('.groups-card');
const allMembersSection = document.getElementById('allMembersSection');
const allMembersCountBadge = document.getElementById('allMembersCountBadge');
const allMembersSearchInput = document.getElementById('allMembersSearchInput');
const groupTagFilterSelect = document.getElementById('groupTagFilterSelect');
const exportAllTagsCsvBtn = document.getElementById('exportAllTagsCsvBtn');
const allMembersLoading = document.getElementById('allMembersLoading');
const allMembersTableBody = document.getElementById('allMembersTableBody');

// DOM Elements
const connectionStatusBadge = document.getElementById('connectionStatusBadge');
const statusText = document.getElementById('statusText');
const userInfoHeader = document.getElementById('userInfoHeader');
const userNameHeader = document.getElementById('userNameHeader');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');

const qrSection = document.getElementById('qrSection');
const qrImage = document.getElementById('qrImage');
const qrLoading = document.getElementById('qrLoading');

const metricsSection = document.getElementById('metricsSection');
const totalGroupsCount = document.getElementById('totalGroupsCount');
const regularGroupsCount = document.getElementById('regularGroupsCount');
const communitiesCount = document.getElementById('communitiesCount');
const totalMembersReach = document.getElementById('totalMembersReach');

const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const groupsLoading = document.getElementById('groupsLoading');
const groupsEmpty = document.getElementById('groupsEmpty');
const groupsGrid = document.getElementById('groupsGrid');
const groupsCountBadge = document.getElementById('groupsCountBadge');

// Modal Elements
const membersModal = document.getElementById('membersModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalGroupName = document.getElementById('modalGroupName');
const modalGroupMeta = document.getElementById('modalGroupMeta');
const announceToggle = document.getElementById('announceToggle');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const getInviteBtn = document.getElementById('getInviteBtn');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const addMemberBox = document.getElementById('addMemberBox');
const newMemberPhone = document.getElementById('newMemberPhone');
const submitAddMemberBtn = document.getElementById('submitAddMemberBtn');

const participantsCount = document.getElementById('participantsCount');
const searchParticipantsInput = document.getElementById('searchParticipantsInput');
const participantsLoading = document.getElementById('participantsLoading');
const participantsTableBody = document.getElementById('participantsTableBody');

// Send Message Modal
const sendMessageModal = document.getElementById('sendMessageModal');
const closeSendMsgBtn = document.getElementById('closeSendMsgBtn');
const cancelSendBtn = document.getElementById('cancelSendBtn');
const confirmSendBtn = document.getElementById('confirmSendBtn');
const sendMsgTargetName = document.getElementById('sendMsgTargetName');
const groupMessageText = document.getElementById('groupMessageText');

// Toast
const toast = document.getElementById('toast');

// --- Initialization ---
function init() {
  setupEventListeners();

  socket.on('status', (data) => {
    updateStatus(data);
  });

  socket.emit('request-status');
}

// --- Event Listeners ---
function setupEventListeners() {
  // Top Tabs
  tabGroupsBtn.addEventListener('click', () => switchView('groups'));
  tabMembersBtn.addEventListener('click', () => switchView('members'));

  exportAllTagsCsvBtn.addEventListener('click', () => {
    window.open('/api/members/export-csv', '_blank');
  });

  allMembersSearchInput.addEventListener('input', (e) => {
    state.allMembersSearchQuery = e.target.value.trim().toLowerCase();
    renderAllMembersTable();
  });

  groupTagFilterSelect.addEventListener('change', (e) => {
    state.allMembersTagFilter = e.target.value;
    renderAllMembersTable();
  });

  refreshBtn.addEventListener('click', () => {
    if (state.status === 'connected') {
      if (state.activeView === 'groups') {
        fetchGroups();
      } else {
        fetchAllMembers();
      }
      showToast('جاري تحديث البيانات...', 'info');
    } else {
      socket.emit('request-status');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    if (!confirm('هل أنت متأكد من تسجيل الخروج وفصل الحساب؟')) return;
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('تم تسجيل الخروج بنجاح', 'success');
      }
    } catch (e) {
      showToast('فشل تسجيل الخروج: ' + e.message, 'error');
    }
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderGroups();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      renderGroups();
    });
  });

  closeModalBtn.addEventListener('click', () => {
    membersModal.classList.add('hidden');
    state.selectedGroup = null;
    state.selectedGroupDetails = null;
  });

  closeSendMsgBtn.addEventListener('click', () => sendMessageModal.classList.add('hidden'));
  cancelSendBtn.addEventListener('click', () => sendMessageModal.classList.add('hidden'));

  confirmSendBtn.addEventListener('click', handleSendMessage);

  // Group settings changes in modal
  announceToggle.addEventListener('change', async () => {
    if (!state.selectedGroup) return;
    const isAnnounce = announceToggle.checked;
    try {
      const res = await fetch(`/api/groups/${state.selectedGroup.id}/setting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'announce', value: isAnnounce })
      });
      const data = await res.json();
      if (data.success) {
        showToast(isAnnounce ? 'تم قفل الإرسال (المشرفين فقط)' : 'تم فتح الإرسال للجميع', 'success');
        state.selectedGroup.announce = isAnnounce;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      announceToggle.checked = !isAnnounce;
      showToast('تعذر تغيير الإعداد: ' + err.message, 'error');
    }
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!state.selectedGroup) return;
    window.open(`/api/groups/${state.selectedGroup.id}/export-csv`, '_blank');
  });

  getInviteBtn.addEventListener('click', async () => {
    if (!state.selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${state.selectedGroup.id}/invite`);
      const data = await res.json();
      if (data.success && data.url) {
        navigator.clipboard.writeText(data.url);
        showToast('تم نسخ رابط الدعوة إلى الحافظة بنجاح!', 'success');
      } else {
        throw new Error(data.error || 'لا تملك صلاحية استخراج الرابط');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  sendMessageBtn.addEventListener('click', () => {
    if (!state.selectedGroup) return;
    openSendMessageModal(state.selectedGroup);
  });

  submitAddMemberBtn.addEventListener('click', handleAddMember);

  searchParticipantsInput.addEventListener('input', (e) => {
    state.participantSearchQuery = e.target.value.trim().toLowerCase();
    filterAndRenderParticipants();
  });
}

// --- Status Handling ---
function updateStatus(data) {
  state.status = data.status;
  state.user = data.user;
  state.qr = data.qr;

  connectionStatusBadge.className = `status-badge ${data.status}`;

  if (data.status === 'connected') {
    statusText.textContent = 'متصل بنجاح';
    userInfoHeader.classList.remove('hidden');
    userNameHeader.textContent = `${data.user?.name || 'واتساب'} (+${data.user?.phone || ''})`;
    qrSection.classList.add('hidden');
    metricsSection.classList.remove('hidden');

    if (state.groups.length === 0) {
      fetchGroups();
    }
  } else if (data.status === 'qr') {
    statusText.textContent = 'بانتظار مسح الرمز';
    userInfoHeader.classList.add('hidden');
    qrSection.classList.remove('hidden');
    qrLoading.classList.add('hidden');
    qrImage.src = data.qr;
    qrImage.classList.remove('hidden');
  } else if (data.status === 'connecting') {
    statusText.textContent = 'جاري الاتصال...';
    userInfoHeader.classList.add('hidden');
    qrSection.classList.remove('hidden');
    qrLoading.classList.remove('hidden');
    qrImage.classList.add('hidden');
  } else {
    statusText.textContent = 'غير متصل';
    userInfoHeader.classList.add('hidden');
    qrSection.classList.remove('hidden');
    qrLoading.classList.remove('hidden');
    qrImage.classList.add('hidden');
  }
}

// --- Fetch Groups ---
async function fetchGroups() {
  groupsLoading.classList.remove('hidden');
  groupsEmpty.classList.add('hidden');
  groupsGrid.innerHTML = '';

  try {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (data.success) {
      state.groups = data.groups || [];
      renderMetrics();
      renderGroups();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast('خطأ في جلب المجموعات: ' + err.message, 'error');
  } finally {
    groupsLoading.classList.add('hidden');
  }
}

// --- Metrics Calculation ---
function renderMetrics() {
  const total = state.groups.length;
  const commCount = state.groups.filter((g) => g.isCommunity || g.isCommunityAnnounce || g.linkedParent).length;
  const regularCount = total - commCount;
  const adminCount = state.groups.filter((g) => g.iAmAdmin).length;
  const memberCount = state.groups.filter((g) => !g.iAmAdmin).length;
  const totalMembers = state.groups.reduce((acc, g) => acc + (g.size || 0), 0);

  totalGroupsCount.textContent = total.toLocaleString();
  if (regularGroupsCount) regularGroupsCount.textContent = regularCount.toLocaleString();
  communitiesCount.textContent = commCount.toLocaleString();
  totalMembersReach.textContent = totalMembers.toLocaleString();

  const cAll = document.getElementById('filterCountAll');
  const cGroups = document.getElementById('filterCountGroups');
  const cComm = document.getElementById('filterCountComm');
  const cAdmin = document.getElementById('filterCountAdmin');
  const cMember = document.getElementById('filterCountMember');

  if (cAll) cAll.textContent = `(${total})`;
  if (cGroups) cGroups.textContent = `(${regularCount})`;
  if (cComm) cComm.textContent = `(${commCount})`;
  if (cAdmin) cAdmin.textContent = `(${adminCount})`;
  if (cMember) cMember.textContent = `(${memberCount})`;
}

// --- Render Groups ---
function renderGroups() {
  let list = state.groups;

  // 1. Filter by Tab
  if (state.activeFilter === 'groups-only') {
    list = list.filter((g) => !g.isCommunity && !g.isCommunityAnnounce && !g.linkedParent);
    groupsCountBadge.textContent = `${list.length} مجموعة معروضة (من أصل ${state.groups.length})`;
  } else if (state.activeFilter === 'community') {
    list = list.filter((g) => g.isCommunity || g.isCommunityAnnounce || g.linkedParent);
    groupsCountBadge.textContent = `${list.length} مجتمع معروض (من أصل ${state.groups.length})`;
  } else if (state.activeFilter === 'admin') {
    list = list.filter((g) => g.iAmAdmin);
    groupsCountBadge.textContent = `${list.length} مجموعة بإشرافك`;
  } else if (state.activeFilter === 'member') {
    list = list.filter((g) => !g.iAmAdmin);
    groupsCountBadge.textContent = `${list.length} عنصر كعضو`;
  } else {
    groupsCountBadge.textContent = `${list.length} عنصر إجمالي`;
  }

  // 2. Search Query
  if (state.searchQuery) {
    list = list.filter((g) => {
      const nameMatch = (g.subject || '').toLowerCase().includes(state.searchQuery);
      const idMatch = (g.id || '').toLowerCase().includes(state.searchQuery);
      return nameMatch || idMatch;
    });
    groupsCountBadge.textContent = `${list.length} نتيجة بحث`;
  }

  if (list.length === 0) {
    groupsEmpty.classList.remove('hidden');
    groupsGrid.innerHTML = '';
    return;
  }

  groupsEmpty.classList.add('hidden');
  groupsGrid.innerHTML = list.map((g) => createGroupCardHtml(g)).join('');

  // Attach card event listeners
  list.forEach((g) => {
    const cardEl = document.getElementById(`group-card-${g.id}`);
    if (!cardEl) return;

    // Manage members button
    const manageBtn = cardEl.querySelector('.btn-manage-members');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => openGroupModal(g));
    }

    // Export CSV button
    const exportBtn = cardEl.querySelector('.btn-card-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.open(`/api/groups/${encodeURIComponent(g.id)}/export-csv`, '_blank');
      });
    }

    // Quick Send Message button
    const sendBtn = cardEl.querySelector('.btn-card-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => openSendMessageModal(g));
    }
  });
}

function createGroupCardHtml(g) {
  const isComm = Boolean(g.isCommunity || g.isCommunityAnnounce || g.linkedParent);
  const typeBadge = isComm
    ? '<span class="role-tag community"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/></svg> مجتمع</span>'
    : '<span class="role-tag group"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> مجموعة</span>';

  const roleBadge = g.iAmAdmin
    ? '<span class="role-tag admin"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> مشرف</span>'
    : '<span class="role-tag member">عضو</span>';

  const creationDate = g.creation ? new Date(g.creation).toLocaleDateString('ar-SA') : 'غير متوفر';

  return `
    <div class="group-item" id="group-card-${g.id}">
      <div>
        <div class="group-top">
          <h3 class="group-title" title="${escapeHtml(g.subject)}">${escapeHtml(g.subject)}</h3>
          <div style="display:flex; gap:6px; align-items:center;">
            ${typeBadge}
            ${roleBadge}
          </div>
        </div>

        <div class="group-meta">
          <div class="meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>الأعضاء:</span>
            <strong>${g.size || g.participantsCount} عضو</strong>
          </div>
          <div class="meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>تاريخ الإنشاء:</span>
            <span>${creationDate}</span>
          </div>
          <div class="meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>الإرسال:</span>
            <span>${g.announce ? 'للمشرفين فقط' : 'مفتوح للجميع'}</span>
          </div>
        </div>
      </div>

      <div class="group-actions">
        <button class="btn btn-primary btn-sm btn-manage-members">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>إدارة الأعضاء</span>
        </button>
        <button class="btn btn-secondary btn-sm btn-card-export" title="تحميل ملف CSV بأرقام الأعضاء">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>تصدير</span>
        </button>
        <button class="btn btn-secondary btn-sm btn-card-send" title="إرسال رسالة للمجموعة">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>إرسال</span>
        </button>
      </div>
    </div>
  `;
}

function switchView(view) {
  state.activeView = view;
  if (view === 'groups') {
    tabGroupsBtn.classList.add('active');
    tabMembersBtn.classList.remove('active');
    groupsCardSection.classList.remove('hidden');
    allMembersSection.classList.add('hidden');
  } else {
    tabMembersBtn.classList.add('active');
    tabGroupsBtn.classList.remove('active');
    groupsCardSection.classList.add('hidden');
    allMembersSection.classList.remove('hidden');
    if (state.allMembers.length === 0) {
      fetchAllMembers();
    }
  }
}

async function fetchAllMembers() {
  allMembersLoading.classList.remove('hidden');
  allMembersTableBody.innerHTML = '';
  try {
    const res = await fetch('/api/members');
    const data = await res.json();
    if (data.success) {
      state.allMembers = data.members || [];
      allMembersCountBadge.textContent = `${state.allMembers.length} عضو موحّد`;

      // Populate group tags dropdown
      const tagsSet = new Set();
      state.allMembers.forEach((m) => {
        (m.groups || []).forEach((g) => tagsSet.add(g.groupName));
      });

      const currentVal = groupTagFilterSelect.value;
      groupTagFilterSelect.innerHTML = '<option value="">جميع وسوم المجموعات (الكل)</option>' +
        Array.from(tagsSet)
          .sort()
          .map((tagName) => `<option value="${escapeHtml(tagName)}" ${currentVal === tagName ? 'selected' : ''}>${escapeHtml(tagName)}</option>`)
          .join('');

      renderAllMembersTable();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast('تعذر جلب دليل الأعضاء: ' + err.message, 'error');
  } finally {
    allMembersLoading.classList.add('hidden');
  }
}

function renderAllMembersTable() {
  let list = state.allMembers;

  if (state.allMembersTagFilter) {
    list = list.filter((m) => (m.groups || []).some((g) => g.groupName === state.allMembersTagFilter));
  }

  if (state.allMembersSearchQuery) {
    const q = state.allMembersSearchQuery;
    list = list.filter((m) => {
      const nameMatch = m.name && m.name.toLowerCase().includes(q);
      const phoneMatch = m.phone && m.phone.toLowerCase().includes(q);
      const tagMatch = (m.groups || []).some((g) => g.groupName.toLowerCase().includes(q));
      return nameMatch || phoneMatch || tagMatch;
    });
  }

  if (list.length === 0) {
    allMembersTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
          لا توجد نتائج مطابقة لبحثك
        </td>
      </tr>
    `;
    return;
  }

  // Render top 250 for speed if large
  const displayList = list.slice(0, 300);

  allMembersTableBody.innerHTML = displayList
    .map((m) => {
      const displayName = m.name ? `<strong>${escapeHtml(m.name)}</strong>` : '<span style="color:var(--text-muted);">-</span>';
      const phoneLabel = `+${m.phone}`;

      const tagsHtml = (m.groups || [])
        .map((g) => `<span class="tag-badge ${g.isAdmin ? 'admin-tag' : ''}"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> ${escapeHtml(g.groupName)} ${g.isAdmin ? '(مشرف)' : ''}</span>`)
        .join('');

      return `
        <tr>
          <td>${displayName}</td>
          <td><strong style="color:var(--text-main); font-size:0.95rem;">${phoneLabel}</strong> ${m.isMe ? '<span class="badge" style="margin-right:4px;">أنت</span>' : ''}</td>
          <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${tagsHtml}</div></td>
        </tr>
      `;
    })
    .join('');
}
async function openGroupModal(group) {
  state.selectedGroup = group;
  membersModal.classList.remove('hidden');

  modalGroupName.textContent = group.subject;
  modalGroupMeta.textContent = `معرف المجموعة: ${group.id}`;

  announceToggle.checked = Boolean(group.announce);

  // If bot is not admin, disable adding members
  if (!group.iAmAdmin) {
    addMemberBox.classList.add('hidden');
    announceToggle.disabled = true;
  } else {
    addMemberBox.classList.remove('hidden');
    announceToggle.disabled = false;
  }

  participantsLoading.classList.remove('hidden');
  participantsTableBody.innerHTML = '';
  participantsCount.textContent = '...';

  try {
    const encodedJid = encodeURIComponent(group.id);
    const res = await fetch(`/api/groups/${encodedJid}`);
    const data = await res.json();
    if (data.success && data.group) {
      state.selectedGroupDetails = data.group;
      participantsCount.textContent = data.group.participants.length;
      filterAndRenderParticipants();
    } else {
      throw new Error(data.error || 'فشل جلب بيانات المجموعة');
    }
  } catch (err) {
    console.error('Error loading group participants:', err);
    participantsTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--danger); padding: 20px;">
          تعذر تحميل الأعضاء: ${err.message}
        </td>
      </tr>
    `;
    showToast('تعذر تحميل بيانات الأعضاء: ' + err.message, 'error');
  } finally {
    participantsLoading.classList.add('hidden');
  }
}

function filterAndRenderParticipants() {
  if (!state.selectedGroupDetails) return;

  let participants = state.selectedGroupDetails.participants || [];

  if (state.participantSearchQuery) {
    participants = participants.filter((p) => {
      const q = state.participantSearchQuery;
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.displayPhone && p.displayPhone.includes(q))
      );
    });
  }

  if (participants.length === 0) {
    participantsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
          لا يوجد أعضاء مطابقين للبحث
        </td>
      </tr>
    `;
    return;
  }

  const iAmAdmin = state.selectedGroup.iAmAdmin;

  participantsTableBody.innerHTML = participants
    .map((p) => {
      let roleText = 'عضو';
      let roleClass = 'role-tag member';
      if (p.isSuperAdmin) {
        roleText = 'مالك المجموعة';
        roleClass = 'role-tag community';
      } else if (p.isAdmin) {
        roleText = 'مشرف ⭐';
        roleClass = 'role-tag admin';
      }

      let actionsHtml = '-';
      if (iAmAdmin && !p.isMe && !p.isSuperAdmin) {
        actionsHtml = `
          <div class="actions-cell">
            ${
              p.isAdmin
                ? `<button class="btn btn-secondary btn-sm" onclick="handleParticipantAction('${p.id}', 'demote')">تنزيل رتبة</button>`
                : `<button class="btn btn-secondary btn-sm" onclick="handleParticipantAction('${p.id}', 'promote')">ترقية لمشرف</button>`
            }
            <button class="btn-danger-sm" onclick="handleParticipantAction('${p.id}', 'remove')">طرد</button>
          </div>
        `;
      }

      const displayLabel = `+${p.phone}`;
      const nameLabel = p.name
        ? `<strong>${escapeHtml(p.name)}</strong>`
        : '<span style="color:var(--text-muted);">-</span>';

      return `
        <tr>
          <td>${nameLabel}</td>
          <td>
            <strong style="color:var(--text-main); font-size:0.95rem;">${escapeHtml(displayLabel)}</strong>
            ${p.isMe ? '<span class="badge" style="margin-right: 6px;">أنت</span>' : ''}
          </td>
          <td><span class="${roleClass}">${roleText}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    })
    .join('');
}

// Window actions
window.handleParticipantAction = async function (participantId, action) {
  if (!state.selectedGroup) return;

  const actionNames = {
    remove: 'طرد هذا العضو',
    promote: 'ترقية هذا العضو إلى مشرف',
    demote: 'خفض رتبة هذا المشرف إلى عضو'
  };

  if (!confirm(`هل أنت متأكد من رغبتك في ${actionNames[action]}؟`)) return;

  try {
    const res = await fetch(`/api/groups/${state.selectedGroup.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants: [participantId],
        action
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('تم تنفيذ الإجراء بنجاح', 'success');
      // Refresh modal
      openGroupModal(state.selectedGroup);
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast('فشل تنفيذ الإجراء: ' + err.message, 'error');
  }
};

async function handleAddMember() {
  if (!state.selectedGroup) return;
  const phone = newMemberPhone.value.trim();
  if (!phone) {
    showToast('يرجى إدخال رقم الهاتف', 'error');
    return;
  }

  try {
    submitAddMemberBtn.disabled = true;
    submitAddMemberBtn.textContent = 'جاري الإضافة...';

    const res = await fetch(`/api/groups/${state.selectedGroup.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants: [phone],
        action: 'add'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('تمت إضافة العضو بنجاح', 'success');
      newMemberPhone.value = '';
      openGroupModal(state.selectedGroup);
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast('فشل إضافة العضو: ' + err.message, 'error');
  } finally {
    submitAddMemberBtn.disabled = false;
    submitAddMemberBtn.textContent = 'إضافة للمجموعة';
  }
}

// --- Send Message Modal ---
function openSendMessageModal(group) {
  state.selectedGroup = group;
  sendMsgTargetName.textContent = `الإرسال إلى: ${group.subject}`;
  groupMessageText.value = '';
  sendMessageModal.classList.remove('hidden');
}

async function handleSendMessage() {
  if (!state.selectedGroup) return;
  const message = groupMessageText.value.trim();
  if (!message) {
    showToast('يرجى كتابة نص الرسالة أولاً', 'error');
    return;
  }

  try {
    confirmSendBtn.disabled = true;
    confirmSendBtn.textContent = 'جاري الإرسال...';

    const res = await fetch(`/api/groups/${state.selectedGroup.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data.success) {
      showToast('تم إرسال الرسالة إلى المجموعة بنجاح!', 'success');
      sendMessageModal.classList.add('hidden');
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast('فشل إرسال الرسالة: ' + err.message, 'error');
  } finally {
    confirmSendBtn.disabled = false;
    confirmSendBtn.textContent = 'إرسال الآن';
  }
}

// --- Toast Utility ---
function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start
document.addEventListener('DOMContentLoaded', init);

