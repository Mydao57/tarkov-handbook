import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/**
 * Structural shape shared by every `SlashCommandBuilder` variant
 * (options-only, subcommands-only, ...). Keeps the registry free of
 * builder-type gymnastics.
 */
export interface SlashCommandData {
  name: string;
  toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface Command {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
