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
  PermissionFlagsBits,
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

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is not configured.");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID is not configured.");
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
    warnings INTEGER DEFAULT 0,
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
    log_channel TEXT
  );
`);

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
    text: "🧀 CHEDDAR • Entertainment and Community",
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
    (user_id, guild_id, coins, xp, level, last_daily, last_work, warnings)
    VALUES (?, ?, 100, 0, 1, 0, 0, 0)
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
      warnings: number;
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
    .setName("clear")
    .setDescription("Delete messages")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages.toString()
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Number of messages")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.KickMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to kick")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to ban")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Temporarily mute a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Duration in minutes")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

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

    if (!channel) {

      channel =
        member.guild.channels.cache.find(
          ch => ch.isTextBased()
        ) as TextChannel | undefined;
    }

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

  const user =
    interaction.user;

  ensureUser(
    user.id,
    guild.id
  );

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
            name: "🛡️ Moderation",
            value:
              "`/clear`\n" +
              "`/kick`\n" +
              "`/ban`\n" +
              "`/timeout`\n" +
              "`/warn`",
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

          {
            name: "⚠️ Warnings",
            value:
              `${data.warnings}`,
            inline: true,
          }

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

  // ==========================================================
  // 🧹 CLEAR
  // ==========================================================

  if (commandName === "clear") {

    if (!interaction.channel?.isTextBased()) {
      return;
    }

    const amount =
      interaction.options.getInteger(
        "amount",
        true
      );

    const channel =
      interaction.channel;

    if (!("bulkDelete" in channel)) {

      await interaction.reply({
        content:
          "❌ This channel does not support bulk message deletion.",
        ephemeral: true,
      });

      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    const deleted =
      await channel.bulkDelete(
        amount,
        true
      );

    await interaction.editReply(
      `🧹 Successfully deleted **${deleted.size} messages**.`
    );

    return;
  }

  // ==========================================================
  // 👢 KICK
  // ==========================================================

  if (commandName === "kick") {

    const target =
      interaction.options.getMember(
        "user"
      ) as GuildMember | null;

    const reason =
      interaction.options.getString(
        "reason"
      ) ??
      "No reason specified";

    if (!target) {

      await interaction.reply({
        content:
          "❌ User not found.",
        ephemeral: true,
      });

      return;
    }

    if (!target.kickable) {

      await interaction.reply({
        content:
          "❌ I cannot kick this user.",
        ephemeral: true,
      });

      return;
    }

    await target.kick(
      reason
    );

    await interaction.reply({
      embeds: [
        createEmbed(
          "👢 User Kicked",
          `**${target.user.username}** has been kicked.\n\n` +
          `📝 Reason: ${reason}`,
          COLORS.error
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🔨 BAN
  // ==========================================================

  if (commandName === "ban") {

    const target =
      interaction.options.getMember(
        "user"
      ) as GuildMember | null;

    const reason =
      interaction.options.getString(
        "reason"
      ) ??
      "No reason specified";

    if (!target) {

      await interaction.reply({
        content:
          "❌ User not found.",
        ephemeral: true,
      });

      return;
    }

    if (!target.bannable) {

      await interaction.reply({
        content:
          "❌ I cannot ban this user.",
        ephemeral: true,
      });

      return;
    }

    await target.ban({
      reason,
    });

    await interaction.reply({
      embeds: [
        createEmbed(
          "🔨 User Banned",
          `**${target.user.username}** has been banned.\n\n` +
          `📝 Reason: ${reason}`,
          COLORS.red
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // 🔇 TIMEOUT
  // ==========================================================

  if (commandName === "timeout") {

    const target =
      interaction.options.getMember(
        "user"
      ) as GuildMember | null;

    const minutes =
      interaction.options.getInteger(
        "minutes",
        true
      );

    if (!target) {

      await interaction.reply({
        content:
          "❌ User not found.",
        ephemeral: true,
      });

      return;
    }

    if (!target.moderatable) {

      await interaction.reply({
        content:
          "❌ I cannot timeout this user.",
        ephemeral: true,
      });

      return;
    }

    await target.timeout(
      minutes * 60 * 1000,
      `Timeout applied by ${user.username}`
    );

    await interaction.reply({
      embeds: [
        createEmbed(
          "🔇 Timeout Applied",
          `**${target.user.username}** has been timed out for **${minutes} minutes**.`,
          COLORS.error
        ),
      ],
    });

    return;
  }

  // ==========================================================
  // ⚠️ WARN
  // ==========================================================

  if (commandName === "warn") {

    const target =
      interaction.options.getMember(
        "user"
      ) as GuildMember | null;

    const reason =
      interaction.options.getString(
        "reason"
      ) ??
      "No reason specified";

    if (!target) {

      await interaction.reply({
        content:
          "❌ User not found.",
        ephemeral: true,
      });

      return;
    }

    ensureUser(
      target.id,
      guild.id
    );

    db.prepare(`
      UPDATE users
      SET warnings = warnings + 1
      WHERE user_id = ?
      AND guild_id = ?
    `).run(
      target.id,
      guild.id
    );

    const data =
      getUser(
        target.id,
        guild.id
      );

    await interaction.reply({
      embeds: [
        createEmbed(
          "⚠️ Warning Issued",
          `**${target.user.username}** has received a warning.\n\n` +
          `📝 Reason: ${reason}\n` +
          `⚠️ Total warnings: **${data.warnings}**`,
          COLORS.error
        ),
      ],
    });

    return;
  }
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
// 🚀 LOGIN
// ============================================================

client.login(TOKEN);
