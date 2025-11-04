// 工具函数（数学计算、DOM操作）

// 计算两点之间的距离
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 标准化向量
function normalizeVector(vx, vy) {
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: vx / magnitude, y: vy / magnitude };
}

// 计算两个电荷之间的库仑力（返回牛顿）
function calculateCoulombForce(charge1, charge2) {
    const pixelDistance = distance(charge1.x, charge1.y, charge2.x, charge2.y);
    const cmDistance = pixelDistance / PIXELS_PER_CM;
    const meterDistance = cmDistance / 100; // 转换为米
    
    // 检查是否可以视为点电荷
    if (cmDistance < MIN_DISTANCE_FOR_POINT_CHARGE) {
        return {
            force: null,
            isPointChargeValid: false,
            distanceCm: cmDistance
        };
    }
    
    // 库仑定律: F = k * |q1 * q2| / r²
    const forceMagnitude = COULOMB_CONSTANT * Math.abs(charge1.q * charge2.q) / (meterDistance * meterDistance);
    
    // 确定力的方向（同性相斥，异性相吸）
    const dx = charge2.x - charge1.x;
    const dy = charge2.y - charge1.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    
    if (distancePixels === 0) {
        return { force: 0, isPointChargeValid: true, distanceCm: cmDistance };
    }
    
    const unitX = dx / distancePixels;
    const unitY = dy / distancePixels;
    
    // 如果电荷同号，力是排斥的（正方向）；如果异号，力是吸引的（负方向）
    const forceDirection = (charge1.q * charge2.q > 0) ? 1 : -1;
    
    return {
        force: forceMagnitude,
        isPointChargeValid: true,
        distanceCm: cmDistance,
        direction: {
            x: unitX * forceDirection,
            y: unitY * forceDirection
        }
    };
}

// 格式化力的显示（科学计数法）
function formatForce(force) {
    if (force === null) return "N/A";
    if (force === 0) return "0 N";
    if (Math.abs(force) < 1e-3 || Math.abs(force) >= 1e6) {
        return `${force.toExponential(2)} N`;
    } else {
        return `${force.toFixed(3)} N`;
    }
}