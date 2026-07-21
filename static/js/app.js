import { analyzeLogText, EVENT_TYPES } from "./parser.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const translations = {
    zh: {
        skip_to_content: "跳到主要内容",
        nav_analysis: "日志分析",
        hero_title: "今天你C了吗",
        hero_body: "上传 EVE 战斗日志，快速查看伤害、维修与命中表现。",
        choose_file: "选择日志",
        drop_title: "拖放战斗日志到这里",
        drop_hint: "支持 .txt 文件",
        reanalyze: "重新分析",
        change_file: "更换文件",
        total_damage: "总伤害",
        outgoing_repair: "输出维修",
        received_repair: "接收维修",
        attack_count: "攻击次数",
        target_damage: "目标伤害",
        hit_quality: "命中质量",
        hit_label: "命中",
        damage: "伤害",
        target_distribution: "目标分布",
        event_replay: "事件回放",
        analyzing: "正在解析日志…",
        glancing: "轻型擦过",
        normal: "命中",
        penetration: "穿透",
        critical: "强力一击",
        miss: "未命中",
        target: "目标",
        value: "数值",
        share: "占比",
        time: "时间",
        event_type: "事件类型",
        no_data: "暂无数据",
        no_events: "没有识别到战斗事件",
        select_file_first: "请先选择日志",
        invalid_file: "请选择 .txt 文件",
        file_too_large: "文件超过 50 MB",
        read_failed: "无法读取日志，请重试",
        selected_file: "已选择",
        analyzed_ok: "日志分析完成",
        events_count: "{count} 条事件",
        total: "总计",
        outgoing_event: "输出维修",
        received_event: "接收维修",
        damage_event: "造成伤害",
        repair_detail: "{count} 次",
        damage_detail: "{count} 次攻击",
        received_detail: "{count} 个来源",
        unknown_owner: "UNKNOWN PILOT"
    },
    en: {
        skip_to_content: "Skip to main content",
        nav_analysis: "Log analysis",
        hero_title: "Did you C today?",
        hero_body: "Upload an EVE combat log to see damage, repairs, and hit quality.",
        choose_file: "Choose log",
        drop_title: "Drop a combat log here",
        drop_hint: "Supports .txt files",
        reanalyze: "Analyze again",
        change_file: "Change file",
        total_damage: "Total damage",
        outgoing_repair: "Outgoing repair",
        received_repair: "Received repair",
        attack_count: "Attacks",
        target_damage: "Damage by target",
        hit_quality: "Hit quality",
        hit_label: "Hits",
        damage: "Damage",
        target_distribution: "Target distribution",
        event_replay: "Event replay",
        analyzing: "Parsing combat log…",
        glancing: "Glancing",
        normal: "Hit",
        penetration: "Penetrating",
        critical: "Critical",
        miss: "Miss",
        target: "Target",
        value: "Value",
        share: "Share",
        time: "Time",
        event_type: "Event type",
        no_data: "No data",
        no_events: "No combat events found",
        select_file_first: "Choose a log first",
        invalid_file: "Choose a .txt file",
        file_too_large: "The file is larger than 50 MB",
        read_failed: "The log could not be read",
        selected_file: "Selected",
        analyzed_ok: "Combat log analyzed",
        events_count: "{count} events",
        total: "Total",
        outgoing_event: "Outgoing repair",
        received_event: "Received repair",
        damage_event: "Damage dealt",
        repair_detail: "{count} cycles",
        damage_detail: "{count} attacks",
        received_detail: "{count} sources",
        unknown_owner: "UNKNOWN PILOT"
    }
};

const state = {
    language: localStorage.getItem("evelog-language") || "zh",
    file: null,
    analysis: null,
    activeCategory: "damage",
    toastTimer: null
};

const dom = {
    siteFrame: document.querySelector("#site-frame"),
    hero: document.querySelector("#upload"),
    fileInput: document.querySelector("#log-file"),
    resultsView: document.querySelector("#results-view"),
    ownerId: document.querySelector("#owner-id"),
    fileName: document.querySelector("#file-name"),
    fileSize: document.querySelector("#file-size"),
    analyzeButton: document.querySelector("#analyze-log-button"),
    changeButton: document.querySelector("#change-file-button"),
    totalDamage: document.querySelector("#total-damage"),
    totalRepair: document.querySelector("#total-repair"),
    totalReceived: document.querySelector("#total-received"),
    attackCount: document.querySelector("#attack-count"),
    targetChart: document.querySelector("#target-chart"),
    hitRing: document.querySelector("#hit-ring"),
    hitTotal: document.querySelector("#hit-total"),
    hitRate: document.querySelector("#hit-rate"),
    hitLegend: document.querySelector("#hit-legend"),
    distributionList: document.querySelector("#distribution-list"),
    categorySummary: document.querySelector("#category-summary"),
    eventList: document.querySelector("#event-list"),
    eventCount: document.querySelector("#event-count"),
    loading: document.querySelector("#loading"),
    toast: document.querySelector("#toast"),
    toastText: document.querySelector("#toast-text"),
    navAnalyze: document.querySelector("#nav-analyze")
};

function t(key, replacements = {}) {
    let value = translations[state.language][key] || key;
    for (const [name, replacement] of Object.entries(replacements)) {
        value = value.replace(`{${name}}`, replacement);
    }
    return value;
}

function formatNumber(value, maximumFractionDigits = 0) {
    return new Intl.NumberFormat(state.language === "zh" ? "zh-CN" : "en-US", {
        maximumFractionDigits
    }).format(Number(value) || 0);
}

function formatPercent(value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue.toFixed(1)}%`;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

function applyTranslations() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.title = state.language === "zh" ? "EVELOG · 战斗日志分析" : "EVELOG · Combat log analyzer";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll("[data-language]").forEach((button) => {
        const isActive = button.dataset.language === state.language;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    if (state.analysis) renderResults();
}

function showToast(message, type = "success") {
    window.clearTimeout(state.toastTimer);
    dom.toastText.textContent = message;
    dom.toast.classList.toggle("error", type === "error");
    dom.toast.classList.remove("hidden");
    state.toastTimer = window.setTimeout(() => dom.toast.classList.add("hidden"), 2800);
}

function setLoading(isLoading) {
    dom.loading.classList.toggle("hidden", !isLoading);
    dom.analyzeButton.disabled = isLoading;
    dom.changeButton.disabled = isLoading;
}

function isValidLogFile(file) {
    if (!file) return false;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "txt") {
        showToast(t("invalid_file"), "error");
        return false;
    }
    if (file.size > MAX_FILE_SIZE) {
        showToast(t("file_too_large"), "error");
        return false;
    }
    return true;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function sortedEntries(group) {
    return Object.entries(group).sort(([, a], [, b]) => b - a);
}

function getSeries(category) {
    if (category === "repair") {
        return {
            data: state.analysis.repairByTarget,
            total: state.analysis.totalRepair,
            color: "#55d995"
        };
    }
    if (category === "received") {
        return {
            data: state.analysis.receivedBySource,
            total: state.analysis.totalReceivedRepair,
            color: "#579dff"
        };
    }
    return {
        data: state.analysis.damageByTarget,
        total: state.analysis.totalDamage,
        color: "#ff563e"
    };
}

function renderTargetChart() {
    dom.targetChart.replaceChildren();
    const entries = sortedEntries(state.analysis.damageByTarget).slice(0, 5);
    if (!entries.length) {
        dom.targetChart.append(createElement("div", "empty-chart", t("no_data")));
        return;
    }

    const maximum = Math.max(...entries.map(([, value]) => value), 1);
    for (const [name, value] of entries) {
        const row = createElement("div", "bar-row");
        const label = createElement("span", "bar-label", name);
        label.title = name;
        const track = createElement("span", "bar-track");
        const fill = createElement("span", "bar-fill");
        fill.style.setProperty("--bar-size", `${(value / maximum) * 100}%`);
        fill.style.setProperty("--series-color", "#ff563e");
        track.append(fill);
        const share = state.analysis.totalDamage ? (value / state.analysis.totalDamage) * 100 : 0;
        const valueLabel = createElement("span", "bar-value", `${formatNumber(value)} · ${formatPercent(share)}`);
        row.append(label, track, valueLabel);
        dom.targetChart.append(row);
    }
}

function renderHitQuality() {
    const hitKeys = ["normal", "miss", "glancing", "penetration", "critical"];
    const colors = {
        normal: "#ff563e",
        miss: "#a8a5af",
        glancing: "#ffb51b",
        penetration: "#579dff",
        critical: "#55d995"
    };
    const total = state.analysis.hitStats.total;
    const landed = Math.max(0, total - state.analysis.hitStats.miss);
    const landedRate = total ? (landed / total) * 100 : 0;
    dom.hitTotal.textContent = formatNumber(landed);
    dom.hitRate.textContent = `/ ${Math.round(landedRate)}%`;
    dom.hitLegend.replaceChildren();

    let cursor = 0;
    const segments = [];
    for (const key of hitKeys) {
        const rate = state.analysis.hitRates[key] || 0;
        if (rate > 0) {
            segments.push(`${colors[key]} ${cursor}% ${cursor + rate}%`);
            cursor += rate;
        }

        const item = createElement("li");
        const dot = createElement("span", "legend-dot");
        dot.style.setProperty("--legend-color", colors[key]);
        item.append(
            dot,
            createElement("span", "", `${t(key)}  ${formatNumber(state.analysis.hitStats[key])}`),
            createElement("span", "legend-percent", `(${formatPercent(rate)})`)
        );
        dom.hitLegend.append(item);
    }

    dom.hitRing.style.background = total && segments.length
        ? `conic-gradient(${segments.join(", ")})`
        : "conic-gradient(rgba(120, 111, 144, .3) 0 100%)";
}

function renderDistribution() {
    dom.distributionList.replaceChildren();
    const series = getSeries(state.activeCategory);
    const entries = sortedEntries(series.data);

    dom.categorySummary.textContent = state.activeCategory === "repair"
        ? t("repair_detail", { count: formatNumber(state.analysis.repairStats.totalCount) })
        : state.activeCategory === "received"
            ? t("received_detail", { count: formatNumber(entries.length) })
            : t("damage_detail", { count: formatNumber(state.analysis.hitStats.total) });

    if (!entries.length) {
        dom.distributionList.append(createElement("div", "empty-list", t("no_data")));
        return;
    }

    const header = createElement("div", "distribution-header");
    header.append(
        createElement("span", "", t("target")),
        createElement("span", "", t("value")),
        createElement("span", "", t("share"))
    );
    dom.distributionList.append(header);

    for (const [name, value] of entries.slice(0, 8)) {
        const share = series.total ? (value / series.total) * 100 : 0;
        const row = createElement("div", "distribution-row");
        row.style.setProperty("--series-color", series.color);
        const nameElement = createElement("span", "distribution-name", name);
        nameElement.title = name;
        const valueElement = createElement("span", "distribution-value", formatNumber(value));
        const shareCell = createElement("span", "distribution-share");
        const shareBar = createElement("span", "share-bar");
        const shareFill = createElement("span");
        shareFill.style.setProperty("--bar-size", `${share}%`);
        shareBar.append(shareFill);
        shareCell.append(shareBar, document.createTextNode(formatPercent(share)));
        row.append(nameElement, valueElement, shareCell);
        dom.distributionList.append(row);
    }

    const totalRow = createElement("div", "distribution-row distribution-total");
    totalRow.append(
        createElement("span", "", t("total")),
        createElement("span", "distribution-value", formatNumber(series.total)),
        createElement("span", "distribution-share", "100.0%")
    );
    dom.distributionList.append(totalRow);
}

function eventLabel(type) {
    if (type === EVENT_TYPES.REPAIR) return t("outgoing_event");
    if (type === EVENT_TYPES.RECEIVED) return t("received_event");
    return t("damage_event");
}

function eventColor(type) {
    if (type === EVENT_TYPES.REPAIR) return "#55d995";
    if (type === EVENT_TYPES.RECEIVED) return "#579dff";
    return "#ff563e";
}

function renderEvents() {
    dom.eventList.replaceChildren();
    const events = state.analysis.events;
    dom.eventCount.textContent = t("events_count", { count: formatNumber(events.length) });

    if (!events.length) {
        dom.eventList.append(createElement("div", "empty-list", t("no_events")));
        return;
    }

    const header = createElement("div", "event-header");
    header.append(
        createElement("span", "", t("time")),
        createElement("span", "", t("event_type")),
        createElement("span", "", t("target")),
        createElement("span", "", t("value"))
    );
    dom.eventList.append(header);

    for (const event of events) {
        const row = createElement("div", "event-row");
        row.style.setProperty("--event-color", eventColor(event.type));
        const timestamp = event.timestamp ? event.timestamp.slice(-8) : "—";
        const target = createElement("span", "event-target", event.target);
        target.title = event.target;
        row.append(
            createElement("span", "event-time", timestamp),
            createElement("span", "event-type", eventLabel(event.type)),
            target,
            createElement("span", "event-value", formatNumber(event.value))
        );
        dom.eventList.append(row);
    }
}

function renderResults() {
    if (!state.analysis) return;

    dom.siteFrame.classList.add("has-results");
    dom.hero.classList.add("hidden");
    dom.resultsView.classList.remove("hidden");
    dom.ownerId.textContent = state.analysis.character || t("unknown_owner");
    dom.fileName.textContent = state.file?.name || "—";
    dom.fileSize.textContent = state.file ? `· ${formatFileSize(state.file.size)}` : "—";
    dom.totalDamage.textContent = formatNumber(state.analysis.totalDamage);
    dom.totalRepair.textContent = formatNumber(state.analysis.totalRepair);
    dom.totalReceived.textContent = formatNumber(state.analysis.totalReceivedRepair);
    dom.attackCount.textContent = formatNumber(state.analysis.hitStats.total);

    renderTargetChart();
    renderHitQuality();
    renderDistribution();
    renderEvents();
}

async function analyzeCurrentFile() {
    if (!state.file) {
        showToast(t("select_file_first"), "error");
        return;
    }

    setLoading(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
        const content = await state.file.text();
        const analysis = analyzeLogText(content);
        if (!analysis.processedLines) {
            showToast(t("no_events"), "error");
            return;
        }

        state.analysis = analysis;
        state.activeCategory = "damage";
        document.querySelectorAll(".category-tab").forEach((tab) => {
            const active = tab.dataset.category === "damage";
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        renderResults();
        window.scrollTo({ top: 0, behavior: "smooth" });
        showToast(t("analyzed_ok"));
    } catch (error) {
        console.error(error);
        showToast(t("read_failed"), "error");
    } finally {
        setLoading(false);
    }
}

async function selectFile(file) {
    if (!isValidLogFile(file)) return;
    state.file = file;
    await analyzeCurrentFile();
}

function chooseFile() {
    dom.fileInput.value = "";
    dom.fileInput.click();
}

function showHome() {
    dom.siteFrame.classList.remove("has-results");
    dom.resultsView.classList.add("hidden");
    dom.hero.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeFileEvents() {
    dom.fileInput.addEventListener("change", (event) => {
        const [file] = event.target.files;
        if (file) selectFile(file);
    });

    dom.analyzeButton.addEventListener("click", analyzeCurrentFile);
    dom.changeButton.addEventListener("click", chooseFile);
    dom.navAnalyze.addEventListener("click", chooseFile);

    for (const eventName of ["dragenter", "dragover"]) {
        dom.hero.addEventListener(eventName, (event) => {
            event.preventDefault();
            dom.hero.classList.add("drag-active");
        });
    }

    for (const eventName of ["dragleave", "drop"]) {
        dom.hero.addEventListener(eventName, (event) => {
            event.preventDefault();
            dom.hero.classList.remove("drag-active");
        });
    }

    dom.hero.addEventListener("drop", (event) => {
        const [file] = event.dataTransfer.files;
        if (file) selectFile(file);
    });

    document.querySelector(".brand").addEventListener("click", (event) => {
        event.preventDefault();
        showHome();
    });
}

function initializeControls() {
    document.querySelectorAll("[data-language]").forEach((button) => {
        button.addEventListener("click", () => {
            state.language = button.dataset.language;
            localStorage.setItem("evelog-language", state.language);
            applyTranslations();
        });
    });

    document.querySelectorAll(".category-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            state.activeCategory = tab.dataset.category;
            document.querySelectorAll(".category-tab").forEach((candidate) => {
                const active = candidate === tab;
                candidate.classList.toggle("active", active);
                candidate.setAttribute("aria-selected", String(active));
            });
            renderDistribution();
        });
    });
}

function initializeFlowMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    dom.siteFrame.addEventListener("pointermove", (event) => {
        if (animationFrame) return;
        animationFrame = requestAnimationFrame(() => {
            const bounds = dom.siteFrame.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            document.documentElement.style.setProperty("--flow-x", `${x * 12}px`);
            document.documentElement.style.setProperty("--flow-y", `${y * 8}px`);
            animationFrame = 0;
        });
    });

    dom.siteFrame.addEventListener("pointerleave", () => {
        document.documentElement.style.setProperty("--flow-x", "0px");
        document.documentElement.style.setProperty("--flow-y", "0px");
    });
}

initializeFileEvents();
initializeControls();
initializeFlowMotion();
applyTranslations();
