import http from "http";
http.createServer((_, res) => res.end("Cheddar Bot Online")).listen(process.env.PORT || 10000);

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  ChatInputCommandInteraction,
  ButtonInteraction,
  GuildMember,
  TextChannel,
} from "discord.js";

import Database from "better-sqlite3";

// ============================================================
// 🧀 CHEDDAR BOT
// All commands and messages are in English.
// ============================================================

// ============================================================
// 🔐 CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ID_OWNER = process.env.ID_OWNER?.trim();

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is not configured.");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID is not configured.");
  process.exit(1);
}

if (!ID_OWNER || !/^\d{17,20}$/.test(ID_OWNER)) {
  console.error("❌ ID_OWNER must be set to your Discord user ID (17–20 digits), not a Discord bot token.");
  process.exit(1);
}

// ============================================================
// 🤖 CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ============================================================
// 💾 DATABASE
// ============================================================

const db = new Database("cheddar.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    coins INTEGER DEFAULT 100,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_daily INTEGER DEFAULT 0,
    last_work INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item TEXT NOT NULL,
    amount INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, guild_id, item)
  );

  CREATE TABLE IF NOT EXISTS config (
    guild_id TEXT PRIMARY KEY,
    welcome_channel TEXT,
    log_channel TEXT,
    auto_role_id TEXT
  );

`);

// Safe migrations for databases created by older versions of Cheddar.
for (const migration of [
  "ALTER TABLE config ADD COLUMN auto_role_id TEXT",
]) {
  try { db.exec(migration); } catch (error) {
    if (!(String(error).includes("duplicate column name"))) throw error;
  }
}

// ============================================================
// 🎨 COLORS
// ============================================================

const COLORS = {
  primary: 0xffd700,
  success: 0x2ecc71,
  error: 0xe74c3c,
  info: 0x3498db,
  purple: 0x9b59b6,
  orange: 0xf39c12,
  red: 0xc0392b,
  blue: 0x5865f2,
  pink: 0xe84393,
};

// ============================================================
// 🧀 FOOTER
// ============================================================

const AVATAR_URL =
  "https://cdn-icons-png.flaticon.com/512/924/924514.png";

function footer() {
  return {
    text: "🧀 CHEDDAR • by YoQuesoso",
    iconURL: AVATAR_URL,
  };
}

// ============================================================
// 🎲 UTILITIES
// ============================================================

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(number: number) {
  return number.toLocaleString("en-US");
}

// ============================================================
// 😂 JOKES
// ============================================================

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "What does JavaScript do at the bar? console.log() 🍺",
  "SQL walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍺",
  "What do you call a programmer on Halloween? A boo-leon! 👻",
  "Why is Java a great island? Because it has too many objects! 🏝️",
  "What did one bit say to another? See you on the bus. 💻",
  "What is a programmer's biggest problem? Having too many bugs. 🐛",
  "What does a programmer drink when they're cold? Java. ☕",
  "Why did the code go to the doctor? It had too many errors. 🏥",
  "HTML walked into a party and CSS said: 'Looking stylish!' 😎",
  "What does a programmer say to their partner? You're my constant variable. ❤️",
  "There are 10 types of people: those who understand binary and those who don't. 🤖",
  "Why did the developer go broke? Because they used up all their cache. 💸",
  "Why don't programmers like nature? It has too many bugs. 🐛",
  "A programmer's favorite place? The localhost. 🏠",
];

// ============================================================
// 📚 FUN FACTS
// ============================================================

const FACTS = [
  "Octopuses have three hearts. 🐙",
  "Honey can remain edible for thousands of years. 🍯",
  "Bees use movements to communicate with each other. 🐝",
  "Butterflies taste with their feet. 🦋",
  "Dolphins use unique sounds to identify each other. 🐬",
  "Bananas are technically berries. 🍌",
  "Sharks existed before trees. 🦈",
  "Lightning can reach temperatures much hotter than the surface of the Sun. ⚡",
  "Cats have specialized muscles that allow them to move their ears. 🐱",
  "Crows are capable of solving complex problems. 🐦",
  "Blue whales have enormous hearts compared with most other animals. 🐋",
  "Some turtles can absorb oxygen through structures near their cloaca. 🐢",
  "A group of flamingos is called a flamboyance. 🦩",
  "Wombat poop is cube-shaped. 🐾",
  "Some frogs can freeze during winter and survive. 🐸",
];

// ============================================================
// 👋 GREETINGS
// ============================================================

const GREETINGS = [
  "Hello {user}! 👋",
  "What's up, {user}! 🎉",
  "Hey {user}! 😄",
  "Greetings, {user}! 🤖",
  "Welcome, {user}! 🚀",
  "Hey there, {user}! ⚡",
];

// ============================================================
// 🌙 GOODBYES
// ============================================================

const FAREWELLS = [
  "See you later, {user}! 👋",
  "See you around, {user}! 🚀",
  "Take care, {user}! 💪",
  "Come back soon, {user}! 🎊",
  "See you next time, {user}! ✨",
  "Have a great one, {user}! 🌟",
];

// ============================================================
// 🧠 TRIVIA
// ============================================================

const TRIVIA = [
  {
    question: "What is the largest planet in the Solar System?",
    options: ["Mars", "Jupiter", "Venus", "Mercury"],
    answer: "Jupiter",
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    answer: "6",
  },
  {
    question: "What is the largest ocean?",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: "Pacific",
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    answer: "Mars",
  },
  {
    question: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    answer: "7",
  },
];

// ============================================================
// 🛍️ SHOP
// ============================================================

const SHOP = {
  pizza: {
    name: "🍕 Pizza",
    price: 100,
  },
  espada: {
    name: "⚔️ Cheese Sword",
    price: 500,
  },
  corona: {
    name: "👑 CHEDDAR Crown",
    price: 1000,
  },
  diamante: {
    name: "💎 Diamond",
    price: 2500,
  },
};

// ============================================================
// 💾 USER FUNCTIONS
// ============================================================

function ensureUser(userId: string, guildId: string) {
  db.prepare(`
    INSERT OR IGNORE INTO users
    (user_id, guild_id, coins, xp, level, last_daily, last_work)
    VALUES (?, ?, 100, 0, 1, 0, 0)
  `).run(userId, guildId);
}

function getUser(userId: string, guildId: string) {
  ensureUser(userId, guildId);

  return db
    .prepare(`
      SELECT *
      FROM users
      WHERE user_id = ?
      AND guild_id = ?
    `)
    .get(userId, guildId) as {
      user_id: string;
      guild_id: string;
      coins: number;
      xp: number;
      level: number;
      last_daily: number;
      last_work: number;
    };
}

function addCoins(
  userId: string,
  guildId: string,
  amount: number
) {
  ensureUser(userId, guildId);

  db.prepare(`
    UPDATE users
    SET coins = coins + ?
    WHERE user_id = ?
    AND guild_id = ?
  `).run(amount, userId, guildId);
}

function removeCoins(
  userId: string,
  guildId: string,
  amount: number
) {
  ensureUser(userId, guildId);

  db.prepare(`
    UPDATE users
    SET coins = coins - ?
    WHERE user_id = ?
    AND guild_id = ?
  `).run(amount, userId, guildId);
}

// ============================================================
// ⭐ XP SYSTEM
// ============================================================

function addXP(
  userId: string,
  guildId: string,
  amount: number
) {
  const user = getUser(userId, guildId);

  const oldLevel = user.level;
  const newXP = user.xp + amount;

  const newLevel =
    Math.floor(newXP / 100) + 1;

  db.prepare(`
    UPDATE users
    SET xp = ?, level = ?
    WHERE user_id = ?
    AND guild_id = ?
  `).run(
    newXP,
    newLevel,
    userId,
    guildId
  );

  return {
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

// ============================================================
// 🎒 INVENTORY
// ============================================================

function addItem(
  userId: string,
  guildId: string,
  item: string,
  amount = 1
) {
  db.prepare(`
    INSERT INTO inventory
    (user_id, guild_id, item, amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, item)
    DO UPDATE SET amount = amount + excluded.amount
  `).run(
    userId,
    guildId,
    item,
    amount
  );
}

function getInventory(
  userId: string,
  guildId: string
) {
  return db
    .prepare(`
      SELECT *
      FROM inventory
      WHERE user_id = ?
      AND guild_id = ?
    `)
    .all(
      userId,
      guildId
    ) as {
      item: string;
      amount: number;
    }[];
}

// ============================================================
// 🎨 EMBEDS
// ============================================================

function createEmbed(
  title: string,
  description: string,
  color: number
) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter(footer())
    .setTimestamp();
}

// ============================================================
// 🔘 BUTTON
// ============================================================

function button(
  id: string,
  label: string,
  style: ButtonStyle,
  emoji?: string
) {
  const btn = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style);

  if (emoji) {
    btn.setEmoji(emoji);
  }

  return btn;
}

// ============================================================
// 📜 COMMANDS
// ============================================================

const commands = [

  new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Greet the community"),

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Say goodbye to the community"),

  new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Tell a joke"),

  new SlashCommandBuilder()
    .setName("fact")
    .setDescription("Show a fun fact"),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll a die"),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Show bot latency"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all commands"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show your profile"),

  new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your level"),

  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Show the server leaderboard"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily coins"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn coins"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Show your coins"),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Show the shop"),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item you want to buy")
        .setRequired(true)
        .addChoices(
          {
            name: "🍕 Pizza",
            value: "pizza",
          },
          {
            name: "⚔️ Cheese Sword",
            value: "espada",
          },
          {
            name: "👑 CHEDDAR Crown",
            value: "corona",
          },
          {
            name: "💎 Diamond",
            value: "diamante",
          },
        )
    ),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Show your inventory"),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Play a trivia question"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock, paper, scissors")
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          {
            name: "🪨 Rock",
            value: "rock",
          },
          {
            name: "📄 Paper",
            value: "paper",
          },
          {
            name: "✂️ Scissors",
            value: "scissors",
          },
        )
    ),


  new SlashCommandBuilder()
    .setName("creative-prompt")
    .setDescription("Get a low-pressure creative idea for the chat"),

  new SlashCommandBuilder()
    .setName("cat-fact")
    .setDescription("Share a cat fact or a low-key cat observation"),

  new SlashCommandBuilder()
    .setName("craft-note")
    .setDescription("Get a Minecraft-inspired thought or conversation prompt"),

  new SlashCommandBuilder()
    .setName("movie-prompt")
    .setDescription("Start a film conversation without spoiling the plot"),

  new SlashCommandBuilder()
    .setName("conversation-starter")
    .setDescription("Get a relaxed prompt for the chat"),

  new SlashCommandBuilder()
    .setName("would-you-rather")
    .setDescription("Get a light would-you-rather question"),

  new SlashCommandBuilder()
    .setName("adminpanel")
    .setDescription("Open the server setup panel")
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Set the channel used for new-member welcomes")
    .setDefaultMemberPermissions(null)
    .addChannelOption(option => option.setName("channel").setDescription("Welcome channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("setautorole")
    .setDescription("Set the role automatically assigned to new members")
    .setDefaultMemberPermissions(null)
    .addRoleOption(option => option.setName("role").setDescription("Role to assign to new members").setRequired(true)),

  new SlashCommandBuilder()
    .setName("rolepanel")
    .setDescription("Post the optional interest-role panel")
    .setDefaultMemberPermissions(null),


].map(command => command.toJSON());

// ============================================================
// 📡 REGISTER COMMANDS
// ============================================================

async function registerCommands() {
  const rest = new REST({
    version: "10",
  }).setToken(TOKEN!);

  try {
    console.log("🔄 Registering commands...");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID!),
      {
        body: commands,
      }
    );

    console.log(
      `✅ ${commands.length} commands registered.`
    );

  } catch (error) {
    console.error(
      "❌ Error registering commands:",
      error
    );
  }
}

// ============================================================
// 👋 WELCOME SYSTEM
// ============================================================

client.on("guildMemberAdd", async member => {

  try {
    // Apply the configured starter role if the bot can manage it.
    const roleConfig = db.prepare("SELECT auto_role_id FROM config WHERE guild_id = ?")
      .get(member.guild.id) as { auto_role_id: string | null } | undefined;
    if (roleConfig?.auto_role_id) {
      const role = member.guild.roles.cache.get(roleConfig.auto_role_id);
      const botMember = member.guild.members.me;
      if (role && botMember && role.id !== member.guild.id && role.position < botMember.roles.highest.position && !role.managed) {
        await member.roles.add(role, "Configured automatic member role").catch(error =>
          console.error("Automatic role assignment failed:", error)
        );
      }
    }

    const config = db
      .prepare(`
        SELECT welcome_channel
        FROM config
        WHERE guild_id = ?
      `)
      .get(member.guild.id) as {
        welcome_channel: string | null;
      } | undefined;

    let channel: TextChannel | undefined;

    if (config?.welcome_channel) {

      const found =
        member.guild.channels.cache.get(
          config.welcome_channel
        );

      if (found?.isTextBased()) {
        channel =
          found as TextChannel;
      }
    }

    // Do not post welcome messages in an arbitrary channel. Configure one with /setwelcome.
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("🎉 Welcome to the server!")
      .setDescription(
        `Welcome ${member}! 👋\n\n` +
        `We hope you enjoy **${member.guild.name}**! 🧀`
      )
      .setThumbnail(
        member.user.displayAvatarURL()
      )
      .addFields(
        {
          name: "👤 User",
          value: member.user.username,
          inline: true,
        },
        {
          name: "👥 Members",
          value: `${member.guild.memberCount}`,
          inline: true,
        }
      )
      .setColor(COLORS.success)
      .setFooter(footer())
      .setTimestamp();

    await channel.send({
      content: `${member}`,
      embeds: [embed],
    });

  } catch (error) {
    console.error(
      "❌ Welcome system error:",
      error
    );
  }
});

// ============================================================
// 💬 INTERACTION HANDLER
// ============================================================

client.on("interactionCreate", async interaction => {

  try {

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    await handleCommand(interaction);

  } catch (error) {

    console.error(
      "❌ Interaction error:",
      error
    );

    const response = {
      embeds: [
        createEmbed(
          "❌ Error",
          "Something went wrong while processing your request. Please try again.",
          COLORS.error
        ),
      ],
      ephemeral: true,
    };

    if (
      interaction.replied ||
      interaction.deferred
    ) {

      await interaction.followUp(
        response
      );

    } else {

      await interaction.reply(
        response
      );
    }
  }
});

// ============================================================
// 🎯 COMMAND HANDLER
// ============================================================

async function handleCommand(
  interaction: ChatInputCommandInteraction
) {

  const commandName =
    interaction.commandName;

  const guild =
    interaction.guild;

  if (!guild) {

    await interaction.reply({
      content:
        "❌ This command can only be used inside a server.",
      ephemeral: true,
    });

    return;
  }

  // Owner-only commands are enforced at runtime, regardless of Discord's
  // cached command permissions. ID_OWNER is the owner's Discord user ID.
  // Keep ordinary community commands available to other members.
  const ownerOnlyCommands = new Set([
    "adminpanel",
    "setwelcome",
    "setautorole",
    "rolepanel",
  ]);

  if (ownerOnlyCommands.has(commandName) && interaction.user.id !== ID_OWNER) {
    await interaction.reply({
      content: "⛔ This command is restricted to the bot owner.",
      ephemeral: true,
    });
    return;
  }

  const user =
    interaction.user;

  ensureUser(
    user.id,
    guild.id
  );

  if (commandName === "creative-prompt") {
    const prompt = pickChatEntry(CREATIVE_CHAT_PROMPTS);
    await interaction.reply({ embeds: [createEmbed("🧩 Creative Corner", prompt.text, COLORS.orange)] });
    return;
  }

  if (commandName === "cat-fact") {
    const entry = pickChatEntry(CAT_CHAT_NOTES);
    await interaction.reply({ embeds: [createEmbed(entry.title, entry.text, COLORS.pink)] });
    return;
  }

  if (commandName === "craft-note") {
    const entry = pickChatEntry(MINECRAFT_CHAT_NOTES);
    await interaction.reply({ embeds: [createEmbed(entry.title, entry.text, COLORS.success)] });
    return;
  }

  if (commandName === "movie-prompt") {
    const entry = pickChatEntry(FILM_CHAT_PROMPTS);
    await interaction.reply({ embeds: [createEmbed("🎬 Film Chat", entry, COLORS.purple)] });
    return;
  }

  if (commandName === "conversation-starter") {
    const entry = pickChatEntry(GENERAL_CHAT_PROMPTS);
    await interaction.reply({ embeds: [createEmbed("💬 Conversation Starter", entry, COLORS.info)] });
    return;
  }

  if (commandName === "would-you-rather") {
    const entry = pickChatEntry(THIS_OR_THAT_PROMPTS);
    await interaction.reply({ embeds: [createEmbed("↔️ Would You Rather?", entry, COLORS.orange)] });
    return;
  }

  if (commandName === "adminpanel") {
    const cfg = db.prepare("SELECT welcome_channel, auto_role_id FROM config WHERE guild_id = ?")
      .get(guild.id) as { welcome_channel: string | null; auto_role_id: string | null } | undefined;
    const embed = new EmbedBuilder()
      .setTitle("Cheddar | Server Control Panel")
      .setDescription("A small control panel for the chat community. Use the commands below to configure welcomes, starter roles, and interest roles.")
      .addFields(
        { name: "Welcome channel", value: cfg?.welcome_channel ? `<#${cfg.welcome_channel}>` : "Not configured — use `/setwelcome`", inline: false },
        { name: "Automatic starter role", value: cfg?.auto_role_id ? `<@&${cfg.auto_role_id}>` : "Not configured — use `/setautorole`", inline: false },
        { name: "Interest roles", value: "Use `/rolepanel` to publish the optional Cat Corner, Minecraft, and Film Chat role picker.", inline: false },
        { name: "Chat features", value: "Use `/cat-fact`, `/craft-note`, `/movie-prompt`, `/conversation-starter`, `/creative-prompt`, and `/would-you-rather` for conversation ideas.", inline: false }
      )
      .setColor(COLORS.blue).setFooter(footer()).setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (commandName === "setwelcome") {
    const channel = interaction.options.getChannel("channel", true);
    if (!channel.isTextBased() || !("send" in channel)) {
      await interaction.reply({ content: "Choose a text channel where the bot can send messages.", ephemeral: true });
      return;
    }
    db.prepare(`INSERT INTO config (guild_id, welcome_channel) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel = excluded.welcome_channel`)
      .run(guild.id, channel.id);
    await interaction.reply({ content: `Welcome messages will be sent in <#${channel.id}>.`, ephemeral: true });
    return;
  }

  if (commandName === "setautorole") {
    const role = interaction.options.getRole("role", true);
    const botMember = guild.members.me;
    if (role.id === guild.id || !botMember || role.position >= botMember.roles.highest.position || role.managed) {
      await interaction.reply({ content: "I cannot assign that role. Choose a normal role below my highest role in Server Settings → Roles.", ephemeral: true });
      return;
    }
    db.prepare(`INSERT INTO config (guild_id, auto_role_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET auto_role_id = excluded.auto_role_id`)
      .run(guild.id, role.id);
    await interaction.reply({ content: `New members will receive ${role}. Make sure the bot's role is above it.`, ephemeral: true });
    return;
  }

  if (commandName === "rolepanel") {
    const embed = new EmbedBuilder()
      .setTitle("Pick your corner of the server")
      .setDescription("Choose the topics you want to see. Press a button again to remove that role. These are interest labels, not staff or permission roles.\n\n🐈 Cat Corner · ⛏️ Minecraft · 🎬 Film Chat")
      .setColor(COLORS.purple).setFooter(footer());
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("interest_cats", "Cat Corner", ButtonStyle.Secondary, "🐈"),
      button("interest_minecraft", "Minecraft", ButtonStyle.Success, "⛏️"),
      button("interest_movies", "Film Chat", ButtonStyle.Secondary, "🎬")
    );
    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  // ==========================================================
  // 👋 HELLO
  // ==========================================================

  if (commandName === "hello") {

    const greeting =
      random(GREETINGS)
        .replace(
          "{user}",
          user.username
        );

    const embed =
      createEmbed(
        "👋 Hello!",
        `✨ ${greeting}`,
        COLORS.primary
      );

    const row =
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          button(
            "another_greeting",
            "Another greeting",
            ButtonStyle.Primary,
            "👋"
          )
        );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 🌙 GOODBYE
  // ==========================================================

  if (commandName === "goodbye") {

    const goodbye =
      random(FAREWELLS)
        .replace(
          "{user}",
          user.username
        );

    await interaction.reply({
      embeds: [
        createEmbed(
          "🌙 Goodbye",
          goodbye,
          COLORS.info
        ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 😂 JOKE
  // ==========================================================

  if (commandName === "joke") {

    await interaction.reply({

      embeds: [
        createEmbed(
          "😂 Joke of the Day",
          `> ${random(JOKES)}`,
          COLORS.purple
        ),
      ],

      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            button(
              "another_joke",
              "Another joke",
              ButtonStyle.Secondary,
              "😂"
            )
          ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 📚 FACT
  // ==========================================================

  if (commandName === "fact") {

    await interaction.reply({

      embeds: [
        createEmbed(
          "📚 Fun Fact",
          `> ${random(FACTS)}`,
          COLORS.success
        ),
      ],

      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            button(
              "another_fact",
              "Another fact",
              ButtonStyle.Secondary,
              "📚"
            )
          ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 🎲 DICE
  // ==========================================================

  if (commandName === "dice") {

    const result =
      randomNumber(1, 6);

    const emojis = [
      "",
      "1️⃣",
      "2️⃣",
      "3️⃣",
      "4️⃣",
      "5️⃣",
      "6️⃣",
    ];

    await interaction.reply({

      embeds: [
        createEmbed(
          "🎲 Dice Roll",
          `${emojis[result]} **You rolled ${result}!**`,
          COLORS.red
        ),
      ],

      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            button(
              "another_dice",
              "Roll again",
              ButtonStyle.Danger,
              "🎲"
            )
          ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 🪙 COINFLIP
  // ==========================================================

  if (commandName === "coinflip") {

    const heads =
      Math.random() < 0.5;

    await interaction.reply({

      embeds: [
        createEmbed(
          "🪙 Coin Flip",
          heads
            ? "🪙 **Heads!**"
            : "🌙 **Tails!**",
          COLORS.orange
        ),
      ],

      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            button(
              "another_coin",
              "Flip again",
              ButtonStyle.Success,
              "🪙"
            )
          ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      5
    );

    return;
  }

  // ==========================================================
  // 🏓 PING
  // ==========================================================

  if (commandName === "ping") {

    const ping =
      client.ws.ping;

    const status =
      ping < 100
        ? "🟢 Excellent"
        : ping < 200
          ? "🟡 Good"
          : "🔴 High";

    await interaction.reply({

      embeds: [
        new EmbedBuilder()
          .setTitle("🏓 Pong!")
          .addFields(
            {
              name: "📡 WebSocket",
              value: `${ping}ms`,
              inline: true,
            },
            {
              name: "📊 Status",
              value: status,
              inline: true,
            }
          )
          .setColor(COLORS.blue)
          .setFooter(footer())
          .setTimestamp(),
      ],

    });

    return;
  }

  // ==========================================================
  // ❓ AYUDA
  // ==========================================================

  if (commandName === "help") {

    const embed =
      new EmbedBuilder()
        .setTitle(
          "🧀 CHEDDAR Help Center"
        )
        .setDescription(
          "Welcome to the CHEDDAR command center!\n\n" +
          "Here are all the features currently available."
        )
        .addFields(

          {
            name: "🎉 Entertainment",
            value:
              "`/hello`\n" +
              "`/goodbye`\n" +
              "`/joke`\n" +
              "`/fact`\n" +
              "`/dice`\n" +
              "`/coinflip`\n" +
              "`/trivia`\n" +
              "`/8ball`\n" +
              "`/rps`",
            inline: true,
          },

          {
            name: "💰 Economy",
            value:
              "`/balance`\n" +
              "`/daily`\n" +
              "`/work`\n" +
              "`/shop`\n" +
              "`/buy`\n" +
              "`/inventory`",
            inline: true,
          },

          {
            name: "⭐ Experience",
            value:
              "`/profile`\n" +
              "`/level`\n" +
              "`/ranking`",
            inline: true,
          },

          {
            name: "💬 Chat Corner",
            value:
              "`/cat-fact`\n" +
              "`/craft-note`\n" +
              "`/movie-prompt`\n" +
              "`/conversation-starter`\n" +
              "`/creative-prompt`\n" +
              "`/would-you-rather`",
            inline: true,
          },

          {
            name: "🤖 System",
            value:
              "`/ping`\n" +
              "`/help`",
            inline: true,
          }

        )
        .setThumbnail(AVATAR_URL)
        .setColor(COLORS.primary)
        .setFooter(footer())
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });

    return;
  }

  // ==========================================================
  // 👤 PROFILE
  // ==========================================================

  if (commandName === "profile") {

    const data =
      getUser(
        user.id,
        guild.id
      );

    const requiredXP =
      data.level * 100;

    const embed =
      new EmbedBuilder()
        .setTitle(
          `👤 ${user.username}'s Profile`
        )
        .setThumbnail(
          user.displayAvatarURL()
        )
        .addFields(

          {
            name: "💰 Coins",
            value:
              `🪙 ${formatNumber(data.coins)}`,
            inline: true,
          },

          {
            name: "⭐ Level",
            value:
              `${data.level}`,
            inline: true,
          },

          {
            name: "✨ XP",
            value:
              `${data.xp}/${requiredXP}`,
            inline: true,
          },

        )
        .setColor(COLORS.primary)
        .setFooter(footer())
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });

    return;
  }

  // ==========================================================
  // ⭐ LEVEL
  // ==========================================================

  if (commandName === "level") {

    const data =
      getUser(
        user.id,
        guild.id
      );

    const required =
      data.level * 100;

    const percentage =
      Math.min(
        100,
        Math.floor(
          (data.xp / required) * 100
        )
      );

    const filled =
      Math.floor(
        percentage / 10
      );

    const bar =
      "🟩".repeat(filled) +
      "⬜".repeat(
        10 - filled
      );

    await interaction.reply({
      embeds: [
        createEmbed(
          `⭐ Level ${data.level}`,
          `${bar}\n\n` +
          `✨ XP: **${data.xp}/${required}**\n` +
          `📊 Progress: **${percentage}%**`,
          COLORS.primary
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🏆 RANKING
  // ==========================================================

  if (commandName === "ranking") {

    const users =
      db.prepare(`
        SELECT *
        FROM users
        WHERE guild_id = ?
        ORDER BY level DESC, xp DESC
        LIMIT 10
      `).all(
        guild.id
      ) as {
        user_id: string;
        level: number;
        xp: number;
        coins: number;
      }[];

    let description = "";

    for (
      let i = 0;
      i < users.length;
      i++
    ) {

      const member =
        await guild.members
          .fetch(
            users[i].user_id
          )
          .catch(
            () => null
          );

      const name =
        member?.user.username ??
        "Unknown User";

      const medal =
        i === 0
          ? "🥇"
          : i === 1
            ? "🥈"
            : i === 2
              ? "🥉"
              : `**${i + 1}.**`;

      description +=
        `${medal} **${name}** — Level ${users[i].level} • ${users[i].xp} XP\n`;
    }

    if (!description) {
      description =
        "There are no users in the ranking yet.";
    }

    await interaction.reply({
      embeds: [
        createEmbed(
          "🏆 CHEDDAR Leaderboard",
          description,
          COLORS.orange
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (commandName === "balance") {

    const data =
      getUser(
        user.id,
        guild.id
      );

    await interaction.reply({
      embeds: [
        createEmbed(
          "💰 Your Balance",
          `You currently have **🪙 ${formatNumber(data.coins)} coins**.`,
          COLORS.orange
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (commandName === "daily") {

    const data =
      getUser(
        user.id,
        guild.id
      );

    const now =
      Date.now();

    const cooldown =
      24 * 60 * 60 * 1000;

    if (
      now - data.last_daily <
      cooldown
    ) {

      const remaining =
        cooldown -
        (now - data.last_daily);

      const hours =
        Math.ceil(
          remaining /
          1000 /
          60 /
          60
        );

      await interaction.reply({

        embeds: [
          createEmbed(
            "⏳ Daily Reward",
            `You have already claimed your daily reward.\n\n` +
            `Come back in approximately **${hours} hours**.`,
            COLORS.error
          ),
        ],

        ephemeral: true,
      });

      return;
    }

    const reward =
      randomNumber(
        100,
        500
      );

    db.prepare(`
      UPDATE users
      SET coins = coins + ?,
          last_daily = ?
      WHERE user_id = ?
      AND guild_id = ?
    `).run(
      reward,
      now,
      user.id,
      guild.id
    );

    await interaction.reply({
      embeds: [
        createEmbed(
          "🎁 Daily Reward",
          `You received **🪙 ${reward} coins**!\n\n` +
          `Come back tomorrow for another reward.`,
          COLORS.success
        ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      15
    );

    return;
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (commandName === "work") {

    const data =
      getUser(
        user.id,
        guild.id
      );

    const now =
      Date.now();

    const cooldown =
      60 * 60 * 1000;

    if (
      now - data.last_work <
      cooldown
    ) {

      const remaining =
        cooldown -
        (now - data.last_work);

      const minutes =
        Math.ceil(
          remaining /
          1000 /
          60
        );

      await interaction.reply({

        embeds: [
          createEmbed(
            "⏳ You're Still Working",
            `You need to wait approximately **${minutes} minutes** before working again.`,
            COLORS.error
          ),
        ],

        ephemeral: true,
      });

      return;
    }

    const reward =
      randomNumber(
        50,
        250
      );

    db.prepare(`
      UPDATE users
      SET coins = coins + ?,
          last_work = ?
      WHERE user_id = ?
      AND guild_id = ?
    `).run(
      reward,
      now,
      user.id,
      guild.id
    );

    const jobs = [
      "programmed an application",
      "sold some cheese",
      "fixed a server",
      "created some designs",
      "worked at the CHEDDAR factory",
      "helped a community member",
    ];

    await interaction.reply({
      embeds: [
        createEmbed(
          "💼 Work Completed",
          `You ${random(jobs)}.\n\n` +
          `💰 You earned **🪙 ${reward} coins**.`,
          COLORS.success
        ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      20
    );

    return;
  }

  // ==========================================================
  // 🛍️ SHOP
  // ==========================================================

  if (commandName === "shop") {

    let description = "";

    for (
      const [id, item]
      of Object.entries(SHOP)
    ) {

      description +=
        `**${item.name}**\n` +
        `ID: \`${id}\`\n` +
        `Price: **🪙 ${formatNumber(item.price)}**\n\n`;
    }

    await interaction.reply({
      embeds: [
        createEmbed(
          "🛍️ CHEDDAR Shop",
          description +
          "Use `/buy item:<item>` to purchase an item.",
          COLORS.orange
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🛒 BUY
  // ==========================================================

  if (commandName === "buy") {

    const itemId =
      interaction.options.getString(
        "item",
        true
      );

    const item =
      SHOP[
        itemId as keyof typeof SHOP
      ];

    if (!item) {

      await interaction.reply({
        content:
          "❌ That item does not exist.",
        ephemeral: true,
      });

      return;
    }

    const data =
      getUser(
        user.id,
        guild.id
      );

    if (
      data.coins <
      item.price
    ) {

      await interaction.reply({

        embeds: [
          createEmbed(
            "❌ Not Enough Coins",
            `You need **🪙 ${item.price} coins**.\n` +
            `You currently have **🪙 ${data.coins} coins**.`,
            COLORS.error
          ),
        ],

        ephemeral: true,
      });

      return;
    }

    removeCoins(
      user.id,
      guild.id,
      item.price
    );

    addItem(
      user.id,
      guild.id,
      itemId
    );

    await interaction.reply({
      embeds: [
        createEmbed(
          "🛒 Purchase Successful",
          `You purchased **${item.name}**!\n\n` +
          `💰 Price: **🪙 ${item.price}**`,
          COLORS.success
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🎒 INVENTORY
  // ==========================================================

  if (commandName === "inventory") {

    const inventory =
      getInventory(
        user.id,
        guild.id
      );

    if (!inventory.length) {

      await interaction.reply({
        embeds: [
          createEmbed(
            "🎒 Empty Inventory",
            "You don't have any items yet.",
            COLORS.info
          ),
        ],
      });

      return;
    }

    let description = "";

    for (
      const item
      of inventory
    ) {

      const shopItem =
        SHOP[
          item.item as keyof typeof SHOP
        ];

      description +=
        `${shopItem?.name ?? item.item} × **${item.amount}**\n`;
    }

    await interaction.reply({
      embeds: [
        createEmbed(
          "🎒 Your Inventory",
          description,
          COLORS.info
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🧠 TRIVIA
  // ==========================================================

  if (commandName === "trivia") {

    const trivia =
      random(TRIVIA);

    const row =
      new ActionRowBuilder<ButtonBuilder>();

    trivia.options.forEach(
      (option, index) => {

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(
              `trivia:${trivia.answer}:${option}`
            )
            .setLabel(option)
            .setStyle(
              index === 0
                ? ButtonStyle.Primary
                : ButtonStyle.Secondary
            )
        );
      }
    );

    await interaction.reply({

      embeds: [
        createEmbed(
          "🧠 Trivia",
          `**${trivia.question}**`,
          COLORS.purple
        ),
      ],

      components: [row],
    });

    return;
  }

  // ==========================================================
  // 🎱 8 BALL
  // ==========================================================

  if (commandName === "8ball") {

    const answers = [
      "Yes, definitely. 🔮",
      "I don't think so. ❌",
      "Probably. 🤔",
      "The stars say yes. ⭐",
      "Don't count on it. 🌙",
      "Maybe. 🎱",
      "Definitely yes. 🧀",
      "Ask again later. 🔄",
    ];

    const question =
      interaction.options.getString(
        "question",
        true
      );

    await interaction.reply({
      embeds: [
        createEmbed(
          "🎱 Magic 8-Ball",
          `**Question:** ${question}\n\n` +
          `🔮 **Answer:** ${random(answers)}`,
          COLORS.purple
        ),
      ],
    });

    addXP(
      user.id,
      guild.id,
      10
    );

    return;
  }

  // ==========================================================
  // 🪨📄✂️ ROCK PAPER SCISSORS
  // ==========================================================

  if (commandName === "rps") {

    const player =
      interaction.options.getString(
        "choice",
        true
      );

    const choices = [
      "rock",
      "paper",
      "scissors",
    ];

    const bot =
      random(choices);

    let result: string;

    if (player === bot) {

      result = "🤝 It's a tie!";

    } else if (
      (player === "rock" &&
        bot === "scissors") ||

      (player === "paper" &&
        bot === "rock") ||

      (player === "scissors" &&
        bot === "paper")
    ) {

      result = "🏆 You won!";

      addCoins(
        user.id,
        guild.id,
        50
      );

      addXP(
        user.id,
        guild.id,
        15
      );

    } else {

      result = "💀 You lost!";
    }

    const emojis: Record<string, string> = {
      rock: "🪨",
      paper: "📄",
      scissors: "✂️",
    };

    await interaction.reply({
      embeds: [
        createEmbed(
          "🪨📄✂️ Rock, Paper, Scissors",
          `You: ${emojis[player]}\n` +
          `CHEDDAR: ${emojis[bot]}\n\n` +
          `**${result}**`,
          COLORS.blue
        ),
      ],
    });

    return;
  }

  // Server moderation commands are intentionally not part of Cheddar Chat.

}

// ============================================================
// 🔘 BUTTON HANDLER
// ============================================================

async function handleButton(
  interaction: ButtonInteraction
) {

  const guild =
    interaction.guild;

  if (!guild) return;

  const interestRoles: Record<string, { name: string; description: string }> = {
    interest_cats: { name: "Cat Corner", description: "Cat-themed chats and photos" },
    interest_minecraft: { name: "Minecraft", description: "Minecraft builds and game talk" },
    interest_movies: { name: "Film Chat", description: "Movie talk and occasional references" },
  };
  const selectedInterest = interestRoles[interaction.customId];
  if (selectedInterest) {
    const member = await guild.members.fetch(interaction.user.id);
    let role = guild.roles.cache.find(r => r.name === selectedInterest.name);
    if (!role) {
      await interaction.reply({ content: `The **${selectedInterest.name}** role has not been created yet. Ask a moderator to create it, then try again.`, ephemeral: true });
      return;
    }
    const botMember = guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position || role.managed) {
      await interaction.reply({ content: `I cannot manage **${role.name}**. Move the bot role above it in Server Settings → Roles.`, ephemeral: true });
      return;
    }
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, "Member updated interest roles");
      await interaction.reply({ content: `Removed **${role.name}** from your roles.`, ephemeral: true });
    } else {
      await member.roles.add(role, "Member selected an interest role");
      await interaction.reply({ content: `Added **${role.name}**.`, ephemeral: true });
    }
    return;
  }

  const user =
    interaction.user;

  ensureUser(
    user.id,
    guild.id
  );

  // ==========================================================
  // 👋 ANOTHER GREETING
  // ==========================================================

  if (
    interaction.customId ===
    "another_greeting"
  ) {

    const greeting =
      random(GREETINGS)
        .replace(
          "{user}",
          user.username
        );

    await interaction.update({

      embeds: [
        createEmbed(
          "👋 Hello!",
          `✨ ${greeting}`,
          COLORS.primary
        ),
      ],

    });

    addXP(
      user.id,
      guild.id,
      2
    );

    return;
  }

  // ==========================================================
  // 😂 ANOTHER JOKE
  // ==========================================================

  if (
    interaction.customId ===
    "another_joke"
  ) {

    await interaction.update({

      embeds: [
        createEmbed(
          "😂 Another Joke",
          `> ${random(JOKES)}`,
          COLORS.purple
        ),
      ],

    });

    addXP(
      user.id,
      guild.id,
      2
    );

    return;
  }

  // ==========================================================
  // 📚 ANOTHER FACT
  // ==========================================================

  if (
    interaction.customId ===
    "another_fact"
  ) {

    await interaction.update({

      embeds: [
        createEmbed(
          "📚 Another Fun Fact",
          `> ${random(FACTS)}`,
          COLORS.success
        ),
      ],

    });

    addXP(
      user.id,
      guild.id,
      2
    );

    return;
  }

  // ==========================================================
  // 🎲 ROLL AGAIN
  // ==========================================================

  if (
    interaction.customId ===
    "another_dice"
  ) {

    const result =
      randomNumber(
        1,
        6
      );

    const emojis = [
      "",
      "1️⃣",
      "2️⃣",
      "3️⃣",
      "4️⃣",
      "5️⃣",
      "6️⃣",
    ];

    await interaction.update({

      embeds: [
        createEmbed(
          "🎲 New Dice Roll",
          `${emojis[result]} **You rolled ${result}!**`,
          COLORS.red
        ),
      ],

    });

    addXP(
      user.id,
      guild.id,
      2
    );

    return;
  }

  // ==========================================================
  // 🪙 FLIP AGAIN
  // ==========================================================

  if (
    interaction.customId ===
    "another_coin"
  ) {

    const heads =
      Math.random() < 0.5;

    await interaction.update({

      embeds: [
        createEmbed(
          "🪙 New Coin Flip",
          heads
            ? "🪙 **Heads!**"
            : "🌙 **Tails!**",
          COLORS.orange
        ),
      ],

    });

    addXP(
      user.id,
      guild.id,
      2
    );

    return;
  }

  // ==========================================================
  // 🧠 TRIVIA
  // ==========================================================

  if (
    interaction.customId
      .startsWith("trivia:")
  ) {

    const parts =
      interaction.customId
        .split(":");

    const correct =
      parts[1];

    const selected =
      parts[2];

    if (
      selected === correct
    ) {

      addCoins(
        user.id,
        guild.id,
        100
      );

      const level =
        addXP(
          user.id,
          guild.id,
          25
        );

      await interaction.update({

        embeds: [
          createEmbed(
            "🎉 Correct!",
            `The correct answer was **${correct}**.\n\n` +
            `🏆 You won **🪙 100 coins**.\n` +
            `✨ You earned **25 XP**.` +
            (
              level.leveledUp
                ? `\n\n🎊 You reached level **${level.newLevel}**!`
                : ""
            ),
            COLORS.success
          ),
        ],

        components: [],
      });

    } else {

      await interaction.update({

        embeds: [
          createEmbed(
            "❌ Incorrect",
            `The correct answer was **${correct}**.\n\n` +
            "Better luck next time! 😄",
            COLORS.error
          ),
        ],

        components: [],
      });
    }

    return;
  }
}

// ============================================================
// 🤖 READY
// ============================================================

client.once(
  "clientReady",
  async () => {

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "🧀 CHEDDAR IS ONLINE"
    );
    console.log(
      "================================="
    );
    console.log(
      `🤖 User: ${client.user?.tag}`
    );
    console.log(
      `🌐 Servers: ${client.guilds.cache.size}`
    );
    console.log(
      "================================="
    );

    client.user?.setPresence({
      activities: [
        {
          name:
            "the community | /help",
          type: 2,
        },
      ],
      status: "online",
    });

    await registerCommands();
  }
);

// ============================================================
// 🚨 ERROR HANDLING
// ============================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "🚨 Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "🚨 Uncaught Exception:",
      error
    );
  }
);

// ============================================================
// 💬 CHAT-ONLY CONTENT LIBRARY
// This bot provides conversation, community, cat, Minecraft, and film prompts.
// Commerce and moderation workflows are intentionally outside this chat bot.
// ============================================================

interface ChatNote {
  title: string;
  text: string;
}

function pickChatEntry<T>(entries: readonly T[]): T {
  if (entries.length === 0) {
    throw new Error("Chat content pool must not be empty.");
  }
  return entries[Math.floor(Math.random() * entries.length)];
}

function pickChatEntries<T>(entries: readonly T[], count: number): T[] {
  const copy = [...entries];
  const wanted = Math.max(0, Math.min(Math.trunc(count), copy.length));
  const selected: T[] = [];
  while (selected.length < wanted) {
    const index = Math.floor(Math.random() * copy.length);
    selected.push(copy.splice(index, 1)[0]);
  }
  return selected;
}

function normalizeChatText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[\r\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatChatList(items: readonly string[], bullet = "•"): string {
  return items.map(item => `${bullet} ${item}`).join("\n");
}

function chatPromptEmbedDescription(prompt: string): string {
  return `${prompt}\n\nNo need to overthink it; answer if you feel like joining in.`;
}

function chatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    cats: "Cat Corner",
    minecraft: "Minecraft",
    films: "Film Chat",
    general: "General Chat",
    creative: "Creative Corner",
  };
  return labels[category] || "Community Chat";
}

function chatPromptFooter(category: string): string {
  return `Cheddar Chat · ${chatCategoryLabel(category)} · Keep it friendly and spoiler-aware`;
}

function chatSafePrompt(value: string): string {
  return normalizeChatText(value, 900).replace(/@everyone/gi, "@\u200beveryone").replace(/@here/gi, "@\u200bhere");
}

function chatPromptBatch(entries: readonly string[], count = 5): string {
  return formatChatList(pickChatEntries(entries, count).map(chatSafePrompt));
}

function chatPoolStats(): Record<string, number> {
  return {
    catNotes: CAT_CHAT_NOTES.length,
    minecraftNotes: MINECRAFT_CHAT_NOTES.length,
    filmPrompts: FILM_CHAT_PROMPTS.length,
    generalPrompts: GENERAL_CHAT_PROMPTS.length,
    wouldYouRatherPrompts: THIS_OR_THAT_PROMPTS.length,
    creativePrompts: CREATIVE_CHAT_PROMPTS.length,
  };
}

function chatPoolStatsText(): string {
  const stats = chatPoolStats();
  return Object.entries(stats).map(([key, count]) => `${key}: ${count}`).join("\n");
}

function chatPromptIsSafe(value: string): boolean {
  const normalized = normalizeChatText(value, 1000).toLowerCase();
  return normalized.length > 0 && !normalized.includes("@everyone") && !normalized.includes("@here");
}

function chatPromptPreview(value: string, limit = 120): string {
  const safe = chatSafePrompt(value);
  return safe.length <= limit ? safe : `${safe.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function chatPromptNumberLabel(index: number): string {
  return `Prompt ${Math.max(1, Math.trunc(index) + 1)}`;
}

function chatPromptSetTitle(category: string): string {
  const titles: Record<string, string> = {
    cats: "🐈 Cat Corner Notes",
    minecraft: "⛏️ Craft Notes",
    films: "🎬 Film Chat Prompts",
    general: "💬 Conversation Starters",
    creative: "🧩 Creative Corner",
  };
  return titles[category] || "💬 Chat Prompts";
}

function chatPromptSetDescription(category: string, entries: readonly string[], count = 5): string {
  const selected = pickChatEntries(entries, count).map((entry, index) => `${index + 1}. ${chatSafePrompt(entry)}`);
  return `${chatPromptSetTitle(category)}\n\n${selected.join("\n\n")}`;
}

function chatPromptSuggestion(category: string): string {
  const suggestions: Record<string, string[]> = {
    cats: ["Share a cat photo if you have one", "Tell us a cat habit you find funny", "Recommend a cat account or artist"],
    minecraft: ["Describe a build you are proud of", "Share a survival tip that saved you time", "Tell us which biome you always return to"],
    films: ["Keep plot twists spoiler-free", "Mention the title before discussing a scene", "Talk about the craft, not only the rating"],
    general: ["Short answers are welcome", "You can pass if a prompt is not your thing", "Be curious without putting anyone on the spot"],
    creative: ["A rough idea is enough to start", "Give feedback that someone can act on", "Ask before giving detailed critique"],
  };
  return pickChatEntry(suggestions[category] || suggestions.general);
}

function chatPromptCardText(category: string, prompt: string): string {
  return `${chatSafePrompt(prompt)}\n\n*${chatPromptSuggestion(category)}.*`;
}

const CAT_CHAT_NOTES: ChatNote[] = [
  { title: "🐈 Cat Corner Note", text: "A cat sitting near your desk can become an unofficial reminder to take a short break." },
  { title: "🐈 Cat Corner Note", text: "Some cats trill at people they know as a friendly greeting." },
  { title: "🐈 Cat Corner Note", text: "Cats often use scent to make a new place feel familiar." },
  { title: "🐈 Cat Corner Note", text: "A slow blink is commonly interpreted as a relaxed, non-threatening cat signal." },
  { title: "🐈 Cat Corner Note", text: "Cats may prefer a high perch because it gives them a clear view of their surroundings." },
  { title: "🐈 Cat Corner Note", text: "A cardboard box can be more interesting to a cat than an expensive toy." },
  { title: "🐈 Cat Corner Note", text: "Cats can have very different play styles, even in the same household." },
  { title: "🐈 Cat Corner Note", text: "A cat's whiskers help it sense nearby objects and changes in its environment." },
  { title: "🐈 Cat Corner Note", text: "Many cats alternate short bursts of play with long periods of rest." },
  { title: "🐈 Cat Corner Note", text: "Some cats communicate with chirps and trills rather than only meows." },
  { title: "🐈 Cat Corner Note", text: "A quiet hiding spot can help a cat feel secure in a busy home." },
  { title: "🐈 Cat Corner Note", text: "Cats often investigate a new object by approaching it in stages." },
  { title: "🐈 Cat Corner Note", text: "A cat stretching after a nap is a tiny reminder to stretch too." },
  { title: "🐈 Cat Corner Note", text: "Cats may knead soft surfaces when they feel comfortable." },
  { title: "🐈 Cat Corner Note", text: "A cat's favorite toy may be something simple that moves unpredictably." },
  { title: "🐈 Cat Corner Note", text: "Cats use body posture, ears, eyes, and tail together to communicate." },
  { title: "🐈 Cat Corner Note", text: "Some cats like company without necessarily wanting to be picked up." },
  { title: "🐈 Cat Corner Note", text: "A predictable routine can help many cats feel more comfortable." },
  { title: "🐈 Cat Corner Note", text: "A cat who watches from a distance is still part of the room's social life." },
  { title: "🐈 Cat Corner Note", text: "Different cats can have very different opinions about brushing." },
  { title: "🐈 Cat Corner Note", text: "A cat's purr can occur in more than one emotional context, not only happiness." },
  { title: "🐈 Cat Corner Note", text: "Cats may rub their cheeks against familiar objects to leave scent cues." },
  { title: "🐈 Cat Corner Note", text: "A toy that imitates prey movement can be more engaging than one that stays still." },
  { title: "🐈 Cat Corner Note", text: "Cats often appreciate having a choice about when to approach people." },
  { title: "🐈 Cat Corner Note", text: "A sunny patch on the floor can become the most important location in a home." },
  { title: "🐈 Cat Corner Note", text: "Some cats enjoy puzzle feeders because they turn snack time into a small task." },
  { title: "🐈 Cat Corner Note", text: "Cats can learn routines by noticing repeated sounds and events." },
  { title: "🐈 Cat Corner Note", text: "A cat's ears can rotate toward sounds before the rest of its body moves." },
  { title: "🐈 Cat Corner Note", text: "A blanket with a familiar smell may become a favorite resting place." },
  { title: "🐈 Cat Corner Note", text: "A cat may be playful at dawn or dusk, depending on its routine." },
  { title: "🐈 Cat Corner Note", text: "Cats can be curious and cautious at the same time." },
  { title: "🐈 Cat Corner Note", text: "A cat may sit nearby as a form of social contact without demanding attention." },
  { title: "🐈 Cat Corner Note", text: "The best cat photo often happens right after you stop trying to pose the cat." },
  { title: "🐈 Cat Corner Note", text: "Cats sometimes tap objects to learn how they move or sound." },
  { title: "🐈 Cat Corner Note", text: "A cat can prefer one person's company while still being friendly with others." },
  { title: "🐈 Cat Corner Note", text: "A safe window perch can provide enrichment through watching outdoor activity." },
  { title: "🐈 Cat Corner Note", text: "Cats may use different meows for different familiar people." },
  { title: "🐈 Cat Corner Note", text: "Play sessions can be a useful way to give indoor cats stimulation." },
  { title: "🐈 Cat Corner Note", text: "A cat's tail position is one clue, but context matters when reading body language." },
  { title: "🐈 Cat Corner Note", text: "Some cats like to supervise chores from a nearby chair." },
];

const MINECRAFT_CHAT_NOTES: ChatNote[] = [
  { title: "⛏️ Craft Note", text: "A good Minecraft base starts with storage that makes sense before decoration begins." },
  { title: "⛏️ Craft Note", text: "A tiny starter house with a clear layout can be more useful than a huge unfinished castle." },
  { title: "⛏️ Craft Note", text: "Redstone builds are easier to debug when each section has a clear purpose." },
  { title: "⛏️ Craft Note", text: "A map wall can turn a practical room into a record of your world's history." },
  { title: "⛏️ Craft Note", text: "A nether hub works best when routes are labeled and easy to recognize." },
  { title: "⛏️ Craft Note", text: "A villager trading hall needs safe paths and clear organization more than fancy walls." },
  { title: "⛏️ Craft Note", text: "Lighting every corner makes a base easier to navigate and less stressful to defend." },
  { title: "⛏️ Craft Note", text: "A themed storage room can make sorting blocks feel like part of the build." },
  { title: "⛏️ Craft Note", text: "Before a long mining trip, bring a plan for tools, food, and inventory space." },
  { title: "⛏️ Craft Note", text: "A bridge can be a landmark, not just a way to cross a river." },
  { title: "⛏️ Craft Note", text: "A farm looks better when the paths, water channels, and crop rows feel intentional." },
  { title: "⛏️ Craft Note", text: "A good build palette often uses a few main blocks and one accent material." },
  { title: "⛏️ Craft Note", text: "A village feels more alive when its paths connect useful places." },
  { title: "⛏️ Craft Note", text: "A small dock can tell a story about how a base trades with the world around it." },
  { title: "⛏️ Craft Note", text: "A redstone contraption benefits from labels or signs near its controls." },
  { title: "⛏️ Craft Note", text: "A survival world becomes memorable when builds solve actual problems." },
  { title: "⛏️ Craft Note", text: "A ruined tower or abandoned mine can add a story without a written quest." },
  { title: "⛏️ Craft Note", text: "A starter base can grow room by room instead of being planned all at once." },
  { title: "⛏️ Craft Note", text: "A mine entrance is easier to find when it has a silhouette visible from far away." },
  { title: "⛏️ Craft Note", text: "A roof can make a simple house distinctive through shape alone." },
  { title: "⛏️ Craft Note", text: "A good path can guide visitors toward the most interesting part of a build." },
  { title: "⛏️ Craft Note", text: "A beacon is useful, but a landmark can be memorable even without rare materials." },
  { title: "⛏️ Craft Note", text: "A secret room works best when its entrance fits the surrounding architecture." },
  { title: "⛏️ Craft Note", text: "A nether portal room can use contrasting blocks to make the portal the focal point." },
  { title: "⛏️ Craft Note", text: "A trading area should be convenient to use before it is decorated." },
  { title: "⛏️ Craft Note", text: "A build looks more natural when terrain is part of the design rather than flattened everywhere." },
  { title: "⛏️ Craft Note", text: "A small garden can make a stone fortress feel inhabited." },
  { title: "⛏️ Craft Note", text: "A rail line can connect distant projects and make a world feel larger." },
  { title: "⛏️ Craft Note", text: "A storage sorter is worth testing with a few items before filling every chest." },
  { title: "⛏️ Craft Note", text: "A farm's output is more useful when you know what the materials will be used for." },
  { title: "⛏️ Craft Note", text: "A ruined portal can inspire a compact lore-focused build nearby." },
  { title: "⛏️ Craft Note", text: "A lighthouse gives a coastline a landmark and a reason for a path." },
  { title: "⛏️ Craft Note", text: "A mountain base benefits from entrances that are easy to recognize from outside." },
  { title: "⛏️ Craft Note", text: "A bridge's supports and underside are visible design opportunities, not wasted space." },
  { title: "⛏️ Craft Note", text: "A compact workshop can feel complete when each station has a clear place." },
  { title: "⛏️ Craft Note", text: "A village market can use different roof shapes to distinguish each stall." },
  { title: "⛏️ Craft Note", text: "A build challenge gets more interesting when the palette has a few constraints." },
  { title: "⛏️ Craft Note", text: "A survival base should have a safe route from bed to storage to crafting." },
  { title: "⛏️ Craft Note", text: "A well-placed sign can make a multiplayer world easier for new visitors." },
  { title: "⛏️ Craft Note", text: "A monument feels more convincing when it has a purpose in the world's story." },
];

const FILM_CHAT_PROMPTS: string[] = [
  "Which movie has a side character who deserved their own story? Keep it spoiler-free.",
  "What film has a setting you would like to explore for one afternoon?",
  "Which movie soundtrack works even when you listen without the film?",
  "What is a great opening scene that tells you what kind of story you are watching?",
  "Which fictional place looks cozy even when the plot is chaotic?",
  "What movie has a clever practical effect that still holds up?",
  "Which animated film has background details you only noticed on a rewatch?",
  "What film would you recommend based on atmosphere rather than genre?",
  "Which character has a memorable costume that tells you something about them?",
  "What is a sequel that expands the world in an interesting way?",
  "Which movie uses silence better than dialogue?",
  "What fictional vehicle would you want to take for a short trip?",
  "Which film has a great ensemble cast where everyone feels distinct?",
  "What movie scene is funny because of timing rather than a punchline?",
  "Which villain is interesting because their plan almost makes sense?",
  "What film has a location that feels like a character of its own?",
  "Which movie would benefit from a short behind-the-scenes documentary?",
  "What is a good comfort film for a quiet evening?",
  "Which genre do you enjoy more when it bends its own rules?",
  "What film has a title that becomes more meaningful after watching it?",
  "Which movie has a strong color palette you remember clearly?",
  "What character makes a bad decision that still feels believable?",
  "Which film has the best use of a recurring visual motif?",
  "What movie would you show someone to introduce them to a genre?",
  "Which fictional object would you keep as a harmless souvenir?",
  "What film has an ending that gives you something to discuss afterward?",
  "Which movie has a great first act even before the main plot begins?",
  "What adaptation made an interesting change from its source material?",
  "Which film is more fun to discuss with friends than to rank?",
  "What movie has a scene that is tense without relying on loud music?",
  "Which film has the most memorable fictional workplace?",
  "What movie makes ordinary objects feel important to the story?",
  "Which animated sidekick is funny without taking over every scene?",
  "What film has a strong sense of weather or season?",
  "Which movie would you like to see re-released in a theater?",
  "What film uses a long take in a way that helps the scene?",
  "Which fictional team would be interesting to watch doing a normal errand?",
  "What movie has an unexpectedly thoughtful message beneath the spectacle?",
  "Which film has a satisfying reveal that does not depend on spoilers?",
  "What is one movie you appreciate more now than when you first watched it?",
];

const GENERAL_CHAT_PROMPTS: string[] = [
  "What tiny thing improved your day more than expected?",
  "What hobby would you try if you could be a beginner without pressure?",
  "What is a very specific sound that you find satisfying?",
  "What fictional home would be pleasant to visit for an hour?",
  "What is a small skill you learned that turned out to be surprisingly useful?",
  "What snack is better than its reputation suggests?",
  "What is a game you enjoy even when you are not particularly good at it?",
  "What ordinary object would you redesign to make it less annoying?",
  "What is your favorite kind of weather for staying indoors?",
  "What is a useful thing you wish more people knew how to do?",
  "What is a low-stakes hill you are willing to die on?",
  "What app or website do you use for something unexpectedly specific?",
  "What is a book, game, or show you discovered by accident?",
  "What is a nice way to spend twenty minutes with no plan?",
  "What is a smell that immediately reminds you of a place?",
  "What is an oddly satisfying task to finish?",
  "What is a fictional job that sounds fun until you think about the details?",
  "What is a tiny collection you have or would like to start?",
  "What is a color combination you think works better than people expect?",
  "What is one feature every good community server should have?",
  "What is a topic you can talk about for five minutes with no preparation?",
  "What is a small purchase that made everyday life easier?",
  "What is a sound you associate with a specific season?",
  "What is a place you would revisit just to notice different details?",
  "What is a task you like doing with music in the background?",
  "What is your favorite kind of fictional map: city, dungeon, island, or something else?",
  "What is a harmless trend you would bring back for a week?",
  "What makes a group chat feel welcoming to a new person?",
  "What is something you like that you rarely get a chance to mention?",
  "What is a practical tip you learned from a friend?",
  "What is a small tradition that makes an ordinary day feel special?",
  "What is a game mechanic you wish more games used?",
  "What is an object on your desk that has a story behind it?",
  "What is a fictional shop you would browse even if you bought nothing?",
  "What is a creative project that sounds fun at a very small scale?",
  "What is a good way to reset after a busy day?",
  "What is a detail that makes a fictional world feel lived-in?",
  "What is a useful rule of thumb you often follow?",
  "What is a comfort activity that does not require much energy?",
  "What is one thing you learned recently just because you were curious?",
];

const THIS_OR_THAT_PROMPTS: string[] = [
  "Build a cozy cabin or restore an abandoned castle?",
  "Explore a cave or map a coastline?",
  "Have a cat supervise your work or a tiny robot organize your desk?",
  "Watch a mystery or a space adventure?",
  "Live above a quiet bookshop or beside a train station?",
  "Play a game with a great story or one with endlessly flexible building?",
  "Have a perfect inventory system or unlimited decorative blocks?",
  "Visit a floating city or an underground garden?",
  "Choose a soundtrack for your day or a color palette for your room?",
  "Solve a puzzle alone or figure it out with a group?",
  "Watch a film with practical effects or beautiful animation?",
  "Build one huge project or lots of tiny detailed projects?",
  "Have a pet that talks or a plant that gives good advice?",
  "Explore an old library or a strange museum?",
  "Choose a rainy afternoon or a clear night full of stars?",
  "Get a map to a hidden place or a key to a mysterious room?",
  "Have a perfect memory for movie quotes or game maps?",
  "Spend a day crafting items or discovering a new biome?",
  "Choose a clever mystery or a heartfelt comedy?",
  "Have a little workshop or a greenhouse full of unusual plants?",
  "Play co-op with friends or explore a single-player world?",
  "Have a very organized room or a very cozy room?",
  "Travel by airship or by underground railway?",
  "Find a hidden village or a secret garden?",
  "Have a cat who brings you items or a parrot who gives dramatic commentary?",
  "Watch a director's cut or a behind-the-scenes feature?",
  "Build with a limited palette or use every block available?",
  "Get a mysterious postcard or an unmarked package?",
  "Visit a fictional arcade or a fictional planetarium?",
  "Solve an ancient riddle or design a new invention?",
  "Have a soundtrack that changes with your mood or lighting that changes with the weather?",
  "Explore a ruined city or a peaceful island?",
  "Choose a perfect cup of tea or a perfect late-night snack?",
  "Have a map that reveals secrets or a compass that points to interesting things?",
  "See a film before anyone else or play a game before launch?",
  "Own a tiny bookshop or a tiny game café?",
  "Build a hidden base or a landmark everyone can visit?",
  "Get one extra hour each day or one completely free day each month?",
  "Have an endless notebook or an endless sketchbook?",
  "Visit a place from a favorite game or a place from a favorite film?",
];

// Reusable moderation-free chat guidance for public channels.
const CREATIVE_CHAT_PROMPTS: Array<{ id: string; text: string; category: string; estimatedMinutes: number }> = [
  {
    id: "creative-001",
    text: "Design a tiny fictional café that only opens during thunderstorms.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-002",
    text: "Invent a mascot for a library built inside an old train station.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-003",
    text: "Describe a room using three textures and one source of light.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-004",
    text: "Create a name for a moon that has a ring of floating gardens.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-005",
    text: "Sketch a fictional map using only circles, lines, and triangles.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-006",
    text: "Give a friendly ghost a hobby that makes its neighbors curious.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-007",
    text: "Imagine a cozy shop where every item has a harmless mystery attached.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-008",
    text: "Create a two-color poster for a made-up local festival.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-009",
    text: "Design a tiny robot whose only job is to keep houseplants company.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-010",
    text: "Invent a board game played by cats in a quiet bookshop.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-011",
    text: "Describe a fantasy town by listing its three most useful public places.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-012",
    text: "Give a spaceship a kitchen layout that makes sense for a long trip.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-013",
    text: "Create a fictional holiday and a tradition that lasts less than five minutes.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-014",
    text: "Design a badge for someone who always remembers to save their work.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-015",
    text: "Imagine a greenhouse built on the roof of a moving train.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-016",
    text: "Name a library section dedicated to books that do not exist yet.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-017",
    text: "Invent a tiny creature that helps gardeners but dislikes loud music.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-018",
    text: "Describe a mysterious key without explaining what it unlocks.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-019",
    text: "Design a menu for a restaurant on a floating island.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-020",
    text: "Create a color palette for a rainy-day arcade.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-021",
    text: "Invent a harmless urban legend about a vending machine that gives good advice.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-022",
    text: "Give a mountain observatory one feature that makes it welcoming to visitors.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-023",
    text: "Describe a fictional museum where the exhibits change when nobody is watching.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-024",
    text: "Create a name for a village that is famous for repairing broken umbrellas.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-025",
    text: "Design a room where a person could focus, rest, and make something by hand.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-026",
    text: "Invent a little ritual that helps a fictional explorer prepare for a trip.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-027",
    text: "Describe a garden that was designed around a single unusual stone.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-028",
    text: "Create a fictional map legend with five symbols and no words.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-029",
    text: "Give a tiny dragon a job that is useful but not glamorous.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-030",
    text: "Imagine a hotel for travelers who arrive from different timelines.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-031",
    text: "Design a sign for a path that leads to a place nobody has named yet.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-032",
    text: "Invent a stationery shop that specializes in letters to future selves.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-033",
    text: "Describe a train carriage made for people who want to watch the stars.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-034",
    text: "Create a harmless puzzle hidden in the decoration of a café.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-035",
    text: "Give a fictional city one unusual rule that makes daily life nicer.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-036",
    text: "Design a festival where the main event is trading small handmade objects.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-037",
    text: "Imagine a lighthouse that guides lost dreams instead of ships.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-038",
    text: "Create a character whose most useful talent is noticing small details.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-039",
    text: "Invent a museum audio guide narrated by an extremely polite crow.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-040",
    text: "Describe a cozy workshop using five objects and no adjectives.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-041",
    text: "Give a fantasy bookstore a section for books that are too shy to be read aloud.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-042",
    text: "Design a public square that is pleasant in both summer and winter.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-043",
    text: "Invent a harmless magical tool that solves one very specific inconvenience.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-044",
    text: "Describe a town where every building has a tiny rooftop garden.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-045",
    text: "Create a fictional map for a game that takes place inside a giant clock.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-046",
    text: "Give a spaceship a room dedicated to hobbies that need no electricity.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-047",
    text: "Imagine a tiny island whose main export is carefully labeled jars of sand.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-048",
    text: "Create a sign for a secret club that is not actually secret.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-049",
    text: "Invent a character who repairs broken musical instruments for free.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-050",
    text: "Design a cozy corner for someone who likes quiet company rather than silence.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-051",
    text: "Describe a fantasy market by listing three smells and three sounds.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-052",
    text: "Create a friendly monster whose talent is finding lost objects.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-053",
    text: "Imagine a bridge designed to make people stop and look at the river.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-054",
    text: "Give a fictional archive a filing system that is strange but understandable.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-055",
    text: "Design a badge for the person who makes group projects easier.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-056",
    text: "Invent a game where players collect interesting sounds instead of points.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-057",
    text: "Describe a small observatory run by people who are curious, not experts.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-058",
    text: "Create a fictional shop that rents out unusual umbrellas.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-059",
    text: "Give a forest cabin one feature that makes it easy for guests to find their way.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-060",
    text: "Imagine a café where the menu is based on fictional places rather than ingredients.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-061",
    text: "Design a harmless treasure hunt for a public park with no buried objects.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-062",
    text: "Invent a community noticeboard that only displays good news and useful tips.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-063",
    text: "Create a name for a workshop where people fix old toys together.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-064",
    text: "Describe a library card belonging to a character from a fantasy world.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-065",
    text: "Give a small moon base one recreational activity that needs almost no equipment.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-066",
    text: "Design a poster for a film about a very ordinary day in an extraordinary city.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-067",
    text: "Invent a creature that leaves tiny paper stars wherever it naps.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-068",
    text: "Describe a village festival using only the names of its stalls.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-069",
    text: "Create a fictional transit map for a town with one impossible destination.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-070",
    text: "Imagine a room that changes its lighting based on the music being played.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-071",
    text: "Give a detective a method for organizing clues that is surprisingly artistic.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-072",
    text: "Design a tiny public garden for people who have only five minutes to visit.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-073",
    text: "Invent a harmless superstition followed by a crew of deep-space librarians.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-074",
    text: "Create a menu for a picnic held on the roof of a greenhouse.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-075",
    text: "Describe a fictional art supply store that has one legendary shelf.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-076",
    text: "Give a town mascot a day job that is completely unrelated to being a mascot.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-077",
    text: "Imagine a quiet train station that has a small room for drawing and reading.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
  {
    id: "creative-078",
    text: "Design a set of icons for a fantasy map with no labels.",
    category: "worldbuilding",
    estimatedMinutes: 4,
  },
  {
    id: "creative-079",
    text: "Invent a fictional weather forecast for a city floating above the clouds.",
    category: "worldbuilding",
    estimatedMinutes: 5,
  },
  {
    id: "creative-080",
    text: "Create a cozy room for a character who collects postcards from imaginary places.",
    category: "worldbuilding",
    estimatedMinutes: 2,
  },
  {
    id: "creative-081",
    text: "Describe a tiny planet by listing its landmarks rather than its geography.",
    category: "worldbuilding",
    estimatedMinutes: 3,
  },
];

const CHAT_ETIQUETTE: string[] = [
  "Make room for people who are new to the conversation.",
  "Ask before sending unsolicited critique of someone's creative work.",
  "Use spoiler warnings when discussing plot twists or endings.",
  "Keep jokes readable and avoid making one member the permanent target.",
  "Do not pressure anyone to answer a personal question.",
  "A short reply is still a contribution; nobody needs to write an essay.",
  "If a reference needs a paragraph of context, offer the context kindly.",
  "Disagree with the idea without attacking the person who shared it.",
  "Respect different skill levels in games, art, and hobbies.",
  "If a chat topic is not for you, scroll past rather than derailing it.",
  "Use the right channel when a conversation has a dedicated home.",
  "Avoid posting private information about yourself or another person.",
  "Give people time to respond; a quiet chat is not a demand for attention.",
  "Credit the creator when sharing artwork, builds, or other references.",
  "Do not assume silence means agreement or disagreement.",
];

const CHAT_MICRO_ACTIVITIES: string[] = [
  "Describe your day using only three harmless nouns.",
  "Share one screenshot from a game you played recently.",
  "Recommend a song for a fictional character's walk-on scene.",
  "Invent a name for a cat who runs a tiny library.",
  "Describe a Minecraft base in five words.",
  "Name a movie using only three emojis and let the chat guess.",
  "Share a tiny win from today, even if it is just finishing a task.",
  "Suggest a color palette for a cozy fictional room.",
  "Give a fictional shop a name and one unusual item it sells.",
  "Share a game mechanic you wish existed in more games.",
  "Invent a harmless achievement badge for a cat sleeping in a box.",
  "Describe a favorite fictional location without naming its source.",
  "Recommend a comfort watch without rating anyone else's taste.",
  "Share a useful shortcut or quality-of-life tip.",
  "Pick a biome and describe the ideal small starter base there.",
  "Write a one-sentence review of your current snack.",
  "Name a fictional holiday and one tradition it would include.",
  "Share an object that would make a good mascot for this server.",
  "Describe the most oddly specific thing you are good at.",
  "Create a title for a movie about an extremely organized cat.",
];

function randomChatEtiquette(): string {
  return pickChatEntry(CHAT_ETIQUETTE);
}

function randomChatMicroActivity(): string {
  return pickChatEntry(CHAT_MICRO_ACTIVITIES);
}

function getChatContentOverview(): string {
  const stats = chatPoolStats();
  return [
    "Cheddar is a chat and community bot.",
    `Cat notes: ${stats.catNotes}`,
    `Minecraft notes: ${stats.minecraftNotes}`,
    `Film prompts: ${stats.filmPrompts}`,
    `General prompts: ${stats.generalPrompts}`,
    `Would-you-rather prompts: ${stats.wouldYouRatherPrompts}`,
    `Micro activities: ${CHAT_MICRO_ACTIVITIES.length}`,
    `Etiquette reminders: ${CHAT_ETIQUETTE.length}`,
  ].join("\n");
}

function getRandomChatPrompt(category: string): string {
  switch (category) {
    case "cats": return pickChatEntry(CAT_CHAT_NOTES).text;
    case "minecraft": return pickChatEntry(MINECRAFT_CHAT_NOTES).text;
    case "films": return pickChatEntry(FILM_CHAT_PROMPTS);
    case "creative": return pickChatEntry(CREATIVE_CHAT_PROMPTS).text;
    default: return pickChatEntry(GENERAL_CHAT_PROMPTS);
  }
}

function validateChatPromptPool(): boolean {
  const pools: Array<readonly unknown[]> = [CAT_CHAT_NOTES, MINECRAFT_CHAT_NOTES, FILM_CHAT_PROMPTS, GENERAL_CHAT_PROMPTS, THIS_OR_THAT_PROMPTS, CHAT_ETIQUETTE, CHAT_MICRO_ACTIVITIES];
  return pools.every(pool => pool.length > 0);
}

function getChatPromptPoolNames(): string[] {
  return ["Cat Corner", "Minecraft", "Film Chat", "General Conversation", "Would You Rather", "Community Etiquette", "Micro Activities"];
}

function getChatPromptPoolSummary(): string {
  return getChatPromptPoolNames().map((name, index) => `${index + 1}. ${name}`).join("\n");
}

function buildChatPromptCollection(category: string, count = 4): string {
  const prompts: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (prompts.length < Math.max(1, Math.min(10, count)) && attempts < 100) {
    attempts++;
    const prompt = getRandomChatPrompt(category);
    if (!seen.has(prompt)) {
      seen.add(prompt);
      prompts.push(prompt);
    }
  }
  return prompts.map((prompt, index) => `${index + 1}. ${chatSafePrompt(prompt)}`).join("\n\n");
}

function chatPromptLengthLabel(prompt: string): string {
  const length = normalizeChatText(prompt, 2000).length;
  if (length < 80) return "Quick prompt";
  if (length < 180) return "Conversation prompt";
  return "Long-form prompt";
}

function chatPromptMetadata(prompt: string, category: string): string {
  return `${chatCategoryLabel(category)} · ${chatPromptLengthLabel(prompt)}`;
}

function getChatPromptByIndex(category: string, index: number): string {
  const pool = category === "cats" ? CAT_CHAT_NOTES.map(note => note.text)
    : category === "minecraft" ? MINECRAFT_CHAT_NOTES.map(note => note.text)
    : category === "films" ? FILM_CHAT_PROMPTS
    : category === "either" ? THIS_OR_THAT_PROMPTS
    : GENERAL_CHAT_PROMPTS;
  const safeIndex = ((Math.trunc(index) % pool.length) + pool.length) % pool.length;
  return pool[safeIndex];
}

function getChatPromptAtRandomIndex(category: string): { index: number; prompt: string } {
  const pool = category === "cats" ? CAT_CHAT_NOTES.map(note => note.text)
    : category === "minecraft" ? MINECRAFT_CHAT_NOTES.map(note => note.text)
    : category === "films" ? FILM_CHAT_PROMPTS
    : category === "either" ? THIS_OR_THAT_PROMPTS
    : GENERAL_CHAT_PROMPTS;
  const index = Math.floor(Math.random() * pool.length);
  return { index, prompt: pool[index] };
}

function describeChatPromptCategories(): string {
  return [
    "🐈 Cat Corner — light cat observations and pet-chat ideas.",
    "⛏️ Minecraft — building, survival, redstone, and world design.",
    "🎬 Film Chat — spoiler-aware movie conversation starters.",
    "💬 General — relaxed prompts that do not require personal disclosures.",
    "🧩 Creative Corner — small imaginative exercises and world-building ideas.",
    "↔️ Would You Rather — low-stakes choices for a group chat.",
  ].join("\n");
}

function getChatOnlyHelpText(): string {
  return [
    "`/hello` — greet the community.",
    "`/joke` and `/fact` — quick entertainment.",
    "`/cat-fact` — cat-themed chat note.",
    "`/craft-note` — Minecraft-inspired note.",
    "`/movie-prompt` — spoiler-aware film topic.",
    "`/conversation-starter` — general group prompt.",
    "`/creative-prompt` — a low-pressure creative idea.",
    "`/would-you-rather` — light group question.",
    "`/rolepanel` — optional interest roles.",
    "`/adminpanel` — owner-only server setup overview.",
  ].join("\n");
}

function chatOnlyDesignPrinciples(): string[] {
  return [
    "The bot focuses on conversation and community engagement.",
    "Commerce workflows are outside this bot’s scope.",
    "Moderation and security workflows are outside this bot’s scope.",
    "Chat prompts should feel natural and optional, not like forced engagement.",
    "Film prompts should avoid requiring spoilers.",
    "Minecraft prompts should include building and exploration, not only memes.",
    "Cat content should be varied and not rely on repeated internet clichés.",
    "Public commands should not expose private user data.",
    "Owner-only settings must compare the invoking user ID with ID_OWNER.",
    "User-generated text should never be sent with broad mention parsing enabled.",
  ];
}

function chatOnlyDesignPrinciplesText(): string {
  return formatChatList(chatOnlyDesignPrinciples());
}

function chatResponseToneGuide(): string[] {
  return [
    "Prefer specific observations over generic hype.",
    "Keep replies warm without forcing a catchphrase into every message.",
    "Use emojis sparingly and only when they help the tone.",
    "Avoid pretending the bot has human experiences or personal memories.",
    "Make every prompt easy to ignore without social pressure.",
    "Avoid sarcasm that could read as a personal insult.",
    "Use short paragraphs for mobile readability.",
    "Do not turn every Minecraft reference into a crafting pun.",
    "Do not make every cat reference about keyboards or boxes.",
    "Do not rely on famous movie quotes as the only film feature.",
  ];
}

function chatResponseToneGuideText(): string {
  return formatChatList(chatResponseToneGuide());
}

function chatCommunityActivityPlan(): string[] {
  return [
    "Monday: share a small win or current project update.",
    "Tuesday: use a Minecraft build or exploration prompt.",
    "Wednesday: share a cat photo, drawing, or harmless pet story.",
    "Thursday: ask a spoiler-free film question.",
    "Friday: use a would-you-rather question for a casual group chat.",
    "Weekend: let members suggest their own topic rather than scheduling every conversation.",
  ];
}

function chatCommunityActivityPlanText(): string {
  return formatChatList(chatCommunityActivityPlan());
}

function chatPromptModerationNotes(): string[] {
  return [
    "Do not ping every member to force participation.",
    "Avoid questions that require disclosing age, address, school, or other sensitive details.",
    "Do not ask members to share account credentials or private messages.",
    "Let people decline a prompt without explanation.",
    "Use content warnings when a topic could unexpectedly become upsetting.",
    "Avoid turning friendly debates into personal arguments.",
    "Keep game spoilers and movie endings clearly labeled.",
    "If someone asks to change the topic, respect that request.",
  ];
}

function chatPromptModerationNotesText(): string {
  return formatChatList(chatPromptModerationNotes());
}

function getChatPromptCategoryPool(category: string): readonly string[] {
  if (category === "films") return FILM_CHAT_PROMPTS;
  if (category === "either") return THIS_OR_THAT_PROMPTS;
  if (category === "minecraft") return MINECRAFT_CHAT_NOTES.map(note => note.text);
  if (category === "cats") return CAT_CHAT_NOTES.map(note => note.text);
  if (category === "activities") return CHAT_MICRO_ACTIVITIES;
  if (category === "creative") return CREATIVE_CHAT_PROMPTS.map(prompt => prompt.text);
  return GENERAL_CHAT_PROMPTS;
}

function chooseChatPrompts(category: string, count: number): string[] {
  return pickChatEntries(getChatPromptCategoryPool(category), count).map(chatSafePrompt);
}

function chatPromptCollectionEmbed(category: string, count = 5): EmbedBuilder {
  const selected = chooseChatPrompts(category, count);
  return createEmbed(chatPromptSetTitle(category), selected.map((prompt, index) => `**${index + 1}.** ${prompt}`).join("\n\n"), COLORS.info);
}

function chatTopicOfTheDaySeed(date = new Date()): number {
  return Number(`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`);
}

function getDailyChatTopic(date = new Date()): { category: string; prompt: string } {
  const categories = ["cats", "minecraft", "films", "general", "either"];
  const seed = chatTopicOfTheDaySeed(date);
  const category = categories[seed % categories.length];
  const prompt = getChatPromptByIndex(category, Math.floor(seed / categories.length));
  return { category, prompt };
}

function dailyChatTopicText(date = new Date()): string {
  const topic = getDailyChatTopic(date);
  return `**${chatCategoryLabel(topic.category)}**\n${chatSafePrompt(topic.prompt)}`;
}

function chatTopicArchiveKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function chatPromptIsDuplicate(candidate: string, recent: readonly string[]): boolean {
  const normalized = normalizeChatText(candidate, 1000).toLowerCase();
  return recent.some(item => normalizeChatText(item, 1000).toLowerCase() === normalized);
}

function getChatPromptFallback(category: string): string {
  const fallbacks: Record<string, string> = {
    cats: "What is a small cat habit that always makes you smile?",
    minecraft: "What small improvement makes a Minecraft base easier to use?",
    films: "Which movie setting would you like to explore without changing the plot?",
    either: "Explore a forest village or build a coastal lighthouse?",
    general: "What is something small you enjoyed this week?",
  };
  return fallbacks[category] || fallbacks.general;
}

function getChatPromptSafe(category: string): string {
  const pool = getChatPromptCategoryPool(category);
  if (!pool.length) return getChatPromptFallback(category);
  const selected = pickChatEntry(pool);
  return chatPromptIsSafe(selected) ? selected : getChatPromptFallback(category);
}

function chatPromptForNewMember(): string {
  return pickChatEntry([
    "Say hi whenever you feel comfortable; there is no introduction template to fill out.",
    "You can start with a favorite game, cat photo, film, or any harmless topic.",
    "Lurking is fine too. Join a conversation when something catches your interest.",
    "The server has a few themed corners, but general chat is always a valid starting point.",
  ]);
}

function chatWelcomeSupplement(username: string): string {
  const safeName = normalizeChatText(username, 80).replace(/@/g, "@\u200b");
  return `${safeName}, ${chatPromptForNewMember()}`;
}

function chatRandomChoice<T>(items: readonly T[], fallback: T): T {
  return items.length ? pickChatEntry(items) : fallback;
}

function chatNoPressureReminder(): string {
  return "Optional prompt: answer if you want, skip if you do not. No pressure either way.";
}

function chatPromptWithNoPressure(prompt: string): string {
  return `${chatSafePrompt(prompt)}\n\n${chatNoPressureReminder()}`;
}

function chatPromptFooterForCategory(category: string): string {
  return `Cheddar · ${chatCategoryLabel(category)} · Be kind, keep spoilers labeled`;
}

function chatPromptColor(category: string): number {
  const colors: Record<string, number> = {
    cats: COLORS.pink,
    minecraft: COLORS.success,
    films: COLORS.purple,
    general: COLORS.info,
    either: COLORS.orange,
  };
  return colors[category] ?? COLORS.primary;
}

function chatPromptEmbed(category: string, prompt: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(chatPromptSetTitle(category))
    .setDescription(chatPromptWithNoPressure(prompt))
    .setColor(chatPromptColor(category))
    .setFooter({ text: chatPromptFooterForCategory(category) })
    .setTimestamp();
}

function getChatPromptStatsSummary(): string {
  const stats = chatPoolStats();
  const total = Object.values(stats).reduce((sum, value) => sum + value, 0);
  return `The chat library contains ${total} ready-to-use entries across ${Object.keys(stats).length} themed pools.`;
}

function chatPromptUsageHints(): string[] {
  return [
    "Use a prompt when chat needs a gentle starting point, not on every message.",
    "Rotate between cats, Minecraft, film chat, and general questions.",
    "Avoid posting multiple prompts in a row if members are already talking.",
    "Let members suggest new themes and retire prompts that no longer fit.",
    "A prompt is an invitation, not a rule or an engagement target.",
  ];
}

function chatPromptUsageHintsText(): string {
  return formatChatList(chatPromptUsageHints());
}

function chatOnlyFeatureSummary(): string {
  return [
    "Cheddar Chat focuses on casual community interaction.",
    describeChatPromptCategories(),
    getChatPromptStatsSummary(),
    "This bot is dedicated to chat, community prompts, and lightweight entertainment.",
    "Moderation and security are handled by the separate moderation bot.",
  ].join("\n\n");
}


// ============================================================
// 🚀 LOGIN
// ============================================================

client.login(TOKEN);
