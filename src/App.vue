<script setup lang="ts">
import { ref } from 'vue';
import WritingGrid from './components/WritingGrid.vue';
import FontSelector from './components/FontSelector.vue';

const text = ref('');
const gridType = ref('田字格'); // 默认田字格, 可选'米字格'
const fontSize = ref(40); // 字体大小，单位px，调整为默认40px
const fontWeight = ref('normal'); // 字体粗细
const lightColor = ref('#9e9e9e'); // 浅色字体颜色
const showPrintButton = ref(false);
const gridCount = ref(13); // 每行格子数量，默认13个
const fontFamily = ref('楷体, KaiTi, STKaiti'); // 默认字体

// 每行格子数量选项
const gridCountOptions = [
  { label: '8个（大格）', value: 8 },
  { label: '10个（中格）', value: 10 },
  { label: '13个（标准）', value: 13 },
  { label: '15个（小格）', value: 15 },
  { label: '18个（细格）', value: 18 }
];

// 预设颜色
const colorOptions = [
  { name: '灰色', value: '#9e9e9e' },
  { name: '淡青', value: '#81d4fa' },
  { name: '淡绿', value: '#a5d6a7' },
  { name: '淡红', value: '#ef9a9a' }
];

// 预设文本
const presetTexts = {
  '静夜思': '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
  '春晓': '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
  '悯农': '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。'
};

function handleTextChange(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  text.value = target.value;
  showPrintButton.value = text.value.trim().length > 0;
}

function selectPresetText(key: string) {
  text.value = presetTexts[key as keyof typeof presetTexts];
  showPrintButton.value = text.value.trim().length > 0;
}

function handlePrint() {
  // 直接执行打印
  window.print();
}

function resetForm() {
  text.value = '';
  gridType.value = '田字格';
  fontSize.value = 40; // 重置为40px
  fontWeight.value = 'normal';
  lightColor.value = '#9e9e9e';
  gridCount.value = 13; // 重置为13格
  fontFamily.value = '楷体, KaiTi, STKaiti'; // 重置为默认字体
  showPrintButton.value = false;
}

function handleFontSelected(font: string) {
  fontFamily.value = font;
}
</script>

<template>
  <div class="container">
    <div class="app-container">
      <div class="settings-container">
        <h1>墨韵字帖</h1>
        
        <div class="controls">
          <div class="control-group">
            <label for="text-input">输入文字:</label>
            <textarea 
              id="text-input" 
              v-model="text" 
              @input="handleTextChange"
              placeholder="请输入要生成字帖的文字，每个不同的字将显示为独立的一行"
              rows="4"
            ></textarea>
          </div>
          
          <div class="control-group">
            <label>选择预设文本:</label>
            <div class="preset-buttons">
              <button 
                v-for="(content, name) in presetTexts" 
                :key="name"
                @click="selectPresetText(name)"
                class="preset-button"
              >
                {{ name }}
              </button>
            </div>
          </div>
          
          <div class="control-row">
            <div class="control-group">
              <label>选择格式:</label>
              <div class="radio-group">
                <label>
                  <input type="radio" v-model="gridType" value="田字格" />
                  田字格
                </label>
                <label>
                  <input type="radio" v-model="gridType" value="米字格" />
                  米字格
                </label>
              </div>
            </div>
            
            <div class="control-group">
              <label>每行格子数:</label>
              <div class="radio-group grid-count-options">
                <label v-for="option in gridCountOptions" :key="option.value">
                  <input type="radio" v-model="gridCount" :value="option.value" />
                  {{ option.label }}
                </label>
              </div>
            </div>
          </div>
          
          <div class="control-row">
            <div class="control-group">
              <label>字体样式:</label>
              <div class="radio-group">
                <label>
                  <input type="radio" v-model="fontWeight" value="normal" />
                  正常
                </label>
                <label>
                  <input type="radio" v-model="fontWeight" value="bold" />
                  加粗
                </label>
              </div>
            </div>
            
            <div class="control-group">
              <FontSelector @fontSelected="handleFontSelected" />
            </div>
          </div>
          
          <div class="control-row">
            <div class="control-group">
              <label>字体颜色:</label>
              <div class="color-options">
                <label 
                  v-for="color in colorOptions" 
                  :key="color.value"
                  class="color-option"
                >
                  <input 
                    type="radio" 
                    v-model="lightColor" 
                    :value="color.value" 
                  />
                  <span 
                    class="color-preview" 
                    :style="{ backgroundColor: color.value }"
                  ></span>
                  {{ color.name }}
                </label>
              </div>
            </div>
          </div>
          
          <div class="button-group">
            <button 
              class="print-button" 
              @click="handlePrint" 
              :disabled="!showPrintButton"
            >
              打印字帖
            </button>
            
            <button 
              class="reset-button" 
              @click="resetForm"
            >
              重置
            </button>
          </div>
        </div>
      </div>
      
      <div class="preview-container">
        <h2>预览</h2>
        <div class="preview">
          <WritingGrid 
            :text="text" 
            :gridType="gridType" 
            :fontSize="fontSize" 
            :fontWeight="fontWeight" 
            :lightColor="lightColor" 
            :gridCount="gridCount"
            :fontFamily="fontFamily"
            :printMode="false"
          />
        </div>
        <div class="preview-info">
          每行显示同一个字，第一个字为深色，其余为浅色。输入的每个不同汉字会单独占一行。
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --primary-color: #1e8449;
  --secondary-color: #a5d6a7;
  --text-color: #333;
  --bg-color: #f8f9fa;
  --control-bg: #eaf7ee;
  --border-color: #d4edda;
  --a4-width: 210mm; /* A4纸宽度 */
  --a4-height: 297mm; /* A4纸高度 */
}

/* 预览字体样式 */
@font-face {
  font-family: '楷体';
  src: local('KaiTi'), local('楷体'), local('楷体-GB2312');
}

@font-face {
  font-family: '宋体';
  src: local('SimSun'), local('宋体');
}

@font-face {
  font-family: '黑体';
  src: local('SimHei'), local('黑体');
}

@font-face {
  font-family: '仿宋';
  src: local('FangSong'), local('仿宋');
}

@font-face {
  font-family: '隶书';
  src: local('LiSu'), local('隶书');
}

.container {
  max-width: var(--a4-width);
  margin: 0 auto;
  padding: 20px;
  font-family: 'SimSun', '宋体', serif;
  color: var(--text-color);
}

h1, h2 {
  text-align: center;
  color: var(--primary-color);
}

h1 {
  margin-bottom: 30px;
  font-weight: bold;
}

h2 {
  margin: 20px 0;
}

.controls {
  background-color: var(--control-bg);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid var(--border-color);
}

.control-group {
  margin-bottom: 15px;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

label {
  display: inline-block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--primary-color);
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
  resize: vertical;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.grid-count-options {
  flex-wrap: wrap;
}

.radio-group label {
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-color);
}

.font-select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
  background-color: white;
}

.font-preview {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 20px;
  text-align: center;
  background-color: white;
}

.slider-group {
  display: flex;
  align-items: center;
}

input[type="range"] {
  width: 200px;
  margin-right: 10px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.print-button, .reset-button, .preset-button {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  border: none;
}

.print-button {
  background-color: var(--primary-color);
  color: white;
}

.print-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.reset-button {
  background-color: #f0f0f0;
  color: #666;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-button {
  background-color: var(--secondary-color);
  color: var(--primary-color);
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
  color: var(--text-color);
}

.color-preview {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

.preview-container {
  margin-top: 30px;
}

.preview {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: white;
  padding: 10px;
  width: var(--a4-width);
  margin: 0 auto;
  box-sizing: border-box;
}

.preview-info {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
  text-align: center;
}

@media print {
  body * {
    visibility: hidden;
  }
  
  .preview, .preview * {
    visibility: visible;
  }
  
  .preview {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    width: 100% !important;
    max-width: none !important;
    background: none !important;
    box-shadow: none !important;
  }
  
  .writing-canvas {
    page-break-inside: avoid;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
  }
  
  /* 确保页面在打印时居中 */
  @page {
    size: A4;
    margin: 1cm;
  }
}

@media (max-width: 768px) {
  .control-row {
    flex-direction: column;
    gap: 10px;
  }
  
  .preview {
    width: 100%;
    overflow-x: auto;
  }
}
</style>