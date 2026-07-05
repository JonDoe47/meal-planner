<template>
  <div class="ing-page">
    <header class="page-header">
      <div>
        <div class="header-title">食材清单</div>
        <div class="header-sub">{{ rangeLabel }}</div>
      </div>
      <div class="header-count">
        <strong>{{ ingredients.length }}</strong>
        <span>种食材</span>
      </div>
    </header>

    <section class="filter-band">
      <div class="preset-row">
        <button
          v-for="item in presetOptions"
          :key="item.value"
          type="button"
          class="preset-chip"
          :class="{ active: preset === item.value }"
          @click="setPreset(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="date-row">
        <button type="button" class="date-control" :class="{ active: preset === 'custom' }" @click="showStartPicker = true">
          <van-icon name="calendar-o" size="15" />
          <span>{{ startDate }}</span>
        </button>
        <span class="date-sep">至</span>
        <button type="button" class="date-control" :class="{ active: preset === 'custom' }" @click="showEndPicker = true">
          <van-icon name="calendar-o" size="15" />
          <span>{{ endDate }}</span>
        </button>
        <van-button type="primary" size="small" :loading="loading" class="query-btn" @click="load">
          查询
        </van-button>
      </div>
    </section>

    <section class="purchase-panel">
      <div class="section-head">
        <div>
          <div class="section-title">采购任务</div>
          <div class="section-meta">{{ selectedMemberText }} · {{ purchasePlatform }}</div>
        </div>
        <van-button
          size="small"
          type="success"
          :disabled="ingredients.length === 0"
          class="notify-btn"
          @click="openWechatNotice"
        >
          <van-icon name="chat-o" size="15" />
          <span>微信通知</span>
        </van-button>
      </div>

      <div class="task-grid">
        <label class="task-field">
          <span class="field-label">购置时间</span>
          <input v-model="purchaseTime" type="datetime-local" />
        </label>
        <label class="task-field">
          <span class="field-label">自定义平台</span>
          <input v-model="customPlatform" placeholder="可填写店铺或平台" @focus="platform = '其他'" />
        </label>
      </div>

      <div class="platform-row">
        <button
          v-for="item in platformOptions"
          :key="item"
          type="button"
          class="platform-chip"
          :class="{ active: platform === item }"
          @click="selectPlatform(item)"
        >
          {{ item }}
        </button>
      </div>

      <button type="button" class="member-select" @click="showMemberPicker = true">
        <span class="member-icon"><van-icon name="friends-o" size="16" /></span>
        <span>{{ selectedMemberText }}</span>
        <van-icon name="arrow" size="14" color="#94a3b8" />
      </button>
    </section>

    <section class="summary-strip" v-if="loaded && ingredients.length > 0">
      <div class="summary-item">
        <span class="summary-label">待采购</span>
        <strong>{{ pendingCount }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">已勾选</span>
        <strong>{{ checkedCount }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">购买成员</span>
        <strong>{{ selectedMembers.length || '-' }}</strong>
      </div>
    </section>

    <van-popup v-model:show="showStartPicker" position="bottom" round>
      <van-date-picker v-model="startPickerVal" @confirm="onStartConfirm" @cancel="showStartPicker = false" />
    </van-popup>
    <van-popup v-model:show="showEndPicker" position="bottom" round>
      <van-date-picker v-model="endPickerVal" @confirm="onEndConfirm" @cancel="showEndPicker = false" />
    </van-popup>

    <van-popup v-model:show="showMemberPicker" position="bottom" round>
      <div class="member-popup">
        <div class="popup-title">选择购买成员</div>
        <div class="member-list">
          <button
            v-for="user in users"
            :key="user.id"
            type="button"
            class="member-option"
            :class="{ active: selectedMemberIds.has(user.id) }"
            @click="toggleMember(user.id)"
          >
            <span>
              <span class="member-name">{{ user.name }}</span>
              <span class="member-role">{{ roleLabel(user.role) }}</span>
            </span>
            <van-icon v-if="selectedMemberIds.has(user.id)" name="success" size="18" color="#16a34a" />
          </button>
          <van-empty v-if="users.length === 0" description="暂无可选成员" :image-size="60" />
        </div>
        <van-button block type="primary" class="popup-done" @click="showMemberPicker = false">完成</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showNoticePreview" position="bottom" round :style="{ maxHeight: '78%' }">
      <div class="notice-popup">
        <div class="popup-title">微信采购消息</div>
        <textarea v-model="noticeMessage" class="notice-textarea" rows="12"></textarea>
        <div class="notice-actions">
          <van-button plain block type="primary" @click="copyNotice">复制消息</van-button>
          <van-button block type="success" @click="copyAndOpenWechat">复制并打开微信</van-button>
        </div>
      </div>
    </van-popup>

    <main class="result-wrap">
      <div v-if="!loaded" class="empty-state">
        <van-empty description="选择日期范围后点击查询" />
      </div>

      <div v-else-if="ingredients.length === 0" class="empty-state">
        <van-empty description="该日期范围内无点餐记录或菜品未配置食材" />
      </div>

      <template v-else>
        <div class="result-head">
          <div class="result-title">采购明细</div>
          <div class="result-actions">
            <van-button size="mini" plain type="primary" @click="copyList">复制清单</van-button>
            <van-button size="mini" plain type="success" @click="markAllPending">全选待购</van-button>
          </div>
        </div>

        <transition-group name="ing-anim" tag="div" class="ing-list">
          <article v-for="ing in ingredients" :key="ing.name" class="ing-item" :class="{ checked: checkedSet.has(ing.name) }">
            <button type="button" class="ing-check" :class="{ checked: checkedSet.has(ing.name) }" @click="toggleCheck(ing.name)">
              <van-icon v-if="checkedSet.has(ing.name)" name="success" size="14" color="white" />
            </button>

            <div class="ing-main">
              <div class="ing-top">
                <div class="ing-name" :class="{ done: checkedSet.has(ing.name) }">{{ ing.name }}</div>
                <span class="count-pill">{{ ing.count }} 次</span>
              </div>
              <div class="ing-dishes">{{ ing.dishes.join('、') }}</div>
              <div class="ing-users">{{ ing.users.join('、') }}</div>
            </div>
          </article>
        </transition-group>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { ingredientApi, userApi } from '../../api'

const today = new Date()
const pad = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtDateTime = d => `${fmt(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const presetOptions = [
  { value: 'today', label: '今日' },
  { value: 'tomorrow', label: '明日' },
  { value: 'week', label: '本周' },
  { value: 'next3', label: '未来3天' }
]
const platformOptions = ['菜市场', '美团买菜', '叮咚买菜', '盒马', '京东到家', '其他']

const startDate = ref(fmt(today))
const endDate = ref(fmt(today))
const startPickerVal = ref(startDate.value.split('-'))
const endPickerVal = ref(endDate.value.split('-'))
const showStartPicker = ref(false)
const showEndPicker = ref(false)
const loading = ref(false)
const loaded = ref(false)
const ingredients = ref([])
const checkedSet = ref(new Set())
const preset = ref('today')

const platform = ref('菜市场')
const customPlatform = ref('')
const purchaseTime = ref(fmtDateTime(new Date()))
const users = ref([])
const selectedMemberIds = ref(new Set())
const showMemberPicker = ref(false)
const showNoticePreview = ref(false)
const noticeMessage = ref('')

const selectedMembers = computed(() => users.value.filter(user => selectedMemberIds.value.has(user.id)))
const selectedMemberText = computed(() => {
  if (selectedMembers.value.length === 0) return '选择购买成员'
  return selectedMembers.value.map(user => user.name).join('、')
})
const checkedCount = computed(() => checkedSet.value.size)
const pendingCount = computed(() => Math.max(ingredients.value.length - checkedCount.value, 0))
const pendingIngredients = computed(() => ingredients.value.filter(item => !checkedSet.value.has(item.name)))
const purchasePlatform = computed(() => (platform.value === '其他' ? customPlatform.value.trim() : platform.value) || '待确认')
const rangeLabel = computed(() => startDate.value === endDate.value ? startDate.value : `${startDate.value} 至 ${endDate.value}`)

function setPreset(p) {
  preset.value = p
  const d = new Date()
  if (p === 'today') {
    startDate.value = endDate.value = fmt(d)
  } else if (p === 'tomorrow') {
    const t = new Date(d)
    t.setDate(d.getDate() + 1)
    startDate.value = endDate.value = fmt(t)
  } else if (p === 'week') {
    const mon = new Date(d)
    mon.setDate(d.getDate() - d.getDay() + 1)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    startDate.value = fmt(mon)
    endDate.value = fmt(sun)
  } else if (p === 'next3') {
    const end = new Date(d)
    end.setDate(d.getDate() + 2)
    startDate.value = fmt(d)
    endDate.value = fmt(end)
  }
  syncPickerValues()
  load()
}

function syncPickerValues() {
  startPickerVal.value = startDate.value.split('-')
  endPickerVal.value = endDate.value.split('-')
}

function onStartConfirm(v) {
  startDate.value = v.selectedValues.join('-')
  preset.value = 'custom'
  showStartPicker.value = false
  syncPickerValues()
}

function onEndConfirm(v) {
  endDate.value = v.selectedValues.join('-')
  preset.value = 'custom'
  showEndPicker.value = false
  syncPickerValues()
}

function selectPlatform(item) {
  platform.value = item
  if (item !== '其他') customPlatform.value = ''
}

function toggleCheck(name) {
  const s = new Set(checkedSet.value)
  s.has(name) ? s.delete(name) : s.add(name)
  checkedSet.value = s
}

function toggleMember(id) {
  const s = new Set(selectedMemberIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedMemberIds.value = s
}

function roleLabel(role) {
  return role === 'ADMIN' ? '管理员' : role === 'VIP' ? 'VIP成员' : '家庭成员'
}

async function load() {
  loading.value = true
  checkedSet.value = new Set()
  try {
    ingredients.value = await ingredientApi.summary({ startDate: startDate.value, endDate: endDate.value })
    loaded.value = true
  } catch {
    showToast({ type: 'fail', message: '查询失败' })
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    users.value = await userApi.list()
  } catch {
    users.value = []
  }
}

function markAllPending() {
  checkedSet.value = new Set()
  showToast({ message: '已恢复为待采购' })
}

function buildPlainList(list = ingredients.value) {
  return list.map(item => {
    const mark = checkedSet.value.has(item.name) ? '[已购]' : '[待购]'
    return `${mark} ${item.name}（用于：${item.dishes.join('、')}）`
  }).join('\n')
}

function buildNoticeMessage() {
  const assignees = selectedMembers.value.map(user => user.name).join('、') || '未指定'
  const list = pendingIngredients.value.length ? pendingIngredients.value : ingredients.value
  const lines = list.map((item, index) => {
    const usersText = item.users?.length ? `；点餐：${item.users.join('、')}` : ''
    return `${index + 1}. ${item.name}（用于：${item.dishes.join('、')}${usersText}）`
  })

  return [
    `采购任务：${rangeLabel.value}`,
    `购买成员：${assignees}`,
    `购置时间：${purchaseTime.value.replace('T', ' ') || '待确认'}`,
    `购置平台：${purchasePlatform.value}`,
    '',
    '请帮忙购买以下食材：',
    ...lines,
    '',
    '买完后可以在食材页勾选已购。'
  ].join('\n')
}

function openWechatNotice() {
  if (ingredients.value.length === 0) {
    showToast({ message: '暂无可通知的食材' })
    return
  }
  noticeMessage.value = buildNoticeMessage()
  showNoticePreview.value = true
}

async function writeClipboard(text) {
  await navigator.clipboard.writeText(text)
}

async function copyList() {
  try {
    await writeClipboard(buildPlainList())
    showToast({ type: 'success', message: '已复制清单' })
  } catch {
    showToast({ type: 'fail', message: '复制失败' })
  }
}

async function copyNotice() {
  try {
    await writeClipboard(noticeMessage.value)
    showToast({ type: 'success', message: '已复制微信消息' })
  } catch {
    showToast({ type: 'fail', message: '复制失败' })
  }
}

async function copyAndOpenWechat() {
  await copyNotice()
  window.location.href = 'weixin://'
}

loadUsers()
load()
</script>

<style scoped>
.ing-page {
  min-height: 100vh;
  background: #f6f8fb;
  padding-bottom: 88px;
}

.page-header {
  background: linear-gradient(135deg, #155e75 0%, #2563eb 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 18px 20px;
}

.header-title {
  font-size: 20px;
  font-weight: 800;
}

.header-sub {
  font-size: 12px;
  opacity: 0.84;
  margin-top: 3px;
}

.header-count {
  min-width: 70px;
  text-align: right;
}

.header-count strong {
  display: block;
  font-size: 24px;
  line-height: 1;
}

.header-count span {
  font-size: 11px;
  opacity: 0.82;
}

.filter-band,
.purchase-panel,
.summary-strip {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 16px;
}

.filter-band {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-row,
.platform-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.preset-chip,
.platform-chip {
  border: 1px solid #d8dee8;
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.preset-chip.active,
.platform-chip.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.date-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.date-control {
  height: 38px;
  border: 1px solid #d8dee8;
  background: white;
  color: #1e293b;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  min-width: 0;
}

.date-control.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
}

.date-sep {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.query-btn,
.notify-btn {
  border-radius: 8px;
  font-weight: 800;
}

.notify-btn :deep(.van-button__content) {
  gap: 5px;
}

.purchase-panel {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.section-head,
.result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title,
.result-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.section-meta {
  margin-top: 3px;
  font-size: 11px;
  color: #64748b;
  max-width: 190px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.task-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.task-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.task-field input {
  height: 40px;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  padding: 0 10px;
  outline: none;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  background: #fff;
}

.task-field input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
}

.member-select {
  width: 100%;
  height: 42px;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  background: #f8fafc;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.member-select span:nth-child(2) {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
}

.member-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e0f2fe;
  color: #0369a1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-strip {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  padding: 0;
  overflow: hidden;
}

.summary-item {
  padding: 12px 14px;
  background: #fff;
}

.summary-label {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.summary-item strong {
  display: block;
  color: #0f172a;
  font-size: 20px;
  margin-top: 2px;
}

.member-popup,
.notice-popup {
  background: white;
  padding: 16px;
}

.popup-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 12px;
}

.member-list {
  max-height: 48vh;
  overflow-y: auto;
}

.member-option {
  width: 100%;
  border: 0;
  background: white;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 2px;
  color: #0f172a;
  text-align: left;
}

.member-option.active {
  color: #15803d;
}

.member-name {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.member-role {
  display: block;
  color: #94a3b8;
  font-size: 11px;
  margin-top: 3px;
}

.popup-done {
  margin-top: 14px;
  border-radius: 8px;
}

.notice-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  padding: 12px;
  resize: vertical;
}

.notice-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.notice-actions :deep(.van-button) {
  border-radius: 8px;
}

.result-wrap {
  padding: 14px 14px 0;
}

.empty-state {
  background: white;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  padding: 28px 0;
}

.result-head {
  margin-bottom: 10px;
}

.result-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.result-actions :deep(.van-button) {
  border-radius: 8px;
  font-weight: 800;
}

.ing-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ing-anim-move,
.ing-anim-enter-active {
  transition: all 0.25s ease;
}

.ing-anim-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.ing-item {
  background: white;
  border: 1px solid #eef2f7;
  border-left: 4px solid #d8dee8;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.03);
}

.ing-item.checked {
  border-left-color: #22c55e;
  background: #f8fefb;
}

.ing-check {
  width: 24px;
  height: 24px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.ing-check.checked {
  background: #22c55e;
  border-color: #22c55e;
}

.ing-main {
  min-width: 0;
  flex: 1;
}

.ing-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ing-name {
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ing-name.done {
  color: #94a3b8;
  text-decoration: line-through;
}

.count-pill {
  flex-shrink: 0;
  color: #92400e;
  background: #fef3c7;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
}

.ing-dishes {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  margin-top: 5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ing-users {
  color: #94a3b8;
  font-size: 11px;
  margin-top: 3px;
}

@media (max-width: 540px) {
  .date-row {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }

  .query-btn {
    grid-column: 1 / -1;
    width: 100%;
  }

  .task-grid,
  .notice-actions {
    grid-template-columns: 1fr;
  }

  .result-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-actions {
    width: 100%;
  }

  .result-actions :deep(.van-button) {
    flex: 1;
  }
}
</style>
