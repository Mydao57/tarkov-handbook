import type { Command } from "../types/command.js";
import { ammoCommand } from "./ammo.js";
import { itemCommand } from "./item.js";
import { langCommand } from "./lang.js";
import { questCommand } from "./quest.js";

export const commands: Command[] = [itemCommand, ammoCommand, questCommand, langCommand];

export const commandMap: Map<string, Command> = new Map(
  commands.map((command) => [command.data.name, command]),
);
