// 全局变量
let currentLogFile = null;
let currentLanguage = 'en'; // 默认语言为英文

// 语言翻译对象
const translations = {
    en: {
        upload_section_title: 'Upload Log File',
        select_log_file: 'Select EVE Online Combat Log File',
        drag_drop_here: 'Click or drag file here',
        analyze_log: 'Analyze Log',
        analysis_results: 'Analysis Results',
        total_dps: 'Total DPS',
        total_repair: 'Total Repair',
        total_received_repair: 'Total Received Repair',
        combat_start_time: 'Combat Start Time',
        combat_id: 'Combat ID',
        combat_replay: 'Combat Replay',
        dealing_damage: 'Dealing Damage',
        performing_repair: 'Performing Repair',
        receiving_repair: 'Receiving Repair',
        target: 'Target',
        analyzing: 'Analyzing...',
        log_analyzed: 'Log analysis completed!',
        valid_data_found: 'Found valid data in',
        lines: 'lines',
        please_select_file: 'Please select a Log file first',
        analysis_failed: 'Failed to analyze Log file: '
    },
    zh: {
        upload_section_title: '上传Log文件',
        select_log_file: '选择EVE Online战斗日志文件',
        drag_drop_here: '点击或拖拽文件到此处',
        analyze_log: '分析Log',
        analysis_results: '分析结果',
        total_dps: '总DPS',
        total_repair: '总维修量',
        total_received_repair: '总接收维修量',
        combat_start_time: '战斗开始时间',
        combat_id: '战斗ID',
        combat_replay: '战斗回放',
        dealing_damage: '造成伤害',
        performing_repair: '进行维修',
        receiving_repair: '接收维修',
        target: '目标',
        analyzing: '分析中...',
        log_analyzed: 'Log分析完成！',
        valid_data_found: '已经识别到',
        lines: '行里有有效数据',
        please_select_file: '请先选择一个Log文件',
        analysis_failed: '分析Log文件失败: '
    }
};

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
    // 更新加载文本
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = translations[currentLanguage].analyzing;
    }
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

// 切换语言
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // 更新语言按钮状态
    document.getElementById('en-btn').classList.toggle('active', lang === 'en');
    document.getElementById('zh-btn').classList.toggle('active', lang === 'zh');
    
    // 更新页面文本
    updatePageText();
    
    // 更新图表标题
    if (dpsChart) {
        renderDpsChart(window.currentAnalysisData);
    }
    if (repairChart) {
        renderRepairChart(window.currentAnalysisData);
    }
    if (window.receivedRepairChart) {
        renderReceivedRepairChart(window.currentAnalysisData);
    }
}

// 更新页面文本
function updatePageText() {
    // 遍历所有带有data-lang-key属性的元素
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
    
    // 更新标题
    document.title = currentLanguage === 'en' ? 'EVE Online Log Analyze' : 'EVE Online Log分析系统';
    
    // 更新页面主标题
    const titleElement = document.querySelector('.title');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fas fa-file-alt"></i> ${currentLanguage === 'en' ? 'EVE Online Log Analyze' : 'EVE Online Log分析系统'}`;
    }
}

// 初始化语言切换功能
function initLanguageSwitch() {
    // 英文按钮
    document.getElementById('en-btn').addEventListener('click', () => {
        switchLanguage('en');
    });
    
    // 中文按钮
    document.getElementById('zh-btn').addEventListener('click', () => {
        switchLanguage('zh');
    });
    
    // 初始加载时更新页面文本
    updatePageText();
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
        totalReceivedRepair: 0,
        dpsByTarget: {},
        repairByTarget: {},
        receivedRepairBySource: {},
        processedLines: 0,
        unrecognizedLines: 0,
        events: [], // 用于战斗回放
        damageEvents: [], // 用于DPS计算
        repairEvents: [], // 用于HPS计算
        receivedRepairEvents: [], // 用于接收维修计算
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
            // 检查是维修量至（发出的维修）还是维修量由（接收的维修）
            if (line.includes('远程装甲维修量至')) {
                // 浅绿色：用户的后勤维修量（发出的维修）
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
            } else if (line.includes('远程装甲维修量由')) {
                // 浅绿色：用户接收的维修量
                eventType = 'RECEIVED_REPAIR';
                eventSubtype = 'IN_Repair';
                
                // 提取维修值
                match = line.match(/<b>(\d+)<\/b>/);
                if (match) {
                    value = parseInt(match[1]);
                    
                    // 提取来源
                    let sourceName = null;
                    let shipType = null;
                    
                    // 提取飞行员名称（优先匹配带颜色标签的）
                    const sourceMatch = line.match(/<font size=12><color=0xFFFFFFFF>\s*<b>([^<]+)<\/b><\/color><\/font>/);
                    if (sourceMatch) {
                        sourceName = sourceMatch[1].trim();
                    } else {
                        // 尝试其他模式
                        const sourcePatterns = [
                            /<color=0xFFFFFFFF>\s*<b>([^<]+)<\/b><\/color>/,
                            /<b>([^<]+)<\/b>\s*-/,
                            /远程装甲维修量由[\s\S]*? - ([^-]+) -/,
                            /由[\s\S]*? - ([^-]+) -/
                        ];
                        
                        for (const pattern of sourcePatterns) {
                            match = line.match(pattern);
                            if (match) {
                                sourceName = match[1].trim();
                                // 移除末尾的空格和特殊字符
                                sourceName = sourceName.replace(/\s*$/, '');
                                break;
                            }
                        }
                    }
                    
                    // 提取舰船类型（如果有）
                    const shipMatch = line.match(/<localized hint="[^"]+">([^<]+)<\/localized>/);
                    if (shipMatch) {
                        shipType = shipMatch[1].trim();
                        // 移除末尾的星号
                        shipType = shipType.replace(/\*$/, '');
                    }
                    
                    // 构建来源名称
                    if (sourceName && shipType) {
                        // 移除任何HTML标签
                        sourceName = sourceName.replace(/<[^>]+>/g, '').trim();
                        shipType = shipType.replace(/<[^>]+>/g, '').trim();
                        target = `${sourceName}（${shipType}）`;
                    } else if (sourceName) {
                        // 移除任何HTML标签
                        sourceName = sourceName.replace(/<[^>]+>/g, '').trim();
                        target = sourceName;
                    } else {
                        target = 'Unknown Source';
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
                case 'RECEIVED_REPAIR':
                    data.totalReceivedRepair += value;
                    if (!data.receivedRepairBySource[target]) {
                        data.receivedRepairBySource[target] = 0;
                    }
                    data.receivedRepairBySource[target] += value;
                    // 记录接收维修事件
                    data.receivedRepairEvents.push({
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
                label: currentLanguage === 'en' ? 'DPS Damage to Targets' : 'DPS对目标造成的伤害',
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
                    text: currentLanguage === 'en' ? 'DPS Damage to Each Target' : 'DPS对各目标造成的伤害'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: currentLanguage === 'en' ? 'Damage Value' : '伤害值'
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
                label: currentLanguage === 'en' ? 'Repair to Targets' : '对目标维修量',
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
                    text: currentLanguage === 'en' ? 'Repair to Each Target' : '对目标维修量'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: currentLanguage === 'en' ? 'Repair Value' : '维修值'
                    }
                }
            }
        }
    });
}

// 渲染接收维修图表
function renderReceivedRepairChart(data) {
    const receivedRepairChartCanvas = document.getElementById('received-repair-chart');
    if (!receivedRepairChartCanvas) return;

    let receivedRepairChart = null;
    if (window.receivedRepairChart) {
        window.receivedRepairChart.destroy();
    }

    const sources = Object.keys(data.receivedRepairBySource);
    const values = sources.map(source => data.receivedRepairBySource[source]);

    const ctx = receivedRepairChartCanvas.getContext('2d');
    window.receivedRepairChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sources,
            datasets: [{
                label: currentLanguage === 'en' ? 'Received Repair' : '接收的维修量',
                data: values,
                backgroundColor: 'rgba(100, 149, 237, 0.7)',
                borderColor: 'rgba(100, 149, 237, 1)',
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
                    text: currentLanguage === 'en' ? 'Received Repair from Each Source' : '从各来源接收的维修量'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: currentLanguage === 'en' ? 'Repair Value' : '维修值'
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
                eventTypeText = currentLanguage === 'en' ? translations[currentLanguage].dealing_damage : translations[currentLanguage].dealing_damage;
                break;
            case 'REPAIR':
                eventTypeText = currentLanguage === 'en' ? translations[currentLanguage].performing_repair : translations[currentLanguage].performing_repair;
                break;
            case 'RECEIVED_REPAIR':
                eventTypeText = currentLanguage === 'en' ? translations[currentLanguage].receiving_repair : translations[currentLanguage].receiving_repair;
                break;
        }
        
        eventEl.innerHTML = `
            <div class="event-timestamp">${event.timestamp}</div>
            <div class="event-details">
                <span class="event-type">${eventTypeText}</span>
                <span class="event-value ${event.type.toLowerCase()}">${event.value}</span>
            </div>
            <div class="event-target">
                ${currentLanguage === 'en' ? translations[currentLanguage].target : translations[currentLanguage].target}: ${event.target}
            </div>
        `;
        
        combatEventsEl.appendChild(eventEl);
    });
}

// 分析Log文件
async function analyzeLog() {
    if (!currentLogFile) {
        showError(translations[currentLanguage].please_select_file);
        return;
    }

    showLoading();
    hideError();

    try {
        const data = await parseLogFile(currentLogFile);
        
        // 存储分析数据，用于语言切换时更新图表
        window.currentAnalysisData = data;
        
        // 更新汇总信息
        totalDpsEl.textContent = data.totalDps;
        totalRepairEl.textContent = data.totalRepair;
        
        // 更新总接收维修量
        const totalReceivedRepairEl = document.getElementById('total-received-repair');
        if (totalReceivedRepairEl) {
            totalReceivedRepairEl.textContent = data.totalReceivedRepair;
        }
        
        // 更新战斗时间和战斗ID
        const combatStartTimeEl = document.getElementById('combat-start-time');
        const combatIdEl = document.getElementById('combat-id');
        
        combatStartTimeEl.textContent = data.combatStartTime || '-';
        combatIdEl.textContent = data.combatId || '-';

        // 渲染图表
        renderDpsChart(data);
        renderRepairChart(data);
        renderReceivedRepairChart(data);
        
        // 渲染战斗回放
        renderCombatReplay(data);

        // 显示分析结果区域
        logAnalysisSection.style.display = 'block';

        // 显示处理结果反馈
        let message = translations[currentLanguage].log_analyzed;
        if (data.processedLines > 0) {
            message += ` ${translations[currentLanguage].valid_data_found} ${data.processedLines} ${translations[currentLanguage].lines}`;
        }
        showError(message);
    } catch (error) {
        showError(translations[currentLanguage].analysis_failed + error.message);
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
    
    // 初始化语言切换功能
    initLanguageSwitch();
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