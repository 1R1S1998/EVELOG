import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeLogText, timestampToMs } from "../static/js/parser.js";


async function fixture(name) {
    return readFile(new URL(`../${name}`, import.meta.url), "utf8");
}

test("parses damage, outgoing repairs, hit quality, and combat metadata", async () => {
    const analysis = analyzeLogText(await fixture("test_log.txt"));

    assert.equal(analysis.totalDamage, 1_200_911);
    assert.equal(analysis.totalRepair, 1_623);
    assert.equal(analysis.totalReceivedRepair, 0);
    assert.equal(analysis.processedLines, 3);
    assert.equal(analysis.character, "L-Tilda");
    assert.equal(analysis.combatStartTime, "2026.02.22 13:30:00");
    assert.equal(analysis.hitStats.total, 1);
    assert.equal(analysis.hitStats.normal, 1);
    assert.equal(analysis.repairStats.totalCount, 2);
    assert.equal(analysis.repairStats.zeroCount, 1);
    assert.equal(analysis.repairStats.averageValue, 811.5);
    assert.equal(analysis.events[0].type, "damage");
});
test("parses received repairs and sorts events chronologically", async () => {
    const analysis = analyzeLogText(await fixture("test_received_repair.txt"));

    assert.equal(analysis.totalReceivedRepair, 8_000);
    assert.equal(analysis.receivedBySource["B0ZziLLa (巴戈龙级)"], 5_000);
    assert.equal(analysis.receivedBySource["TestPilot (多米尼克斯级)"], 3_000);

    const times = analysis.events.map((event) => timestampToMs(event.timestamp));
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test("preserves listener names containing spaces", async () => {
    const analysis = analyzeLogText(await fixture("test_full_combat_id.txt"));
    assert.equal(analysis.character, "Penelope Chelien");
});

test("classifies specific hit qualities before generic hits", () => {
    const log = [
        "[2026-02-22 13:00:00] [DAMAGE] [me] [a] 10 强力一击",
        "[2026-02-22 13:00:01] [DAMAGE] [me] [b] 20 穿透",
        "[2026-02-22 13:00:02] [DAMAGE] [me] [c] 30 轻轻擦过",
        "[2026-02-22 13:00:03] [DAMAGE] [me] [d] 0 完全没有打中"
    ].join("\n");
    const analysis = analyzeLogText(log);

    assert.equal(analysis.hitStats.critical, 1);
    assert.equal(analysis.hitStats.penetration, 1);
    assert.equal(analysis.hitStats.glancing, 1);
    assert.equal(analysis.hitStats.miss, 1);
    assert.equal(analysis.hitStats.normal, 0);
});
