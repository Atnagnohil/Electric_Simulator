// UI交互逻辑（滑块、按钮响应等）

// 更新激活按钮的UI
function updateActiveButtonUI(activeTool) {
    // 移除所有按钮的激活状态
    document.getElementById('btn-add-charge').classList.remove('tool-active');
    
    // 根据当前工具激活对应按钮
    if (activeTool === 'addCharge') {
        document.getElementById('btn-add-charge').classList.add('tool-active');
    }
}

// 全局函数供main.js调用
window.updateActiveButtonUI = updateActiveButtonUI;
window.updateCrosshairVisibility = updateCrosshairVisibility;

// 绑定工具按钮事件
function bindToolButtons() {
    document.getElementById('btn-add-charge').addEventListener('click', () => {
        // 切换添加电荷工具的激活状态
        if (window.currentTool === 'addCharge') {
            window.currentTool = null;
            document.getElementById('btn-add-charge').classList.remove('tool-active');
        } else {
            window.currentTool = 'addCharge';
            document.getElementById('btn-add-charge').classList.add('tool-active');
        }
        updateCrosshairVisibility();
    });
    
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('确定要清除所有电荷吗？')) {
            // 这个操作将在main.js中处理
            window.dispatchEvent(new CustomEvent('clearCharges'));
        }
    });
    
    // 缩放按钮
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        scale = Math.min(5.0, scale * 1.2);
    });
    
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        scale = Math.max(0.1, scale * 0.8);
    });
    
    document.getElementById('btn-reset-view').addEventListener('click', () => {
        scale = 1.0;
        offsetX = 0;
        offsetY = 0;
    });
    
    // 模拟控制按钮
    const toggleSimBtn = document.getElementById('btn-toggle-simulation');
    if (toggleSimBtn) {
        toggleSimBtn.addEventListener('click', () => {
            isSimulationRunning = !isSimulationRunning;
            toggleSimBtn.innerHTML = isSimulationRunning ? 
                '<i class="fas fa-pause mr-2"></i> 暂停模拟' : 
                '<i class="fas fa-play mr-2"></i> 开始模拟';
            toggleSimBtn.className = isSimulationRunning ? 
                'tool-btn w-full bg-red-600 text-white py-2.5 px-3 rounded-lg flex items-center justify-center font-medium' : 
                'tool-btn w-full bg-green-600 text-white py-2.5 px-3 rounded-lg flex items-center justify-center font-medium';
        });
    }
    
    // 导出图片按钮
    const exportBtn = document.getElementById('btn-export-image');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportCanvasAsImage();
        });
    }
}

// 加载预设场景
function loadPreset(presetName, setCharges) {
    if (!presetName) return;
    
    // 这里在实际应用中应该从presets.json文件中加载
    // 为了简化，我们直接在代码中定义预设
    const presets = {
        dipole: [
            {x: 300, y: 200, q: 1.0},
            {x: 500, y: 200, q: -1.0}
        ],
        quadrupole: [
            {x: 250, y: 150, q: 1.0},
            {x: 350, y: 150, q: -1.0},
            {x: 250, y: 250, q: -1.0},
            {x: 350, y: 250, q: 1.0}
        ],
        line: [
            {x: 200, y: 200, q: 1.0},
            {x: 300, y: 200, q: 1.0},
            {x: 400, y: 200, q: 1.0},
            {x: 500, y: 200, q: 1.0},
            {x: 600, y: 200, q: 1.0}
        ],
        capacitor: [
            // 平行板电容器 - 正极板
            {x: 200, y: 150, q: 1.0},
            {x: 250, y: 150, q: 1.0},
            {x: 300, y: 150, q: 1.0},
            {x: 350, y: 150, q: 1.0},
            {x: 400, y: 150, q: 1.0},
            {x: 450, y: 150, q: 1.0},
            {x: 500, y: 150, q: 1.0},
            {x: 550, y: 150, q: 1.0},
            // 平行板电容器 - 负极板
            {x: 200, y: 250, q: -1.0},
            {x: 250, y: 250, q: -1.0},
            {x: 300, y: 250, q: -1.0},
            {x: 350, y: 250, q: -1.0},
            {x: 400, y: 250, q: -1.0},
            {x: 450, y: 250, q: -1.0},
            {x: 500, y: 250, q: -1.0},
            {x: 550, y: 250, q: -1.0}
        ],
        single: [
            {x: 400, y: 200, q: 1.0}
        ],
        same_sign: [
            {x: 300, y: 200, q: 1.0},
            {x: 500, y: 200, q: 1.0}
        ]
    };
    
    if (presets[presetName]) {
        const presetCharges = presets[presetName].map((charge, index) => ({
            id: nextChargeId++,
            number: nextChargeId - 1,
            x: charge.x,
            y: charge.y,
            q: charge.q,
            vx: 0,
            vy: 0,
            fixed: false
        }));
        setCharges(presetCharges);
    }
}