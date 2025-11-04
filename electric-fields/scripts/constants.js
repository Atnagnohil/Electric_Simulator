// 全局常量定义
const POSITIVE_COLOR = '#00f5d4';  // 霓虹青 - 正电荷
const NEGATIVE_COLOR = '#6c63ff';  // 深空紫 - 负电荷
const POSITIVE_FIELD_LINE_COLOR = '#00d8ff'; // 荧光蓝 - 正电荷电场线
const NEGATIVE_FIELD_LINE_COLOR = '#00d8ff';  // 荧光蓝 - 负电荷电场线
const EQUIPOTENTIAL_COLOR = '#ff6b6b'; // 等势面颜色 - 珊瑚红
const VECTOR_FIELD_COLOR = '#4ecdc4'; // 矢量场颜色 - 青绿色
const BASE_CHARGE_RADIUS = 8; // 基础电荷半径
const MAX_CHARGE_RADIUS = 25; // 最大电荷半径
const MIN_CHARGE_RADIUS = 5;  // 最小电荷半径
const MAX_CHARGE_MAGNITUDE = 10; // 最大电荷量（用于映射）
const FIELD_LINE_COUNT = 16;
const FIELD_LINE_LENGTH = 200;
const STEP_SIZE = 2;
const K = 1; // 库仑常数（简化为1）
const EQUIPOTENTIAL_RESOLUTION = 50; // 等势面网格分辨率
const VECTOR_SPACING = 40; // 矢量场间距
const VECTOR_SCALE = 0.5; // 矢量缩放因子

// 物理常量和转换因子
const PIXELS_PER_CM = 20; // 20像素 = 1厘米
const COULOMB_CONSTANT = 8.9875517923e9; // 库仑常数 k = 8.99×10^9 N·m²/C²
const MIN_DISTANCE_FOR_POINT_CHARGE = 2; // 最小距离（厘米），小于这个距离不能视为点电荷

// 动态模拟常量
const MASS = 1e-3; // 电荷质量 (kg)，假设为1克
const DAMPING = 0.98; // 阻尼系数，模拟空气阻力
const TIME_STEP = 0.016; // 时间步长 (秒)，约60fps

// 根据电荷量计算显示半径
function getDisplayRadius(chargeMagnitude) {
    // 使用对数映射使大小变化更自然
    const magnitude = Math.abs(chargeMagnitude);
    if (magnitude === 0) return MIN_CHARGE_RADIUS;
    
    // 对数映射：小电荷量变化更敏感，大电荷量变化平缓
    const logMagnitude = Math.log10(magnitude + 1);
    const logMax = Math.log10(MAX_CHARGE_MAGNITUDE + 1);
    const normalized = Math.min(logMagnitude / logMax, 1);
    
    // 线性插值在最小和最大半径之间
    return MIN_CHARGE_RADIUS + (MAX_CHARGE_RADIUS - MIN_CHARGE_RADIUS) * normalized;
}

// 计算电势（标量场）
function calculatePotential(charges, x, y) {
    let potential = 0;
    for (const charge of charges) {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        
        // 避免除零错误
        if (r === 0) continue;
        
        // 电势公式: V = k*q/r
        potential += K * charge.q / r;
    }
    return potential;
}