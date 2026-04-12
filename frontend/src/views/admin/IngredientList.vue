<template>
  <div class="ing-page">
    <div class="page-header">
      <div class="header-title">食材清单</div>
      <div class="header-sub">汇总家庭点餐所需食材</div>
    </div>

    <div class="date-bar">
      <div class="preset-row">
        <van-tag plain @click="setPreset('today')" :type="preset==='today'?'primary':'default'" round class="preset-tag">今日</van-tag>
        <van-tag plain @click="setPreset('tomorrow')" :type="preset==='tomorrow'?'primary':'default'" round class="preset-tag">明日</van-tag>
        <van-tag plain @click="setPreset('week')" :type="preset==='week'?'primary':'default'" round class="preset-tag">本周</van-tag>
        <van-tag plain @click="setPreset('next3')" :type="preset==='next3'?'primary':'default'" round class="preset-tag">未来3天</van-tag>
      </div>
      <div class="date-row">
        <div class="date-item" @click="showStartPicker = true" :class="{ active: preset !== 'today' && preset !== 'tomorrow' && preset !== 'week' && preset !== 'next3' }">
          <van-icon name="calendar-o" size="14" color="#2563eb" />
          <span>{{ startDate }}</span>
        </div>
        <span class="date-sep">至</span>
        <div class="date-item" @click="showEndPicker = true">
          <van-icon name="calendar-o" size="14" color="#2563eb" />
          <span>{{ endDate }}</span>
        </div>
        <van-button type="primary" size="small" round :loading="loading" @click="load" class="query-btn">查询</van-button>
      </div>
    </div>

    <van-popup v-model:show="showStartPicker" position="bottom" round>
      <van-date-picker v-model="startPickerVal" @confirm="v => { startDate = v.selectedValues.join('-'); showStartPicker = false }" @cancel="showStartPicker = false" />
    </van-popup>
    <van-popup v-model:show="showEndPicker" position="bottom" round>
      <van-date-picker v-model="endPickerVal" @confirm="v => { endDate = v.selectedValues.join('-'); showEndPicker = false }" @cancel="showEndPicker = false" />
    </van-popup>

    <div class="result-wrap">
      <div v-if="!loaded" class="hint"><van-empty description="选择日期范围后点击查询" /></div>
      <div v-else-if="ingredients.length === 0" class="hint"><van-empty description="该日期范围内无点餐记录或菜品未配置食材" /></div>
      <div v-else>
        <div class="result-header">
          <span>共需 <strong>{{ ingredients.length }}</strong> 种食材</span>
          <van-button size="mini" plain type="primary" @click="copyList" class="copy-btn">📋 复制清单</van-button>
        </div>
        <transition-group name="ing-anim" tag="div" class="ing-list">
          <div v-for="ing in ingredients" :key="ing.name" class="ing-item" :class="{ checked: checkedSet.has(ing.name) }">
            <div class="ing-left">
              <div class="ing-check" :class="{ checked: checkedSet.has(ing.name) }" @click="toggleCheck(ing.name)">
                <van-icon v-if="checkedSet.has(ing.name)" name="success" size="14" color="white" />
              </div>
              <div class="ing-name" :class="{ 'ing-done': checkedSet.has(ing.name) }">{{ ing.name }}</div>
            </div>
            <div class="ing-right">
              <div class="ing-dishes">{{ ing.dishes.join('、') }}</div>
              <div class="ing-users">{{ ing.users.join(' ') }}</div>
            </div>
          </div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import { ingredientApi } from '../../api'

const today = new Date()
const fmt = d => d.toISOString().split('T')[0]
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

function setPreset(p) {
  preset.value = p
  const d = new Date()
  if (p === 'today') { startDate.value = endDate.value = fmt(d) }
  else if (p === 'tomorrow') { const t = new Date(d); t.setDate(d.getDate()+1); startDate.value = endDate.value = fmt(t) }
  else if (p === 'week') { const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); startDate.value = fmt(mon); endDate.value = fmt(sun) }
  else if (p === 'next3') { const end = new Date(d); end.setDate(d.getDate()+2); startDate.value = fmt(d); endDate.value = fmt(end) }
  load()
}

async function load() {
  loading.value = true; checkedSet.value = new Set()
  try { ingredients.value = await ingredientApi.summary({ startDate: startDate.value, endDate: endDate.value }); loaded.value = true }
  catch { showToast({ type: 'fail', message: '查询失败' }) }
  finally { loading.value = false }
}

function toggleCheck(name) { const s = new Set(checkedSet.value); s.has(name) ? s.delete(name) : s.add(name); checkedSet.value = s }

function copyList() {
  navigator.clipboard.writeText(ingredients.value.map(i => `${checkedSet.has(i.name)?'[✓]':'[ ]'} ${i.name}  (${i.dishes.join('、')})`).join('\n'))
  .then(() => showToast({ type: 'success', message: '已复制' }))
}
load()
</script>

<style scoped>
.ing-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); color: white; flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; }
.header-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; font-weight: 500; }

.date-bar { background: white; padding: var(--space-md) var(--space-lg); box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--border-light); }
.preset-row { display: flex; gap: 8px; flex-wrap: wrap; }
.preset-tag { transition: all 0.15s; cursor: pointer; font-size: 13px !important; font-weight: 600 !important; }
.preset-tag:hover { transform: translateY(-1px); }
.date-row { display: flex; align-items: center; gap: 8px; }
.date-item {
  display: flex; align-items: center; gap: 5px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  padding: 7px 12px; font-size: 13px; color: var(--text1);
  cursor: pointer; transition: all 0.2s; background: white; font-weight: 600;
}
.date-item:hover { border-color: var(--primary); }
.date-item.active { border-color: var(--primary); background: var(--primary-light); }
.date-sep { font-size: 13px; color: var(--text3); flex-shrink: 0; font-weight: 500; }
.query-btn { margin-left: auto; font-weight: 700; }

.result-wrap { padding: var(--space-md); }
.hint { padding: 40px 0; }
.result-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 600; color: var(--text1); margin-bottom: 12px;
}
.result-header strong { color: var(--primary); font-size: 16px; }
.copy-btn { font-weight: 700; transition: all 0.15s; }
.copy-btn:hover { transform: scale(1.05); }

.ing-list { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 0; }
.ing-anim-move { transition: all 0.35s ease; }
.ing-anim-enter-active { transition: all 0.25s ease-out; }
.ing-anim-enter-from { opacity: 0; transform: translateX(-12px); }

.ing-item {
  background: white; border-radius: var(--radius-md); padding: 12px 14px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow); border-left: 3px solid transparent; transition: all 0.2s;
}
.ing-item:hover { border-color: var(--success-green); box-shadow: var(--shadow-md); }
.ing-item.checked { background: #f0fdf4; border-left-color: var(--success-green); }
.ing-left { display: flex; align-items: center; gap: 10px; width: 110px; flex-shrink: 0; }
.ing-check {
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;
}
.ing-check:hover { border-color: var(--success-green); transform: scale(1.1); }
.ing-check.checked { background: linear-gradient(135deg, #22c55e, #4ade80); border-color: transparent; box-shadow: 0 2px 6px rgba(34,197,94,0.3); }
.ing-name { font-size: 14px; font-weight: 700; color: var(--text1); transition: all 0.2s; }
.ing-done { text-decoration: line-through; color: var(--text3); }
.ing-right { flex: 1; min-width: 0; }
.ing-dishes { font-size: 12px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.ing-users { font-size: 11px; color: var(--text3); margin-top: 3px; }
</style>