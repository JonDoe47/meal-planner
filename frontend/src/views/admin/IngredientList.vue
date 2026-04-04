<template>
  <div class="ing-page">
    <div class="page-header">
      <div class="header-title">食材清单</div>
      <div class="header-sub">汇总家庭点餐所需食材</div>
    </div>

    <!-- 日期选择 -->
    <div class="date-bar">
      <div class="date-row">
        <div class="date-item" @click="showStartPicker = true">
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
      <div class="preset-row">
        <van-tag plain @click="setPreset('today')" :type="preset==='today'?'primary':'default'">今日</van-tag>
        <van-tag plain @click="setPreset('tomorrow')" :type="preset==='tomorrow'?'primary':'default'">明日</van-tag>
        <van-tag plain @click="setPreset('week')" :type="preset==='week'?'primary':'default'">本周</van-tag>
        <van-tag plain @click="setPreset('next3')" :type="preset==='next3'?'primary':'default'">未来3天</van-tag>
      </div>
    </div>

    <van-popup v-model:show="showStartPicker" position="bottom" round>
      <van-date-picker v-model="startPickerVal" @confirm="v => { startDate = v.selectedValues.join('-'); showStartPicker = false }" @cancel="showStartPicker = false" />
    </van-popup>
    <van-popup v-model:show="showEndPicker" position="bottom" round>
      <van-date-picker v-model="endPickerVal" @confirm="v => { endDate = v.selectedValues.join('-'); showEndPicker = false }" @cancel="showEndPicker = false" />
    </van-popup>

    <!-- 汇总结果 -->
    <div class="result-wrap">
      <div v-if="!loaded" class="hint">
        <van-empty description="选择日期范围后点击查询" />
      </div>
      <div v-else-if="ingredients.length === 0" class="hint">
        <van-empty description="该日期范围内无点餐记录或菜品未配置食材" />
      </div>
      <div v-else>
        <div class="result-header">
          <span>共需 {{ ingredients.length }} 种食材</span>
          <van-button size="mini" plain type="primary" @click="copyList">复制清单</van-button>
        </div>
        <div class="ing-list">
          <div v-for="ing in ingredients" :key="ing.name" class="ing-item">
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
        </div>
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
  else if (p === 'week') {
    const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    startDate.value = fmt(mon); endDate.value = fmt(sun)
  } else if (p === 'next3') {
    const end = new Date(d); end.setDate(d.getDate()+2)
    startDate.value = fmt(d); endDate.value = fmt(end)
  }
  load()
}

async function load() {
  loading.value = true
  checkedSet.value = new Set()
  try {
    ingredients.value = await ingredientApi.summary({ startDate: startDate.value, endDate: endDate.value })
    loaded.value = true
  } catch {
    showToast({ type: 'fail', message: '查询失败' })
  } finally { loading.value = false }
}

function toggleCheck(name) {
  const s = new Set(checkedSet.value)
  s.has(name) ? s.delete(name) : s.add(name)
  checkedSet.value = s
}

function copyList() {
  const text = ingredients.value.map(i => `□ ${i.name}  (${i.dishes.join('、')})`).join('\n')
  navigator.clipboard.writeText(text).then(() => showToast({ type: 'success', message: '已复制' }))
}

// 默认加载今日
load()
</script>

<style scoped>
.ing-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.header-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }

.date-bar { background: white; padding: 14px 16px; box-shadow: 0 1px 0 var(--border); }
.date-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.date-item {
  display: flex; align-items: center; gap: 5px;
  border: 1.5px solid var(--border); border-radius: 8px;
  padding: 6px 10px; font-size: 13px; color: var(--text1); cursor: pointer;
}
.date-sep { font-size: 13px; color: var(--text2); flex-shrink: 0; }
.query-btn { margin-left: auto; }
.preset-row { display: flex; gap: 8px; }

.result-wrap { padding: 12px; }
.hint { padding: 40px 0; }
.result-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 600; color: var(--text1); margin-bottom: 10px;
}

.ing-list { display: flex; flex-direction: column; gap: 8px; }
.ing-item {
  background: white; border-radius: 12px; padding: 12px 14px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow);
}
.ing-left { display: flex; align-items: center; gap: 10px; width: 100px; flex-shrink: 0; }
.ing-check {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: all 0.2s;
}
.ing-check.checked { background: #16a34a; border-color: #16a34a; }
.ing-name { font-size: 15px; font-weight: 600; color: var(--text1); }
.ing-done { text-decoration: line-through; color: var(--text2); }
.ing-right { flex: 1; min-width: 0; }
.ing-dishes { font-size: 12px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ing-users { font-size: 11px; color: #94a3b8; margin-top: 2px; }
</style>
