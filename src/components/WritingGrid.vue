<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  gridType: {
    type: String,
    default: '田字格'
  },
  fontSize: {
    type: Number,
    default: 40
  },
  fontWeight: {
    type: String,
    default: 'normal'
  },
  lightColor: {
    type: String,
    default: '#9e9e9e'
  },
  borderColor: {
    type: String,
    default: '#000000'
  },
  gridCount: {
    type: Number,
    default: 13
  },
  fontFamily: {
    type: String,
    default: '楷体, KaiTi, STKaiti'
  },
  printMode: {
    type: Boolean,
    default: false
  },
  highQualityPrint: {
    type: Boolean,
    default: true
  }
});

const canvasRef = ref<HTMLCanvasElement[]>([]);
const pageRefs = ref<HTMLDivElement[]>([]);
const canvasCtx = ref<(CanvasRenderingContext2D | null)[]>([]);

// A4纸宽度（毫米）和边距
const A4_WIDTH_MM = 210;
const MARGIN_MM = 20; // 左右各10mm边距
const AVAILABLE_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM;

// 毫米转像素比例 (1 mm ≈ 3.78 px)
const MM_TO_PX = 3.78;

// 可用宽度（像素）
const availableWidthPx = computed(() => AVAILABLE_WIDTH_MM * MM_TO_PX);

// 根据每行格子数计算格子尺寸
const gridSize = computed(() => {
  // 根据格子数和可用宽度计算每个格子的尺寸
  return availableWidthPx.value / props.gridCount;
});

// 行间距
const lineHeight = computed(() => gridSize.value * 1.2);

// 每行字数固定为用户选择的值
const charsPerLine = computed(() => props.gridCount);

// 每页行数 (A4纸张大约可容纳的行数)
const rowsPerPage = computed(() => {
  // A4页面高度约为297mm，留出上下边距（各10mm），计算可容纳行数
  const pageHeight = 277; // 可用高度(mm)
  // 将lineHeight值转换为mm
  const rowHeightInMm = lineHeight.value / MM_TO_PX;
  // 计算可容纳的行数
  return Math.floor(pageHeight / rowHeightInMm);
});

// 计算需要的页数
const totalPages = computed(() => {
  const uniqueChars = [...new Set(props.text.replace(/\s+/g, ''))];
  const pages = Math.ceil(uniqueChars.length / rowsPerPage.value);
  // 确保至少有一页
  return Math.max(1, pages);
});

// 使文字相对格子更大的系数（根据格子数自动调整）
const fontSizeMultiplier = computed(() => {
  // 格子越多，倍数越小，确保文字不会太小或太大
  if (props.gridCount >= 18) return 0.85;
  if (props.gridCount >= 15) return 0.9;
  if (props.gridCount >= 13) return 0.95;
  if (props.gridCount >= 10) return 1.0;
  return 1.1; // 格子少时使用较大的字体
});

// 自动计算的字体大小
const calculatedFontSize = computed(() => {
  // 增加字体大小系数，使文字更清晰
  const base = gridSize.value * 0.65 * fontSizeMultiplier.value;
  
  // 打印模式下略微增大字体，补偿打印时的缩小效果
  return props.printMode ? base * 1.1 : base;
});

// 根据是否为打印模式调整样式
const containerStyle = computed(() => {
  if (props.printMode) {
    return {
      padding: '0',
      margin: '0',
      width: '100%',
      maxWidth: 'none',
      background: 'none',
      boxShadow: 'none'
    };
  }
  return {};
});

const isExporting = ref(false); // 是否正在导出图片
const exportMessage = ref(''); // 导出进度消息

// 初始化Canvas
onMounted(() => {
  // 创建必要的页面和canvas
  createPages();
  
  // 绘制字帖
  drawAllPages();

  // 监听导出图片的事件
  const container = document.querySelector('.writing-grid-container');
  if (container) {
    container.addEventListener('export-image', handleExportImage);
  }
});

// 在组件卸载时移除事件监听
onUnmounted(() => {
  const container = document.querySelector('.writing-grid-container');
  if (container) {
    container.removeEventListener('export-image', handleExportImage);
  }
});

// 监听属性变化，重新绘制
watch(() => props.text, () => {
  createPages();
  drawAllPages();
});

watch(() => props.gridType, () => {
  drawAllPages();
});

watch(() => props.gridCount, () => {
  // 重新创建页面并绘制
  createPages();
  drawAllPages();
});

watch(() => props.fontWeight, () => {
  drawAllPages();
});

watch(() => props.fontFamily, () => {
  drawAllPages();
});

watch(() => props.lightColor, () => {
  drawAllPages();
});

watch(() => props.borderColor, () => {
  drawAllPages();
});

watch(() => props.highQualityPrint, () => {
  drawAllPages();
});

// 创建所需的页面和canvas
function createPages() {
  // 清空现有的引用
  canvasRef.value = [];
  canvasCtx.value = [];
  pageRefs.value = [];
  
  // 下一个tick再创建，确保DOM已更新
  setTimeout(() => {
    const pageContainer = document.querySelector('.writing-grid-container');
    if (!pageContainer) return;
    
    // 清空现有页面
    pageContainer.innerHTML = '';
    
    // 文本处理，去除多余空格和换行符，提取唯一字符
    const cleanText = props.text.replace(/\s+/g, '');
    const uniqueChars = [...new Set(cleanText)];
    
    // 如果没有字符，创建一个空页面
    if (uniqueChars.length === 0) {
      // 创建页面容器
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      pageContainer.appendChild(pageDiv);
      return;
    }
    
    // 计算每页显示的字符数量
    const charsPerPage = rowsPerPage.value;
    
    // 为每一页创建div和canvas
    for (let i = 0; i < totalPages.value; i++) {
      // 创建页面容器
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      if (i > 0) {
        pageDiv.classList.add('page-break');
      }
      
      // 计算该页应显示的字符数量
      const startIdx = i * charsPerPage;
      const endIdx = Math.min(startIdx + charsPerPage, uniqueChars.length);
      const pageCharsCount = endIdx - startIdx;
      
      // 如果这页没有字符，则不创建
      if (pageCharsCount <= 0) continue;
      
      // 创建canvas
      const canvas = document.createElement('canvas');
      canvas.className = 'writing-canvas';
      
      // 设置canvas的CSS尺寸
      const baseWidth = availableWidthPx.value;
      canvas.style.width = `${baseWidth}px`;
      
      // 估算高度
      const rowsForThisPage = endIdx - startIdx;
      const baseHeight = rowsForThisPage * lineHeight.value;
      canvas.style.height = `${baseHeight}px`;
      
      pageDiv.appendChild(canvas);
      
      // 将页面添加到容器
      pageContainer.appendChild(pageDiv);
      
      // 存储引用
      pageRefs.value.push(pageDiv);
      canvasRef.value.push(canvas);
      
      // 获取绘图上下文
      const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false 提高性能
      canvasCtx.value.push(ctx);
    }
    
    // 绘制所有页面
    drawAllPages();
  }, 0);
}

// 绘制所有页面
function drawAllPages() {
  // 文本处理，去除多余空格和换行符，提取唯一字符
  const cleanText = props.text.replace(/\s+/g, '');
  const uniqueChars = [...new Set(cleanText)];
  
  // 为每个页面绘制相应的内容
  for (let page = 0; page < totalPages.value; page++) {
    const startCharIndex = page * rowsPerPage.value;
    const endCharIndex = Math.min((page + 1) * rowsPerPage.value, uniqueChars.length);
    const charsForThisPage = uniqueChars.slice(startCharIndex, endCharIndex);
    
    drawPage(page, charsForThisPage);
  }
}

// 绘制单个页面
function drawPage(pageIndex: number, chars: string[]) {
  if (!canvasRef.value[pageIndex] || !canvasCtx.value[pageIndex]) return;
  
  const ctx = canvasCtx.value[pageIndex]!;
  const canvas = canvasRef.value[pageIndex];
  
  // 增加canvas的分辨率以提高渲染质量
  const dpr = props.highQualityPrint ? (window.devicePixelRatio || 1) * 2 : (window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  
  // 设置canvas尺寸为实际物理像素大小
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // 缩放上下文以匹配css尺寸
  ctx.scale(dpr, dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 设置背景色为白色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 设置字体抗锯齿和平滑度
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 设置字体 - 使用自动计算的字体大小和用户选择的字体
  ctx.font = `${props.fontWeight} ${calculatedFontSize.value}px ${props.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 添加边框 - 使用用户选择的边框颜色
  ctx.strokeStyle = props.borderColor;
  ctx.lineWidth = props.highQualityPrint ? 1.2 : 1;
  ctx.strokeRect(0, 0, rect.width, rect.height);
  
  // 计算内容区域的总宽度，并居中定位
  const contentWidth = charsPerLine.value * gridSize.value;
  const offsetX = (rect.width - contentWidth) / 2;
  
  // 循环绘制每个字符的一行
  for (let rowIndex = 0; rowIndex < chars.length; rowIndex++) {
    const char = chars[rowIndex];
    
    // 循环绘制这一行的所有字符
    for (let col = 0; col < charsPerLine.value; col++) {
      const x = offsetX + col * gridSize.value + gridSize.value / 2;
      const y = rowIndex * lineHeight.value + lineHeight.value / 2;
      
      // 绘制格子
      if (props.gridType === '田字格') {
        drawTianGrid(ctx, x, y);
      } else {
        drawMiGrid(ctx, x, y);
      }
      
      // 绘制文字 - 第一个字深色，其他浅色
      if (col === 0) {
        // 第一个字使用深黑色
        ctx.fillStyle = '#000000';
        
        // 提高文字渲染质量
        if (props.fontWeight === 'bold' || props.highQualityPrint) {
          // 对于加粗文字或高质量模式，使用描边方式增强清晰度
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.5;
          ctx.strokeText(char, x, y);
        }
        
        // 高质量打印模式下，多次绘制提高文字质量
        const iterations = props.highQualityPrint ? 2 : 1;
        for (let i = 0; i < iterations; i++) {
          ctx.fillText(char, x, y);
        }
      } else {
        // 其余字使用用户选择的浅色
        ctx.fillStyle = props.lightColor;
        ctx.fillText(char, x, y);
      }
    }
  }
}

// 绘制田字格
function drawTianGrid(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const halfGrid = gridSize.value / 2;
  
  // 绘制外框 - 使用用户选择的边框颜色
  ctx.strokeStyle = props.borderColor;
  ctx.lineWidth = props.highQualityPrint ? 1.8 : 1.5; // 高质量模式下线条更粗
  
  // 确保线条精确绘制在像素边界上，避免模糊
  const x1 = Math.floor(x - halfGrid) + 0.5;
  const y1 = Math.floor(y - halfGrid) + 0.5;
  const width = Math.floor(gridSize.value);
  const height = Math.floor(gridSize.value);
  
  ctx.strokeRect(x1, y1, width, height);
  
  // 绘制十字线 - 使用边框颜色但透明度降低
  ctx.beginPath();
  // 将选择的颜色转换为RGBA格式，增加透明度
  const borderColorRgba = convertToRgba(props.borderColor, 0.5);
  ctx.strokeStyle = borderColorRgba;
  ctx.setLineDash([3, 3]); // 调整虚线样式，使其更明显
  
  // 横线
  ctx.moveTo(Math.floor(x1), Math.floor(y) + 0.5);
  ctx.lineTo(Math.floor(x1 + width), Math.floor(y) + 0.5);
  // 竖线
  ctx.moveTo(Math.floor(x) + 0.5, Math.floor(y1));
  ctx.lineTo(Math.floor(x) + 0.5, Math.floor(y1 + height));
  ctx.stroke();
  
  // 重置虚线设置
  ctx.setLineDash([]);
}

// 绘制米字格
function drawMiGrid(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const halfGrid = gridSize.value / 2;
  
  // 绘制外框 - 使用用户选择的边框颜色
  ctx.strokeStyle = props.borderColor;
  ctx.lineWidth = props.highQualityPrint ? 1.8 : 1.5; // 高质量模式下线条更粗
  
  // 确保线条精确绘制在像素边界上，避免模糊
  const x1 = Math.floor(x - halfGrid) + 0.5;
  const y1 = Math.floor(y - halfGrid) + 0.5;
  const width = Math.floor(gridSize.value);
  const height = Math.floor(gridSize.value);
  
  ctx.strokeRect(x1, y1, width, height);
  
  // 绘制米字格线 - 使用边框颜色但透明度降低
  ctx.beginPath();
  // 将选择的颜色转换为RGBA格式，增加透明度
  const borderColorRgba = convertToRgba(props.borderColor, 0.5);
  ctx.strokeStyle = borderColorRgba;
  ctx.setLineDash([3, 3]); // 调整虚线样式，使其更明显
  
  // 横线
  ctx.moveTo(Math.floor(x1), Math.floor(y) + 0.5);
  ctx.lineTo(Math.floor(x1 + width), Math.floor(y) + 0.5);
  // 竖线
  ctx.moveTo(Math.floor(x) + 0.5, Math.floor(y1));
  ctx.lineTo(Math.floor(x) + 0.5, Math.floor(y1 + height));
  
  // 绘制对角线
  ctx.moveTo(Math.floor(x1), Math.floor(y1));
  ctx.lineTo(Math.floor(x1 + width), Math.floor(y1 + height));
  ctx.moveTo(Math.floor(x1 + width), Math.floor(y1));
  ctx.lineTo(Math.floor(x1), Math.floor(y1 + height));
  ctx.stroke();
  
  // 重置虚线设置
  ctx.setLineDash([]);
}

// 将十六进制颜色转换为RGBA格式
function convertToRgba(hex: string, alpha: number): string {
  // 移除#号（如果有）
  hex = hex.replace('#', '');
  
  // 解析RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 返回RGBA字符串
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 导出图片函数
function handleExportImage(event: Event) {
  // 设置导出状态
  isExporting.value = true;
  exportMessage.value = '准备导出...';
  
  // 使用setTimeout延迟执行，让UI有时间更新
  setTimeout(() => {
    // 获取格式参数
    let format = 'png'; // 默认格式
    
    if (event instanceof CustomEvent && event.detail) {
      if (event.detail.format) {
        format = event.detail.format;
      }
    }

    try {
      // 获取所有页面的数量
      const pages = document.querySelectorAll('.page');
      
      if (pages.length === 0) {
        exportMessage.value = '没有可导出的内容';
        setTimeout(() => {
          isExporting.value = false;
          exportMessage.value = '';
        }, 2000);
        return;
      }
      
      exportMessage.value = '处理图片中...';
      
      // 如果只有一页，直接导出
      if (pages.length === 1 && canvasRef.value.length > 0) {
        const canvas = canvasRef.value[0];
        if (canvas) {
          exportCanvasAsImage(canvas, '字帖', format);
        }
        return;
      }
      
      // 如果有多页，创建一个合并的画布
      exportMessage.value = '合并多个页面...';
      const mergeCanvas = document.createElement('canvas');
      const mergeCtx = mergeCanvas.getContext('2d');
      
      if (!mergeCtx) {
        exportMessage.value = '创建画布失败，请稍后再试';
        setTimeout(() => {
          isExporting.value = false;
          exportMessage.value = '';
        }, 2000);
        return;
      }
      
      // 计算合并画布的尺寸
      let totalHeight = 0;
      let maxWidth = 0;
      
      canvasRef.value.forEach(canvas => {
        if (canvas) {
          maxWidth = Math.max(maxWidth, canvas.width);
          totalHeight += canvas.height;
        }
      });
      
      // 设置合并画布的尺寸
      mergeCanvas.width = maxWidth;
      mergeCanvas.height = totalHeight;
      
      // 合并所有画布
      let currentY = 0;
      canvasRef.value.forEach((canvas, index) => {
        if (canvas) {
          exportMessage.value = `处理第 ${index+1}/${canvasRef.value.length} 页...`;
          mergeCtx.drawImage(canvas, 0, currentY);
          currentY += canvas.height;
        }
      });
      
      // 生成有意义的文件名（使用当前日期和时间）
      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)}${now.getDate() < 10 ? '0' + now.getDate() : now.getDate()}`;
      const timeStr = `${now.getHours() < 10 ? '0' + now.getHours() : now.getHours()}${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;
      const filename = `字帖_${dateStr}_${timeStr}`;
      
      exportMessage.value = '正在生成图片...';
      // 导出合并的画布
      exportCanvasAsImage(mergeCanvas, filename, format);
    } catch (error) {
      console.error('导出过程发生错误:', error);
      exportMessage.value = '导出失败，请稍后再试';
      setTimeout(() => {
        isExporting.value = false;
        exportMessage.value = '';
      }, 2000);
    }
  }, 100);
}

// 导出单个画布为图片
function exportCanvasAsImage(canvas: HTMLCanvasElement, filename: string, format: string) {
  try {
    exportMessage.value = '正在保存图片...';
    // 创建下载链接
    const link = document.createElement('a');
    
    // 将画布转换为图片URL
    const imgData = canvas.toDataURL(`image/${format}`, 1.0);
    
    // 设置下载属性
    link.download = `${filename}.${format}`;
    link.href = imgData;
    
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 导出成功
    exportMessage.value = '导出成功！';
    setTimeout(() => {
      isExporting.value = false;
      exportMessage.value = '';
    }, 2000);
  } catch (error) {
    console.error('导出图片失败:', error);
    exportMessage.value = '导出图片失败，请稍后再试';
    setTimeout(() => {
      isExporting.value = false;
      exportMessage.value = '';
    }, 2000);
  }
}
</script>

<template>
  <div class="writing-grid-container" :style="containerStyle">
    <!-- 进度指示器 -->
    <div v-if="isExporting" class="export-overlay">
      <div class="export-progress">
        <div class="export-spinner"></div>
        <div class="export-message">{{ exportMessage }}</div>
      </div>
    </div>
    
    <!-- 字帖内容 -->
    <div v-if="text.trim().length === 0" class="empty-message">
      请输入要生成字帖的文字
    </div>
  </div>
</template>

<style scoped>
.writing-grid-container {
  padding: 20px;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 800px;
  box-sizing: border-box;
}

.page {
  margin-bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.page-break {
  page-break-before: always;
  margin-top: 30px;
  position: relative;
}

.page-break::before {
  content: '';
  display: block;
  width: 100%;
  border-top: 1px dashed #ccc;
  position: absolute;
  top: -15px;
}

.writing-canvas {
  display: block;
  margin: 0 auto;
  border: 1px solid #eaeaea;
  image-rendering: -webkit-optimize-contrast; /* 提高Chrome中的渲染质量 */
  image-rendering: crisp-edges; /* 提高常规渲染质量 */
  -webkit-font-smoothing: antialiased; /* 改善字体渲染 */
  -moz-osx-font-smoothing: grayscale; /* 改善Firefox字体渲染 */
}

@media print {
  .writing-grid-container {
    padding: 0;
    margin: 0;
    box-shadow: none;
    width: 100%;
    max-width: none;
    background: none;
    border-radius: 0;
  }
  
  .page {
    margin: 0;
    padding: 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  .page-break {
    break-before: page;
    page-break-before: always;
    margin-top: 0;
  }
  
  .page-break::before {
    display: none;
  }
  
  .writing-canvas {
    border: none;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
    image-rendering: -webkit-optimize-contrast; /* 确保打印时也应用高质量渲染 */
    image-rendering: crisp-edges;
    print-color-adjust: exact; /* 确保打印时颜色准确 */
    -webkit-print-color-adjust: exact;
  }
  
  @page {
    margin: 0.5cm; /* 减少页边距，让内容更大 */
  }
}

/* 导出进度样式 */
.export-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.export-progress {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.export-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.export-message {
  font-size: 16px;
  font-weight: bold;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 