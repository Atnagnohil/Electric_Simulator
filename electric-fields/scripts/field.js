// 处理电场线、点电荷计算与Canvas绘制

// 计算指定位置的电场向量
function calculateFieldVector(charges, x, y) {
    let Ex = 0;
    let Ey = 0;
    
    for (const charge of charges) {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const rSquared = dx * dx + dy * dy;
        
        // 避免除零错误
        if (rSquared === 0) continue;
        
        // 库仑定律: E = k*q/r^2
        const magnitude = K * charge.q / rSquared;
        const distance = Math.sqrt(rSquared);
        
        // 分解为x和y分量
        Ex += magnitude * (dx / distance);
        Ey += magnitude * (dy / distance);
    }
    
    return { vx: Ex, vy: Ey };
}

// 绘制电荷
function drawCharges(ctx, charges) {
    for (const charge of charges) {
        const displayRadius = getDisplayRadius(charge.q);
        
        // 绘制外圈光晕效果
        const gradient = ctx.createRadialGradient(
            charge.x, charge.y, 0,
            charge.x, charge.y, displayRadius * 3
        );
        
        if (charge.q > 0) {
            gradient.addColorStop(0, 'rgba(0, 245, 212, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 245, 212, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(108, 99, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(108, 99, 255, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(charge.x, charge.y, displayRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 绘制电荷主体
        ctx.beginPath();
        ctx.arc(charge.x, charge.y, displayRadius, 0, Math.PI * 2);
        
        // 添加金属光泽效果
        const chargeGradient = ctx.createRadialGradient(
            charge.x - displayRadius/3, charge.y - displayRadius/3, 1,
            charge.x, charge.y, displayRadius
        );
        
        if (charge.q > 0) {
            chargeGradient.addColorStop(0, '#66fff9'); // 亮青色
            chargeGradient.addColorStop(1, '#00f5d4'); // 霓虹青
        } else {
            chargeGradient.addColorStop(0, '#a39dff'); // 浅紫色
            chargeGradient.addColorStop(1, '#6c63ff'); // 深空紫
        }
        
        ctx.fillStyle = chargeGradient;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, displayRadius / 8); // 边框宽度随半径调整
        ctx.stroke();
        
        // 绘制电荷符号
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, displayRadius * 1.2)}px Inter, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charge.q > 0 ? '+' : '−', charge.x, charge.y);
        
        // 绘制电荷编号（小号，白色）
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(8, displayRadius * 0.6)}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`#${charge.number}`, charge.x, charge.y - displayRadius - 2);
        
        // 绘制电荷数值
        ctx.fillStyle = charge.q > 0 ? '#00f5d4' : '#6c63ff';
        ctx.font = `bold ${Math.max(10, displayRadius * 0.8)}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // 格式化电荷值，保留适当的小数位数
        let formattedValue;
        if (Math.abs(charge.q) % 1 === 0) {
            formattedValue = `${charge.q > 0 ? '+' : ''}${charge.q.toFixed(0)}`;
        } else if (Math.abs(charge.q) < 0.1) {
            formattedValue = `${charge.q > 0 ? '+' : ''}${charge.q.toExponential(1)}`;
        } else {
            formattedValue = `${charge.q > 0 ? '+' : ''}${charge.q.toFixed(1)}`;
        }
        ctx.fillText(`${formattedValue}C`, charge.x, charge.y + displayRadius + 5);
    }
}

// 绘制电场线
function drawFieldLines(ctx, charges, canvasWidth, canvasHeight) {
    // 从所有电荷开始绘制场线
    for (const charge of charges) {
        // 确定电场线颜色
        const fieldLineColor = '#00d8ff'; // 荧光蓝
        
        // 从电荷周围发出多条场线
        for (let i = 0; i < FIELD_LINE_COUNT; i++) {
            const displayRadius = getDisplayRadius(charge.q);
            const angle = (2 * Math.PI * i) / FIELD_LINE_COUNT;
            let x = charge.x + (displayRadius + 2) * Math.cos(angle);
            let y = charge.y + (displayRadius + 2) * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            // 沿着场线方向逐步绘制
            let points = [{x: x, y: y}]; // 存储点用于平滑处理
            
            for (let j = 0; j < FIELD_LINE_LENGTH; j++) {
                const field = calculateFieldVector(charges, x, y);
                const normalized = normalizeVector(field.vx, field.vy);
                
                // 如果场强为零，则停止绘制这条线
                if (normalized.x === 0 && normalized.y === 0) break;
                
                const dx = normalized.x * STEP_SIZE;
                const dy = normalized.y * STEP_SIZE;
                
                // 正电荷场线沿场强方向，负电荷场线沿场强反方向
                if (charge.q > 0) {
                    x += dx;
                    y += dy;
                } else {
                    x -= dx;
                    y -= dy;
                }
                
                // 如果超出画布边界则停止
                if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) break;
                
                // 检查是否接近相反类型的电荷
                let nearOpposite = false;
                for (const otherCharge of charges) {
                    if (otherCharge.q * charge.q < 0) {
                        const otherDisplayRadius = getDisplayRadius(otherCharge.q);
                        if (distance(x, y, otherCharge.x, otherCharge.y) < otherDisplayRadius + 2) {
                            nearOpposite = true;
                            break;
                        }
                    }
                }
                if (nearOpposite) break;
                
                // 存储点用于后续平滑处理
                points.push({x: x, y: y});
            }
            
            // 绘制平滑的曲线
            if (points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                
                // 如果点数较少，使用直线连接
                if (points.length < 3) {
                    for (let k = 1; k < points.length; k++) {
                        ctx.lineTo(points[k].x, points[k].y);
                    }
                } else {
                    // 使用二次贝塞尔曲线进行平滑连接
                    for (let k = 1; k < points.length - 1; k++) {
                        const xc = (points[k].x + points[k + 1].x) / 2;
                        const yc = (points[k].y + points[k + 1].y) / 2;
                        ctx.quadraticCurveTo(points[k].x, points[k].y, xc, yc);
                    }
                    // 连接到最后一个点
                    ctx.quadraticCurveTo(
                        points[points.length - 2].x, 
                        points[points.length - 2].y, 
                        points[points.length - 1].x, 
                        points[points.length - 1].y
                    );
                }
                
                ctx.strokeStyle = fieldLineColor;
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // 添加虚线效果模拟流动
                const dashPattern = [5, 5];
                ctx.setLineDash(dashPattern);
                ctx.stroke();
                ctx.setLineDash([]); // 重置虚线
            }
        }
    }
}

// 绘制等势面
function drawEquipotentials(ctx, charges, canvasWidth, canvasHeight) {
    if (charges.length === 0) return;
    
    // 根据电荷数量动态调整网格分辨率以优化性能
    const baseResolution = EQUIPOTENTIAL_RESOLUTION;
    const chargeCount = charges.length;
    let gridSize = baseResolution;
    
    if (chargeCount > 10) {
        gridSize = Math.max(20, baseResolution - (chargeCount - 10) * 2);
    } else if (chargeCount > 5) {
        gridSize = Math.max(30, baseResolution - (chargeCount - 5));
    }
    
    const cellWidth = canvasWidth / gridSize;
    const cellHeight = canvasHeight / gridSize;
    const potentialGrid = [];
    
    // 计算网格点的电势
    for (let i = 0; i <= gridSize; i++) {
        potentialGrid[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            const x = j * cellWidth;
            const y = i * cellHeight;
            potentialGrid[i][j] = calculatePotential(charges, x, y);
        }
    }
    
    // 确定等势面级别（基于电荷的最大电势）
    let maxPotential = 0;
    for (const charge of charges) {
        const potentialAtCharge = Math.abs(K * charge.q / getDisplayRadius(charge.q));
        maxPotential = Math.max(maxPotential, potentialAtCharge);
    }
    
    if (maxPotential === 0) return;
    
    // 生成多个等势面级别
    const levels = [];
    const levelCount = 8;
    for (let i = 1; i <= levelCount; i++) {
        levels.push(maxPotential * (i / levelCount));
        levels.push(-maxPotential * (i / levelCount));
    }
    
    // 对每个级别绘制等势线
    ctx.strokeStyle = EQUIPOTENTIAL_COLOR;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    
    for (const level of levels) {
        const contours = extractContours(potentialGrid, level, cellWidth, cellHeight);
        for (const contour of contours) {
            if (contour.length > 1) {
                ctx.beginPath();
                ctx.moveTo(contour[0].x, contour[0].y);
                for (let i = 1; i < contour.length; i++) {
                    ctx.lineTo(contour[i].x, contour[i].y);
                }
                ctx.stroke();
            }
        }
    }
    
    ctx.globalAlpha = 1.0;
}

// 使用Marching Squares算法提取等值线
function extractContours(grid, level, cellWidth, cellHeight) {
    const contours = [];
    const rows = grid.length - 1;
    const cols = grid[0].length - 1;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            // 获取4个角点的值
            const topLeft = grid[i][j];
            const topRight = grid[i][j + 1];
            const bottomLeft = grid[i + 1][j];
            const bottomRight = grid[i + 1][j + 1];
            
            // 计算每个边的交点
            const edges = [];
            
            // Top edge
            if ((topLeft >= level) !== (topRight >= level)) {
                const t = (level - topLeft) / (topRight - topLeft);
                edges.push({ x: j + t, y: i });
            }
            
            // Right edge
            if ((topRight >= level) !== (bottomRight >= level)) {
                const t = (level - topRight) / (bottomRight - topRight);
                edges.push({ x: j + 1, y: i + t });
            }
            
            // Bottom edge
            if ((bottomRight >= level) !== (bottomLeft >= level)) {
                const t = (level - bottomRight) / (bottomLeft - bottomRight);
                edges.push({ x: j + t, y: i + 1 });
            }
            
            // Left edge
            if ((bottomLeft >= level) !== (topLeft >= level)) {
                const t = (level - bottomLeft) / (topLeft - bottomLeft);
                edges.push({ x: j, y: i + t });
            }
            
            // 连接交点形成线段
            if (edges.length === 2) {
                const start = { 
                    x: edges[0].x * cellWidth, 
                    y: edges[0].y * cellHeight 
                };
                const end = { 
                    x: edges[1].x * cellWidth, 
                    y: edges[1].y * cellHeight 
                };
                contours.push([start, end]);
            }
        }
    }
    
    // 简单的线段连接（实际应用中可能需要更复杂的连接算法）
    return contours;
}

// 绘制电场矢量
function drawFieldVectors(ctx, charges, canvasWidth, canvasHeight) {
    if (charges.length === 0) return;
    
    ctx.strokeStyle = VECTOR_FIELD_COLOR;
    ctx.fillStyle = VECTOR_FIELD_COLOR;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    
    // 根据电荷数量动态调整矢量场密度以优化性能
    let vectorSpacing = VECTOR_SPACING;
    const chargeCount = charges.length;
    
    if (chargeCount > 8) {
        vectorSpacing = VECTOR_SPACING * 1.5;
    } else if (chargeCount > 4) {
        vectorSpacing = VECTOR_SPACING * 1.2;
    }
    
    // 在网格点上绘制矢量
    for (let x = vectorSpacing / 2; x < canvasWidth; x += vectorSpacing) {
        for (let y = vectorSpacing / 2; y < canvasHeight; y++) {
            // 检查是否靠近电荷（避免在电荷位置绘制）
            let nearCharge = false;
            for (const charge of charges) {
                const displayRadius = getDisplayRadius(charge.q);
                if (distance(x, y, charge.x, charge.y) < displayRadius + 5) {
                    nearCharge = true;
                    break;
                }
            }
            if (nearCharge) continue;
            
            // 计算电场矢量
            const field = calculateFieldVector(charges, x, y);
            const magnitude = Math.sqrt(field.vx * field.vx + field.vy * field.vy);
            
            if (magnitude === 0) continue;
            
            // 归一化并缩放矢量
            const scale = Math.min(magnitude * VECTOR_SCALE, VECTOR_SPACING * 0.4);
            const normalizedX = field.vx / magnitude;
            const normalizedY = field.vy / magnitude;
            const arrowX = x + normalizedX * scale;
            const arrowY = y + normalizedY * scale;
            
            // 绘制箭头
            drawArrow(ctx, x, y, arrowX, arrowY);
        }
    }
    
    ctx.globalAlpha = 1.0;
}

// 绘制箭头
function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headLength = 6; // 箭头长度
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // 绘制箭杆
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // 绘制箭头头部
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
}