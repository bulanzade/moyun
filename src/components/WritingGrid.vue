<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  gridType: {
    type: String,
    default: '田字格'
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
  highQualityPrint: {
    type: Boolean,
    default: true
  },
  displayMode: {
    type: String,
    default: 'single-char-per-line' // 'single-char-per-line' 或 'multi-chars-per-line'
  },
  darkCharCount: {
    type: Number,
    default: 1 // 一行多字模式下每个字符的深色字符数量
  },
  lightCharCount: {
    type: Number,
    default: 1 // 一行多字模式下每个字符的浅色字符数量
  },
  emptyGridCount: {
    type: Number,
    default: 0 // 一行多字模式下每个字符后的空白格数量
  },
  imageFormat: {
    type: String,
    default: 'png' // 导出图片格式
  },
  exportRequestId: {
    type: Number,
    default: 0 // 父组件递增该值触发一次图片导出
  }
});

// A4纸宽度（毫米）和边距
const A4_WIDTH_MM = 210;
const MARGIN_MM = 20; // 左右共留出20mm边距
const AVAILABLE_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM;

// 毫米转像素比例 (1 mm ≈ 3.78 px)
const MM_TO_PX = 3.78;

// 可用宽度（像素）
const availableWidthPx = computed(() => AVAILABLE_WIDTH_MM * MM_TO_PX);

// 根据每行格子数计算格子尺寸
const gridSize = computed(() => availableWidthPx.value / props.gridCount);

// 行间距
const lineHeight = computed(() => gridSize.value * 1.2);

// 每行字数固定为用户选择的值
const charsPerLine = computed(() => props.gridCount);

// 每页行数 (A4纸张大约可容纳的行数)
const rowsPerPage = computed(() => {
  const pageHeight = 277; // 可用高度(mm)，A4高297mm留出上下边距
  const rowHeightInMm = lineHeight.value / MM_TO_PX;
  return Math.floor(pageHeight / rowHeightInMm);
});

// 文本输入防抖：避免每次按键都全量重建并重绘所有页面
const debouncedText = ref(props.text);
let textDebounceTimer: number | undefined;
watch(() => props.text, (value) => {
  window.clearTimeout(textDebounceTimer);
  textDebounceTimer = window.setTimeout(() => {
    debouncedText.value = value;
  }, 250);
});
onUnmounted(() => window.clearTimeout(textDebounceTimer));

const cleanText = computed(() => debouncedText.value.replace(/\s+/g, ''));
const uniqueChars = computed(() => [...new Set(cleanText.value)]);
const charsPerGroup = computed(() => props.darkCharCount + props.lightCharCount + props.emptyGridCount);

// 每页的绘制内容：一字一行模式记录本页字符，一行多字模式记录本页的单元格范围
interface PageSpec {
  chars: string[];
  startCell: number;
  endCell: number;
  rows: number;
}

// 分页是纯计算，页面和canvas全部由模板渲染，不手动操作DOM
const pages = computed<PageSpec[]>(() => {
  if (cleanText.value.length === 0 || charsPerGroup.value === 0) return [];

  const result: PageSpec[] = [];
  if (props.displayMode === 'single-char-per-line') {
    const chars = uniqueChars.value;
    for (let start = 0; start < chars.length; start += rowsPerPage.value) {
      const pageChars = chars.slice(start, start + rowsPerPage.value);
      result.push({ chars: pageChars, startCell: 0, endCell: 0, rows: pageChars.length });
    }
  } else {
    const totalCells = cleanText.value.length * charsPerGroup.value;
    const cellsPerPage = rowsPerPage.value * charsPerLine.value;
    for (let start = 0; start < totalCells; start += cellsPerPage) {
      const end = Math.min(start + cellsPerPage, totalCells);
      result.push({
        chars: [],
        startCell: start,
        endCell: end,
        rows: Math.ceil((end - start) / charsPerLine.value)
      });
    }
  }
  return result;
});

// 使文字相对格子更大的系数（根据格子数自动调整）
const fontSizeMultiplier = computed(() => {
  if (props.gridCount >= 18) return 0.85;
  if (props.gridCount >= 15) return 0.9;
  if (props.gridCount >= 13) return 0.95;
  if (props.gridCount >= 10) return 1.0;
  return 1.1; // 格子少时使用较大的字体
});

// 自动计算的字体大小
const calculatedFontSize = computed(() => gridSize.value * 0.65 * fontSizeMultiplier.value);

const canvasRefs = ref<(HTMLCanvasElement | null)[]>([]);

function setCanvasRef(el: Element | ComponentPublicInstance | null, index: number) {
  canvasRefs.value[index] = el instanceof HTMLCanvasElement ? el : null;
}

// 首次挂载及任何影响分页或绘制样式的属性变化后统一重绘
watch(
  [
    pages,
    () => props.gridType,
    () => props.fontWeight,
    () => props.fontFamily,
    () => props.lightColor,
    () => props.borderColor,
    () => props.highQualityPrint
  ],
  () => {
    void nextTick(drawAllPages);
  },
  { immediate: true }
);

function drawAllPages() {
  for (let i = 0; i < pages.value.length; i++) {
    drawPage(i);
  }
}

// 绘制单个页面
function drawPage(pageIndex: number) {
  const canvas = canvasRefs.value[pageIndex];
  const spec = pages.value[pageIndex];
  if (!canvas || !spec) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cssWidth = availableWidthPx.value;
  const cssHeight = spec.rows * lineHeight.value;

  // 提高canvas分辨率以提升渲染质量
  const dpr = props.highQualityPrint ? (window.devicePixelRatio || 1) * 2 : (window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 设置canvas宽高会自动清空画布，这里填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.font = `${props.fontWeight} ${calculatedFontSize.value}px ${sanitizeFontFamilyForCanvas(props.fontFamily)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 页面外框，向内收缩半个线宽避免被裁剪
  ctx.strokeStyle = props.borderColor;
  ctx.lineWidth = props.highQualityPrint ? 1.2 : 1;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, cssWidth - ctx.lineWidth, cssHeight - ctx.lineWidth);

  const contentWidth = charsPerLine.value * gridSize.value;
  const offsetX = (cssWidth - contentWidth) / 2;

  if (props.displayMode === 'single-char-per-line') {
    drawSingleCharsPage(ctx, spec.chars, offsetX);
  } else {
    drawMultiCharsPage(ctx, spec.startCell, spec.endCell, offsetX);
  }
}

// 绘制一字一行模式：每个字符占一行，第一个字深色，其余浅色
function drawSingleCharsPage(ctx: CanvasRenderingContext2D, chars: string[], offsetX: number) {
  for (let rowIndex = 0; rowIndex < chars.length; rowIndex++) {
    const char = chars[rowIndex];
    for (let col = 0; col < charsPerLine.value; col++) {
      const x = offsetX + col * gridSize.value + gridSize.value / 2;
      const y = rowIndex * lineHeight.value + lineHeight.value / 2;
      drawGridCell(ctx, x, y);
      drawChar(ctx, char, x, y, col === 0);
    }
  }
}

// 绘制一行多字模式：按单元格范围绘制，允许字符组跨页
function drawMultiCharsPage(ctx: CanvasRenderingContext2D, startCell: number, endCell: number, offsetX: number) {
  let currentCol = 0;
  let currentRow = 0;

  for (let cellIndex = startCell; cellIndex < endCell; cellIndex++) {
    const charIndex = Math.floor(cellIndex / charsPerGroup.value);
    const innerIndex = cellIndex % charsPerGroup.value;
    const char = cleanText.value[charIndex];

    if (currentCol >= charsPerLine.value) {
      currentCol = 0;
      currentRow++;
    }

    const x = offsetX + currentCol * gridSize.value + gridSize.value / 2;
    const y = currentRow * lineHeight.value + lineHeight.value / 2;

    drawGridCell(ctx, x, y);

    if (innerIndex < props.darkCharCount) {
      drawChar(ctx, char, x, y, true);
    } else if (innerIndex < props.darkCharCount + props.lightCharCount) {
      drawChar(ctx, char, x, y, false);
    }
    // 其余为空白格：仅绘制格子

    currentCol++;
  }
}

// 绘制单个字：深色字在加粗或高质量模式下用描边增强清晰度，浅色字不加描边
function drawChar(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, dark: boolean) {
  if (dark) {
    ctx.fillStyle = '#000000';
    if (props.fontWeight === 'bold' || props.highQualityPrint) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.strokeText(char, x, y);
    }
  } else {
    ctx.fillStyle = props.lightColor;
  }

  // 高质量打印模式下多次绘制提高文字质量
  const iterations = props.highQualityPrint ? 2 : 1;
  for (let i = 0; i < iterations; i++) {
    ctx.fillText(char, x, y);
  }
}

// 绘制格子（田字格或米字格）
function drawGridCell(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const halfGrid = gridSize.value / 2;

  // 外框
  ctx.strokeStyle = props.borderColor;
  ctx.lineWidth = props.highQualityPrint ? 1.8 : 1.5;
  // 确保线条精确绘制在像素边界上，避免模糊
  const x1 = Math.floor(x - halfGrid) + 0.5;
  const y1 = Math.floor(y - halfGrid) + 0.5;
  const width = Math.floor(gridSize.value);
  const height = Math.floor(gridSize.value);
  ctx.strokeRect(x1, y1, width, height);

  // 内部辅助线：边框颜色降低透明度并使用虚线
  ctx.beginPath();
  ctx.strokeStyle = convertToRgba(props.borderColor, 0.5);
  ctx.setLineDash([3, 3]);

  // 横线
  ctx.moveTo(Math.floor(x1), Math.floor(y) + 0.5);
  ctx.lineTo(Math.floor(x1 + width), Math.floor(y) + 0.5);
  // 竖线
  ctx.moveTo(Math.floor(x) + 0.5, Math.floor(y1));
  ctx.lineTo(Math.floor(x) + 0.5, Math.floor(y1 + height));

  // 米字格增加对角线
  if (props.gridType === '米字格') {
    ctx.moveTo(Math.floor(x1), Math.floor(y1));
    ctx.lineTo(Math.floor(x1 + width), Math.floor(y1 + height));
    ctx.moveTo(Math.floor(x1 + width), Math.floor(y1));
    ctx.lineTo(Math.floor(x1), Math.floor(y1 + height));
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

// 将十六进制颜色转换为RGBA格式（支持3位与6位写法）
function convertToRgba(hex: string, alpha: number): string {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value.split('').map(c => c + c).join('');
  }
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 将 font-family 字符串转换为适用于 Canvas 的安全格式：
// 多词或含特殊字符的字体名用单引号包裹，避免 Canvas 解析失败回退到非预期字体，
// 导致字形或尺寸异常
function sanitizeFontFamilyForCanvas(fontFamily: string): string {
  return fontFamily
    .split(',')
    .map(part => {
      const name = part.trim().replace(/^["']|["']$/g, '');
      if (/\s/.test(name) || /[^a-zA-Z0-9\-]/.test(name)) {
        const escaped = name.replace(/'/g, "\\'");
        return `'${escaped}'`;
      }
      return name;
    })
    .join(', ');
}

// ---------- 导出图片 ----------

const isExporting = ref(false);
const exportMessage = ref('');

// 父组件递增 exportRequestId 触发导出
watch(() => props.exportRequestId, (id) => {
  if (id > 0) {
    void runExport();
  }
});

// 用1x1画布探测浏览器是否真正支持该图片格式（如Safari不支持WebP）
function supportsImageFormat(format: string): boolean {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  return probe.toDataURL(`image/${format}`).startsWith(`data:image/${format}`);
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${dateStr}_${timeStr}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

// 逐页导出为图片文件，避免把多页合并成一张超出浏览器画布上限的巨图
async function runExport() {
  if (isExporting.value) return;
  isExporting.value = true;
  exportMessage.value = '准备导出...';
  await nextTick();

  try {
    let format = props.imageFormat;
    if (!supportsImageFormat(format)) {
      format = 'png';
    }

    const canvases = canvasRefs.value
      .slice(0, pages.value.length)
      .filter((canvas): canvas is HTMLCanvasElement => canvas !== null);

    if (canvases.length === 0) {
      finishExport('没有可导出的内容');
      return;
    }

    const timestamp = formatTimestamp();
    for (let i = 0; i < canvases.length; i++) {
      if (canvases.length > 1) {
        exportMessage.value = `导出第 ${i + 1}/${canvases.length} 页...`;
        await nextTick();
      }
      const filename = canvases.length > 1 ? `字帖_${timestamp}_第${i + 1}页` : `字帖_${timestamp}`;
      await exportCanvasAsImage(canvases[i], filename, format);
      // 连续触发下载之间稍作间隔，避免被浏览器拦截
      if (i < canvases.length - 1) {
        await sleep(300);
      }
    }
    finishExport('导出成功！');
  } catch (error) {
    console.error('导出过程发生错误:', error);
    finishExport('导出失败，请稍后再试');
  }
}

function exportCanvasAsImage(canvas: HTMLCanvasElement, filename: string, format: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('生成图片数据失败'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      resolve();
    }, `image/${format}`, 1.0);
  });
}

function finishExport(message: string) {
  exportMessage.value = message;
  window.setTimeout(() => {
    isExporting.value = false;
    exportMessage.value = '';
  }, 2000);
}
</script>

<template>
  <div class="writing-grid-container">
    <!-- 导出进度指示器 -->
    <div v-if="isExporting" class="export-overlay">
      <div class="export-progress">
        <div class="export-spinner"></div>
        <div class="export-message">{{ exportMessage }}</div>
      </div>
    </div>

    <!-- 空内容提示 -->
    <div v-if="pages.length === 0" class="empty-message">
      请输入要生成字帖的文字
    </div>

    <!-- 字帖页面 -->
    <div
      v-for="(page, index) in pages"
      :key="index"
      class="page"
      :class="{ 'page-break': index > 0 }"
    >
      <canvas
        class="writing-canvas"
        :ref="(el) => setCanvasRef(el, index)"
        :style="{ width: `${availableWidthPx}px`, height: `${page.rows * lineHeight}px` }"
      ></canvas>
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
