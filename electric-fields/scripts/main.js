// 页面初始化逻辑（绑定事件、调用绘制函数）

let canvas, ctx;
let charges = [];
let currentTool = 'addCharge'; // 默认工具
let selectedCharge = null;
let isDragging = false;
let crosshairElement;
let loadingOverlay;
let currentChargeValue = 1.0; // 当前电荷值
let viewSettings = {
    showFieldLines: true,
    showEquipotentials: false,
    showVectors: false
};
let nextChargeId = 1; // 电荷ID计数器

// 画布缩放和平移状态
let scale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// 属性面板相关
let selectedChargeForProperties = null;

// 动态模拟状态
let isSimulationRunning = false;
let simulationTime = 0;

// 性能优化：缓存最后计算的电荷状态
let lastChargesHash = '';
let equipotentialCache = null;
let vectorCache = null;
let cacheValid = false;

// 使currentTool全局可用（用于ui.js）
window.currentTool = currentTool;
window.viewSettings = viewSettings;
window.charges = charges;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('simulation-canvas');
    ctx = canvas.getContext('2d');
    crosshairElement = document.getElementById('crosshair');
    loadingOverlay = document.getElementById('loading-overlay');
    
    // 设置canvas大小
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 绑定工具按钮
    bindToolButtons();
    
    // 监听清除电荷事件
    window.addEventListener('clearCharges', () => {
        charges = [];
        // 触发电荷更新事件
        window.dispatchEvent(new CustomEvent('chargeUpdated'));
    });
    
    // 绑定预设场景加载按钮
    document.getElementById('btn-load-preset').addEventListener('click', () => {
        showLoading();
        setTimeout(() => {
            const presetName = document.getElementById('preset-selector').value;
            loadPreset(presetName, (newCharges) => {
                charges = newCharges;
                // 触发电荷更新事件
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('chargeUpdated'));
                }, 0);
            });
            hideLoading();
        }, 300); // 模拟加载时间
    });
    
    // 绑定电荷滑块
    const chargeSlider = document.getElementById('charge-slider');
    chargeSlider.addEventListener('input', () => {
        currentChargeValue = parseFloat(chargeSlider.value);
        document.getElementById('charge-value').textContent = 
            currentChargeValue >= 0 ? `+${currentChargeValue.toFixed(1)}` : `${currentChargeValue.toFixed(1)}`;
    });
    
    // 绑定视图控制开关
    document.getElementById('show-field-lines').addEventListener('change', (e) => {
        viewSettings.showFieldLines = e.target.checked;
    });
    
    document.getElementById('show-equipotentials').addEventListener('change', (e) => {
        viewSettings.showEquipotentials = e.target.checked;
    });
    
    document.getElementById('show-vectors').addEventListener('change', (e) => {
        viewSettings.showVectors = e.target.checked;
    });
    
    // 绑定鼠标事件
    bindMouseEvents();
    
    // 绑定力计算事件
    bindForceCalculationEvents();
    
    // 绑定属性面板事件
    bindPropertiesPanelEvents();
    
    // 初始化按钮UI
    window.updateActiveButtonUI(currentTool);
    window.updateCrosshairVisibility();
    
    // 初始化电荷选择下拉菜单
    updateChargeSelectOptions();
    
    // 启动渲染循环
    mainLoop();
});

// 调整canvas大小
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

// 显示加载蒙层
function showLoading() {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
}

// 隐藏加载蒙层
function hideLoading() {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
}

// 更新准星可见性
function updateCrosshairVisibility() {
    if (window.currentTool === 'addCharge') {
        crosshairElement.classList.remove('hidden');
    } else {
        crosshairElement.classList.add('hidden');
    }
}

// 更新准星样式以适应缩放
function updateCrosshairScale() {
    if (crosshairElement) {
        crosshairElement.style.transform = `scale(${1/scale})`;
    }
}

// 绑定鼠标事件
function bindMouseEvents() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('contextmenu', handleContextMenu);
    
    // 鼠标进入和离开事件，用于准星显示
    canvas.addEventListener('mouseenter', () => {
        updateCrosshairVisibility();
    });
    
    canvas.addEventListener('mouseleave', () => {
        crosshairElement.classList.add('hidden');
    });
}

// 鼠标滚轮事件处理（缩放）
function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算相对于画布中心的偏移
    const worldMouseX = (mouseX - offsetX) / scale;
    const worldMouseY = (mouseY - offsetY) / scale;
    
    // 缩放因子
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5.0, scale * zoomFactor));
    
    // 保持鼠标位置不变
    offsetX = mouseX - worldMouseX * newScale;
    offsetY = mouseY - worldMouseY * newScale;
    scale = newScale;
}

// 右键菜单事件处理
function handleContextMenu(e) {
    // 暂时禁用默认右键菜单
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // 转换为世界坐标
    const worldX = (mx - offsetX) / scale;
    const worldY = (my - offsetY) / scale;
    
    // 检查是否点击了电荷
    let clickedCharge = null;
    for (let i = charges.length - 1; i >= 0; i--) {
        const charge = charges[i];
        const displayRadius = getDisplayRadius(charge.q);
        if (distance(worldX, worldY, charge.x, charge.y) <= displayRadius) {
            clickedCharge = charge;
            break;
        }
    }
    
    if (clickedCharge) {
        // 显示电荷右键菜单（后续实现）
        showChargeContextMenu(clickedCharge, e.clientX, e.clientY);
    } else {
        // 显示画布右键菜单（平移等）
        showCanvasContextMenu(e.clientX, e.clientY);
    }
}

// 屏幕坐标转世界坐标
function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / scale
    };
}

// 世界坐标转屏幕坐标
function worldToScreen(worldX, worldY) {
    return {
        x: worldX * scale + offsetX,
        y: worldY * scale + offsetY
    };
}

// 鼠标按下事件处理
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // 检查是否按住Ctrl键进行平移
    if (e.ctrlKey || e.button === 1) { // Ctrl+左键 或 鼠标中键
        isPanning = true;
        panStartX = screenX;
        panStartY = screenY;
        canvas.style.cursor = 'grabbing';
        return;
    }
    
    const worldPos = screenToWorld(screenX, screenY);
    const worldX = worldPos.x;
    const worldY = worldPos.y;
    
    // 首先检查是否点中了某个电荷（优先级最高）
    for (let i = charges.length - 1; i >= 0; i--) {
        const charge = charges[i];
        const displayRadius = getDisplayRadius(charge.q);
        if (distance(worldX, worldY, charge.x, charge.y) <= displayRadius) {
            // 如果是右键点击，显示属性面板
            if (e.button === 2) {
                selectedChargeForProperties = charge;
                showPropertiesPanel(charge);
                e.preventDefault();
                return;
            }
            
            // 总是允许拖拽电荷，无论当前工具状态
            selectedCharge = charge;
            isDragging = true;
            // 隐藏准星
            crosshairElement.classList.add('hidden');
            return;
        }
    }
    
    // 如果没有点中电荷，则根据当前工具添加新电荷
    if (window.currentTool === 'addCharge' && !isDragging) {
        const newCharge = {
            id: nextChargeId++,
            number: nextChargeId - 1,
            x: worldX,
            y: worldY,
            q: currentChargeValue,
            vx: 0, // x方向速度
            vy: 0, // y方向速度
            fixed: false // 是否固定位置
        };
        charges.push(newCharge);
        // 触发电荷更新事件
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chargeUpdated'));
        }, 0);
    }
}

// 鼠标移动事件处理
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // 更新准星位置
    crosshairElement.style.left = (screenX - 12) + 'px';
    crosshairElement.style.top = (screenY - 12) + 'px';
    updateCrosshairScale();
    
    if (isPanning) {
        // 平移画布
        const deltaX = screenX - panStartX;
        const deltaY = screenY - panStartY;
        offsetX += deltaX;
        offsetY += deltaY;
        panStartX = screenX;
        panStartY = screenY;
        return;
    }
    
    if (isDragging && selectedCharge) {
        const worldPos = screenToWorld(screenX, screenY);
        selectedCharge.x = worldPos.x;
        selectedCharge.y = worldPos.y;
    }
}

// 鼠标抬起事件处理
function handleMouseUp() {
    isDragging = false;
    isPanning = false;
    selectedCharge = null;
    canvas.style.cursor = 'default';
    // 恢复准星显示（如果处于添加模式）
    updateCrosshairVisibility();
}

// 计算电荷受力
function calculateForces(charges) {
    for (let i = 0; i < charges.length; i++) {
        const charge1 = charges[i];
        if (charge1.fixed) continue;
        
        let fx = 0, fy = 0;
        
        for (let j = 0; j < charges.length; j++) {
            if (i === j) continue;
            const charge2 = charges[j];
            
            const dx = charge1.x - charge2.x;
            const dy = charge1.y - charge2.y;
            const rSquared = dx * dx + dy * dy;
            
            if (rSquared === 0) continue;
            
            const r = Math.sqrt(rSquared);
            const cmDistance = r / PIXELS_PER_CM;
            
            // 如果距离太近，跳过计算（非点电荷）
            if (cmDistance < MIN_DISTANCE_FOR_POINT_CHARGE) continue;
            
            // 库仑力大小
            const forceMagnitude = COULOMB_CONSTANT * Math.abs(charge1.q * charge2.q) / (r * r * PIXELS_PER_CM * PIXELS_PER_CM / 10000);
            
            // 力的方向
            const unitX = dx / r;
            const unitY = dy / r;
            
            // 同性相斥，异性相吸
            const direction = (charge1.q * charge2.q > 0) ? 1 : -1;
            
            fx += direction * forceMagnitude * unitX;
            fy += direction * forceMagnitude * unitY;
        }
        
        // 计算加速度 a = F/m
        const ax = fx / MASS;
        const ay = fy / MASS;
        
        // 更新速度 v = v + a * dt
        charge1.vx += ax * TIME_STEP;
        charge1.vy += ay * TIME_STEP;
        
        // 应用阻尼
        charge1.vx *= DAMPING;
        charge1.vy *= DAMPING;
    }
}

// 更新电荷位置
function updateChargesPosition(charges) {
    for (const charge of charges) {
        if (charge.fixed) continue;
        charge.x += charge.vx * TIME_STEP * PIXELS_PER_CM * 100; // 转换为像素
        charge.y += charge.vy * TIME_STEP * PIXELS_PER_CM * 100;
    }
}

// 主渲染循环
function mainLoop() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果模拟运行中，更新物理状态
    if (isSimulationRunning) {
        calculateForces(charges);
        updateChargesPosition(charges);
        simulationTime += TIME_STEP;
    }
    
    // 应用缩放和平移变换
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // 检查是否需要更新缓存
    const currentHash = getChargesHash(charges);
    if (currentHash !== lastChargesHash) {
        lastChargesHash = currentHash;
        cacheValid = false;
        equipotentialCache = null;
        vectorCache = null;
    }
    
    // 根据视图设置绘制不同元素
    if (viewSettings.showFieldLines) {
        drawFieldLines(ctx, charges, canvas.width / scale, canvas.height / scale);
    }
    
    if (viewSettings.showEquipotentials) {
        if (!cacheValid || !equipotentialCache) {
            // 这里可以考虑异步计算以避免阻塞UI
            drawEquipotentials(ctx, charges, canvas.width / scale, canvas.height / scale);
        } else {
            // 使用缓存（如果实现了）
            drawEquipotentials(ctx, charges, canvas.width / scale, canvas.height / scale);
        }
    }
    
    if (viewSettings.showVectors) {
        if (!cacheValid || !vectorCache) {
            drawFieldVectors(ctx, charges, canvas.width / scale, canvas.height / scale);
        } else {
            // 使用缓存（如果实现了）
            drawFieldVectors(ctx, charges, canvas.width / scale, canvas.height / scale);
        }
    }
    
    // 绘制电荷（始终显示）
    drawCharges(ctx, charges);
    
    cacheValid = true;
    
    // 恢复变换
    ctx.restore();
    
    // 请求下一帧
    requestAnimationFrame(mainLoop);
}

// 更新力计算显示
function updateForceCalculationDisplay() {
    const forceResultElement = document.getElementById('force-result');
    const warningElement = document.getElementById('warning-message');
    
    if (!forceResultElement || !warningElement) return;
    
    if (selectedChargesForForce.length < 2) {
        forceResultElement.innerHTML = '<div class="text-center text-gray-500 text-sm">请选择两个电荷</div>';
        warningElement.classList.add('hidden');
        return;
    }
    
    const charge1 = selectedChargesForForce[0];
    const charge2 = selectedChargesForForce[1];
    
    const forceResult = calculateCoulombForce(charge1, charge2);
    
    if (!forceResult.isPointChargeValid) {
        forceResultElement.innerHTML = `
            <div class="space-y-2">
                <div><span class="text-gray-400">电荷1:</span> <span class="text-neoncyan">${charge1.q > 0 ? '+' : ''}${charge1.q}C</span></div>
                <div><span class="text-gray-400">电荷2:</span> <span class="text-deepspacepurple">${charge2.q > 0 ? '+' : ''}${charge2.q}C</span></div>
                <div><span class="text-gray-400">距离:</span> <span class="text-yellow-400">${forceResult.distanceCm.toFixed(2)} cm</span></div>
                <div><span class="text-gray-400">库仑力:</span> <span class="text-yellow-400">无法计算（非点电荷）</span></div>
            </div>
        `;
        warningElement.classList.remove('hidden');
    } else {
        const forceFormatted = formatForce(forceResult.force);
        const forceType = (charge1.q * charge2.q > 0) ? '排斥力' : '吸引力';
        const color1 = charge1.q > 0 ? 'text-neoncyan' : 'text-deepspacepurple';
        const color2 = charge2.q > 0 ? 'text-neoncyan' : 'text-deepspacepurple';
        
        forceResultElement.innerHTML = `
            <div class="space-y-2">
                <div><span class="text-gray-400">电荷1:</span> <span class="${color1}">${charge1.q > 0 ? '+' : ''}${charge1.q}C</span></div>
                <div><span class="text-gray-400">电荷2:</span> <span class="${color2}">${charge2.q > 0 ? '+' : ''}${charge2.q}C</span></div>
                <div><span class="text-gray-400">距离:</span> <span class="text-white">${forceResult.distanceCm.toFixed(2)} cm</span></div>
                <div><span class="text-gray-400">库仑力:</span> <span class="text-fluorescent">${forceFormatted}</span></div>
                <div><span class="text-gray-400">力类型:</span> <span class="text-white">${forceType}</span></div>
            </div>
        `;
        warningElement.classList.add('hidden');
    }
}

// 更新电荷选择下拉菜单
function updateChargeSelectOptions() {
    const select1 = document.getElementById('charge-select-1');
    const select2 = document.getElementById('charge-select-2');
    
    if (!select1 || !select2) return;
    
    // 保存当前选择
    const current1 = select1.value;
    const current2 = select2.value;
    
    // 清空选项
    select1.innerHTML = '<option value="">选择电荷 1</option>';
    select2.innerHTML = '<option value="">选择电荷 2</option>';
    
    // 添加电荷选项
    charges.forEach(charge => {
        const option1 = document.createElement('option');
        option1.value = charge.id;
        option1.textContent = `#${charge.number} (${charge.q > 0 ? '+' : ''}${charge.q}C)`;
        select1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = charge.id;
        option2.textContent = `#${charge.number} (${charge.q > 0 ? '+' : ''}${charge.q}C)`;
        select2.appendChild(option2);
    });
    
    // 恢复之前的选择（如果仍然存在）
    if (charges.some(c => c.id == current1)) {
        select1.value = current1;
    }
    if (charges.some(c => c.id == current2)) {
        select2.value = current2;
    }
}

// 计算电荷数组的哈希值（用于缓存）
function getChargesHash(charges) {
    if (charges.length === 0) return 'empty';
    return charges.map(c => `${c.id}:${c.x.toFixed(1)}:${c.y.toFixed(1)}:${c.q.toFixed(3)}`).join('|');
}

// 显示电荷右键菜单
function showChargeContextMenu(charge, x, y) {
    // 临时使用属性面板代替右键菜单
    selectedChargeForProperties = charge;
    showPropertiesPanel(charge);
}

// 显示画布右键菜单
function showCanvasContextMenu(x, y) {
    // 画布右键菜单可以包含平移、缩放等选项
    console.log('Canvas context menu at', x, y);
}

// 显示属性面板
function showPropertiesPanel(charge) {
    const infoElement = document.getElementById('properties-info');
    const formElement = document.getElementById('properties-form');
    const numberElement = document.getElementById('charge-number');
    const quantityElement = document.getElementById('charge-quantity');
    const xElement = document.getElementById('charge-x');
    const yElement = document.getElementById('charge-y');
    
    if (!infoElement || !formElement || !numberElement || !quantityElement || !xElement || !yElement) {
        return;
    }
    
    // 显示电荷信息
    numberElement.textContent = `#${charge.number}`;
    quantityElement.value = charge.q;
    xElement.value = Math.round(charge.x);
    yElement.value = Math.round(charge.y);
    const fixedElement = document.getElementById('charge-fixed');
    if (fixedElement) {
        fixedElement.checked = charge.fixed || false;
    }
    
    infoElement.classList.add('hidden');
    formElement.classList.remove('hidden');
    
    // 显示属性面板
    const panel = document.getElementById('properties-panel');
    if (panel) {
        panel.style.display = 'block';
    }
}

// 更新属性面板显示
function updatePropertiesPanel() {
    if (selectedChargeForProperties) {
        const charge = charges.find(c => c.id === selectedChargeForProperties.id);
        if (charge) {
            showPropertiesPanel(charge);
        } else {
            hidePropertiesPanel();
        }
    }
}

// 导出画布为图片
function exportCanvasAsImage() {
    try {
        // 暂停模拟以获得清晰图像
        const wasRunning = isSimulationRunning;
        isSimulationRunning = false;
        
        // 确保所有内容都已渲染
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = 'electric-field-simulator.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // 恢复模拟状态
            isSimulationRunning = wasRunning;
        }, 100);
    } catch (error) {
        alert('导出图片失败：' + error.message);
    }
}

// 隐藏属性面板
function hidePropertiesPanel() {
    const infoElement = document.getElementById('properties-info');
    const formElement = document.getElementById('properties-form');
    
    if (infoElement && formElement) {
        infoElement.classList.remove('hidden');
        formElement.classList.add('hidden');
    }
    
    selectedChargeForProperties = null;
}

// 计算并显示库仑力
function calculateAndDisplayForce() {
    const select1 = document.getElementById('charge-select-1');
    const select2 = document.getElementById('charge-select-2');
    const forceResultElement = document.getElementById('force-result');
    const warningElement = document.getElementById('warning-message');
    
    if (!select1 || !select2 || !forceResultElement || !warningElement) return;
    
    const chargeId1 = select1.value;
    const chargeId2 = select2.value;
    
    if (!chargeId1 || !chargeId2 || chargeId1 === chargeId2) {
        forceResultElement.innerHTML = '<div class="text-center text-gray-500 text-sm">请选择两个不同的电荷</div>';
        warningElement.classList.add('hidden');
        return;
    }
    
    const charge1 = charges.find(c => c.id == chargeId1);
    const charge2 = charges.find(c => c.id == chargeId2);
    
    if (!charge1 || !charge2) {
        forceResultElement.innerHTML = '<div class="text-center text-gray-500 text-sm">电荷未找到</div>';
        warningElement.classList.add('hidden');
        return;
    }
    
    const forceResult = calculateCoulombForce(charge1, charge2);
    
    if (!forceResult.isPointChargeValid) {
        forceResultElement.innerHTML = `
            <div class="space-y-2">
                <div><span class="text-gray-400">电荷1:</span> <span class="text-neoncyan">#${charge1.number} (${charge1.q > 0 ? '+' : ''}${charge1.q}C)</span></div>
                <div><span class="text-gray-400">电荷2:</span> <span class="text-deepspacepurple">#${charge2.number} (${charge2.q > 0 ? '+' : ''}${charge2.q}C)</span></div>
                <div><span class="text-gray-400">距离:</span> <span class="text-yellow-400">${forceResult.distanceCm.toFixed(2)} cm</span></div>
                <div><span class="text-gray-400">库仑力:</span> <span class="text-yellow-400">无法计算（非点电荷）</span></div>
            </div>
        `;
        warningElement.classList.remove('hidden');
    } else {
        const forceFormatted = formatForce(forceResult.force);
        const forceType = (charge1.q * charge2.q > 0) ? '排斥力' : '吸引力';
        const color1 = charge1.q > 0 ? 'text-neoncyan' : 'text-deepspacepurple';
        const color2 = charge2.q > 0 ? 'text-neoncyan' : 'text-deepspacepurple';
        
        forceResultElement.innerHTML = `
            <div class="space-y-2">
                <div><span class="text-gray-400">电荷1:</span> <span class="${color1}">#${charge1.number} (${charge1.q > 0 ? '+' : ''}${charge1.q}C)</span></div>
                <div><span class="text-gray-400">电荷2:</span> <span class="${color2}">#${charge2.number} (${charge2.q > 0 ? '+' : ''}${charge2.q}C)</span></div>
                <div><span class="text-gray-400">距离:</span> <span class="text-white">${forceResult.distanceCm.toFixed(2)} cm</span></div>
                <div><span class="text-gray-400">库仑力:</span> <span class="text-fluorescent">${forceFormatted}</span></div>
                <div><span class="text-gray-400">力类型:</span> <span class="text-white">${forceType}</span></div>
            </div>
        `;
        warningElement.classList.add('hidden');
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 绑定力计算按钮事件
function bindForceCalculationEvents() {
    const calculateBtn = document.getElementById('calculate-force-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateAndDisplayForce);
    }
    
    // 使用防抖更新下拉菜单当电荷发生变化
    const debouncedUpdate = debounce(updateChargeSelectOptions, 100);
    window.addEventListener('chargeUpdated', debouncedUpdate);
}

// 绑定属性面板事件
function bindPropertiesPanelEvents() {
    const applyBtn = document.getElementById('btn-apply-changes');
    const deleteBtn = document.getElementById('btn-delete-charge');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            if (selectedChargeForProperties) {
                const quantity = parseFloat(document.getElementById('charge-quantity').value);
                const x = parseFloat(document.getElementById('charge-x').value);
                const y = parseFloat(document.getElementById('charge-y').value);
                
                const charge = charges.find(c => c.id === selectedChargeForProperties.id);
                if (charge) {
                    charge.q = isNaN(quantity) ? charge.q : quantity;
                    charge.x = isNaN(x) ? charge.x : x;
                    charge.y = isNaN(y) ? charge.y : y;
                    const fixedElement = document.getElementById('charge-fixed');
                    charge.fixed = fixedElement ? fixedElement.checked : false;
                    window.dispatchEvent(new CustomEvent('chargeUpdated'));
                }
            }
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (selectedChargeForProperties && confirm('确定要删除这个电荷吗？')) {
                charges = charges.filter(c => c.id !== selectedChargeForProperties.id);
                hidePropertiesPanel();
                window.dispatchEvent(new CustomEvent('chargeUpdated'));
            }
        });
    }
}

// 全局函数
window.updateForceCalculationDisplay = updateForceCalculationDisplay;
window.updateChargeSelectOptions = updateChargeSelectOptions;
window.bindForceCalculationEvents = bindForceCalculationEvents;