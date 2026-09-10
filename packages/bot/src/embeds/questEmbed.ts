import { EmbedBuilder } from "discord.js";
import { t, type Locale } from "../i18n/index.js";
import { clampField } from "../lib/format.js";
import type { TaskDetail, TaskObjective, TaskRewards } from "../types/tarkov.js";

const QUEST_COLOR = 0x2e86c1;

function formatObjective(objective: TaskObjective, locale: Locale): string {
  const extras: string[] = [];
  if (objective.foundInRaid) extras.push(t(locale, "quest.fir"));
  const mapNames = objective.maps.map((m) => m.name).filter(Boolean);
  if (mapNames.length > 0) extras.push(mapNames.join(", "));

  const marker = objective.optional ? "◇" : "◆";
  const suffix = extras.length > 0 ? ` _(${extras.join(" • ")})_` : "";
  return `${marker} ${objective.description}${suffix}`;
}

function formatUnlocks(rewards: TaskRewards | null): string {
  if (!rewards) return "";
  const lines: string[] = [];

  for (const offer of rewards.offerUnlock) {
    const name = offer.item.name ?? offer.item.shortName ?? "?";
    lines.push(`• ${offer.trader.name} LL${offer.level}: ${name}`);
  }
  for (const skill of rewards.skillLevelReward) {
    lines.push(`• +${skill.level} ${skill.name}`);
  }
  for (const standing of rewards.traderStanding) {
    const sign = standing.standing > 0 ? "+" : "";
    lines.push(`• ${standing.trader.name} ${sign}${standing.standing} rep`);
  }
  for (const trader of rewards.traderUnlock) {
    lines.push(`• ${trader.name} (unlocked)`);
  }
  for (const reward of rewards.items) {
    const name = reward.item.name ?? reward.item.shortName ?? "?";
    lines.push(`• ${reward.count}× ${name}`);
  }

  return lines.join("\n");
}

export function buildQuestEmbed(task: TaskDetail, locale: Locale): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(QUEST_COLOR).setTitle(task.name);
  if (task.wikiLink) embed.setURL(task.wikiLink);
  if (task.taskImageLink) embed.setThumbnail(task.taskImageLink);

  const meta: string[] = [`**${t(locale, "quest.trader")}:** ${task.trader.name}`];
  if (task.map) meta.push(`**${t(locale, "quest.map")}:** ${task.map.name}`);
  if (task.minPlayerLevel) meta.push(`**${t(locale, "quest.minLevel")}:** ${task.minPlayerLevel}`);
  if (task.experience) meta.push(`**XP:** ${task.experience.toLocaleString("en-US")}`);
  if (task.factionName && task.factionName !== "Any") {
    meta.push(`**${t(locale, "quest.faction")}:** ${task.factionName}`);
  }
  if (task.kappaRequired) meta.push(`**${t(locale, "quest.kappa")}** ✅`);
  embed.setDescription(meta.join("\n"));

  if (task.taskRequirements.length > 0) {
    embed.addFields({
      name: t(locale, "quest.requires"),
      value: clampField(task.taskRequirements.map((r) => `• ${r.task.name}`).join("\n")),
    });
  }

  const objectiveText = task.objectives.map((o) => formatObjective(o, locale)).join("\n");
  embed.addFields({
    name: `🎯 ${t(locale, "quest.objectives")} (${task.objectives.length})`,
    value: clampField(objectiveText) || "—",
  });

  const unlocks = formatUnlocks(task.finishRewards);
  if (unlocks) {
    embed.addFields({ name: `🔓 ${t(locale, "quest.unlocks")}`, value: clampField(unlocks) });
  }

  return embed;
}
