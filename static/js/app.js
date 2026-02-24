// 全局变量
let currentLogFile = null;

// 图表实例
let dpsChart = null;
let repairChart = null;

// DOM元素
const logFileInput = document.getElementById('log-file');
const analyzeLogBtn = document.getElementById('analyze-log-btn');
const logAnalysisSection = document.getElementById('log-analysis-section');
const totalDpsEl = document.getElementById('total-dps');
const totalRepairEl = document.getElementById('total-repair');
const dpsChartCanvas = document.getElementById('dps-chart');
const repairChartCanvas = document.getElementById('repair-chart');
const combatEventsEl = document.getElementById('combat-events');
const fileUploadArea = document.querySelector('.file-upload-area');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// 显示加载指示器
function showLoading() {
    loading.classList.remove('hidden');
}

// 隐藏加载指示器
function hideLoading() {
    loading.classList.add('hidden');
}

// 显示错误信息
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        hideError();
    }, 3000);
}

// 隐藏错误信息
function hideError() {
    errorMessage.classList.add('hidden');
}

// 更新文件上传区域显示
function updateFileUploadDisplay(filename) {
    const fileLabel = fileUploadArea.querySelector('.file-label');
    if (fileLabel) {
        fileLabel.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <span>${filename}</span>
            <span style="font-size: 0.9rem; color: #94a3b8;">点击更换文件</span>
        `;
    }
}

// 初始化文件上传功能
function initFileUpload() {
    if (fileUploadArea) {
        // 拖拽功能
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-active');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('drag-active');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-active');
            
            if (e.dataTransfer.files.length > 0) {
                currentLogFile = e.dataTransfer.files[0];
                updateFileUploadDisplay(currentLogFile.name);
                showError(`已选择文件: ${currentLogFile.name}`);
            }
        });

        // 文件选择功能
        logFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                currentLogFile = e.target.files[0];
                updateFileUploadDisplay(currentLogFile.name);
                showError(`已选择文件: ${currentLogFile.name}`);
            }
        });
    }
}

// 解析Log文件
function parseLogFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n');
                const data = analyzeLogData(lines);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsText(file);
    });
}

// 分析Log数据
function analyzeLogData(lines) {
    const data = {
        totalDps: 0,
        totalRepair: 0,
        dpsByTarget: {},
        repairByTarget: {},
        processedLines: 0,
        unrecognizedLines: 0,
        events: [], // 用于战斗回放
        damageEvents: [], // 用于DPS计算
        repairEvents: [], // 用于HPS计算
        combatStartTime: null, // 战斗开始时间
        combatId: null // 战斗ID
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 提取时间戳
        let timestampMatch = line.match(/\[\s*(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s*\]/);
        let timestamp = timestampMatch ? timestampMatch[1] : 'Unknown';
        
        // 更新战斗时间
        if (timestamp !== 'Unknown') {
            const dateTime = new Date(timestamp.replace('.', '-'));
            if (!data.combatStartTime || dateTime < new Date(data.combatStartTime.replace('.', '-'))) {
                data.combatStartTime = timestamp;
            }
        }
        
        // 尝试提取战斗ID（从"收听者:"后面提取）
        if (!data.combatId) {
            const combatIdMatch = line.match(/收听者:\s*(.+)/);
            if (combatIdMatch) {
                data.combatId = combatIdMatch[1].trim();
            }
        }
        
        // 尝试多种日志格式解析
        let match = null;
        let eventType = null;
        let target = null;
        let value = null;
        let eventSubtype = null;
        
        // 基于颜色代码识别事件类型
        if (line.includes('color=0xff00ffff')) {
            // 紫红色：用户打出的伤害
            eventType = 'DAMAGE';
            eventSubtype = 'OUT_Damage';
            
            // 提取伤害值
            match = line.match(/<b>(\d+)<\/b>/);
            if (match) {
                value = parseInt(match[1]);
                
                // 提取目标
                let pilotName = null;
                let shipType = null;
                
                // 尝试从目标中提取飞行员名称和舰船类型
                // 模式1: 名称[联盟](舰船类型*)
                const fullTargetMatch = line.match(/<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/);
                if (fullTargetMatch) {
                    let fullTarget = fullTargetMatch[1].trim();
                    // 移除任何HTML标签
                    fullTarget = fullTarget.replace(/<[^>]+>/g, '').trim();
                    
                    // 尝试从括号中提取舰船类型
                    const shipTypeMatch = fullTarget.match(/\(([^)]+\*?)\)/);
                    if (shipTypeMatch) {
                        shipType = shipTypeMatch[1].trim();
                        shipType = shipType.replace(/\*$/, '');
                        // 提取飞行员名称（去掉舰船类型部分）
                        pilotName = fullTarget.replace(/\s*\([^)]+\*?\)/, '').trim();
                        target = `${pilotName}（${shipType}）`;
                    } else {
                        target = fullTarget;
                    }
                } else {
                    // 尝试其他模式
                    const targetPatterns = [
                        /对[\s\S]*?<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/,
                        /对[\s\S]*?<b>([\s\S]*?)<\/b>/,
                        /对[\s\S]*?<color=0xffffffff>([\s\S]*?)<\/color>/,
                        /<font size=10>对<\/font>[\s\S]*?<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/,
                        /<font size=10>对<\/font>[\s\S]*?<b>([\s\S]*?)<\/b>/,
                        /(SLBY BC\[\.CCT\.\]\(神示级海军型\*\))/,
                        /<color=0xffffffff>([\s\S]*?)<\/color>/
                    ];
                    
                    for (const pattern of targetPatterns) {
                        match = line.match(pattern);
                        if (match) {
                            let extractedTarget = match[1].trim();
                            // 移除任何剩余的HTML标签
                            extractedTarget = extractedTarget.replace(/<[^>]+>/g, '').trim();
                            
                            // 尝试从括号中提取舰船类型
                            const shipTypeMatch = extractedTarget.match(/\(([^)]+\*?)\)/);
                            if (shipTypeMatch) {
                                shipType = shipTypeMatch[1].trim();
                                shipType = shipType.replace(/\*$/, '');
                                // 提取飞行员名称（去掉舰船类型部分）
                                pilotName = extractedTarget.replace(/\s*\([^)]+\*?\)/, '').trim();
                                target = `${pilotName}（${shipType}）`;
                            } else {
                                target = extractedTarget;
                            }
                            break;
                        }
                    }
                    
                    if (!target) {
                        target = 'Unknown';
                    }
                }
            }
        } else if (line.includes('color=0xffccff66')) {
            // 浅绿色：用户的后勤维修量
            eventType = 'REPAIR';
            eventSubtype = 'OUT_Repair';
            
            // 提取维修值
            match = line.match(/<b>(\d+)<\/b>/);
            if (match) {
                value = parseInt(match[1]);
                
                // 提取目标
                let pilotName = null;
                let shipType = null;
                
                // 提取舰船类型（优先匹配带localized标签的）
                const shipMatch = line.match(/<localized hint="[^"]+">([^<]+)<\/localized>/);
                if (shipMatch) {
                    shipType = shipMatch[1].trim();
                    // 移除末尾的星号
                    shipType = shipType.replace(/\*$/, '');
                } else {
                    // 尝试其他模式
                    const shipPatterns = [
                        /<color=0xFFFFCC66>\s*<u><b>([^<]+)<\/b><\/u><\/color>/,
                        /<u><b>([^<]+)<\/b><\/u>/,
                        /<font size=14><color=0xFFFFCC66>\s*<u><b>([^<]+)<\/b><\/u><\/color><\/font>/,
                        /<font size=14><color=0xFFFFCC66>\s*<u><b><localized hint="[^"]+">([^<]+)<\/localized><\/b><\/u><\/color><\/font>/
                    ];
                    
                    for (const pattern of shipPatterns) {
                        match = line.match(pattern);
                        if (match) {
                            shipType = match[1].trim();
                            // 移除末尾的星号
                            shipType = shipType.replace(/\*$/, '');
                            break;
                        }
                    }
                }
                
                // 如果上面的方法都没找到，尝试从完整目标字符串中提取
                if (!shipType) {
                    const fullTargetMatch = line.match(/<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/);
                    if (fullTargetMatch) {
                        const fullTarget = fullTargetMatch[1];
                        // 尝试从括号中提取舰船类型
                        const shipTypeMatch = fullTarget.match(/\(([^)]+\*?)\)/);
                        if (shipTypeMatch) {
                            shipType = shipTypeMatch[1].trim();
                            shipType = shipType.replace(/\*$/, '');
                        }
                    }
                }
                
                // 提取飞行员名称（优先匹配带颜色标签的）
                const pilotMatch = line.match(/<font size=12><color=0xFFFFFFFF>\s*<b>([^<]+)<\/b><\/color><\/font>/);
                if (pilotMatch) {
                    pilotName = pilotMatch[1].trim();
                } else {
                    // 尝试其他模式
                    const pilotPatterns = [
                        /<color=0xFFFFFFFF>\s*<b>([^<]+)<\/b><\/color>/,
                        /<b>([^<]+)<\/b>\s*-/,
                        /远程装甲维修量至[\s\S]*? - ([^-]+) -/,
                        /至[\s\S]*? - ([^-]+) -/
                    ];
                    
                    for (const pattern of pilotPatterns) {
                        match = line.match(pattern);
                        if (match) {
                            pilotName = match[1].trim();
                            // 移除末尾的空格和特殊字符
                            pilotName = pilotName.replace(/\s*$/, '');
                            break;
                        }
                    }
                }
                
                // 构建目标名称
                if (pilotName && shipType) {
                    // 移除任何HTML标签
                    pilotName = pilotName.replace(/<[^>]+>/g, '').trim();
                    shipType = shipType.replace(/<[^>]+>/g, '').trim();
                    target = `${pilotName}（${shipType}）`;
                } else if (pilotName) {
                    // 移除任何HTML标签
                    pilotName = pilotName.replace(/<[^>]+>/g, '').trim();
                    target = pilotName;
                } else if (shipType) {
                    // 移除任何HTML标签
                    shipType = shipType.replace(/<[^>]+>/g, '').trim();
                    target = shipType;
                } else {
                    // 尝试通用模式
                    const generalPatterns = [
                        /远程装甲维修量至[\s\S]*?<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/,
                        /远程装甲维修量至[\s\S]*?<b>([\s\S]*?)<\/b>/,
                        /维修[\s\S]*?<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/,
                        /维修[\s\S]*?<b>([\s\S]*?)<\/b>/,
                        /至[\s\S]*?<b><color=0xffffffff>([\s\S]*?)<\/color><\/b>/,
                        /至[\s\S]*?<b>([\s\S]*?)<\/b>/
                    ];
                    
                    for (const pattern of generalPatterns) {
                        match = line.match(pattern);
                        if (match) {
                            target = match[1].trim();
                            // 移除任何HTML标签
                            target = target.replace(/<[^>]+>/g, '').trim();
                            break;
                        }
                    }
                    
                    if (!target) {
                        target = 'Fleet Member';
                    }
                }
            }
        }
        
        // 格式1: [时间] [事件类型] [来源] [目标] [数值]
        if (!eventType) {
            match = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] \[(\w+)\] \[(\w+)\] (\d+)/);
            if (match) {
                timestamp = match[1];
                eventType = match[2].toUpperCase();
                target = match[4];
                value = parseInt(match[5]);
                eventSubtype = eventType;
            }
        }
        
        // 格式2: 时间 事件类型 来源 目标 数值
        if (!eventType) {
            match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+(\w+)\s+(\w+)\s+(\d+)/);
            if (match) {
                timestamp = match[1];
                eventType = match[2].toUpperCase();
                target = match[4];
                value = parseInt(match[5]);
                eventSubtype = eventType;
            }
        }

        // 如果成功解析到事件类型、目标和数值
        if (eventType && target && value) {
            data.processedLines++;
            
            // 记录事件用于战斗回放
            data.events.push({
                timestamp: timestamp,
                type: eventType,
                subtype: eventSubtype,
                target: target,
                value: value
            });
            
            switch (eventType) {
                case 'DAMAGE':
                    data.totalDps += value;
                    if (!data.dpsByTarget[target]) {
                        data.dpsByTarget[target] = 0;
                    }
                    data.dpsByTarget[target] += value;
                    // 记录伤害事件用于DPS计算
                    data.damageEvents.push({
                        timestamp: timestamp,
                        value: value
                    });
                    break;
                case 'REPAIR':
                    data.totalRepair += value;
                    if (!data.repairByTarget[target]) {
                        data.repairByTarget[target] = 0;
                    }
                    data.repairByTarget[target] += value;
                    // 记录维修事件用于HPS计算
                    data.repairEvents.push({
                        timestamp: timestamp,
                        value: value
                    });
                    break;
            }
        } else {
            data.unrecognizedLines++;
        }
    });

    return data;
}

// 渲染DPS图表
function renderDpsChart(data) {
    if (dpsChart) {
        dpsChart.destroy();
    }

    const targets = Object.keys(data.dpsByTarget);
    const values = targets.map(target => data.dpsByTarget[target]);

    const ctx = dpsChartCanvas.getContext('2d');
    dpsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: targets,
            datasets: [{
                label: 'DPS对目标造成的伤害',
                data: values,
                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                borderColor: 'rgba(231, 76, 60, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'DPS对各目标造成的伤害'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '伤害值'
                    }
                }
            }
        }
    });
}

// 渲染维修图表
function renderRepairChart(data) {
    if (repairChart) {
        repairChart.destroy();
    }

    const targets = Object.keys(data.repairByTarget);
    const values = targets.map(target => data.repairByTarget[target]);

    const ctx = repairChartCanvas.getContext('2d');
    repairChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: targets,
            datasets: [{
                label: '维修量对目标的修复',
                data: values,
                backgroundColor: 'rgba(80, 200, 120, 0.7)',
                borderColor: 'rgba(80, 200, 120, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '维修量对各目标的修复'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '维修值'
                    }
                }
            }
        }
    });
}



// 渲染战斗回放
function renderCombatReplay(data) {
    combatEventsEl.innerHTML = '';
    
    // 按时间排序事件
    const sortedEvents = [...data.events].sort((a, b) => {
        return new Date(a.timestamp.replace('.', '-')) - new Date(b.timestamp.replace('.', '-'));
    });
    
    sortedEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `combat-event ${event.type.toLowerCase()}`;
        
        let eventTypeText = '';
        switch (event.type) {
            case 'DAMAGE':
                eventTypeText = '造成伤害';
                break;
            case 'REPAIR':
                eventTypeText = '进行维修';
                break;
        }
        
        eventEl.innerHTML = `
            <div class="event-timestamp">${event.timestamp}</div>
            <div class="event-details">
                <span class="event-type">${eventTypeText}</span>
                <span class="event-value ${event.type.toLowerCase()}">${event.value}</span>
            </div>
            <div class="event-target">
                目标: ${event.target}
            </div>
        `;
        
        combatEventsEl.appendChild(eventEl);
    });
}

// 分析Log文件
async function analyzeLog() {
    if (!currentLogFile) {
        showError('请先选择一个Log文件');
        return;
    }

    showLoading();
    hideError();

    try {
        const data = await parseLogFile(currentLogFile);
        
        // 更新汇总信息
        totalDpsEl.textContent = data.totalDps;
        totalRepairEl.textContent = data.totalRepair;
        
        // 更新战斗时间和战斗ID
        const combatStartTimeEl = document.getElementById('combat-start-time');
        const combatIdEl = document.getElementById('combat-id');
        
        combatStartTimeEl.textContent = data.combatStartTime || '-';
        combatIdEl.textContent = data.combatId || '-';

        // 渲染图表
        renderDpsChart(data);
        renderRepairChart(data);
        
        // 渲染战斗回放
        renderCombatReplay(data);

        // 显示分析结果区域
        logAnalysisSection.style.display = 'block';

        // 显示处理结果反馈
        let message = `Log分析完成！`;
        if (data.processedLines > 0) {
            message += ` 已经识别到 ${data.processedLines} 行里有有效数据`;
        }
        showError(message);
    } catch (error) {
        showError('分析Log文件失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 分析按钮点击事件
    if (analyzeLogBtn) {
        analyzeLogBtn.addEventListener('click', analyzeLog);
    }
}

// 初始化页面
function init() {
    // 初始化文件上传功能
    initFileUpload();
    
    // 初始化事件监听器
    initEventListeners();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}