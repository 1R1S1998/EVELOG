const EVENT_TYPES = Object.freeze({
    DAMAGE: "damage",
    REPAIR: "repair",
    RECEIVED: "received"
});

const UNKNOWN_WEAPON = "Unknown weapon";

function parseNumber(value) {
    const parsed = Number.parseInt(String(value).replace(/,/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function stripMarkup(value = "") {
    return value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanEntityName(value = "") {
    return stripMarkup(value)
        .replace(/^[-–—\s]+|[-–—\s]+$/g, "")
        .replace(/\*+(?=\))/g, "")
        .replace(/\*+$/g, "")
        .trim();
}

function extractTimestamp(line) {
    const match = line.match(/\[\s*(\d{4}[.-]\d{2}[.-]\d{2}\s+\d{2}:\d{2}:\d{2})\s*\]/);
    if (match) return match[1].replace(/-/g, ".");

    const plainMatch = line.match(/(\d{4}[.-]\d{2}[.-]\d{2}\s+\d{2}:\d{2}:\d{2})/);
    return plainMatch ? plainMatch[1].replace(/-/g, ".") : null;
}

export function timestampToMs(timestamp) {
    if (!timestamp) return Number.NaN;
    const match = timestamp.match(/^(\d{4})[.-](\d{2})[.-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return Number.NaN;

    const [, year, month, day, hour, minute, second] = match.map(Number);
    return Date.UTC(year, month - 1, day, hour, minute, second);
}

function extractAmount(line) {
    const boldAmount = line.match(/<b>\s*([\d,]+)\s*<\/b>/i);
    if (boldAmount) return parseNumber(boldAmount[1]);

    const trailingAmount = line.match(/\s([\d,]+)\s*$/);
    return trailingAmount ? parseNumber(trailingAmount[1]) : null;
}

function extractShip(line) {
    // EVE logs sometimes omit the closing </localized> tag, so stop at
    // either that tag or the next markup boundary.
    const localized = line.match(/<localized\s+hint="[^"]+">([^<]+)(?:<\/localized>|<)/i);
    if (localized) return cleanEntityName(localized[1]);

    const underlined = line.match(/<u>\s*<b>([^<]+)<\/b>\s*<\/u>/i);
    if (underlined) return cleanEntityName(underlined[1]);

    const highlighted = line.match(/color=0xFF40FFCF>\s*-?\s*<b>([^<]+)<\/b>/i);
    return highlighted ? cleanEntityName(highlighted[1]) : "";
}

function extractPilot(line) {
    const explicitPilot = line.match(/<font\s+size=12><color=0xFFFFFFFF>\s*<b>([^<]+)<\/b>/i);
    if (explicitPilot) return cleanEntityName(explicitPilot[1]);

    const broadPilot = line.match(/<color=0xFFFFFFFF>\s*<b>([^<]+)<\/b>/i);
    return broadPilot ? cleanEntityName(broadPilot[1]) : "";
}

function extractDamageTarget(line) {
    const highlighted = line.match(/<b><color=0xffffffff>([\s\S]*?)<\/b>/i);
    if (highlighted) return cleanEntityName(highlighted[1]) || "Unknown";

    const afterTo = line.match(/(?:<font[^>]*>\s*对\s*<\/font>|\bto\b)([\s\S]*?)(?:\s+-\s+|$)/i);
    if (afterTo) return cleanEntityName(afterTo[1]) || "Unknown";

    const missed = line.match(/(?:完全没有打中|miss(?:es|ed)?)\s*([^\-]+?)(?:\s+-\s+|$)/i);
    return missed ? cleanEntityName(missed[1]) : "Unknown";
}

function extractDamageWeapon(line) {
    const visible = stripMarkup(line);
    const separated = visible.match(/\s-\s+(.+?)\s+-\s+(?:命中|未命中|轻轻擦过|穿透|强力一击|hit(?:s)?|miss(?:es|ed)?|glanc(?:es|ed|ing)?|penetrat(?:es|ed|ing)?|critical|strong)(?:\s|$)/i);
    if (separated) return cleanEntityName(separated[1]) || UNKNOWN_WEAPON;

    const payload = visible.replace(/^\[.*?\]\s*\(combat\)\s*/i, "");
    const missed = payload.match(/^(?:你的\s*|your\s+)?(.+?)\s+(?:完全没有打中|未命中|miss(?:es|ed)?)(?:\s|$)/i);
    return missed ? cleanEntityName(missed[1]) || UNKNOWN_WEAPON : UNKNOWN_WEAPON;
}

function extractRepairTarget(line) {
    const pilot = extractPilot(line);
    const ship = extractShip(line);

    if (pilot && ship) return `${pilot} (${ship})`;
    if (pilot) return pilot;
    if (ship) return ship;

    const marker = line.includes("远程装甲维修量由") ? "远程装甲维修量由" : "远程装甲维修量至";
    const remainder = line.split(marker)[1] || "";
    const visible = cleanEntityName(remainder.split(" - ")[0]);
    return visible || "Unknown";
}

function classifyHit(line) {
    if (/(完全没有打中|未命中|\bmiss(?:es|ed)?\b)/i.test(line)) return "miss";
    if (/(强力一击|暴击|\bcritical\b|\bstrong\b)/i.test(line)) return "critical";
    if (/(穿透|\bpenetrat(?:e|es|ed|ion)\b)/i.test(line)) return "penetration";
    if (/(轻轻擦过|\bglanc(?:e|es|ed|ing)\b)/i.test(line)) return "glancing";
    return "normal";
}

function detectRichEvent(line) {
    const timestamp = extractTimestamp(line);

    if (line.includes("color=0xff00ffff") || line.includes("完全没有打中")) {
        const missed = /(完全没有打中|未命中|\bmiss(?:es|ed)?\b)/i.test(line);
        return {
            timestamp,
            type: EVENT_TYPES.DAMAGE,
            target: extractDamageTarget(line),
            weapon: extractDamageWeapon(line),
            value: missed ? 0 : extractAmount(line),
            quality: classifyHit(line)
        };
    }

    if (line.includes("color=0xffccff66")) {
        const isReceived = line.includes("远程装甲维修量由") || /received\s+remote\s+(?:armor\s+)?repair/i.test(line);
        const isOutgoing = line.includes("远程装甲维修量至") || /remote\s+(?:armor\s+)?repair\s+to/i.test(line);
        if (!isReceived && !isOutgoing) return null;

        return {
            timestamp,
            type: isReceived ? EVENT_TYPES.RECEIVED : EVENT_TYPES.REPAIR,
            target: extractRepairTarget(line),
            value: extractAmount(line),
            quality: null
        };
    }

    return null;
}

function detectPlainEvent(line) {
    const bracketed = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+\[(DAMAGE|REPAIR|RECEIVED_REPAIR)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+([\d,]+)/i);
    const plain = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(DAMAGE|REPAIR|RECEIVED_REPAIR)\s+(\S+)\s+(\S+)\s+([\d,]+)/i);
    const match = bracketed || plain;
    if (!match) return null;

    const normalizedType = match[2].toUpperCase();
    const type = normalizedType === "DAMAGE"
        ? EVENT_TYPES.DAMAGE
        : normalizedType === "RECEIVED_REPAIR"
            ? EVENT_TYPES.RECEIVED
            : EVENT_TYPES.REPAIR;

    return {
        timestamp: match[1].replace(/-/g, "."),
        type,
        target: cleanEntityName(match[4]) || "Unknown",
        weapon: type === EVENT_TYPES.DAMAGE ? UNKNOWN_WEAPON : null,
        value: parseNumber(match[5]),
        quality: type === EVENT_TYPES.DAMAGE ? classifyHit(line) : null
    };
}

function addToGroup(group, key, amount) {
    group[key] = (group[key] || 0) + amount;
}

function createAnalysis() {
    return {
        totalDamage: 0,
        totalRepair: 0,
        totalReceivedRepair: 0,
        damageByTarget: {},
        damageByWeapon: {},
        repairByTarget: {},
        receivedBySource: {},
        events: [],
        processedLines: 0,
        unrecognizedLines: 0,
        ignoredLines: 0,
        combatStartTime: null,
        combatEndTime: null,
        character: null,
        hitStats: {
            total: 0,
            glancing: 0,
            normal: 0,
            penetration: 0,
            critical: 0,
            miss: 0
        },
        hitRates: {},
        repairStats: {
            totalCount: 0,
            zeroCount: 0,
            zeroRate: 0,
            averageValue: 0
        }
    };
}

function updateTimeRange(analysis, timestamp) {
    const value = timestampToMs(timestamp);
    if (!Number.isFinite(value)) return;

    const start = timestampToMs(analysis.combatStartTime);
    const end = timestampToMs(analysis.combatEndTime);
    if (!Number.isFinite(start) || value < start) analysis.combatStartTime = timestamp;
    if (!Number.isFinite(end) || value > end) analysis.combatEndTime = timestamp;
}

function finalizeAnalysis(analysis) {
    const hitKeys = ["glancing", "normal", "penetration", "critical", "miss"];
    for (const key of hitKeys) {
        analysis.hitRates[key] = analysis.hitStats.total
            ? (analysis.hitStats[key] / analysis.hitStats.total) * 100
            : 0;
    }

    if (analysis.repairStats.totalCount) {
        analysis.repairStats.zeroRate = (analysis.repairStats.zeroCount / analysis.repairStats.totalCount) * 100;
        analysis.repairStats.averageValue = analysis.totalRepair / analysis.repairStats.totalCount;
    }

    analysis.events.sort((a, b) => {
        const aTime = timestampToMs(a.timestamp);
        const bTime = timestampToMs(b.timestamp);
        if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
        if (!Number.isFinite(aTime)) return 1;
        if (!Number.isFinite(bTime)) return -1;
        return aTime - bTime;
    });

    return analysis;
}

export function analyzeLogText(content) {
    const analysis = createAnalysis();
    const lines = String(content || "").split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const listener = line.match(/(?:收听者|Listener):\s*(.+)$/i);
        if (listener) {
            analysis.character = listener[1].trim();
            updateTimeRange(analysis, extractTimestamp(line));
            analysis.ignoredLines += 1;
            continue;
        }

        const event = detectPlainEvent(line) || detectRichEvent(line);
        if (!event || event.value === null || event.value === undefined) {
            analysis.unrecognizedLines += 1;
            continue;
        }

        analysis.processedLines += 1;
        analysis.events.push(event);
        updateTimeRange(analysis, event.timestamp);

        if (event.type === EVENT_TYPES.DAMAGE) {
            analysis.totalDamage += event.value;
            addToGroup(analysis.damageByTarget, event.target, event.value);
            addToGroup(analysis.damageByWeapon, event.weapon || UNKNOWN_WEAPON, event.value);
            analysis.hitStats.total += 1;
            analysis.hitStats[event.quality || "normal"] += 1;
        }

        if (event.type === EVENT_TYPES.REPAIR) {
            analysis.totalRepair += event.value;
            addToGroup(analysis.repairByTarget, event.target, event.value);
            analysis.repairStats.totalCount += 1;
            if (event.value === 0) analysis.repairStats.zeroCount += 1;
        }

        if (event.type === EVENT_TYPES.RECEIVED) {
            analysis.totalReceivedRepair += event.value;
            addToGroup(analysis.receivedBySource, event.target, event.value);
        }
    }

    return finalizeAnalysis(analysis);
}

export { EVENT_TYPES };
