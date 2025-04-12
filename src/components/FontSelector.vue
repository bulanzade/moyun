<script setup lang="ts">
import { ref, onMounted, defineEmits } from 'vue';

const emit = defineEmits(['fontSelected']);

// 预定义的常用中文字体
const commonFonts = [
  '楷体, KaiTi, STKaiti', 
  '宋体, SimSun, STSong', 
  '黑体, SimHei, STHeiti', 
  '仿宋, FangSong, STFangsong',
  '华文楷体, STKaiti',
  '华文宋体, STSong',
  '华文黑体, STHeiti',
  '华文仿宋, STFangsong'
];

const detectedFonts = ref<string[]>([]);
const availableFonts = ref<string[]>([]);
const selectedFont = ref('楷体, KaiTi, STKaiti');
const isLoading = ref(false);
const showScanButton = ref(true);
const scanMessage = ref('');

// 检测字体是否可用
const detectFont = async (fontName: string) => {
  try {
    // 使用FontFace对象来检查字体是否存在
    const testFont = new FontFace('__test__', `local("${fontName}")`);
    try {
      await testFont.load();
      return true;
    } catch (e) {
      return false;
    }
  } catch (e) {
    // 回退方法，使用比较字符串宽度的方法
    const testString = '田字格米字格';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;
    
    // 使用一个不太可能存在的字体作为控制组
    context.font = `12px 'unlikely-font-name-xxxx'`;
    const fallbackWidth = context.measureText(testString).width;
    
    // 测试目标字体
    context.font = `12px '${fontName}'`;
    const testWidth = context.measureText(testString).width;
    
    // 如果宽度不同，说明字体可用
    return fallbackWidth !== testWidth;
  }
};

// 检测所有字体
const detectAllFonts = async () => {
  isLoading.value = true;
  scanMessage.value = '';
  const fontResults: string[] = [];
  
  // 检测预定义字体
  for (const fontStr of commonFonts) {
    // 提取fontStr中的第一个字体名称
    const fontName = fontStr.split(',')[0].trim();
    const isAvailable = await detectFont(fontName);
    if (isAvailable) {
      fontResults.push(fontStr);
    }
  }
  
  availableFonts.value = fontResults;
  isLoading.value = false;
};

// 扫描本地系统字体
const scanSystemFonts = async () => {
  isLoading.value = true;
  scanMessage.value = '正在扫描本地字体...';
  
  // 如果支持Font API，尝试获取系统字体
  if ('queryLocalFonts' in window) {
    try {
      // @ts-ignore - TypeScript可能不认识这个API
      const fonts = await window.queryLocalFonts();
      const uniqueFonts = new Set<string>();
      
      // 不过滤字体，添加所有系统字体
      fonts.forEach((font: any) => {
        uniqueFonts.add(font.family);
      });
      
      // 转换为数组并添加到检测到的字体中
      const additionalFonts = Array.from(uniqueFonts).filter(
        font => !availableFonts.value.some(f => f.includes(font))
      );
      
      if (additionalFonts.length > 0) {
        availableFonts.value = [...availableFonts.value, ...additionalFonts];
        detectedFonts.value = [...additionalFonts];
        scanMessage.value = `找到${additionalFonts.length}个本地字体`;
      } else {
        scanMessage.value = '没有找到额外的字体';
      }
      
      showScanButton.value = false;
    } catch (error) {
      console.error('获取系统字体失败:', error);
      scanMessage.value = '获取系统字体失败，可能需要在浏览器设置中允许网站访问字体';
    }
  } else {
    scanMessage.value = '您的浏览器不支持字体API，无法检测系统字体';
  }
  
  isLoading.value = false;
};

// 选择字体
const handleSelectFont = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  selectedFont.value = target.value;
  emit('fontSelected', target.value);
};

// 组件挂载时只检测预定义字体
onMounted(() => {
  detectAllFonts();
});
</script>

<template>
  <div class="font-selector">
    <div class="font-selector-row">
      <label for="font-select">选择字体:</label>
      <select 
        id="font-select" 
        v-model="selectedFont"
        @change="handleSelectFont"
        :disabled="isLoading"
      >
        <option v-if="isLoading && availableFonts.length === 0" value="">加载中...</option>
        <option v-for="font in availableFonts" :key="font" :value="font" :style="{ fontFamily: font }">
          {{ font.split(',')[0] }}
        </option>
      </select>
      <div v-if="isLoading" class="loading-spinner"></div>
    </div>
    
    <div class="font-actions" v-if="showScanButton">
      <button @click="scanSystemFonts" :disabled="isLoading" class="scan-button">
        扫描本地字体
      </button>
      <span v-if="scanMessage" class="scan-message">{{ scanMessage }}</span>
    </div>
    <div v-else-if="scanMessage" class="scan-message">{{ scanMessage }}</div>
  </div>
</template>

<style scoped>
.font-selector {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.font-selector-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  width: 200px;
  font-size: 14px;
}

label {
  font-weight: bold;
  min-width: 80px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.font-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 90px;
}

.scan-button {
  padding: 5px 10px;
  border-radius: 4px;
  background-color: #1e8449;
  color: white;
  cursor: pointer;
  border: none;
  font-size: 14px;
}

.scan-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.scan-message {
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 对下拉列表中的字体进行样式设置 */
select option {
  padding: 5px;
  font-size: 16px;
}
</style> 