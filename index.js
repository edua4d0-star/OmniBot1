require('dotenv').config();
const express = require('express'); 
const mongoose = require('mongoose');
const path = require('path');

// 🧞 Configuração do Akinator
const { Akinator } = require('aki-api');

// 🎨 Configuração do Canvas
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// 🤖 Configuração do Discord.js
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    AttachmentBuilder, 
    Options, 
    PermissionsBitField 
} = require('discord.js');

// 📂 Importação do Schema de Usuário
const User = require('./models/User');

// ==================== 🛠️ VARIÁVEIS GLOBAIS UNIFICADAS ====================
let roletaDisponivelGlobal = true; // Esta é a variável principal
let proximoEventoRoleta = Date.now() + Math.random() * (6 * 60 * 60 * 1000); 
let cooldownLigar = new Set();

// Reset automático da roleta à meia-noite
setInterval(() => {
    const agora = new Date();
    if (agora.getHours() === 0 && agora.getMinutes() === 0) {
        roletaDisponivelGlobal = true;
    }
}, 60000);

// ==================== 🌐 SERVIDOR WEB (KEEP-ALIVE) ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('O bot de Facção está operando com sucesso! 🌑');
});

app.listen(PORT, () => {
    console.log(`✅ Servidor Web ativo na porta ${PORT}`);
});

// ==================== 🗄️ CONEXÃO MONGODB ====================
const mongoURI = process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro MongoDB:", err));

// ==================== 🤖 CONFIGURAÇÃO BOT ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, 
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
        GuildMemberManager: 50, 
    }),
});

const lojaItens = {
    // 🏛️ CATEGORIA: LEGAL & TRABALHO
    "escudo": { nome: "Escudo de Energia", preco: 6000, estoque: 3, categoria: "legal", desc: "Protege o teu saldo de uma tentativa de roubo." },
    "picareta": { nome: "Picareta de Ferro", preco: 8000, estoque: 5, categoria: "legal", desc: "Aumenta os teus ganhos ao minerar no !trabalhar." },
    "computador": { nome: "Computador", preco: 10000, estoque: 4, categoria: "legal", desc: "Permite trabalhar como Freelancer com bónus de moedas." },
    "cafe": { nome: "Café Energético", preco: 2500, estoque: 20, categoria: "legal", desc: "Reduz o tempo de espera do próximo !trabalhar." },
    "maleta": { nome: "Maleta Executiva", preco: 15000, estoque: 3, categoria: "legal", desc: "Aumenta a capacidade máxima de depósito no banco." },
    "uniforme": { nome: "Uniforme de Trabalho", preco: 4000, estoque: 10, categoria: "legal", desc: "Dá um bónus fixo de 500 moedas em cada !trabalhar." },
    "tablet": { nome: "Tablet de Gestão", preco: 12000, estoque: 5, categoria: "legal", desc: "Visualiza os ganhos de todos os membros do servidor." },
    "fundo": { nome: "Passe de Background", preco: 25000, estoque: 999, categoria: "legal", desc: "Permite usar um link de imagem personalizado no seu !perfil." },

    // 🌑 CATEGORIA: SUBMUNDO (CRIME)
    "passaporte": { nome: "Passaporte Falso", preco: 7500, estoque: 5, categoria: "submundo", desc: "Limpa o teu histórico e reseta o timer do contrato." },
    "faca": { nome: "Faca de Combate", preco: 8000, estoque: 10, categoria: "submundo", desc: "Aumenta a tua chance de sucesso no !roubar e !concluir." },
    "dinamite": { nome: "Dinamite", preco: 10000, estoque: 5, categoria: "submundo", desc: "Garante sucesso no !crime com ganho x2.5 (Consumível)." },
    "arma": { nome: "Pistola 9mm", preco: 25000, estoque: 2, categoria: "submundo", desc: "Garante vitória no !atacar e bónus passivo no crime." },
    "lockpick": { nome: "Chave Mestra (Lockpick)", preco: 5000, estoque: 15, categoria: "submundo", desc: "Aumenta a chance de roubar lojas sem ser apanhado." },
    "mascara": { nome: "Máscara de Palhaço", preco: 12000, estoque: 4, categoria: "submundo", desc: "Esconde o teu nome nos logs e reduz multas da polícia." },
    "pendrive": { nome: "Pen-drive Infectado", preco: 9000, estoque: 6, categoria: "submundo", desc: "Item essencial para as missões de Hacker da Deep Web." },
    "colete": { nome: "Colete à Prova de Balas", preco: 18000, estoque: 3, categoria: "submundo", desc: "Evita que você seja silenciado pelo comando !matar uma vez." },
    "inibidor": { nome: "Inibidor de Sinal", preco: 14000, estoque: 2, categoria: "submundo", desc: "Impede que alguém use o comando !localizar em você." },
    "algema": { nome: "Algemas de Aço", preco: 15000, estoque: 3, categoria: "submundo", desc: "Prende um usuário, impedindo-o de usar comandos por 2 minutos." },

    // ⚡ CATEGORIA: CIBERNÉTICA & TECH
    "chip": { nome: "Chip Neural", preco: 45000, estoque: 2, categoria: "tech", desc: "Reduz cooldowns e dá bônus de 20% no lucro do !concluir." },
    "bateria": { nome: "Bateria de Lítio Pro", preco: 7000, estoque: 10, categoria: "tech", desc: "Consumível: Reseta instantaneamente o cooldown do !atacar." },
    "visor": { nome: "Visor Noturno", preco: 16000, estoque: 4, categoria: "tech", desc: "Permite ver quem tem mais dinheiro na mão no momento." },
    "virus": { nome: "Vírus Cavalo de Tróia", preco: 20000, estoque: 3, categoria: "tech", desc: "Rouba 10% do banco de um alvo aleatório (Risco de falha)." },

    // ❤️ CATEGORIA: RELACIONAMENTO & LUXO (SISTEMA DE AFINIDADE)
    "anel": { nome: "Anel de Diamante", preco: 50000, estoque: 2, categoria: "presente", desc: "Aumenta drasticamente a afinidade ao dar um !presentear." },
    "flores": { nome: "Buquê de Flores", preco: 1500, estoque: 50, categoria: "presente", desc: "Aumenta +10 de afinidade no comando !presentear." },
    "chocolate": { nome: "Caixa de Bombons", preco: 3000, estoque: 30, categoria: "presente", desc: "Aumenta a afinidade e reseta o cooldown de comandos sociais." },
    "urso": { nome: "Urso Gigante", preco: 7000, estoque: 10, categoria: "presente", desc: "Um presente fofo que concede +25 de afinidade ao cônjuge." },
    "mansao": { nome: "Escritório na Mansão", preco: 350000, estoque: 1, categoria: "luxo", desc: "Dobra o valor recebido em bónus diários (!daily)." },

    // 💎 CATEGORIA: RELÍQUIAS LENDÁRIAS
    "faccao": { nome: "Convite de Facção", preco: 2000000, estoque: 1, categoria: "lendario", desc: "Dá acesso ao cargo supremo e bónus em todos os crimes." },
    "iate": { nome: "Escritório no Iate", preco: 500000, estoque: 1, categoria: "lendario", desc: "Reduz as multas de polícia em 50% permanentemente." },
    "jatinho": { nome: "Jatinho Particular", preco: 1500000, estoque: 1, categoria: "lendario", desc: "Permite fugir de qualquer tentativa de !matar ou !kick." },
    "relogio": { nome: "Relógio de Ouro", preco: 100000, estoque: 2, categoria: "lendario", desc: "Exibe um título especial de 'Magnata' no seu perfil." },
    "coroa": { nome: "Coroa do Rei do Crime", preco: 5000000, estoque: 1, categoria: "lendario", desc: "O item mais caro. Dá imunidade a roubos de qualquer jogador." }
}; 

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

// ==================== EVENTO AUTOMÁTICO: BOM DIA & CIA ====================
    // Verifica se a roleta está disponível e se já passou do horário sorteado
    if (roletaDisponivelGlobal && Date.now() > proximoEventoRoleta && !message.author.bot) {
        
        roletaDisponivelGlobal = false; // Desativa para ninguém mais ganhar hoje
        
        // Sorteia o próximo horário (daqui a 6 a 12 horas)
        proximoEventoRoleta = Date.now() + (6 * 60 * 60 * 1000) + (Math.random() * 6 * 60 * 60 * 1000);

        const premioGrande = Math.floor(Math.random() * (500000 - 150000 + 1)) + 150000;

        await User.updateOne({ userId: message.author.id }, { $inc: { money: premioGrande } });

        const embedSurpresa = new EmbedBuilder()
            .setTitle('📺 BOM DIA & CIA - EVENTO SURPRESA!')
            .setColor('#F1C40F')
            .setThumbnail('https://i.imgur.com/v8tTfI7.png')
            .setDescription(`⭐ **INCRÍVEL!** A roleta parou para você no meio do chat!\n\n🎙️ **Yudi:** "PLAYSTATION! PLAYSTATION!"\n\n💰 **Prêmio Ganho:** \`${premioGrande.toLocaleString()}\` moedas!`)
            .setImage('https://media.giphy.com/media/l41lTjJp9k6yZ8z7q/giphy.gif');

        message.channel.send({ content: `🎊 <@${message.author.id}>`, embeds: [embedSurpresa] });
    }

    // 1. Carrega os dados do MongoDB (UMA ÚNICA VEZ AQUI)
    let userData = await User.findOne({ userId: message.author.id });
    if (!userData) userData = await User.create({ userId: message.author.id });

    // Resposta à Menção
    if (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) {
        const embedMencao = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('👋 Olá! Eu sou o OmniBot')
            .setDescription('Meu prefixo é: `!`\nUse `!ajuda` para ver comandos.');
        return message.reply({ embeds: [embedMencao] });
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

if (command === 'akinator' || command === 'aki') {
        try {
            const akiApi = require('aki-api');
            const AkiClass = akiApi.Aki || (akiApi.default && akiApi.default.Aki);

            // Criando o gênio com configurações de disfarce
            const aki = new AkiClass({ 
                region: 'en', 
                childMode: false 
            });

            // Tenta iniciar
            await aki.start();
            
            // ... restante do seu código de embeds e botões ...

            const gerarBotoes = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('0').setLabel('Sim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('1').setLabel('Não').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('2').setLabel('Não Sei').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('3').setLabel('Talvez Sim').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('4').setLabel('Talvez Não').setStyle(ButtonStyle.Primary),
                );
            };
            
            const embed = new EmbedBuilder()
                .setTitle('🤔 Akinator')
                .setDescription(`**Pergunta ${aki.currentStep + 1}:**\n${aki.question}`)
                .setColor('#F1C40F')
                .setThumbnail('https://i.imgur.com/vHqY7Ym.png')
                .setFooter({ text: `Progresso: ${Math.round(aki.progress)}%` });

            const msg = await message.reply({ embeds: [embed], components: [gerarBotoes()] });

            const filter = (i) => i.user.id === message.author.id;
            const collector = msg.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async (interaction) => {
                try {
                    if (!interaction.deferred) await interaction.deferUpdate();

                    await aki.step(interaction.customId);

                    if (aki.progress >= 80 || aki.currentStep >= 78) {
                        collector.stop();

                        const guess = aki.answers[0]; 

                        const winEmbed = new EmbedBuilder()
                            .setTitle('🎯 O Gênio deu o palpite!')
                            .setDescription(`Eu acho que seu personagem é: **${guess.name}**\n*${guess.description}*\n\n**Eu acertei?**`)
                            .setImage(guess.absolute_picture_path || 'https://i.imgur.com/vHqY7Ym.png')
                            .setColor('#2ECC71');

                        const rowConfirm = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('aki_sim').setLabel('Sim, acertou!').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('aki_nao').setLabel('Não, errou!').setStyle(ButtonStyle.Danger)
                        );

                        const finalMsg = await msg.edit({ embeds: [winEmbed], components: [rowConfirm] });

                        const finalCollector = finalMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

                        finalCollector.on('collect', async (iFinal) => {
                            if (!iFinal.deferred) await iFinal.deferUpdate();
                            if (iFinal.customId === 'aki_sim') {
                                await User.updateOne({ userId: message.author.id }, { $inc: { akinatorDerrotas: 1 } });
                                await finalMsg.edit({ content: "🧞 **Akinator:** HAHA! Eu sabia!", components: [], embeds: [winEmbed] });
                            } else {
                                await User.updateOne({ userId: message.author.id }, { $inc: { akinatorVitorias: 1 } });
                                await finalMsg.edit({ content: "😔 **Akinator:** Você me venceu...", components: [], embeds: [winEmbed.setColor('#FF0000')] });
                            }
                        });
                        return;
                    }

                    const nextEmbed = new EmbedBuilder()
                        .setTitle('🤔 Akinator')
                        .setDescription(`**Pergunta ${aki.currentStep + 1}:**\n${aki.question}`)
                        .setColor('#F1C40F')
                        .setThumbnail('https://i.imgur.com/vHqY7Ym.png')
                        .setFooter({ text: `Progresso: ${Math.round(aki.progress)}%` });

                    await msg.edit({ embeds: [nextEmbed], components: [gerarBotoes()] });
                } catch (err) {
                    console.error("Erro no coletor:", err);
                }
            });

          } catch (e) {
            console.error("ERRO COMPLETO:", e); // Isso vai mostrar o erro real no console

            if (e.message.includes('403')) {
                return message.reply("⚠️ **O Gênio bloqueou a conexão.**\nO Akinator detectou o bot como um acesso não autorizado. Isso é um bloqueio temporário do site deles. Tente novamente em alguns minutos ou faça o deploy no Render.");
            }
            
            message.reply("❌ Não consegui iniciar o gênio. Tente novamente mais tarde.");
        }
    }

    // ==================== 📊 COMANDO STATS AKINATOR ====================
    if (command === 'akiestats') {
        const vitorias = userData.akinatorVitorias || 0;
        const derrotas = userData.akinatorDerrotas || 0;
        
        const embedStats = new EmbedBuilder()
            .setTitle(`📊 Stats Akinator - ${message.author.username}`)
            .addFields(
                { name: '🏆 Vitórias (Você ganhou)', value: `\`${vitorias}\``, inline: true },
                { name: '🧞 Derrotas (Gênio acertou)', value: `\`${derrotas}\``, inline: true }
            )
            .setColor('#F1C40F');

        return message.reply({ embeds: [embedStats] });
    }

// ==================== 📞 COMANDO !LIGAR (CUSTO: 72) ====================
    if (command === 'ligar' || command === 'call') {
        const custoLigacao = 72;

        // 1. Verifica se o usuário tem dinheiro (userData vem do seu banco de dados)
        if (userData.money < custoLigacao) {
            return message.reply(`💸 Você não tem **${custoLigacao} moedas** para fazer essa ligação!`);
        }

        // 2. Verifica se alguém já ganhou o prêmio global hoje
        if (!roletaDisponivelGlobal) {
            return message.reply("📺 **Yudi:** \"O programa de hoje já acabou e os prêmios foram entregues! Volte amanhã!\"");
        }

        // 3. Verifica Cooldown (5 minutos)
        if (cooldownLigar.has(message.author.id)) {
            return message.reply("📞 **Linha Ocupada!** Você já tentou ligar recentemente. Espere um pouco.");
        }

        // --- AÇÃO: DESCONTA O DINHEIRO E ATIVA COOLDOWN ---
        await User.updateOne({ userId: message.author.id }, { $inc: { money: -custoLigacao } });
        cooldownLigar.add(message.author.id);
        setTimeout(() => cooldownLigar.delete(message.author.id), 300000); 

        const msgLigar = await message.reply(`☎️ [-${custoLigacao} moedas] **Tuuuut... Tuuuut...** Ligando para o Bom Dia & Cia...`);

        setTimeout(async () => {
            // Chance de 2% de ser atendido
            const sorteioAtender = Math.random() < 0.02; 

            if (sorteioAtender && roletaDisponivelGlobal) {
                roletaDisponivelGlobal = false; // Bloqueia o prêmio para o resto do dia

                // Sorteia o prêmio gigante (150k a 500k)
                const premioGrande = Math.floor(Math.random() * (500000 - 150000 + 1)) + 150000;

                await User.updateOne({ userId: message.author.id }, { $inc: { money: premioGrande } });

                const embedWin = new EmbedBuilder()
                    .setTitle('📺 BOM DIA & CIA - VOCÊ ESTÁ NO AR!')
                    .setColor('#F1C40F')
                    .setDescription(`🎙️ **PRISCILA:** "Alô? Quem fala?!"\n👤 **Vencedor:** <@${message.author.id}>\n\n🎮 **PLAYSTATION 2!!**\n💰 **Prêmio:** \`${premioGrande.toLocaleString()}\` moedas!`)
                    .setImage('https://media.giphy.com/media/l41lTjJp9k6yZ8z7q/giphy.gif');

                return msgLigar.edit({ content: `✅ **LIGAÇÃO ATENDIDA!**`, embeds: [embedWin] });
            } else {
                return msgLigar.edit("❌ **Ocupado:** \"Desculpe, todas as nossas linhas estão ocupadas. Tente novamente mais tarde!\"");
            }
        }, 3000);
        return; // Finaliza aqui para não executar outros comandos
    } 
    // COMANDO MONEY
    if (command === 'money' || command === 'bal') {
        const alvo = message.mentions.users.first() || message.author;
        let data = (alvo.id === message.author.id) ? userData : await User.findOne({ userId: alvo.id });
        const saldo = data ? data.money.toLocaleString() : "0";
        return message.reply(`💰 **${alvo.username}** tem **${saldo} moedas**.`);
    }

// ==================== 🎁 COMANDO DAILY (INTEGRADO) ====================
if (command === 'daily') {
    try {
        const tempoEspera = 24 * 60 * 60 * 1000; // 24 horas
        const agora = Date.now();
        const inventory = userData.inventory || [];

        // 1. Verificação de Cooldown
        if (agora - (userData.lastDaily || 0) < tempoEspera) {
            const restando = tempoEspera - (agora - userData.lastDaily);
            const horas = Math.floor(restando / 3600000);
            const minutos = Math.floor((restando % 3600000) / 60000);
            
            return message.reply(`❌ Já coletaste o teu bônus hoje! Volta em **${horas}h e ${minutos}min**.`);
        }

        // 2. Lógica de Ganhos
        let ganho = Math.floor(Math.random() * 7001) + 3000; // Base: 3k a 10k
        let extras = [];

        // --- BÔNUS: MANSÃO (Dobra o valor) ---
        if (inventory.includes('mansao')) {
            ganho *= 2;
            extras.push("🏡 **Bônus de Mansão (2x)**");
        }

        // --- BÔNUS: RELÓGIO DE OURO (Bônus fixo de ostentação) ---
        if (inventory.includes('relogio')) {
            const bonusOuro = 2500;
            ganho += bonusOuro;
            extras.push("⌚ **Bônus Magnata (+2.5k)**");
        }

        // 3. Salvamento
        userData.money += ganho;
        userData.lastDaily = agora;
        await userData.save();

        // 4. Resposta Estilizada
        let resposta = `🎁 **RECOMPENSA DIÁRIA** 🎁\n\n` +
                       `Recebeste **${ganho.toLocaleString()} moedas** hoje!`;

        if (extras.length > 0) {
            resposta += `\n\n✨ **Benefícios ativos:**\n${extras.join('\n')}`;
        }

        resposta += `\n\n*Amanhã tem mais! Não te esqueças de voltar.*`;

        return message.reply(resposta);

    } catch (error) {
        console.error("Erro no comando daily:", error);
        message.reply("❌ Ocorreu um erro ao coletar o seu daily.");
    }
}
// ==================== 🔨 COMANDO TRABALHAR (VERSÃO 2.0 - INTEGRADA) ====================
if (command === 'trabalhar' || command === 'work') {
    const now = Date.now();
    const inventory = userData.inventory || [];
    const totalTrabalhos = userData.workCount || 0;
    const isFaccao = userData.cargo === "Membro da Facção";
    const lastWork = userData.lastWork || 0;

    // 1. Definição Dinâmica de Cooldown
    let cooldown;
    if (totalTrabalhos < 30) cooldown = 600000;
    else if (totalTrabalhos < 70) cooldown = 900000;
    else if (totalTrabalhos < 130) cooldown = 1200000;
    else if (totalTrabalhos < 200) cooldown = 1500000;
    else if (totalTrabalhos < 300) cooldown = 1800000;
    else if (totalTrabalhos < 420) cooldown = 2100000;
    else if (totalTrabalhos < 550) cooldown = 2400000;
    else if (totalTrabalhos < 700) cooldown = 2700000;
    else if (totalTrabalhos < 850) cooldown = 3000000;
    else if (totalTrabalhos < 1000) cooldown = 3300000;
    else cooldown = 3600000;

    // --- [NOVO] BÔNUS PASSIVO: CHIP NEURAL (Reduz cooldown em 30%) ---
    if (inventory.includes('chip')) {
        cooldown = Math.floor(cooldown * 0.7);
    }

    // 2. Verificação de Cooldown / Passaporte
    if (now - lastWork < cooldown) {
        // Se tiver passaporte, ele usa automaticamente para não barrar o comando
        if (inventory.includes('passaporte')) {
            const index = userData.inventory.indexOf('passaporte');
            userData.inventory.splice(index, 1);
            userData.markModified('inventory');
            // Deixa passar para o trabalho...
        } else {
            const restante = cooldown - (now - lastWork);
            const minutos = Math.ceil(restante / 60000);
            return message.reply(`⏳ Estás cansado! Volta em **${minutos} minutos**.\n💡 *Dica: Podes usar um **Café Energético** ou um **Passaporte** para resetar o tempo!*`);
        }
    }

    // 3. Lógica de Profissões (Mantendo sua estrutura original)
    let ganhoBase = 0;
    let nomeProfissao = "";

    if (isFaccao) {
        if (totalTrabalhos < 30) { ganhoBase = Math.floor(Math.random() * 500) + 1000; nomeProfissao = "Olheiro"; }
        else if (totalTrabalhos < 70) { ganhoBase = Math.floor(Math.random() * 1000) + 2000; nomeProfissao = "Aviãozinho"; }
        else if (totalTrabalhos < 130) { ganhoBase = Math.floor(Math.random() * 1500) + 3500; nomeProfissao = "Vendedor de Carga"; }
        else if (totalTrabalhos < 200) { ganhoBase = Math.floor(Math.random() * 2000) + 5500; nomeProfissao = "Segurança do Morro"; }
        else if (totalTrabalhos < 300) { ganhoBase = Math.floor(Math.random() * 3000) + 8000; nomeProfissao = "Cobrador"; }
        else if (totalTrabalhos < 420) { ganhoBase = Math.floor(Math.random() * 4000) + 11000; nomeProfissao = "Gerente de Boca"; }
        else if (totalTrabalhos < 550) { ganhoBase = Math.floor(Math.random() * 5000) + 15000; nomeProfissao = "Fornecedor"; }
        else if (totalTrabalhos < 700) { ganhoBase = Math.floor(Math.random() * 6000) + 20000; nomeProfissao = "Conselheiro"; }
        else if (totalTrabalhos < 850) { ganhoBase = Math.floor(Math.random() * 8000) + 24000; nomeProfissao = "Braço Direito"; }
        else if (totalTrabalhos < 1000) { ganhoBase = Math.floor(Math.random() * 10000) + 27000; nomeProfissao = "Sub-Chefe"; }
        else { ganhoBase = Math.floor(Math.random() * 15000) + 30000; nomeProfissao = "Líder da Facção 🏴‍☠️"; }
    } else {
        if (totalTrabalhos < 30) { ganhoBase = Math.floor(Math.random() * 500) + 1000; nomeProfissao = "Estagiário"; }
        else if (totalTrabalhos < 70) { ganhoBase = Math.floor(Math.random() * 800) + 1800; nomeProfissao = "Auxiliar"; }
        else if (totalTrabalhos < 130) { ganhoBase = Math.floor(Math.random() * 1000) + 2800; nomeProfissao = "Vendedor Júnior"; }
        else if (totalTrabalhos < 200) { ganhoBase = Math.floor(Math.random() * 1500) + 4000; nomeProfissao = "Analista Pleno"; }
        else if (totalTrabalhos < 300) { ganhoBase = Math.floor(Math.random() * 2000) + 5500; nomeProfissao = "Supervisor"; }
        else if (totalTrabalhos < 420) { ganhoBase = Math.floor(Math.random() * 2500) + 7000; nomeProfissao = "Gerente de Setor"; }
        else if (totalTrabalhos < 550) { ganhoBase = Math.floor(Math.random() * 3000) + 8500; nomeProfissao = "Gerente Regional"; }
        else if (totalTrabalhos < 700) { ganhoBase = Math.floor(Math.random() * 4000) + 10000; nomeProfissao = "Diretor Executivo"; }
        else if (totalTrabalhos < 850) { ganhoBase = Math.floor(Math.random() * 5000) + 11500; nomeProfissao = "Vice-Presidente"; }
        else if (totalTrabalhos < 1000) { ganhoBase = Math.floor(Math.random() * 6000) + 13000; nomeProfissao = "Sócio-Fundador"; }
        else { ganhoBase = Math.floor(Math.random() * 10000) + 15000; nomeProfissao = "CEO da Empresa 💎"; }
    }

    // 4. BÔNUS DE ITENS (SISTEMA MELHORADO)
    let bonusTotal = 0;
    let extras = [];
    
    if (inventory.includes('picareta')) { bonusTotal += 1200; extras.push("⛏️"); }
    if (inventory.includes('computador')) { bonusTotal += 3000; extras.push("💻"); }
    if (inventory.includes('uniforme')) { bonusTotal += 500; extras.push("👕"); }
    if (inventory.includes('chip')) { extras.push("💾"); }

    const totalFinal = ganhoBase + bonusTotal;
    userData.money += totalFinal;
    userData.lastWork = now;
    userData.workCount = (userData.workCount || 0) + 1;
    await userData.save();

    // 5. Resposta Visual Estilizada
    const passaporteTexto = (now - lastWork < cooldown) ? "🎫 **PASSAPORTE USADO!** Cansaço ignorado.\n" : "";
    const bonusTexto = extras.length > 0 ? `\n> **Bônus ativos:** ${extras.join(' ')} (+\`${bonusTotal.toLocaleString()}\`)` : "";

    return message.reply(
        `${passaporteTexto}` +
        `🔨 Trabalhaste como **${nomeProfissao}** e ganhaste **${totalFinal.toLocaleString()} moedas**!` +
        `${bonusTexto}\n` +
        `📊 Nível: \`${userData.workCount}\` | ⏳ Cooldown: \`${Math.ceil(cooldown/60000)}min\``
    );
}
if (command === 'setmoney') {
    // Substitua apenas os números, mantenha as aspas ''
    if (message.author.id !== '1203435676083822712') return message.reply("❌ Apenas o dono pode usar este comando.");

    const alvo = message.mentions.users.first();
    const quantia = parseInt(args[1]);

    if (!alvo || isNaN(quantia)) return message.reply("❌ Use: `!setmoney @usuario 5000`.");

    try {
        // O $set muda o valor diretamente para a quantia digitada
        const usuarioAtualizado = await User.findOneAndUpdate(
            { userId: alvo.id },
            { $set: { money: quantia } }, 
            { upsert: true, new: true }
        );

        return message.reply(`✅ O saldo de ${alvo.username} foi alterado diretamente para **${quantia.toLocaleString()}** moedas.`);
    } catch (error) {
        console.error("Erro no comando setmoney:", error);
        message.reply("❌ Ocorreu um erro ao definir o dinheiro.");
    }
}
// ==================== 💼 COMANDO TRABALHOS (MÁXIMO 1K) ====================
if (command === 'trabalhos' || command === 'jobs' || command === 'empregos') {
    const totalTrabalhos = userData.workCount || 0;
    const isFaccao = userData.cargo === "Membro da Facção";

    let profissaoAtual = "";
    let proxProfissao = "";

    // 1. As 10 metas para chegar ao nível 11 (O último nível é após 1000)
    const metas = [30, 70, 130, 200, 300, 420, 550, 700, 850, 1000];

    // 2. Listas de nomes para os 11 níveis
    const profsCivil = [
        "Estagiário", "Auxiliar", "Vendedor Júnior", "Analista Pleno", 
        "Supervisor", "Gerente de Setor", "Gerente Regional", 
        "Diretor Executivo", "Vice-Presidente", "Sócio-Fundador", "CEO da Empresa 💎"
    ];

    const profsFaccao = [
        "Olheiro", "Aviãozinho", "Vendedor de Carga", "Segurança do Morro", 
        "Cobrador", "Gerente de Boca", "Fornecedor", 
        "Conselheiro", "Braço Direito", "Sub-Chefe", "Líder da Facção 🏴‍☠️"
    ];

    const lista = isFaccao ? profsFaccao : profsCivil;
    
    // 3. Lógica para encontrar o cargo atual baseado no workCount
    let index = metas.findIndex(m => totalTrabalhos < m);

    if (index === -1) {
        // Se não encontrou (ou seja, passou de 1000)
        profissaoAtual = lista[10];
        proxProfissao = "Nível Máximo Alcançado! 🏆";
    } else {
        profissaoAtual = lista[index];
        proxProfissao = `${lista[index + 1]} (${metas[index]} trab.)`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`💼 Carreira de ${message.author.username}`)
        .setColor(isFaccao ? "#2b2d31" : "#00ff00")
        .setThumbnail(message.author.displayAvatarURL())
        .setDescription(`Você completou **${totalTrabalhos}** turnos de trabalho.`)
        .addFields(
            { name: '📍 Profissão Atual:', value: `\`${profissaoAtual}\``, inline: true },
            { name: '🚀 Próxima Promoção:', value: `\`${proxProfissao}\``, inline: true }
        )
        .setFooter({ text: "O tempo de espera aumenta conforme você é promovido!" })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}
// ==================== 🛠️ COMANDO RESETAR (ATUALIZADO) ====================
if (command === 'resetar' || command === 'reset') {
    try {
        const meuID = "1203435676083822712";

        // 1. Verifica se quem enviou é o dono do bot
        if (message.author.id !== meuID) {
            return message.reply("❌ Apenas o meu desenvolvedor pode usar este comando!");
        }

        // 2. Define o alvo: quem foi marcado OU você mesmo
        const alvo = message.mentions.users.first() || message.author;

        // 3. Busca os dados no MongoDB
        let targetData;
        if (alvo.id === message.author.id) {
            targetData = userData;
        } else {
            targetData = await User.findOne({ userId: alvo.id });
        }

        if (!targetData) return message.reply("❌ Este usuário não possui dados registrados.");

        // 4. Reseta os dados no MongoDB
        targetData.money = 5000; 
        targetData.bank = 0; 
        targetData.cargo = "Civil";
        
        // --- RESET DO SISTEMA DE BACKGROUNDS ---
        targetData.bg = "https://i.imgur.com/yG1r44O.jpeg"; // Volta para o fundo padrão seguro
        targetData.bgInventory = []; // Limpa a lista de fundos comprados
        
        // Limpa o inventário geral (mantendo a estrutura de array)
        targetData.inventory = [];

        targetData.missionCount = 0;
        targetData.workCount = 0; 
        targetData.lastCrime = 0; 
        targetData.lastWork = 0; 
        targetData.lastDaily = 0;
        targetData.lastTrafico = 0;
        targetData.lastMission = 0;
        
        await targetData.save();

        // 5. Lógica para remover o cargo no Discord
        const idDoCargoFaccao = "1454692749482660003";
        const membroNoServidor = message.guild.members.cache.get(alvo.id);

        if (membroNoServidor) {
            if (membroNoServidor.roles.cache.has(idDoCargoFaccao)) {
                await membroNoServidor.roles.remove(idDoCargoFaccao).catch(err => {
                    console.error("Erro ao remover cargo:", err);
                    message.channel.send("⚠️ Erro ao remover o cargo no Discord (Verifique minha posição na hierarquia).");
                });
            }
        }

        const msgQuem = alvo.id === message.author.id ? "Seu próprio perfil foi resetado" : `O perfil de **${alvo.username}** foi resetado`;

        return message.reply(`🛠️ **[ADMIN]** ${msgQuem} com sucesso!\n- Dinheiro inicial: 5.000\n- Status: Civil\n- Fundo: **Padrão Restaurado** 🖼️\n- Inventário: Esvaziado\n- Timers: Zerados`);

    } catch (error) {
        console.error("Erro no comando resetar:", error);
        return message.reply("❌ Ocorreu um erro crítico ao tentar resetar os dados.");
    }
}
// ==================== 🏦 SISTEMA DE BANCO ====================

// COMANDO DEPOSITAR
if (command === 'depositar' || command === 'dep') {
    const valorStr = args[0];
    let valorParaDepositar;

    if (!valorStr) return message.reply("❌ Diz quanto queres depositar ou usa `!dep all`.");

    if (valorStr.toLowerCase() === 'all') {
        valorParaDepositar = userData.money;
    } else {
        valorParaDepositar = parseInt(valorStr);
    }

    if (isNaN(valorParaDepositar) || valorParaDepositar <= 0) return message.reply("❌ Valor inválido.");
    if (userData.money < valorParaDepositar) return message.reply("❌ Não tens esse dinheiro todo na mão.");

    userData.money -= valorParaDepositar;
    userData.bank += valorParaDepositar;
    await userData.save();

    const embedDep = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🏦 Depósito Concluído')
        .setDescription(`Depositaste **${valorParaDepositar.toLocaleString()} moedas** no banco.\n🛡️ Agora estão protegidas de roubos!`);
    
    return message.reply({ embeds: [embedDep] });
}

// COMANDO SACAR
if (command === 'sacar' || command === 'saque') {
    const valorStr = args[0];
    let valorParaSacar;

    if (!valorStr) return message.reply("❌ Diz quanto queres sacar ou usa `!sacar all`.");

    if (valorStr.toLowerCase() === 'all') {
        valorParaSacar = userData.bank;
    } else {
        valorParaSacar = parseInt(valorStr);
    }

    if (isNaN(valorParaSacar) || valorParaSacar <= 0) return message.reply("❌ Valor inválido.");
    if (userData.bank < valorParaSacar) return message.reply("❌ Não tens esse dinheiro no banco.");

    userData.bank -= valorParaSacar;
    userData.money += valorParaSacar;
    await userData.save();

    const embedSaque = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle('🏦 Saque Concluído')
        .setDescription(`Sacaste **${valorParaSacar.toLocaleString()} moedas** para a tua mão.`);
    
    return message.reply({ embeds: [embedSaque] });
}
// ==================== 💸 COMANDO PIX ====================
if (command === 'pix') {
    try {
        const targetUser = message.mentions.users.first();
        const quantia = parseInt(args[1]);

        if (!targetUser) return message.reply('❌ Precisas de marcar (@) alguém!');
        if (targetUser.id === message.author.id) return message.reply('❌ Não podes enviar para ti próprio!');
        if (isNaN(quantia) || quantia <= 0) return message.reply('❌ Quantia inválida!');

        // Garante que o userData (quem envia) existe
        let senderData = await User.findOne({ userId: message.author.id });
        if (!senderData || senderData.money < quantia) {
            return message.reply(`❌ Saldo insuficiente ou conta não encontrada!`);
        }

        // Garante que o targetData (quem recebe) existe
        let targetData = await User.findOne({ userId: targetUser.id });
        if (!targetData) {
            targetData = await User.create({ userId: targetUser.id });
        }

        // Realiza a transação
        senderData.money -= quantia;
        targetData.money += quantia;

        await senderData.save();
        await targetData.save();

        const embed = new EmbedBuilder()
            .setTitle('💸 PIX Realizado!')
            .setColor('#2ecc71')
            .setDescription(`${message.author} enviou dinheiro para ${targetUser}!`)
            .addFields({ name: '💰 Valor', value: `R$ ${quantia.toLocaleString()}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Erro no comando PIX:", error);
        return message.reply("❌ Ocorreu um erro interno ao realizar o PIX.");
    }
}
// ==================== 🎰 COMANDO CASSINO (ROLETA) ====================
if (command === 'roleta' || command === 'bet') {
    const quantia = parseInt(args[0]);

    if (isNaN(quantia) || quantia <= 0) {
        return message.reply("❌ Digite um valor válido para apostar! Ex: `!roleta 100`.");
    }

    if (userData.money < quantia) {
        return message.reply(`💸 Você não tem dinheiro suficiente! Seu saldo: **${userData.money.toLocaleString()}**`);
    }

    // Chance de 45% de ganhar (um pouco menos que a metade para a casa ganhar)
    const ganhou = Math.random() < 0.45;
    let novoSaldo;

    if (ganhou) {
        const premio = quantia * 2;
        novoSaldo = userData.money + quantia; // Ganha o que apostou
        await User.updateOne({ userId: message.author.id }, { $inc: { money: quantia } });

        const embedVitoria = new EmbedBuilder()
            .setTitle('🎰 RESULTADO DA ROLETA')
            .setDescription(`🍀 **VOCÊ GANHOU!!**\n\nVocê apostou **${quantia.toLocaleString()}** e recebeu **${premio.toLocaleString()}** moedas!`)
            .setColor('#2ECC71')
            .setThumbnail('https://i.imgur.com/K69P9K7.png'); // Imagem de moedas/sorte

        return message.reply({ embeds: [embedVitoria] });
    } else {
        novoSaldo = userData.money - quantia;
        await User.updateOne({ userId: message.author.id }, { $inc: { money: -quantia } });

        const embedDerrota = new EmbedBuilder()
            .setTitle('🎰 RESULTADO DA ROLETA')
            .setDescription(`💀 **VOCÊ PERDEU!**\n\nO gênio da sorte não estava com você. Você perdeu **${quantia.toLocaleString()}** moedas.`)
            .setColor('#E74C3C');

        return message.reply({ embeds: [embedDerrota] });
    }
}
// ==================== 🃏 JOGO DE BLACKJACK (21) ====================
if (command === 'blackjack' || command === 'bj') {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
    
    let aposta = parseInt(args[0]);
    if (!aposta || aposta <= 0) return message.reply("❌ Digita um valor válido para apostar!");

    let dados = await User.findOne({ userId: message.author.id });
    if (!dados || dados.money < aposta) return message.reply("❌ Não tens dinheiro suficiente na mão!");

    // Configuração do Jogo
    const naipes = ['♠️', '♥️', '♣️', '♦️'];
    const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    function criarCarta() {
        const valor = valores[Math.floor(Math.random() * valores.length)];
        const naipe = naipes[Math.floor(Math.random() * naipes.length)];
        let pontos = parseInt(valor);
        if (['J', 'Q', 'K'].includes(valor)) pontos = 10;
        if (valor === 'A') pontos = 11;
        return { texto: `${valor}${naipe}`, pontos };
    }

    let maoPlayer = [criarCarta(), criarCarta()];
    let maoDealer = [criarCarta(), criarCarta()];

    const calcularPontos = (mao) => {
        let total = mao.reduce((sum, carta) => sum + carta.pontos, 0);
        let as = mao.filter(c => c.texto.startsWith('A')).length;
        while (total > 21 && as > 0) { total -= 10; as--; }
        return total;
    };

    // Embed Inicial
    const renderEmbed = (finalizado = false) => {
        let pontosP = calcularPontos(maoPlayer);
        let pontosD = finalizado ? calcularPontos(maoDealer) : "??";
        let cartasD = finalizado ? maoDealer.map(c => c.texto).join(" ") : `${maoDealer[0].texto} 🎴`;

        const eb = new EmbedBuilder()
            .setTitle('🃏 Blackjack (21)')
            .setColor(finalizado ? '#2b2d31' : '#5865F2')
            .addFields(
                { name: `Sua Mão (${pontosP})`, value: maoPlayer.map(c => c.texto).join(" "), inline: true },
                { name: `Banca (${pontosD})`, value: cartasD, inline: true }
            )
            .setFooter({ text: `Aposta: ${aposta.toLocaleString()} moedas` });
        return eb;
    };

    const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('Pedir Carta').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stand').setLabel('Parar').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [renderEmbed()], components: [botoes] });

    const filter = (i) => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
        await i.deferUpdate();

        if (i.customId === 'hit') {
            maoPlayer.push(criarCarta());
            if (calcularPontos(maoPlayer) > 21) {
                collector.stop('lose');
            } else {
                await msg.edit({ embeds: [renderEmbed()] });
            }
        } else if (i.customId === 'stand') {
            // Dealer joga
            while (calcularPontos(maoDealer) < 17) { maoDealer.push(criarCarta()); }
            collector.stop('check');
        }
    });

    collector.on('end', async (collected, reason) => {
        let pontosP = calcularPontos(maoPlayer);
        let pontosD = calcularPontos(maoDealer);
        let resultado = "";

        if (reason === 'lose' || pontosP > 21) {
            resultado = "💥 **ESTOUROU!** Você passou de 21 e perdeu.";
            await User.updateOne({ userId: message.author.id }, { $inc: { money: -aposta } });
        } else if (reason === 'check') {
            if (pontosD > 21 || pontosP > pontosD) {
                resultado = `🎉 **GANHOU!** Você recebeu **${aposta.toLocaleString()}** moedas.`;
                await User.updateOne({ userId: message.author.id }, { $inc: { money: aposta } });
            } else if (pontosP === pontosD) {
                resultado = "🤝 **EMPATE!** O dinheiro foi devolvido.";
            } else {
                resultado = "💀 **PERDEU!** A banca venceu.";
                await User.updateOne({ userId: message.author.id }, { $inc: { money: -aposta } });
            }
        } else {
            return msg.edit({ content: "⏰ Tempo esgotado!", components: [] });
        }

        const finalEmbed = renderEmbed(true).setDescription(resultado);
        await msg.edit({ embeds: [finalEmbed], components: [] });
    });
}
    // ==================== 🪙 COMANDO CASSINO ====================
    if (command === 'cassino' || command === 'caraoucoroa') {
        const targetUser = message.mentions.users.first();
        const aposta = parseInt(args[1]);

        if (!targetUser || targetUser.id === userId) return message.reply('❌ Desafia outra pessoa!');
        if (isNaN(aposta) || aposta <= 0) return message.reply('❌ Valor inválido!');

        let targetData = await User.findOne({ userId: targetUser.id });
        if (!targetData) targetData = await User.create({ userId: targetUser.id });

        if (userData.money < aposta || targetData.money < aposta) return message.reply('❌ Alguém não tem dinheiro!');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_bet').setLabel(`Aceitar ${aposta}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_bet').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        const convite = await message.reply({ content: `🪙 **APOSTA!** ${targetUser}, aceitas o desafio?`, components: [row] });
        const filter = i => i.user.id === targetUser.id;
        const collector = convite.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar_bet') {
                const freshA = await User.findOne({ userId: userId });
                const freshT = await User.findOne({ userId: targetUser.id });

                const ganhou = Math.random() > 0.5;
                const win = ganhou ? freshA : freshT;
                const lose = ganhou ? freshT : freshA;

                win.money += aposta;
                lose.money -= aposta;
                await win.save();
                await lose.save();

                await i.update({ content: `🪙 **<@${win.userId}> venceu e levou tudo!**`, components: [] });
            } else {
                await i.update({ content: '❌ Recusado.', components: [] });
            }
        });
    }
    // ==================== 📈 INVESTIMENTO OTIMIZADO ====================
if (command === 'investir' || command === 'stock') {
    const valorInput = args[0];
    
    // 1. Verificações de Segurança (Early Returns)
    if (!valorInput) return message.reply("❓ Indica quanto queres investir. Ex: `!investir 5000` ou `!investir all`.");

    let quantia;
    if (valorInput.toLowerCase() === 'all') {
        quantia = userData.money;
    } else {
        quantia = parseInt(valorInput);
    }

    if (isNaN(quantia) || quantia <= 0) return message.reply("❌ Valor inválido.");
    if (quantia < 500) return message.reply("❌ O investimento mínimo é de **500 moedas**.");
    if (userData.money < quantia) return message.reply("❌ Não tens saldo suficiente.");

    // 2. Sistema de Cooldown (Para evitar spam)
    const agora = Date.now();
    const tempoEspera = 600000; // 10 minutos
    if (agora - (userData.lastInvest || 0) < tempoEspera) {
        const restante = Math.ceil((tempoEspera - (agora - (userData.lastInvest || 0))) / 60000);
        return message.reply(`⏳ O mercado financeiro está instável. Volta em **${restante} minutos**.`);
    }

    // 3. Lógica de Mercado (Calculada num único bloco)
    const sorte = Math.random();
    let resultado;
    let cor;
    let mudanca;

    if (sorte > 0.55) { // 45% de chance de lucro
        const mult = (Math.random() * 0.5) + 0.1; // Ganho entre 10% e 60%
        mudanca = Math.floor(quantia * mult);
        userData.money += mudanca;
        resultado = `📈 **LUCRO!** As ações subiram e ganhaste **${mudanca.toLocaleString()}** moedas.`;
        cor = 0x2ecc71; // Verde
    } else { // 55% de chance de perda
        const mult = (Math.random() * 0.3) + 0.1; // Perda entre 10% e 40%
        mudanca = Math.floor(quantia * mult);
        userData.money -= mudanca;
        resultado = `📉 **QUEDA!** O mercado derreteu e perdeste **${mudanca.toLocaleString()}** moedas.`;
        cor = 0xe74c3c; // Vermelho
    }

    // 4. Gravação Única no Banco
    userData.lastInvest = agora;
    await userData.save();

    // 5. Resposta Visual
    const embed = {
        title: "🏛️ Bolsa de Valores",
        description: resultado,
        color: cor,
        fields: [{ name: "Saldo Atual", value: `💰 ${userData.money.toLocaleString()} moedas` }],
        timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
}

// ==================== 🏆 COMANDO TOP (LOCAL & GLOBAL) ====================
if (command === 'top') {
    try {
        const isGlobal = args[0]?.toLowerCase() === 'global';
        let topRicos;

        if (isGlobal) {
            // Busca os 10 mais ricos de TODO o banco de dados
            topRicos = await User.find()
                .sort({ money: -1, bank: -1 }) // Ordena por quem tem mais no total
                .limit(10);
        } else {
            // TOP LOCAL: Pega os IDs de todos os membros do servidor atual
            const membrosIds = (await message.guild.members.fetch()).map(m => m.id);
            
            // Busca no banco apenas os usuários que estão nesta lista de IDs
            topRicos = await User.find({ userId: { $in: membrosIds } })
                .sort({ money: -1, bank: -1 })
                .limit(10);
        }

        const lista = topRicos.map((u, i) => {
            const total = (u.money || 0) + (u.bank || 0);
            return `**${i + 1}.** <@${u.userId}> — 💰 \`${total.toLocaleString()}\``;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(isGlobal ? '🌎 TOP 10 RICOS (GLOBAL)' : `🏙️ TOP 10 RICOS (${message.guild.name})`)
            .setColor('#FFD700')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2583/2583344.png')
            .setDescription(lista || "Ninguém neste servidor começou sua jornada ainda.")
            .setFooter({ text: isGlobal ? "Use !top para ver o ranking deste servidor" : "Use !top global para ver o ranking mundial" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Erro no comando top:", error);
        return message.reply("❌ Erro ao processar o ranking. Tente novamente mais tarde.");
    }
}
// ==================== 🚀 COMANDO VOTE (COMPLETO) ====================
    if (command === 'votar' || command === 'vote') {
        const embedVoto = new EmbedBuilder()
            .setColor('#ff3366')
            .setAuthor({ name: 'Top.gg - Sistema de Votos', iconURL: 'https://cdn.discordapp.com/emojis/1083437286161485824.png' })
            .setTitle('🚀 Ajude o OmniBot e Ganhe Recompensas!')
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(
                `Votar no bot ajuda a nossa comunidade a crescer e você ainda sai ganhando!\n\n` +
                `💰 **Recompensa:** \`5.000 moedas\`\n` +
                `⏰ **Intervalo:** A cada \`12 horas\``
            )
            .addFields(
                { name: '🔗 Link Direto', value: '[CLIQUE AQUI PARA VOTAR](https://top.gg/bot/1453894302978670604/vote)' },
                { name: '📢 Como funciona?', value: 'Após votar, o Top.gg nos avisa e eu envio seu dinheiro e um aviso no seu PV automaticamente!' }
            )
            .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const botaoVoto = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Votar no Top.gg')
                .setURL('https://top.gg/bot/ID_DO_SEU_BOT/vote')
                .setStyle(ButtonStyle.Link)
        );

        return message.reply({ embeds: [embedVoto], components: [botaoVoto] });
    }
// ==================== ❤️ COMANDO SHIP (COM EASTER EGG) ====================
if (command === 'ship') {
    const users = message.mentions.users.map(u => u);

    if (users.length < 2) {
        return message.reply('❌ Precisas de mencionar duas pessoas para ver a compatibilidade! Ex: `!ship @user1 @user2`');
    }

    const user1 = users[0];
    const user2 = users[1];

    // IDs ESPECIAIS (Easter Egg)
    const idEspecial1 = "1362260490818027683";
    const idEspecial2 = "857667179040997437";

    const ehCasalEspecial = (user1.id === idEspecial1 && user2.id === idEspecial2) || 
                            (user1.id === idEspecial2 && user2.id === idEspecial1);

    let lovePercent;
    let bar;
    let status;

    if (ehCasalEspecial) {
        // Resultado para o casal especial
        lovePercent = "∞"; // Infinito
        bar = "❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥❤️‍🔥";
        status = "⚠️ **ERRO CRÍTICO:** A compatibilidade de vocês quebra o limite de qualquer número! É o destino.";
    } else {
        // Lógica normal para outros casais
        const combinedId = (BigInt(user1.id) + BigInt(user2.id)).toString();
        lovePercent = parseInt(combinedId.substring(combinedId.length - 2)) || Math.floor(Math.random() * 101);
        
        const progress = Math.floor(lovePercent / 10);
        bar = "❤️".repeat(progress) + "🖤".repeat(10 - progress);

        if (lovePercent < 20) status = "💔 Horrível. Nem tentem.";
        else if (lovePercent < 50) status = "😐 Talvez como amigos...";
        else if (lovePercent < 80) status = "🔔 Há esperança! Um jantar resolvia.";
        else if (lovePercent < 95) status = "💖 Que casal lindo! Já podem casar.";
        else status = "💍 ALMAS GÊMEAS! O amor da vida toda.";
    }

    const embed = new EmbedBuilder()
        .setTitle('💘 Calculadora do Amor Omni')
        .setColor(ehCasalEspecial ? '#FFD700' : '#FF1493') // Dourado se for o casal especial
        .setDescription(`Será que **${user1.username}** e **${user2.username}** combinam?\n\n**${lovePercent}%** [${bar}]\n\n> ${status}`)
        .setFooter({ text: 'Dica: Usem !casar se o amor for real!' });

    return message.reply({ embeds: [embed] });
}
    // ==================== 💔 COMANDO DIVORCIAR (COM CONFIRMAÇÃO) ====================
    if (command === 'divorciar') {
        const conjugeId = userData.marriedWith;

        if (!conjugeId) {
            return message.reply('❌ Estás solteiro, não há ninguém para divorciar.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirmar_divorcio')
                .setLabel('Sim, quero o divórcio')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancelar_divorcio')
                .setLabel('Não, mudei de ideia')
                .setStyle(ButtonStyle.Secondary)
        );

        const pergunta = await message.reply({
            content: `⚠️ **TEM CERTEZA?**\nEstás prestes a separar-te de <@${conjugeId}>. Toda a vossa afinidade será zerada e não há volta atrás.\nDesejas mesmo divorciar-te?`,
            components: [row]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = pergunta.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirmar_divorcio') {
                // Limpa os dados do autor (userData que já carregamos)
                userData.marriedWith = null;
                userData.affinity = 0;
                await userData.save();

                // Limpa o perfil do ex-cônjuge no banco de dados
                await User.updateOne(
                    { userId: conjugeId }, 
                    { $set: { marriedWith: null, affinity: 0 } }
                );

                return i.update({ 
                    content: `💔 **O divórcio foi oficializado.** Estás oficialmente solteiro(a) e a vossa afinidade foi zerada.`, 
                    components: [] 
                });
            } else {
                return i.update({ 
                    content: `💖 **Ufa!** O amor venceu. O divórcio foi cancelado.`, 
                    components: [] 
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                pergunta.edit({ content: '⏳ O tempo acabou. O pedido de divórcio foi cancelado automaticamente.', components: [] }).catch(() => {});
            }
        });
    }
    // ==================== 😈 COMANDO TRAIR (SISTEMA DE RISCO) ====================
if (command === 'trair' || command === 'cheating') {
    try {
        const target = message.mentions.users.first();
        
        // 1. Verificações Básicas
        if (!userData.marriedWith) {
            return message.reply("❌ Não podes trair se não estiveres casado(a)! Estás livre para ficar com quem quiseres.");
        }

        if (!target) return message.reply("❌ Com quem queres trair o teu cônjuge? Menciona alguém!");
        if (target.id === message.author.id) return message.reply("🤔 Isso não é traição, é apenas... solidão?");
        if (target.id === userData.marriedWith) return message.reply("❤️ Isso não é traição! Estás a sair com o teu próprio cônjuge.");
        if (target.bot) return message.reply("🤖 Trair com um robô? Que estranho...");

        // 2. Cooldown (Para não floodar traição)
        const agora = Date.now();
        const cooldown = 3600000; // 1 hora
        if (agora - (userData.lastCrime || 0) < cooldown) {
            return message.reply("⏳ Estás sob vigilância! Espera um pouco antes de te aventurares novamente.");
        }

        // 3. Lógica de Sorteio (50% de chance de ser pego)
        const foiPego = Math.random() < 0.50;
        userData.lastCrime = agora; // Usa o mesmo timer de crimes ou cria userData.lastTraicao

        if (foiPego) {
            // --- CONSEQUÊNCIA: FOI PEGO ---
            const perdaAfinidade = Math.floor(Math.random() * 15) + 10; // Perde 10-25 pts
            
            userData.affinity = Math.max(0, (userData.affinity || 0) - perdaAfinidade);
            userData.traicoes = (userData.traicoes || 0) + 1; // Aumenta o contador de traições

            // Sincroniza a perda com o cônjuge no banco
            await User.updateOne(
                { userId: userData.marriedWith }, 
                { $set: { affinity: userData.affinity } }
            );

            await userData.save();

            return message.reply(
                `📸 **FOSTE APANHADO(A)!**\n` +
                `Alguém viu-te num encontro com ${target.username} e contou tudo ao teu cônjuge!\n` +
                `💔 Perderam **${perdaAfinidade}** pontos de afinidade.\n` +
                `🔥 O teu contador de traições subiu para **${userData.traicoes}**!`
            );

        } else {
            // --- SUCESSO: DISCRETO ---
            userData.traicoes = (userData.traicoes || 0) + 1;
            await userData.save();

            return message.reply(
                `🤫 **DISCRETO...**\n` +
                `Tiveste um encontro secreto com ${target.username} e ninguém desconfiou de nada.\n` +
                `🔥 O teu nível de perigo subiu! (Traições: **${userData.traicoes}**)`
            );
        }

    } catch (error) {
        console.error("Erro no comando trair:", error);
        message.reply("❌ Ocorreu um erro ao processar a traição.");
    }
}
// ==================== 💍 COMANDO CASAR (VERSÃO FINAL COM DATA) ====================
if (command === 'casar') {
    const target = message.mentions.users.first();
    const custo = 25000;
    const fundoPadraoCasal = "https://i.imgur.com/bcaHfu4.png";

    // 1. Verificações Básicas
    if (!target) return message.reply('❌ Precisas de mencionar (@) a pessoa com quem te queres casar!');
    if (target.id === message.author.id) return message.reply('❌ Não te podes casar contigo próprio!');
    if (target.bot) return message.reply('❌ Robôs não têm sentimentos para casar.');

    try {
        let userData = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });
        let targetData = await User.findOne({ userId: target.id }) || await User.create({ userId: target.id });

        // 2. Verificações de Estado Civil e Dinheiro
        if (userData.marriedWith) return message.reply('❌ Já estás casado(a)!');
        if (targetData.marriedWith) return message.reply(`❌ **${target.username}** já está casado(a)!`);

        if (userData.money < custo) return message.reply(`❌ Não tens **${custo.toLocaleString()} moedas** para as taxas.`);
        if (targetData.money < custo) return message.reply(`❌ **${target.username}** não tem as **${custo.toLocaleString()} moedas** necessárias.`);

        // 3. Criação dos Botões
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_casar').setLabel('Aceitar Casamento').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_casar').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        const pedido = await message.reply({
            content: `💍 **PEDIDO DE CASAMENTO**\n${target}, aceitas casar com ${message.author}?\n⚠️ *Custo da cerimónia: **${custo.toLocaleString()} moedas** de cada um.*`,
            components: [row]
        });

        const filter = i => i.user.id === target.id;
        const collector = pedido.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar_casar') {
                const freshAuthor = await User.findOne({ userId: message.author.id });
                const freshTarget = await User.findOne({ userId: target.id });

                if (freshAuthor.money < custo || freshTarget.money < custo) {
                    return i.update({ content: '❌ Alguém ficou sem dinheiro! Casamento cancelado.', components: [] });
                }

                // --- DATA DO CASAMENTO (Dia/Mês/Ano) ---
                const agora = new Date();
                const dataHoje = `${agora.getDate()}/${agora.getMonth() + 1}/${agora.getFullYear()}`;

                // Atualiza o Autor
                await User.findOneAndUpdate(
                    { userId: message.author.id },
                    { 
                        $inc: { money: -custo }, 
                        $set: { 
                            marriedWith: target.id, 
                            affinity: 0, 
                            marriageDate: dataHoje, // Salva ex: "01/01/2026"
                            bgCasal: fundoPadraoCasal 
                        } 
                    }
                );

                // Atualiza o Alvo
                await User.findOneAndUpdate(
                    { userId: target.id },
                    { 
                        $inc: { money: -custo }, 
                        $set: { 
                            marriedWith: message.author.id, 
                            affinity: 0, 
                            marriageDate: dataHoje, 
                            bgCasal: fundoPadraoCasal 
                        } 
                    }
                );

                return i.update({ 
                    content: `💖 **VIVAM OS NOIVOS!**\n${message.author} e ${target} casaram-se no dia **${dataHoje}**! 🎉\nUsem \`!vercasamento\` para ver o vosso perfil de casal.`, 
                    components: [] 
                });

            } else {
                return i.update({ content: `💔 O pedido foi recusado por ${target.username}.`, components: [] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                pedido.edit({ content: '⏳ O pedido expirou no altar...', components: [] }).catch(() => {});
            }
        });

    } catch (error) {
        console.error("Erro no Casar:", error);
        message.reply("❌ Erro ao realizar o casamento.");
    }
}
// ==================== 💍 CONFIGURAR CASAMENTO (VERSÃO 40 INSÍGNIAS) ====================
if (command === 'configcasamento' || command === 'casamentoconfig') {
    try {
        let dados = await User.findOne({ userId: message.author.id });
        
        if (!dados || !dados.marriedWith) {
            return message.reply("❌ Precisas de estar casado para configurar o card!");
        }

        const conjugeId = dados.marriedWith;
        const subCommand = args[0]?.toLowerCase();
        const valor = args.slice(1).join(" ").toLowerCase();

        // --- MENU PRINCIPAL (AJUDA RÁPIDA) ---
        if (!subCommand) {
            const embedInfo = new EmbedBuilder()
                .setTitle("⚙️ Personalizar Matrimônio")
                .setColor("#FF69B4")
                .setDescription("Personaliza o teu card de casal.")
                .addFields(
                    { name: "📝 Bio do Casal", value: `\`${dados.coupleBio || "Não definida"}\` \n Use: \`!configcasamento bio [frase]\`` },
                    { name: "🏅 Insígnia Ativa", value: `\`${dados.activeBadge || "Nenhuma"}\`` },
                    { name: "🏆 Lista Completa", value: "Usa `!insignias` para ver as 40 opções e requisitos!" }
                )
                .setFooter({ text: "Use: !configcasamento insignia [id]" });

            return message.reply({ embeds: [embedInfo] });
        }

        // --- LÓGICA DA BIO ---
        if (subCommand === 'bio') {
            const frase = args.slice(1).join(" ");
            if (!frase) return message.reply("❌ Digita a nova frase!");
            if (frase.length > 50) return message.reply("❌ Máximo 50 caracteres.");

            await User.updateOne({ userId: message.author.id }, { $set: { coupleBio: frase } });
            await User.updateOne({ userId: conjugeId }, { $set: { coupleBio: frase } });
            return message.reply(`✅ Bio atualizada para: *"${frase}"*`);
        }
        // --- LÓGICA DAS INSÍGNIAS ---
        if (subCommand === 'insignia' || subCommand === 'badge') {
            if (!valor) return message.reply("❌ Digita o ID da insígnia! Ex: `!configcasamento insignia amantes`.");

            const listaInsignias = {
                // AFINIDADE
                'iniciante': { nome: '🌱 Iniciante', req: () => true },
                'noivos': { nome: '💍 Noivos', req: (d) => d.affinity >= 50 },
                'amantes': { nome: '💖 Amantes', req: (d) => d.affinity >= 100 },
                'apaixonados': { nome: '🔥 Apaixonados', req: (d) => d.affinity >= 200 },
                'romanticos': { nome: '🌹 Românticos', req: (d) => d.affinity >= 300 },
                'luademel': { nome: '🍯 Lua de Mel', req: (d) => d.affinity >= 400 },
                'brilhantes': { nome: '✨ Brilhantes', req: (d) => d.affinity >= 500 },
                'docinhos': { nome: '🍭 Docinhos', req: (d) => d.affinity >= 600 },
                'misticos': { nome: '🔮 Místicos', req: (d) => d.affinity >= 700 },
                'cupidos': { nome: '🏹 Cupidos', req: (d) => d.affinity >= 850 },
                'eternos': { nome: '♾️ Eternos', req: (d) => d.affinity >= 1000 },
                'realeza': { nome: '👑 Realeza', req: (d) => d.affinity >= 1500 },
                'inquebraveis': { nome: '💎 Inquebráveis', req: (d) => d.affinity >= 2000 },
                'galacticos': { nome: '🌌 Galácticos', req: (d) => d.affinity >= 3000 },
                'solares': { nome: '☀️ Solares', req: (d) => d.affinity >= 4000 },
                'abduzidos': { nome: '🛸 Abduzidos', req: (d) => d.affinity >= 5000 },
                'blindados': { nome: '🛡️ Blindados', req: (d) => d.affinity >= 7000 },
                'interstelares': { nome: '🪐 Interstelares', req: (d) => d.affinity >= 10000 },
                'lendarios': { nome: '🎇 Lendários', req: (d) => d.affinity >= 15000 },
                'divinos': { nome: '🔱 Divinos', req: (d) => d.affinity >= 20000 },

                // CONDUTA / TRAIÇÃO
                'fiel': { nome: '🛡️ Fiel', req: (d) => (d.traicoes || 0) === 0 && d.affinity >= 200 },
                'tentacao': { nome: '🐍 Tentação', req: (d) => (d.traicoes || 0) >= 1 },
                'flagrados': { nome: '📸 Flagrados', req: (d) => (d.traicoes || 0) >= 3 },
                'perigoso': { nome: '😈 Perigoso', req: (d) => (d.traicoes || 0) >= 10 },
                'infiel': { nome: '👺 Infiel', req: (d) => (d.traicoes || 0) >= 20 },
                'viuvo': { nome: '💀 Viúvo Negro', req: (d) => (d.traicoes || 0) >= 50 },
                'liberal': { nome: '🔓 Liberal', req: (d) => (d.traicoes || 0) >= 5 && d.affinity >= 500 },
                'toxic': { nome: '☣️ Tóxicos', req: (d) => d.affinity <= 5 },
                'justos': { nome: '⚖️ Justiceiros', req: (d) => d.policial === true }, // Exemplo se for policia
                'solitario': { nome: '🕯️ Solitários', req: () => true },

                // RIQUEZA (Saldo Banco + Mão)
                'pobres': { nome: '💸 Pobres', req: (d) => (d.money + (d.bank || 0)) < 1000 },
                'estaveis': { nome: '💵 Estáveis', req: (d) => (d.money + (d.bank || 0)) >= 50000 },
                'burgueses': { nome: '💳 Burgueses', req: (d) => (d.money + (d.bank || 0)) >= 500000 },
                'elite': { nome: '🥂 Elite', req: (d) => (d.money + (d.bank || 0)) >= 1000000 },
                'sugar': { nome: '💎 Sugar Couple', req: (d) => (d.money + (d.bank || 0)) >= 5000000 },
                'nobres': { nome: '🏰 Nobres', req: (d) => (d.money + (d.bank || 0)) >= 10000000 },
                'magnatas': { nome: '🏛️ Magnatas', req: (d) => (d.money + (d.bank || 0)) >= 50000000 },
                'donos': { nome: '🌍 Donos do Mundo', req: (d) => (d.money + (d.bank || 0)) >= 100000000 },
                'viciados': { nome: '🎰 Viciados', req: (d) => d.cassinoGasto >= 1000000 },
                'gado': { nome: '🤡 Gado', req: () => true }
            };

            const selecao = listaInsignias[valor];

            if (!selecao) return message.reply("❌ Essa insígnia não existe! Use `!insignias` para ver a lista.");

            // Validação do Requisito
            if (!selecao.req(dados)) {
                return message.reply(`❌ Não tens os requisitos para **${selecao.nome}**!`);
            }

            // SALVAMENTO DUPLO (Para o casal)
            await User.updateOne({ userId: message.author.id }, { $set: { activeBadge: selecao.nome } });
            await User.updateOne({ userId: conjugeId }, { $set: { activeBadge: selecao.nome } });

            return message.reply(`✅ Insígnia **${selecao.nome}** equipada para o casal!`);
        }

    } catch (error) {
        console.error(error);
        message.reply("❌ Erro ao configurar casamento.");
    }
}
// ==================== 🏆 COMANDO LISTAR INSÍGNIAS (40 OPÇÕES) ====================
if (command === 'insignias' || command === 'medalhas') {
    
    // Objeto com a lógica de todas as insígnias para o sistema reconhecer
    const listaInsignias = {
        // --- AFETO (Afinidade) ---
        'iniciante': { nome: '🌱 Iniciante', req: '0 pts' },
        'noivos': { nome: '💍 Noivos', req: '50 pts' },
        'amantes': { nome: '💖 Amantes', req: '100 pts' },
        'apaixonados': { nome: '🔥 Apaixonados', req: '200 pts' },
        'romanticos': { nome: '🌹 Românticos', req: '300 pts' },
        'luademel': { nome: '🍯 Lua de Mel', req: '400 pts' },
        'brilhantes': { nome: '✨ Brilhantes', req: '50 pts' },
        'docinhos': { nome: '🍭 Docinhos', req: '600 pts' },
        'misticos': { nome: '🔮 Místicos', req: '700 pts' },
        'cupidos': { nome: '🏹 Cupidos', req: '850 pts' },
        'eternos': { nome: '♾️ Eternos', req: '1000 pts' },
        'realeza': { nome: '👑 Realeza', req: '1500 pts' },
        'inquebraveis': { nome: '💎 Inquebráveis', req: '2000 pts' },
        'galacticos': { nome: '🌌 Galácticos', req: '3000 pts' },
        'solares': { nome: '☀️ Solares', req: '4000 pts' },
        'abduzidos': { nome: '🛸 Abduzidos', req: '5000 pts' },
        'blindados': { nome: '🛡️ Blindados', req: '7000 pts' },
        'interstelares': { nome: '🪐 Interstelares', req: '10k pts' },
        'lendarios': { nome: '🎇 Lendários', req: '15k pts' },
        'divinos': { nome: '🔱 Divinos', req: '20k pts' },

        // --- CONDUTA (Traições) ---
        'fiel': { nome: '🛡️ Fiel', req: '0 Traições + 200 pts' },
        'tentacao': { nome: '🐍 Tentação', req: '1 Traição' },
        'flagrados': { nome: '📸 Flagrados', req: '3 Traições' },
        'perigoso': { nome: '😈 Perigoso', req: '10 Traições' },
        'infiel': { nome: '👺 Infiel', req: '20 Traições' },
        'viuvo': { nome: '💀 Viúvo Negro', req: '50 Traições' },
        'liberal': { nome: '🔓 Liberal', req: '5 Traições + 500 pts' },
        'toxic': { nome: '☣️ Tóxicos', req: '< 5 Afinidade' },
        'justos': { nome: '⚖️ Justiceiros', req: 'Prender traidor' },
        'solitario': { nome: '🕯️ Solitários', req: 'Sem interação' },

        // --- RIQUEZA (Dinheiro) ---
        'pobres': { nome: '💸 Pobres', req: '< 1k' },
        'estaveis': { nome: '💵 Estáveis', req: '50k' },
        'burgueses': { nome: '💳 Burgueses', req: '500k' },
        'elite': { nome: '🥂 Elite', req: '1M' },
        'sugar': { nome: '💎 Sugar Couple', req: '5M' },
        'nobres': { nome: '🏰 Nobres', req: '10M' },
        'magnatas': { nome: '🏛️ Magnatas', req: '50M' },
        'donos': { nome: '🌍 Donos do Mundo', req: '100M' },
        'viciados': { nome: '🎰 Viciados', req: 'Gastar 1M Cassino' },
        'gado': { nome: '🤡 Gado', req: 'Livre' }
    };

    const embedInsignias = new EmbedBuilder()
        .setTitle('🏆 Galeria de Insígnias (40 Opções)')
        .setColor('#FFD700')
        .setDescription('Usa `!configcasamento insignia [id]` para equipar!')
        .addFields(
            { 
                name: '💖 AFETO (Afinidade)', 
                value: '`iniciante`, `noivos`, `amantes`, `apaixonados`, `romanticos`, `luademel`, `brilhantes`, `docinhos`, `misticos`, `cupidos`, `eternos`, `realeza`, `inquebraveis`, `galacticos`, `solares`, `abduzidos`, `blindados`, `interstelares`, `lendarios`, `divinos`'
            },
            { 
                name: '⚖️ CONDUTA (Traição/Crise)', 
                value: '`fiel`, `tentacao`, `flagrados`, `perigoso`, `infiel`, `viuvo`, `liberal`, `toxic`, `justos`, `solitario`'
            },
            { 
                name: '💰 RIQUEZA & ZUEIRA', 
                value: '`pobres`, `estaveis`, `burgueses`, `elite`, `sugar`, `nobres`, `magnatas`, `donos`, `viciados`, `gado`'
            }
        )
        .setFooter({ text: 'Consulta os requisitos com o Staff ou no manual!' });

    return message.reply({ embeds: [embedInsignias] });
}
// ==================== 💍 COMANDO VERCASAMENTO (VERSÃO COM INSÍGNIAS) ====================
if (command === 'vercasamento' || command === 'marry') {
    const aguarde = await message.reply("💖 Abrindo o álbum do casal...");

    try {
        const dadosUser = await User.findOne({ userId: message.author.id });

        if (!dadosUser || !dadosUser.marriedWith) {
            return aguarde.edit("💔 Você não está casado(a)! Use `!casar @alguem`.");
        }

        const conjugeId = dadosUser.marriedWith;
        const conjugeUser = await message.client.users.fetch(conjugeId).catch(() => null);

        const canvasLib = require('@napi-rs/canvas');
        const canvas = canvasLib.createCanvas(900, 500); 
        const ctx = canvas.getContext('2d');

        // 1. FUNDO
        try {
            const imgFundo = await canvasLib.loadImage("https://i.imgur.com/bcaHfu4.png");
            ctx.drawImage(imgFundo, 0, 0, 900, 500);
        } catch (e) {
            ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, 900, 500);
        }

        // 2. OVERLAY ESCURO PRINCIPAL
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.roundRect(40, 40, 820, 420, 20); // Bordas arredondadas
        ctx.fill();

        // 3. RENDERIZAR AVATARES
        const renderAvatar = async (user, x, y) => {
            try {
                const url = user ? user.displayAvatarURL({ extension: 'png', size: 256 }) : "https://i.imgur.com/6otv9uB.png";
                const img = await canvasLib.loadImage(url);
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, 85, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF69B4'; // Borda rosa no avatar
                ctx.lineWidth = 5;
                ctx.stroke();
                ctx.clip();
                ctx.drawImage(img, x - 85, y - 85, 170, 170);
                ctx.restore();
            } catch (e) { console.log("Erro avatar"); }
        };

        await renderAvatar(message.author, 220, 180);
        await renderAvatar(conjugeUser, 680, 180);

        // 4. TEXTOS
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';

        // Ícone Central
        ctx.font = '70px Arial';
        ctx.fillText('💝', 450, 195);

        // Nomes
        ctx.font = 'bold 32px Arial';
        ctx.fillText(message.author.username.toUpperCase(), 220, 315);
        ctx.fillText(conjugeUser ? conjugeUser.username.toUpperCase() : "ALMA GÊMEA", 680, 315);

        // --- EXIBIÇÃO DA INSÍGNIA (AJUSTADO PARA 40 OPÇÕES) ---
        const insignia = dadosUser.activeBadge || "🌱 Iniciante";

        ctx.save();
        // Sombra para dar profundidade à medalha
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

        // Criar o fundo da insígnia (Retângulo Arredondado)
        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)'; 
        ctx.beginPath();
        ctx.roundRect(325, 215, 250, 45, 15); // Posição ajustada
        ctx.fill();

        // Borda da insígnia (Dourada para dar destaque de conquista)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texto da Insígnia
        ctx.font = 'bold 20px Arial'; 
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 0; // Remove sombra do texto para legibilidade
        ctx.textAlign = 'center';
        ctx.fillText(insignia.toUpperCase(), 450, 245);
        ctx.restore();

        // Bio do Casal
        const bio = dadosUser.coupleBio || "Unidos pelo destino.";
        ctx.font = 'italic 26px Arial';
        ctx.fillStyle = '#FFC0CB';
        ctx.fillText(`“ ${bio} ”`, 450, 380);

        // Rodapé com Data e Afinidade
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#ffffff';
        const data = dadosUser.marriageDate || "---";
        const afinidade = dadosUser.affinity || 0;
        
        // Desenha uma linha separadora fina
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 410);
        ctx.lineTo(800, 410);
        ctx.stroke();

        ctx.fillText(`📅 CASADOS DESDE: ${data}    ✨ AFINIDADE: ${afinidade}`, 450, 445);

        // 5. ENVIO
        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: 'casamento.png' });
        
        await aguarde.delete().catch(() => {});
        return message.reply({ files: [attachment] });

    } catch (error) {
        console.error("ERRO NO VERCASAMENTO:", error);
        return aguarde.edit("❌ Erro ao gerar a imagem do casal.");
    }
}
// ==================== 💌 COMANDO CARTINHA (RESTRITO AO CÔNJUGE) ====================
if (command === 'cartinha' || command === 'letter') {
    try {
        const conjugeId = userData.marriedWith;

        // 1. Verificação: Está casado?
        if (!conjugeId) {
            return message.reply('❌ Só podes enviar cartinhas se estiveres casado(a)!');
        }

        const target = message.mentions.users.first();

        // 2. Verificação: Marcou alguém? É o cônjuge?
        if (!target || target.id !== conjugeId) {
            return message.reply(`❌ Só podes enviar uma cartinha para a pessoa com quem estás casado(a)! Mencione <@${conjugeId}>.`);
        }

        // 3. Verificação: Dinheiro
        const custo = 7500;
        if (userData.money < custo) {
            return message.reply(`❌ Uma cartinha perfumada custa **${custo.toLocaleString()} moedas**. Não tens saldo suficiente!`);
        }

        // 4. Execução (Gasta dinheiro e gera afinidade)
        const pontosGanhos = Math.floor(Math.random() * 4) + 3; // Ganha entre 3 e 6 pontos
        
        userData.money -= custo;
        userData.affinity = (userData.affinity || 0) + pontosGanhos;
        
        // Atualiza o parceiro simultaneamente no banco
        await User.updateOne(
            { userId: conjugeId }, 
            { $inc: { affinity: pontosGanhos } }
        );

        await userData.save();

        // 5. Envio do Embed
        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('💌 Uma Cartinha de Amor Chegou!')
            .setDescription(`${message.author} enviou uma carta escrita à mão e perfumada para ${target}!\n\n> "O meu amor por ti cresce a cada dia..."`)
            .addFields(
                { name: '💖 Afinidade', value: `**+${pontosGanhos}** pontos`, inline: true },
                { name: '💰 Custo', value: `\`${custo.toLocaleString()}\``, inline: true }
            )
            .setFooter({ text: 'O amor está no ar...' })
            .setTimestamp();

        return message.channel.send({ content: `<@${target.id}>, recebeste correio!`, embeds: [embed] });

    } catch (err) {
        console.error("Erro no comando cartinha:", err);
        return message.reply("❌ O correio falhou! Tenta enviar a cartinha novamente mais tarde.");
    }
}
// ==================== 🎁 COMANDO PRESENTEAR (SOCIAL + AFINIDADE RESTRITA) ====================
if (command === 'presentear' || command === 'gift' || command === 'dar') {
    try {
        const alvo = message.mentions.users.first();
        const itemID = args[1]?.toLowerCase();

        // 1. Verificações de Alvo e Item
        if (!alvo) return message.reply("🎁 **Para quem é o presente?** Menciona alguém! Ex: `!presentear @user rosa`.");
        if (alvo.id === message.author.id) return message.reply("🤔 Dar um presente a ti mesmo?");
        if (alvo.bot) return message.reply("🤖 Bots não têm sentimentos... Guarda o presente para um humano!");
        if (!itemID) return message.reply("💝 **O que queres dar?** Escreve o ID do item. Ex: `!presentear @user flores`.");

        const inventory = userData.inventory || [];
        const index = inventory.indexOf(itemID);

        if (index === -1) return message.reply("❌ Não tens esse item na tua mochila!");

        // 2. Tabela de Afinidade (Só conta se for casado)
        const tabelaAfinidade = {
            'rosa': { pts: 5, msg: "ficou encantado(a) com a tua rosa solitária! 🌹" },
            'flores': { pts: 15, msg: "adorou o buquê de flores! 💐" },
            'chocolate': { pts: 10, msg: "saboreou o chocolate e achou-te uma doçura! 🍫" },
            'urso': { pts: 25, msg: "abraçou o urso de pelúcia e agora não para de sorrir! 🧸" },
            'anel': { pts: 50, msg: "ficou sem palavras com o anel... Isso foi um pedido? 💍" },
            'mansao': { pts: 500, msg: "DEU UMA MANSÃO! Quem resistiria? 🏰" }
        };

        const presente = tabelaAfinidade[itemID];
        if (!presente) return message.reply("❓ Esse item não pode ser dado como presente social. Tenta Rosa, Flores, Chocolate, Urso, Anel ou Mansao!");

        let alvoData = await User.findOne({ userId: alvo.id }) || await User.create({ userId: alvo.id });

        // 3. Processamento do Item (Sempre muda de dono, sendo casado ou não)
        userData.inventory.splice(index, 1); 
        if (!alvoData.inventory) alvoData.inventory = [];
        alvoData.inventory.push(itemID);

        userData.markModified('inventory');
        alvoData.markModified('inventory');

        // 4. Lógica de Afinidade (SÓ SE FOR O CÔNJUGE)
        let ganhouAfinidade = false;
        if (userData.marriedWith === alvo.id) {
            ganhouAfinidade = true;
            userData.affinity = (userData.affinity || 0) + presente.pts;
            alvoData.affinity = userData.affinity; // Sincroniza
        }

        await userData.save();
        await alvoData.save();

        // 5. Resposta Especial
        let resposta = `🎁 **PRESENTE ENVIADO!**\n❤️ **${alvo.username}** ${presente.msg}`;
        
        if (ganhouAfinidade) {
            resposta += `\n📈 **Afinidade do casal:** \`+${presente.pts}\` (Total: \`${userData.affinity}\`)`;
        } else {
            resposta += `\n📦 O item foi transferido para a mochila de **${alvo.username}**!`;
        }

        return message.reply(resposta);

    } catch (err) {
        console.error("Erro no comando presentear:", err);
        return message.reply("❌ Ocorreu um erro ao entregar o presente.");
    }
}
// ==================== 💋 COMANDO BEIJAR (SISTEMA COM AFINIDADE PARA CASADOS) ====================
if (command === 'beijar' || command === 'kiss') {
    try {
        const target = message.mentions.users.first();
        if (!target) return message.reply('💋 Você precisa mencionar alguém para beijar!');

        // 1. Verificações de Alvo
        if (target.id === message.author.id) return message.reply('Você não pode beijar a si mesmo!');
        if (target.id === message.client.user.id) return message.reply('Aww, um beijo em mim? *fico corada*');

        // Buscar dados do autor
        let userData = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });
        const inventory = userData.inventory || [];

        // 2. Lógica de Afinidade (SÓ SE ESTIVER CASADO COM O ALVO)
        let mostrarAfinidade = false;
        let ganhoAfinidade = 1;
        let extras = [];

        if (userData.marriedWith === target.id) {
            mostrarAfinidade = true;

            // --- BÔNUS: ANEL DE DIAMANTE ---
            if (inventory.includes('anel')) {
                ganhoAfinidade *= 2;
                extras.push("💍 **Bônus de Anel:** Afinidade dobrada!");
            }

            // --- BÔNUS: CHOCOLATE (Consumo Automático) ---
            if (inventory.includes('chocolate')) {
                const index = inventory.indexOf('chocolate');
                userData.inventory.splice(index, 1);
                userData.markModified('inventory');
                ganhoAfinidade += 5;
                extras.push("🍫 **Chocolate usado:** +5 de afeto!");
            }

            // Atualiza afinidade no banco para o casal
            userData.affinity = (userData.affinity || 0) + ganhoAfinidade;
            await userData.save();
            
            // Sincroniza com o cônjuge
            await User.updateOne({ userId: target.id }, { $inc: { affinity: ganhoAfinidade } });
        }

        // 3. Banco de Dados de Beijos
        const mensagens = [
            `💋 **${message.author.username}** deu um beijo apaixonado em **${target.username}**! ❤️`,
            `😚 **${message.author.username}** deu um beijo fofinho na bochecha de **${target.username}**! ✨`,
            `😏 **${message.author.username}** roubou um beijo de **${target.username}**! 🏃‍♂️💨`,
            `💖 **${message.author.username}** e **${target.username}** deram um beijo cinematográfico! 🎬`,
            `🥰 **${message.author.username}** deu um beijo carinhoso na testa de **${target.username}**! 🧸`,
            `🌹 **${message.author.username}** beijou a mão de **${target.username}** com todo cavalheirismo! 🎩`,
            `🍭 **${message.author.username}** deu um beijo doce em **${target.username}**! 🍬`,
            `🤭 **${message.author.username}** beijou **${target.username}** e ficou todo vermelho de vergonha! 😳`,
            `🦋 **${message.author.username}** deu um beijo de esquimó em **${target.username}**! ❄️`,
            `⚡ **${message.author.username}** e **${target.username}** sentiram faíscas com esse beijo! 🎇`,
            `✨ **${message.author.username}** deu um beijo de boa noite em **${target.username}**! 🌙`,
            `🍓 **${message.author.username}** deu um beijo com sabor de morango em **${target.username}**! 🍓`,
            `💎 **${message.author.username}** deu um beijo precioso em **${target.username}**!`,
            `🍭 **${message.author.username}** e **${target.username}** trocaram um beijo super fofo!`,
            `🐾 **${message.author.username}** deu um beijo de gatinho em **${target.username}**! 🐈`,
            `🌈 **${message.author.username}** deu um beijo colorido em **${target.username}**!`,
            `🍫 **${message.author.username}** deu um beijo doce como chocolate em **${target.username}**!`,
            `🎈 **${message.author.username}** deu um beijo leve como um balão em **${target.username}**!`,
            `⭐ **${message.author.username}** deu um beijo brilhante em **${target.username}**!`,
            `🔥 **${message.author.username}** deu um beijo super intenso em **${target.username}**! Wow!`,
            `🎵 **${message.author.username}** beijou **${target.username}** no ritmo da música! 🎶`,
            `🧸 **${message.author.username}** deu um beijo de urso em **${target.username}**!`,
            `🌊 **${message.author.username}** deu um beijo refrescante em **${target.username}**!`,
            `🍩 **${message.author.username}** deu um beijo açucarado em **${target.username}**!`,
            `💌 **${message.author.username}** mandou um beijo apaixonado para **${target.username}**!`
        ];

        const sorteio = mensagens[Math.floor(Math.random() * mensagens.length)];

        // 4. Resposta Final (Só mostra afinidade se mostrarAfinidade for true)
        let footer = "";
        if (mostrarAfinidade) {
            footer = `\n💕 **Afinidade:** \`+${ganhoAfinidade}\` (Total: \`${userData.affinity}\`)`;
            if (extras.length > 0) footer += `\n✨ ${extras.join(' | ')}`;
        }

        return message.channel.send(`${sorteio}${footer}`);

    } catch (error) {
        console.error("Erro no comando beijar:", error);
        message.reply("❌ Ocorreu um erro ao processar o seu beijo!");
    }
}
// ==================== 💆 COMANDO CAFUNÉ (SISTEMA DE AFINIDADE) ====================
if (command === 'cafune' || command === 'headpat') {
    try {
        const target = message.mentions.users.first();

        // 1. Verificações de Alvo (Estilo Loritta)
        if (!target) return message.reply('💆 Você precisa mencionar alguém para fazer um cafuné! Exemplo: `!cafune @usuario`');

        if (target.id === message.author.id) {
            return message.reply('Você quer fazer cafuné em você mesmo? Deixe-me fazer isso por você! *faço um cafuné em sua cabeça*');
        }

        if (target.id === message.client.user.id) {
            return message.reply('Aww, obrigada! Eu adoro carinho atrás das orelhas... digo, nos meus circuitos! *aproveito o cafuné*');
        }

        // Buscar dados do autor no banco
        let dadosAutor = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });

        // 2. Lógica de Afinidade (SÓ SE ESTIVER CASADO COM O ALVO)
        let mostrarAfinidade = false;
        let ganhoAfinidade = 1; // Cafuné geralmente dá menos que beijo, ou o mesmo, você escolhe.

        if (dadosAutor.marriedWith === target.id) {
            mostrarAfinidade = true;

            // Atualiza afinidade no banco para o autor
            dadosAutor.affinity = (dadosAutor.affinity || 0) + ganhoAfinidade;
            await dadosAutor.save();
            
            // Sincroniza com o cônjuge (para o card de casamento ficar igual para os dois)
            await User.updateOne({ userId: target.id }, { $inc: { affinity: ganhoAfinidade } });
        }

        // 3. Banco de Dados de Frases
        const mensagens = [
            `💆 **${message.author.username}** está fazendo um cafuné relaxante em **${target.username}**!`,
            `✨ **${message.author.username}** começou a fazer um cafuné fofinho em **${target.username}**!`,
            `😊 **${message.author.username}** está bagunçando o cabelo de **${target.username}** com um cafuné!`,
            `🧸 **${message.author.username}** deu um cafuné bem carinhoso em **${target.username}** para confortá-lo(a).`,
            `☁️ **${message.author.username}** está fazendo um cafuné tão bom que **${target.username}** quase dormiu!`,
            `🌟 **${message.author.username}** está dando atenção e muito cafuné para **${target.username}**!`,
            `🐱 **${message.author.username}** fez um cafuné estilo "gatinho" em **${target.username}**!`,
            `💤 **${message.author.username}** deixou **${target.username}** relaxado(a) com esse carinho na cabeça!`,
            `🥰 **${message.author.username}** não resistiu e fez um cafuné em **${target.username}**!`,
            `🍭 **${message.author.username}** fez um cafuné super doce em **${target.username}**!`,
            `🖐️ **${message.author.username}** colocou a mão na cabeça de **${target.username}** e começou um cafuné suave.`,
            `🍀 **${message.author.username}** está fazendo um cafuné da sorte em **${target.username}**!`,
            `🎵 **${message.author.username}** faz cafuné em **${target.username}** enquanto cantarola uma música.`,
            `🌈 **${message.author.username}** trouxe alegria para **${target.username}** com um cafuné especial!`,
            `🧘 **${message.author.username}** está transmitir paz para **${target.username}** através de um cafuné.`,
            `💖 **${message.author.username}** está demonstrando todo o seu afeto com um cafuné em **${target.username}**.`,
            `🍼 **${message.author.username}** mimalhou **${target.username}** com um cafuné de bebê!`,
            `🍓 **${message.author.username}** deu um cafuné carinhoso em **${target.username}**!`,
            `🌻 **${message.author.username}** fez um cafuné que iluminou o dia de **${target.username}**!`,
            `🎈 **${message.author.username}** deixou **${target.username}** nas nuvens com esse cafuné!`
        ];

        const sorteio = mensagens[Math.floor(Math.random() * mensagens.length)];

        // 4. Montagem da Resposta Final
        let footer = "";
        if (mostrarAfinidade) {
            footer = `\n💕 **Afinidade:** \`+${ganhoAfinidade}\` (Total: \`${dadosAutor.affinity}\`)`;
        }

        return message.channel.send(`${sorteio}${footer}`);

    } catch (error) {
        console.error("Erro no comando cafune:", error);
        message.reply("❌ Ocorreu um erro ao tentar fazer o cafuné!");
    }
}
    
// ==================== 🤗 COMANDO ABRAÇAR (SISTEMA DE AFETOS + TECH) ====================
if (command === 'abracar' || command === 'hug') {
    try {
        const target = message.mentions.users.first();
        
        // Buscar dados do autor no banco (Garante que userData existe)
        let userData = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });
        const inventory = userData.inventory || [];
        const now = Date.now();
        const cooldownSocial = 30000; // 30 segundos

        // 1. Verificações Específicas
        if (!target) return message.reply('🤗 Precisas de mencionar alguém para abraçar! Exemplo: `!abracar @usuario`');

        if (target.id === message.author.id) {
            return message.reply('Queres abraçar-te a ti próprio? Deixa-me fazer isso por ti! *te dou um abraço bem apertado*');
        }

        if (target.id === message.client.user.id) {
            return message.reply('Aww! Eu adoro abraços! *retribuo o abraço com os meus braços mecânicos e fofinhos*');
        }

        // 2. Lógica de Itens e Cooldown (Funciona para todos)
        let usouBateria = false;
        if (userData.lastSocial && (now - userData.lastSocial < cooldownSocial)) {
            if (inventory.includes('bateria')) {
                const index = userData.inventory.indexOf('bateria');
                userData.inventory.splice(index, 1);
                userData.markModified('inventory');
                usouBateria = true;
            } else {
                const restante = Math.ceil((cooldownSocial - (now - userData.lastSocial)) / 1000);
                return message.reply(`⏳ Calma! Estás muito carente. Espera **${restante} segundos** para abraçar de novo.`);
            }
        }

        // 3. Lógica de Afinidade (SÓ SE ESTIVER CASADO COM O ALVO)
        let mostrarAfinidade = false;
        let ganhoAfinidade = 1;
        let extras = [];

        if (userData.marriedWith === target.id) {
            mostrarAfinidade = true;

            // --- BÔNUS: ANEL DE DIAMANTE ---
            if (inventory.includes('anel')) {
                ganhoAfinidade *= 2;
                extras.push("💍 **Poder do Anel:** Abraço duplicado!");
            }

            // Atualiza afinidade no banco para o autor
            userData.affinity = (userData.affinity || 0) + ganhoAfinidade;
            
            // Sincroniza com o cônjuge
            await User.updateOne({ userId: target.id }, { $inc: { affinity: ganhoAfinidade } });
        }

        if (usouBateria) {
            extras.push("🔋 **Bateria de Lítio:** Cooldown social resetado!");
        }

        // 4. Salvar dados de tempo (sempre salva o cooldown, mesmo sem afinidade)
        userData.lastSocial = now;
        await userData.save();

        // 5. Banco de Dados de Frases
        const mensagens = [
            `🤗 **${message.author.username}** deu um abraço bem apertado em **${target.username}**!`,
            `✨ **${message.author.username}** deu um abraço carinhoso em **${target.username}**!`,
            `💖 **${message.author.username}** envolveu **${target.username}** em um abraço quentinho!`,
            `🧸 **${message.author.username}** deu um abraço de urso em **${target.username}**!`,
            `☁️ **${message.author.username}** deu um abraço reconfortante em **${target.username}**!`,
            `🌟 **${message.author.username}** correu e deu um abraço surpresa em **${target.username}**!`,
            `😊 **${message.author.username}** e **${target.username}** estão abraçadinhos!`,
            `🍂 **${message.author.username}** deu um abraço acolhedor em **${target.username}**!`,
            `🐱 **${message.author.username}** deu um abraço fofo em **${target.username}**!`,
            `🌊 **${message.author.username}** deu um abraço calmo em **${target.username}**!`,
            `🎈 **${message.author.username}** deu um abraço leve em **${target.username}**!`,
            `🍭 **${message.author.username}** deu um abraço doce em **${target.username}**!`,
            `🔥 **${message.author.username}** deu um abraço protetor em **${target.username}**!`,
            `🌈 **${message.author.username}** espalhou alegria com um abraço em **${target.username}**!`,
            `🌻 **${message.author.username}** deu um abraço que iluminou o dia de **${target.username}**!`,
            `🎶 **${message.author.username}** deu um abraço ritmado em **${target.username}**!`,
            `💎 **${message.author.username}** deu um abraço valioso em **${target.username}**!`,
            `🛡️ **${message.author.username}** deu um abraço de "estou aqui com você" em **${target.username}**!`,
            `🚀 **${message.author.username}** deu um abraço sideral em **${target.username}**!`,
            `⚡ **${message.author.username}** deu um abraço eletrizante em **${target.username}**!`
        ];

        const sorteio = mensagens[Math.floor(Math.random() * mensagens.length)];

        // 6. Resposta Final
        let footer = "";
        if (mostrarAfinidade) {
            footer = `\n\n💕 **Afinidade:** \`+${ganhoAfinidade}\` | Total: \`${userData.affinity}\``;
        }

        // Se usou bateria, avisa mesmo que não tenha afinidade
        if (usouBateria && !mostrarAfinidade) footer += `\n\n✨ **Bateria de Lítio:** Cooldown social resetado!`;
        else if (usouBateria && mostrarAfinidade) footer += `\n✨ Bateria de Lítio usada!`;

        return message.channel.send(`${sorteio}${footer}`);

    } catch (error) {
        console.error("Erro no comando abraçar:", error);
        message.reply("❌ Aconteceu um erro ao tentar dar esse abraço!");
    }
}
// ==================== 🖐️ COMANDO TAPA (SISTEMA DE AFINIDADE NEGATIVA) ====================
if (command === 'tapa' || command === 'slap') {
    try {
        const target = message.mentions.users.first();

        // 1. Verificações Específicas
        if (!target) return message.reply('🖐️ Você precisa mencionar alguém para dar um tapa!');

        if (target.id === message.author.id) {
            return message.reply('Você quer se bater? Não faça isso! Se você quer tanto dar um tapa em alguém, bata em mim... não, espera, em mim também não!');
        }

        if (target.id === message.client.user.id) {
            return message.reply('Ei! Por que você está tentando me bater? Eu sou apenas um bot inofensivo! *começo a chorar virtualmente*');
        }

        // Buscar dados do autor
        let dadosAutor = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });
        const agora = Date.now();

        // 2. Cooldown de 10 segundos
        if (agora - (dadosAutor.lastSocial || 0) < 10000) {
            return message.reply("⏳ Calma, a violência não é a resposta! Espere um pouco.");
        }

        // 3. Lógica de Afinidade NEGATIVA (SÓ SE ESTIVER CASADO COM O ALVO)
        let perdeuAfinidade = false;
        let perda = 2; // Quantidade de afinidade que perde por tapa

        if (dadosAutor.marriedWith === target.id) {
            perdeuAfinidade = true;

            // Diminui a afinidade (garantindo que não fique menor que 0 se você preferir)
            dadosAutor.affinity = Math.max(0, (dadosAutor.affinity || 0) - perda);
            dadosAutor.lastSocial = agora;
            await dadosAutor.save();

            // Sincroniza a perda com o cônjuge
            await User.updateOne(
                { userId: target.id }, 
                { $set: { affinity: dadosAutor.affinity }, $set: { lastSocial: agora } }
            );
        } else {
            // Se não for casado, apenas salva o cooldown
            dadosAutor.lastSocial = agora;
            await dadosAutor.save();
        }

        // 4. Banco de Dados de Frases
        const mensagens = [
            `🖐️ **POW!** **${message.author.username}** deu um tapa bem estalado em **${target.username}**!`,
            `💢 **${message.author.username}** deu um tapa de anime em **${target.username}**!`,
            `😤 **${message.author.username}** perdeu a paciência e deu um tapa em **${target.username}**!`,
            `💨 **${message.author.username}** deu um tapa tão rápido em **${target.username}** que nem deu para ver!`,
            `🥊 **${message.author.username}** deu um tabefe em **${target.username}**!`,
            `😹 **${message.author.username}** deu um tapa de brincadeira em **${target.username}**!`,
            `😵 **${message.author.username}** deixou **${target.username}** tonto com esse tapa!`,
            `💥 **${message.author.username}** deu um tapa épico em **${target.username}**!`,
            `🤫 **${message.author.username}** deu um tapa silencioso em **${target.username}**!`,
            `🙄 **${message.author.username}** deu um tapa "acorda pra vida" em **${target.username}**!`,
            `👐 **${message.author.username}** deu um tapa duplo em **${target.username}**!`,
            `🎭 **${message.author.username}** deu um tapa dramático em **${target.username}**!`,
            `🔥 **${message.author.username}** deu um tapa ardente em **${target.username}**!`,
            `💫 **${message.author.username}** fez **${target.username}** ver estrelas com esse tapa!`
        ];

        const sorteio = mensagens[Math.floor(Math.random() * mensagens.length)];

        // 5. Resposta Final
        let footer = "";
        if (perdeuAfinidade) {
            footer = `\n💔 **Afinidade Perdida:** \`-${perda}\` (Total: \`${dadosAutor.affinity}\`)`;
        }

        return message.channel.send(`${sorteio}${footer}`);

    } catch (error) {
        console.error("Erro no comando tapa:", error);
        message.reply("❌ Ocorreu um erro ao tentar dar esse tapa!");
    }
}
// ==================== ⚔️ COMANDO ATACAR (SISTEMA DE COMBATE + PUNIÇÃO CASAL) ====================
if (command === 'atacar' || command === 'attack') {
    try {
        const target = message.mentions.users.first();

        // 1. Verificações de Alvo
        if (!target) return message.reply('⚔️ Precisas de mencionar alguém para atacar!');
        if (target.id === message.author.id) return message.reply('Queres atacar-te a ti próprio? Se estás triste, eu posso dar-te um abraço! 🤗');
        if (target.id === message.client.user.id) return message.reply('Ei! Por que me queres atacar? Eu sou apenas um bot fofinho! 🤖📦');

        // Carregar dados de ambos
        let dadosAutor = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id });
        let targetData = await User.findOne({ userId: target.id }) || await User.create({ userId: target.id });
        
        const agora = Date.now();
        const myInv = dadosAutor.inventory || [];
        const targetInv = targetData.inventory || [];

        // 2. Cooldown com Bônus (Chip Neural)
        let cooldownLuta = 15000; 
        if (myInv.includes('chip')) cooldownLuta = 5000; 

        if (agora - (dadosAutor.lastSocial || 0) < cooldownLuta) {
            const restante = Math.ceil((cooldownLuta - (agora - dadosAutor.lastSocial)) / 1000);
            return message.reply(`⏳ Estás sem fôlego! Espera **${restante}s** para lutar de novo.`);
        }

        // 3. Lógica de Afinidade NEGATIVA (SÓ SE ESTIVER CASADO COM O ALVO)
        let perdeuAfinidade = false;
        let perda = 5; // Ataque tira mais afinidade que tapa

        if (dadosAutor.marriedWith === target.id) {
            perdeuAfinidade = true;
            dadosAutor.affinity = Math.max(0, (dadosAutor.affinity || 0) - perda);
            // Sincronizar afinidade para ambos
            targetData.affinity = dadosAutor.affinity;
        }

        // 4. Status de Equipamento e Poder
        const euTenhoArma = myInv.includes('arma');
        const euTenhoFaca = myInv.includes('faca');
        const euTenhoChip = myInv.includes('chip');
        const alvoTemArma = targetInv.includes('arma');
        const indexEscudoAlvo = targetInv.indexOf('escudo');

        let chanceVitoria = 0.50; 
        let bonusTexto = [];

        if (euTenhoFaca) { chanceVitoria += 0.15; bonusTexto.push("🔪 Faca (+15%)"); }
        if (euTenhoArma) { chanceVitoria += 0.25; bonusTexto.push("🔫 Pistola (+25%)"); }
        if (euTenhoChip) { chanceVitoria += 0.10; bonusTexto.push("💾 Chip Neural (+10%)"); }
        if (alvoTemArma) { chanceVitoria -= 0.30; bonusTexto.push("⚠️ Alvo Armado (-30%)"); }

        // 5. Verificação de Escudo
        if (indexEscudoAlvo !== -1 && !euTenhoArma) {
            targetData.inventory.splice(indexEscudoAlvo, 1);
            targetData.markModified('inventory');
            dadosAutor.lastSocial = agora;
            await targetData.save();
            await dadosAutor.save();
            return message.reply(`🛡️ **DEFESA!** **${target.username}** usou um **Escudo** para bloquear o teu ataque! O escudo quebrou, mas ele saiu ileso.`);
        }

        // 6. Execução do Combate
        const venceu = Math.random() < chanceVitoria;
        let resultadoTexto = "";

        if (venceu) {
            const frasesVitoria = [
                `🥊 **NOCAUTE!** **${message.author.username}** acertou um soco em cheio em **${target.username}**!`,
                `⚔️ **DOMÍNIO!** **${message.author.username}** venceu a briga e deixou **${target.username}** no chão!`,
                `💥 **POW!** Com reflexos de ninja, **${message.author.username}** derrotou o oponente!`
            ];
            resultadoTexto = frasesVitoria[Math.floor(Math.random() * frasesVitoria.length)];
            if (euTenhoArma) resultadoTexto = `🔫 **FOGO CRUZADO!** **${message.author.username}** usou a sua Pistola 9mm para render **${target.username}**! 🏆`;
        } else {
            const frasesDerrota = [
                `🤕 **DERROTA!** **${target.username}** desviou do golpe de **${message.author.username}** e revidou!`,
                `🛡️ **CONTRA-ATAQUE!** **${message.author.username}** tentou atacar, mas levou a pior!`,
                `💀 **QUE VIRADA!** **${target.username}** imobilizou **${message.author.username}**!`
            ];
            resultadoTexto = frasesDerrota[Math.floor(Math.random() * frasesDerrota.length)];
            if (alvoTemArma) resultadoTexto = `🛡️ **REAÇÃO ARMADA!** **${target.username}** sacou uma Pistola 9mm e fez **${message.author.username}** fugir! 🏃💨`;
        }

        // 7. Salvamento Final
        dadosAutor.lastSocial = agora;
        await dadosAutor.save();
        await targetData.save();

        // 8. Resposta Final
        const embedTitulo = venceu ? "🤺 **VITÓRIA NA ARENA!**" : "🛡️ **DERROTA NA ARENA!**";
        let msgFinal = `${embedTitulo}\n\n${resultadoTexto}`;
        
        if (bonusTexto.length > 0) msgFinal += `\n\n✨ **Fatores:** \`${bonusTexto.join(' | ')}\``;
        if (perdeuAfinidade) msgFinal += `\n💔 **Clima Tenso:** Por atacares o teu cônjuge, perderam **${perda}** de afinidade! (Total: \`${dadosAutor.affinity}\`)`;

        return message.channel.send(msgFinal);

    } catch (error) {
        console.error("Erro no comando atacar:", error);
        message.reply("❌ Ocorreu um erro durante a batalha!");
    }
}
// ==================== 🥷 COMANDO ROUBAR (VERSÃO FINAL) ====================
if (command === 'roubar' || command === 'steal') {
    try {
        const target = message.mentions.users.first();
        
        // 1. Verificações de Segurança
        if (!target) return message.reply('❌ Precisas de marcar (@) a vítima!');
        if (target.id === message.author.id) return message.reply('❌ Não podes roubar a ti próprio!');
        if (target.bot) return message.reply('❌ Não podes roubar robôs!');

        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) return message.reply('❌ Esta pessoa ainda não iniciou no bot!');
        if (targetData.money < 500) return message.reply('❌ Esta pessoa está falida, não vale o risco!');

        // --- INVENTÁRIOS ---
        const myInv = userData.inventory || [];
        const victimInv = targetData.inventory || [];

        const euTenhoArma = myInv.includes('arma');
        const euTenhoFaca = myInv.includes('faca');
        const euTenhoInibidor = myInv.includes('inibidor');
        const euTenhoMascara = myInv.includes('mascara');
        const euTenhoLockpick = myInv.includes('lockpick');

        const alvoTemArma = victimInv.includes('arma');
        const alvoTemCoroa = victimInv.includes('coroa'); // PROTEÇÃO SUPREMA
        const indexEscudo = victimInv.indexOf('escudo');

        // 2. 🛡️ DEFESA LENDÁRIA: COROA DO REI DO CRIME
        if (alvoTemCoroa) {
            return message.reply(`👑 **IMPOSSÍVEL!** ${target.username} porta a **Coroa do Rei**, a sua aura de poder impede qualquer tentativa de roubo!`);
        }

        // 3. 🔫 DEFESA: PISTOLA (Vítima)
        if (alvoTemArma && !euTenhoInibidor) {
            const multaReacao = 4000;
            userData.money = Math.max(0, userData.money - multaReacao);
            await userData.save();
            return message.reply(`🔫 **REAGIRAM!** Tentaste roubar ${target.username}, mas ele sacou uma **Pistola 9mm**! Fugiste e perdeste **${multaReacao.toLocaleString()} moedas**.`);
        } 
        
        // Se o ladrão tem Inibidor, ele gasta o item para anular a arma da vítima
        if (alvoTemArma && euTenhoInibidor) {
            userData.inventory.splice(myInv.indexOf('inibidor'), 1);
            userData.markModified('inventory');
        }

        // 4. 🛡️ DEFESA: ESCUDO (Vítima)
        if (indexEscudo !== -1) {
            targetData.inventory.splice(indexEscudo, 1);
            targetData.markModified('inventory');
            await targetData.save();
            return message.reply(`🛡️ **BLOQUEADO!** O roubo falhou! **${target.username}** tinha um **Escudo** que foi destruído, mas protegeu o dinheiro!`);
        }

        // 5. 🔪 CÁLCULO DE CHANCE (Ataque)
        let chanceSucesso = 0.35; 
        if (euTenhoFaca) chanceSucesso += 0.15; 
        if (euTenhoArma) chanceSucesso += 0.30;
        if (euTenhoLockpick) chanceSucesso += 0.10; 

        // 6. EXECUÇÃO
        if (Math.random() < chanceSucesso) {
            // Sucesso
            let porcentagem = (Math.random() * (0.25 - 0.10) + 0.10); // 10% a 25%
            
            // Bônus do Lockpick: Rouba mais e consome o item
            if (euTenhoLockpick) {
                porcentagem += 0.05;
                userData.inventory.splice(myInv.indexOf('lockpick'), 1);
                userData.markModified('inventory');
            }

            const roubo = Math.floor(targetData.money * porcentagem);
            
            userData.money += roubo;
            targetData.money -= roubo;

            await userData.save();
            await targetData.save();

            let bonusMsg = "";
            if (euTenhoInibidor && alvoTemArma) bonusMsg += "\n📡 **Hackeado!** Teu Inibidor de Sinal desativou a segurança da vítima.";
            if (euTenhoLockpick) bonusMsg += "\n🔐 **Mestre das Chaves:** O Lockpick garantiu um saque maior (Gasto).";

            return message.reply(`💰 **SUCESSO!** Levaste **${roubo.toLocaleString()} moedas** de ${target.username}.${bonusMsg}`);
        } else {
            // Falha
            let perda = 2500;
            let msgFalha = `👮 **FALHA!** Foste apanhado e pagaste uma multa de **${perda.toLocaleString()} moedas**.`;

            if (euTenhoMascara) {
                msgFalha = `🎭 **ESCAPE!** Quase foste preso, mas como estavas de **Máscara**, ninguém te identificou. Fugiste sem perder dinheiro!`;
            } else {
                userData.money = Math.max(0, userData.money - perda);
            }

            await userData.save();
            return message.reply(msgFalha);
        }
    } catch (error) {
        console.error("Erro no roubar:", error);
        message.reply("❌ Erro técnico ao processar o roubo.");
    }
}
 // ==================== 🏴 COMANDO ENTRAR NA FACÇÃO (SISTEMA COMPLETO) ====================
if (command === 'entrarfaccao' || command === 'entrar') {
    const inventory = userData.inventory || [];
    
    // 1. ID do Cargo que o jogador vai ganhar no Discord
    // Substitua os números abaixo pelo ID real do cargo no seu servidor
    const cargoDiscordID = "1454692749482660003";

    // 2. Verificação: Já é membro?
    if (userData.cargo === "Membro da Facção") {
        return message.reply("⚠️ Tu já fazes parte da elite!");
    }

    // 3. Verificação: Tem o convite?
    if (!inventory.includes('faccao')) {
        return message.reply("❌ Não tens o **Convite de Facção** na mochila. Compra um no `!submundo`!");
    }

    try {
        // 4. REMOVE O ITEM DA MOCHILA (CONSUMIR)
        const index = userData.inventory.indexOf('faccao');
        if (index > -1) {
            userData.inventory.splice(index, 1);
        }

        // 5. ATUALIZA O BANCO DE DATOS
        userData.cargo = "Membro da Facção";
        userData.markModified('inventory');
        userData.markModified('cargo');
        await userData.save();

        // 6. ATRIBUI O CARGO NO DISCORD (Ação Visual)
        const role = message.guild.roles.cache.get(cargoDiscordID);
        if (role) {
            await message.member.roles.add(role).catch(e => console.log("Erro ao dar cargo: Bot sem permissão."));
        }

        // 7. RESPOSTA VISUAL (Embed)
        const embed = {
            color: 0x1a1a1a,
            title: "🔥 Iniciação Concluída!",
            description: `O teu **Convite** foi destruído.\n\nBem-vindo à elite, **${message.author.username}**.\nAgora és oficialmente um **Membro da Facção** no banco de dados e no servidor!`,
            thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/743/743225.png' },
            footer: { text: "O teu status é permanente." }
        };

        return message.reply({ embeds: [embed] });

    } catch (err) {
        console.error(err);
        return message.reply("❌ Ocorreu um erro ao processar a tua entrada.");
    }
}
// ==================== 🏴 COMANDO DOMÍNIO (COLETIVO DA FACÇÃO) ====================
if (command === 'dominio' || command === 'faccao') {
    try {
        // 1. Busca todos os usuários que pertencem à facção (ajuste os nomes dos cargos conforme seu bot)
        const membros = await User.find({ 
            cargo: { $in: ["Membro da Facção", "Líder da Facção 🏴‍☠️"] } 
        });
        
        if (membros.length === 0) {
            return message.reply("🚫 A organização ainda não tem membros registrados.");
        }

        // 2. Cálculos Coletivos (Agora usando os novos campos)
        const totalSoldados = membros.length;
        const riquezaTotal = membros.reduce((acc, user) => acc + (user.money || 0) + (user.bank || 0) + (user.dirtyMoney || 0), 0);
        const totalTrabalhos = membros.reduce((acc, user) => acc + (user.workCount || 0), 0);
        
        // Contagem de arsenal e tecnologia coletiva
        let arsenal = { armas: 0, dinamites: 0, inibidores: 0 };
        
        membros.forEach(user => {
            const inv = user.inventory || [];
            arsenal.armas += inv.filter(item => item === 'arma').length;
            arsenal.dinamites += inv.filter(item => item === 'dinamite').length;
            arsenal.inibidores += inv.filter(item => item === 'inibidor').length;
        });

        // 3. Lógica de Influência (Baseada em Soldados, Armas e Operações)
        let statusInfluencia = "⚖️ Iniciante (Gangue de Bairro)";
        let corEmbed = 0x555555; // Cinza

        if (totalSoldados >= 5 && totalTrabalhos >= 150) {
            statusInfluencia = "🔥 Alta (Domínio das Ruas)";
            corEmbed = 0xffa500; // Laranja
        } 
        
        if (totalSoldados >= 10 && arsenal.armas >= 5 && totalTrabalhos >= 500) {
            statusInfluencia = "💀 Lendária (Dona da Cidade)";
            corEmbed = 0x000000; // Preto
        }
        
        if (totalSoldados >= 15 && arsenal.dinamites >= 10 && riquezaTotal > 1000000) {
            statusInfluencia = "👑 Suprema (Sindicato do Crime)";
            corEmbed = 0x8b0000; // Vermelho Escuro
        }

        // 4. Construção do Painel
        const embed = {
            color: corEmbed,
            title: "🏴 RELATÓRIO DE DOMÍNIO: ORGANIZAÇÃO",
            description: "Análise estratégica de poder e recursos da facção no servidor.",
            thumbnail: { url: "https://i.imgur.com/uO6XG9A.png" },
            fields: [
                { name: "👥 Soldados", value: `\`${totalSoldados}\` membros`, inline: true },
                { name: "📊 Operações", value: `\`${totalTrabalhos}\` concluídas`, inline: true },
                { name: "📊 Influência", value: `**${statusInfluencia}**`, inline: false },
                { 
                    name: "📦 Recursos Coletivos", 
                    value: `🔫 Armas: \`${arsenal.armas}\` | 🧨 Dinamites: \`${arsenal.dinamites}\` | 📡 Inibidores: \`${arsenal.inibidores}\``, 
                    inline: false 
                },
                { 
                    name: "💰 Poder Financeiro", 
                    value: `Total em Circulação: **${riquezaTotal.toLocaleString()}** moedas\n*(Inclui Banco, Carteira e Dinheiro Sujo)*`, 
                    inline: false 
                }
            ],
            footer: { text: "Lealdade acima de tudo. O crime é um negócio." },
            timestamp: new Date()
        };

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Erro no comando dominio:", error);
        message.reply("❌ Erro ao acessar os arquivos criptografados da organização.");
    }
}
// ==================== 🏦 ASSALTO EM DUPLA (SISTEMA DE CASAL & ITENS) ====================
if (command === 'assaltodupla' || command === 'assalto') {
    try {
        // 1. Verificação de Casamento
        if (!userData.marriedWith) {
            return message.reply("❌ Este crime exige um parceiro de extrema confiança. Precisas de estar **casado** para planejar este assalto!");
        }

        // 2. Buscar dados do Parceiro(a)
        const partnerData = await User.findOne({ userId: userData.marriedWith });
        if (!partnerData) return message.reply("❌ Erro ao localizar os dados do teu parceiro. Ele(a) ainda joga?");

        // 3. Cooldown (6 horas)
        const cooldown = 21600000; 
        const agora = Date.now();
        const ultimoAssalto = userData.lastRob || 0;

        if (agora - ultimoAssalto < cooldown) {
            const restante = cooldown - (agora - ultimoAssalto);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);
            return message.reply(`⏳ A polícia está de vigia! Esperem mais **${horas}h e ${minutos}min** para o próximo golpe.`);
        }

        // 4. Lógica de Itens (Verifica se QUALQUER UM dos dois tem o item)
        const invEu = userData.inventory || [];
        const invParceiro = partnerData.inventory || [];
        const invTotal = [...invEu, ...invParceiro];
        
        let chanceSucesso = 0.60; // 60% base
        let ganhoBase = Math.floor(Math.random() * 20000) + 15000; 
        
        // --- AJUSTE: Afinidade aleatória entre 1 e 9 ---
        let afinidadeGanho = Math.floor(Math.random() * 9) + 1; 
        
        let extras = [];

        // --- BÔNUS: INIBIDOR DE SINAL (Aumenta a chance de sucesso) ---
        if (invTotal.includes('inibidor')) {
            chanceSucesso += 0.25; // Vai para 85%
            extras.push("📡 **Inibidor:** Alarme silenciado (Chance +25%)");
        }

        // --- BÔNUS: DINAMITE (Aumenta muito o lucro) ---
        if (invTotal.includes('dinamite')) {
            ganhoBase += 15000;
            extras.push("🧨 **Dinamite:** Cofre implodido (+15k moedas)");
            
            // Consome a dinamite de quem a tiver
            if (invEu.includes('dinamite')) {
                userData.inventory.splice(invEu.indexOf('dinamite'), 1);
                userData.markModified('inventory');
            } else {
                partnerData.inventory.splice(invParceiro.indexOf('dinamite'), 1);
                partnerData.markModified('inventory');
            }
        }

        // --- BÔNUS: ANEL DE DIAMANTE (Aumenta afinidade) ---
        if (invTotal.includes('anel')) {
            // Se tiver anel, ganha um bônus fixo além do sorteio
            const bonusAnel = 10;
            afinidadeGanho += bonusAnel;
            extras.push(`💍 **Anel:** Sintonia perfeita (+${bonusAnel} Afeto)`);
        }

        // 5. EXECUÇÃO DO GOLPE
        if (Math.random() < chanceSucesso) {
            // --- SUCESSO ---
            userData.money += ganhoBase;
            userData.lastRob = agora;
            userData.affinity = (userData.affinity || 0) + afinidadeGanho;
            
            partnerData.money += ganhoBase; 
            partnerData.affinity = userData.affinity; // Sincroniza o valor exato

            await userData.save();
            await partnerData.save();

            const embedSucesso = {
                title: "🏦 O GOLPE PERFEITO!",
                description: `Tu e <@${userData.marriedWith}> invadiram o cofre principal e saíram antes das sirenes!`,
                color: 0x00FF00, // Verde
                fields: [
                    { name: "💰 Lucro p/ cada", value: `**${ganhoBase.toLocaleString()}** moedas`, inline: true },
                    { name: "❤️ Afinidade", value: `+${afinidadeGanho} pontos`, inline: true }
                ],
                footer: { text: extras.length > 0 ? `Bônus Ativos: ${extras.join(' | ')}` : "Parceria criminosa eterna." }
            };
            return message.reply({ embeds: [embedSucesso] });

        } else {
            // --- FALHA ---
            let multa = 5000;
            let temMascara = invTotal.includes('mascara');
            
            if (temMascara) multa = 0; 

            userData.money = Math.max(0, userData.money - multa);
            userData.lastRob = agora; 
            
            partnerData.money = Math.max(0, partnerData.money - multa);
            partnerData.lastRob = agora;

            await userData.save();
            await partnerData.save();

            if (temMascara) {
                return message.reply(`👮 **Cercados!** O alarme disparou, mas as vossas **Máscaras** 🎭 impediram a identificação. Fugiram sem pagar fiança, mas precisam de se esconder (Cooldown ativado)!`);
            } else {
                return message.reply(`🚨 **A CASA CAIU!** Vocês foram pegos na saída. Cada um teve de pagar **${multa.toLocaleString()} moedas** de fiança para sair da esquadra!`);
            }
        }

    } catch (error) {
        console.error("Erro no assaltodupla:", error);
        message.reply("❌ Ocorreu um erro ao planejar o assalto.");
    }
}
// ==================== 🧼 COMANDO LAVAR (VERSÃO ARRUMADA) ====================
if (command === 'lavar') {
    try {
        // 1. Verificação de Cargo (Membro da Facção ou Mafia)
        const cargosCriminais = ["Membro da Facção", "Líder da Facção 🏴‍☠️"]; // Ajuste conforme seus nomes de cargos
        if (!cargosCriminais.includes(userData.cargo)) {
            return message.reply("🚫 **Acesso Negado.** Precisas de conexões no Submundo para aceder à rede de lavagem.");
        }

        const args = message.content.split(' ').slice(1);
        let quantia = args[0] === 'tudo' ? userData.dirtyMoney : parseInt(args[0]);
        const myInv = userData.inventory || [];

        // 2. Validações de Entrada
        if (userData.dirtyMoney <= 0) {
            return message.reply("❌ Não tens **Dinheiro Sujo** para lavar! Vai cometer alguns crimes primeiro.");
        }

        if (!quantia || isNaN(quantia) || quantia <= 0) {
            return message.reply("❓ **Uso correto:** `!lavar <quantia>` ou `!lavar tudo`.");
        }

        if (userData.dirtyMoney < quantia) {
            return message.reply(`❌ Só tens **${userData.dirtyMoney.toLocaleString()}** de dinheiro sujo.`);
        }

        // 3. Lógica de Itens e Taxas (Lavagem sempre tem uma "mãozinha" que fica com parte do dinheiro)
        let chanceSucesso = 0.75; // 75% base de não ser pego pela polícia
        let taxaLavagem = 0.25;  // 25% de taxa padrão (Lava 1000, recebe 750)
        let extras = [];

        // Chip Neural: Hackeia os sistemas fiscais (Diminui a taxa / aumenta o lucro final)
        if (myInv.includes('chip')) {
            taxaLavagem -= 0.10; // Taxa cai para 15%
            extras.push("💾 **Chip Neural:** Otimizou as transações fiscais.");
        }

        // Inibidor de Sinal: Esconde o IP (Aumenta muito a segurança)
        if (myInv.includes('inibidor')) {
            chanceSucesso += 0.20; // Chance sobe para 95%
            extras.push("📡 **Inibidor:** Bloqueou o rastreio da Unidade de Crimes Financeiros.");
        }

        // Pendrive: Equipamento básico de hacker (Diminui a taxa levemente)
        if (myInv.includes('pendrive') && !myInv.includes('chip')) {
            taxaLavagem -= 0.05; // Taxa cai para 20%
            extras.push("📟 **Pendrive:** Facilitou a transferência off-shore.");
        }

        // 4. Execução da Operação
        if (Math.random() < chanceSucesso) {
            // --- SUCESSO ---
            const custoLavagem = Math.floor(quantia * taxaLavagem);
            const valorLimpo = quantia - custoLavagem;

            userData.dirtyMoney -= quantia;
            userData.money += valorLimpo;
            await userData.save();

            let msgSucesso = `🧼 **OPERACÃO CONCLUÍDA COM SUCESSO!**\n\n` +
                             `💰 **Valor Processado:** \`${quantia.toLocaleString()}\` moedas sujas.\n` +
                             `💸 **Taxa do Operador:** \`-${custoLavagem.toLocaleString()}\` (Taxa: ${(taxaLavagem * 100).toFixed(0)}%)\n` +
                             `✅ **Depositado na Carteira:** \`${valorLimpo.toLocaleString()}\` moedas limpas.`;
            
            if (extras.length > 0) msgSucesso += `\n\n**Tecnologia detectada:**\n${extras.join('\n')}`;
            
            return message.reply(msgSucesso);

        } else {
            // --- FALHA (Confisco Total ou Parcial) ---
            const confiscado = Math.floor(quantia * 0.8); // Perde 80% do que tentou lavar
            userData.dirtyMoney -= quantia;
            await userData.save();

            return message.reply(`🚨 **A CASA CAIU!** O banco central detectou a movimentação suspeita. **${confiscado.toLocaleString()} moedas** foram confiscadas e o restante foi perdido na fuga!`);
        }

    } catch (error) {
        console.error("Erro no comando lavar:", error);
        message.reply("❌ Ocorreu um erro no processamento financeiro.");
    }
}
// ==================== ❄️ COMANDO TRÁFICO (VERSÃO ELITE FACÇÃO) ====================
if (command === 'traficar' || command === 'trafico') {
    try {
        // 1. Verificação de Cargo
        if (userData.cargo !== "Membro da Facção") {
            return message.reply("🚫 **Acesso Negado.** Apenas membros da elite da facção conhecem as rotas de tráfico.");
        }

        const now = Date.now();
        const myInv = userData.inventory || [];
        const lastTrafico = userData.lastTrafico || 0;
        
        // --- LÓGICA DE COOLDOWN (Chip Neural ajuda aqui também) ---
        let cooldown = 7200000; // 2 horas base
        if (myInv.includes('chip')) {
            cooldown = 3600000; // Reduz para 1 hora (Membros com chip são mais eficientes)
        }

        if (now - lastTrafico < cooldown) {
            const restante = cooldown - (now - lastTrafico);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.ceil((restante % 3600000) / 60000);
            return message.reply(`⏳ As rotas estão "quentes" (muita polícia). Volta em **${horas}h e ${minutos}min**.`);
        }

        // 2. Lógica de Itens e Chances
        let chanceSucesso = 0.80; // 80% base
        let ganhoBase = Math.floor(Math.random() * 20001) + 15000; // 15k a 35k
        let extras = [];

        // Bônus: Pistola (Garante mais segurança no transporte)
        if (myInv.includes('arma')) {
            ganhoBase += 5000;
            chanceSucesso += 0.05; // +5% de chance
            extras.push("🔫 Pistola");
        }

        // Bônus: Chip Neural (Facilita a fuga e o cálculo das rotas)
        if (myInv.includes('chip')) {
            ganhoBase += 3000;
            chanceSucesso += 0.05; // +5% de chance
            extras.push("💾 Chip Neural");
        }

        // 3. Execução
        const sorteio = Math.random();

        if (sorteio < chanceSucesso) {
            // SUCESSO
            userData.money += ganhoBase;
            userData.lastTrafico = now;
            await userData.save();

            let msgSucesso = `📦 **OPERAÇÃO BEM SUCEDIDA!**\n` +
                             `A mercadoria chegou ao destino. Lucraste **${ganhoBase.toLocaleString()} moedas**!`;
            
            if (extras.length > 0) msgSucesso += `\n> **Equipamento Utilizado:** ${extras.join(' e ')}`;
            
            return message.reply(msgSucesso);

        } else {
            // FALHA (A polícia interceptou)
            let multa = 10000;
            
            // Se tiver máscara, a polícia não te identifica e a multa cai
            if (myInv.includes('mascara')) {
                multa = 3000;
                extras.push("🎭 Máscara");
            }

            userData.money = Math.max(0, userData.money - multa);
            userData.lastTrafico = now;
            await userData.save();

            let msgFalha = `🚨 **INTERCEPTADO!** A patrulha fechou o cerco. `;
            
            if (myInv.includes('mascara')) {
                msgFalha += `Conseguiste fugir sem ser identificado graças à **Máscara**, mas perdeste **${multa.toLocaleString()}** em mercadoria.`;
            } else {
                msgFalha += `Tiveste de subornar os oficiais para não seres preso. Prejuízo de **${multa.toLocaleString()} moedas**.`;
            }

            return message.reply(msgFalha);
        }

    } catch (error) {
        console.error("Erro no comando traficar:", error);
        message.reply("❌ Ocorreu um erro na rota de tráfico.");
    }
}
// ==================== 🎯 COMANDO MISSÕES (EXCLUSIVO FACÇÃO) ====================
if (command === 'missao' || command === 'mission') {
    if (userData.cargo !== "Membro da Facção") {
        return message.reply("🚫 As missões de elite só estão disponíveis para a Facção.");
    }

    const now = Date.now();
    if (now - (userData.lastMission || 0) < 3600000) return message.reply("⏳ Já realizaste uma operação recentemente. Descansa 1 hora.");

    const missoes = [
        { nome: "Escoltar o Chefe", ganho: 12000, desc: "Garantiste que o comboio chegasse seguro." },
        { nome: "Hackear o Banco Central", ganho: 25000, desc: "Desviaste fundos de contas inativas." },
        { nome: "Queima de Arquivo", ganho: 15000, desc: "Eliminaste provas contra a organização." },
        { nome: "Infiltração Policial", ganho: 18000, desc: "Recuperaste o dossiê da facção na esquadra." }
    ];

    const missaoSorteada = missoes[Math.floor(Math.random() * missoes.length)];

    userData.money += missaoSorteada.ganho;
    userData.lastMission = now;
    userData.missionCount = (userData.missionCount || 0) + 1;
    
    await userData.save();

    return message.reply(`🎯 **MISSÃO CONCLUÍDA: ${missaoSorteada.nome}**\n> ${missaoSorteada.desc}\n💰 Recompensa: **${missaoSorteada.ganho.toLocaleString()} moedas**.`);
}
// ==================== 🌑 COMANDO CRIME (VERSÃO INTEGRADA) ====================
if (command === 'crime') {
    try {
        const now = Date.now();
        const myInv = userData.inventory || [];
        
        // Identificação dos itens (IDs sincronizados com a LojaItens)
        const indexDinamite = myInv.indexOf('dinamite');
        const temDinamite = indexDinamite !== -1;
        const temFaccao = myInv.includes('faccao'); // Convite de Facção (Lendário)
        const temArma = myInv.includes('arma');
        const temMascara = myInv.includes('mascara');
        const temFaca = myInv.includes('faca');
        const temJatinho = myInv.includes('jatinho'); // Para fugas
        const temInibidor = myInv.includes('inibidor'); // Para bônus de chance

        // 1. Definição do Cooldown
        // Se for Facção Suprema (Item Lendário), o cooldown é maior porém o lucro é absurdo.
        const cooldown = temFaccao ? 43200000 : 1800000; // 12h para facção, 30min para comum.
        const lastCrime = userData.lastCrime || 0;

        if (now - lastCrime < cooldown) {
            const restante = cooldown - (now - lastCrime);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);
            
            return message.reply(temFaccao 
                ? `⏳ **Operação em andamento!** A Interpol está à tua procura. Espera **${horas}h e ${minutos}m**.` 
                : `⏳ A polícia ainda ronda a zona! Espera **${minutos} minutos**.`);
        }

        // 2. Lógica de Chances e Bônus
        let chanceSucesso = 0.45; // 45% base
        let multiplicador = 1;
        let extrasAtivos = [];

        if (temFaca) { chanceSucesso += 0.07; extrasAtivos.push("🔪"); } 
        if (temArma) { chanceSucesso += 0.15; multiplicador += 0.5; extrasAtivos.push("🔫"); }
        if (temInibidor) { chanceSucesso += 0.10; extrasAtivos.push("📡"); } // Inibidor ajuda a não ser detectado
        if (temDinamite) { chanceSucesso += 0.10; multiplicador += 1.5; extrasAtivos.push("🧨"); }
        
        // Se tiver o Convite de Facção, a chance é altíssima e o multiplicador é de elite
        if (temFaccao) { chanceSucesso = 0.95; multiplicador = 50; extrasAtivos.push("🏴‍☠️"); }

        // 3. Execução do Sorteio
        const sorteio = Math.random();

        if (sorteio < chanceSucesso) {
            // --- SUCESSO ---
            const ganhoBase = Math.floor(Math.random() * 3001) + 2000; 
            const ganhoFinal = Math.floor(ganhoBase * multiplicador);

            userData.money += ganhoFinal;
            userData.lastCrime = now;

            // Consumo de Dinamite (Consumível)
            if (temDinamite) {
                userData.inventory.splice(indexDinamite, 1);
                userData.markModified('inventory');
            }

            await userData.save();

            let msg = `🥷 **O GOLPE FOI UM SUCESSO!**\n\n`;
            if (temFaccao) msg += `👑 Como **Líder de Facção**, orquestraste um assalto a um banco nacional e lucraste **${ganhoFinal.toLocaleString()} moedas**!`;
            else if (temDinamite) msg += `💥 A explosão foi perfeita! Limpaste o cofre e levaste **${ganhoFinal.toLocaleString()} moedas**!`;
            else msg += `💰 Conseguiste escapar pelos becos com **${ganhoFinal.toLocaleString()} moedas**!`;

            if (extrasAtivos.length > 0) msg += `\n> **Equipamento Usado:** ${extrasAtivos.join(' ')}`;
            
            return message.reply(msg);

        } else {
            // --- FALHA ---
            // Se tiver Jatinho (Item Lendário), ele nunca paga multa (fuga perfeita)
            if (temJatinho) {
                userData.lastCrime = now;
                await userData.save();
                return message.reply("👮 **A polícia cercou-te!** Mas tu ligaste o motor do teu **Jatinho Particular** 🛩️ e fugiste para águas internacionais. Sem multas!");
            }

            let multa = 3000;
            if (temMascara) multa = Math.floor(multa * 0.4); // Máscara reduz a multa em 60%
            if (temFaccao) multa = 1000; // Facção paga pouco suborno

            userData.money = Math.max(0, userData.money - multa);
            userData.lastCrime = now;
            await userData.save();

            let msgFalha = `👮 **A CASA CAIU!** Foste apanhado e pagaste **${multa.toLocaleString()} moedas** de fiança.`;
            if (temMascara) msgFalha += `\n🎭 *A tua máscara dificultou a identificação, reduzindo o valor da fiança!*`;

            return message.reply(msgFalha);
        }
    } catch (err) {
        console.error("Erro no crime:", err);
        message.reply("❌ Erro técnico ao processar o crime.");
    }
}
// ==================== 📢 COMANDO ANÚNCIO (SILENCIOSO) ====================
if (command === 'anuncio' || command === 'broadcast') {
    // 1. Verificação de Permissão
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Não tens permissão para usar este comando!');
    }

    // 2. Lógica de Canal e Texto
    const args = message.content.split(' ').slice(1);
    const canalMencionado = message.mentions.channels.first();
    
    // Define o canal: Mencionado ou o Atual
    const canalDestino = canalMencionado || message.channel;
    
    // Define o texto: Se tiver canal, remove a primeira palavra (a menção). Se não, usa tudo.
    const texto = canalMencionado ? args.slice(1).join(' ') : args.join(' ');

    if (!texto) {
        return message.reply('❓ Digite a mensagem após o comando!').then(msg => {
            setTimeout(() => msg.delete(), 5000); // Apaga o erro após 5 segundos
        });
    }

    // 3. Criar a Embed
    const embedAnuncio = new EmbedBuilder()
        .setTitle('📢 Comunicado Oficial')
        .setColor('#F1C40F')
        .setDescription(texto)
        .setThumbnail(message.guild.iconURL())
        .setFooter({ text: `Enviado por: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

    // 4. Execução
    try {
        // Apaga a mensagem do comando do usuário
        if (message.deletable) await message.delete();

        // Envia apenas o anúncio no canal de destino
        await canalDestino.send({ embeds: [embedAnuncio] });

    } catch (err) {
        console.error("Erro no anúncio:", err);
    }
}
    // ==================== 📊 COMANDO STATS ====================
if (command === 'stats' || command === 'botinfo') {
    const uptime = process.uptime();
    const horas = Math.floor(uptime / 3600);
    const minutos = Math.floor((uptime % 3600) / 60);
    const segundos = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
        .setTitle(`📊 Estatísticas do OmniBot`)
        .setColor('#00ff00')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            { name: '⏳ Tempo Online', value: `\`${horas}h ${minutos}m ${segundos}s\``, inline: true },
            { name: '🏠 Servidores', value: `\`${client.guilds.cache.size}\``, inline: true },
            { name: '👥 Usuários', value: `\`${client.users.cache.size}\``, inline: true },
            { name: '⚙️ Memória RAM', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
            { name: '👑 Desenvolvedor', value: `<@1203435676083822712>`, inline: true }
        )
        .setFooter({ text: 'Hospedado via Render.com' })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}
// ==================== ℹ️ COMANDO INFO ====================
if (command === 'info' || command === 'bot') {
    const embed = new EmbedBuilder()
        .setTitle(`ℹ️ Informações do OmniBot`)
        .setColor('#5865F2') // Cor Blurple do Discord
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(
            `Olá! Eu sou o **OmniBot**, um bot focado em economia, diversão e interação social.\n\n` +
            `Fui criado para tornar os servidores mais dinâmicos com sistemas de crimes, facções e uma economia ativa.`
        )
        .addFields(
            { name: '👑 Desenvolvedor', value: `<@1203435676083822712>`, inline: true },
            { name: '💻 Tecnologia', value: `\`Node.js & MongoDB\``, inline: true },
            { name: '🛰️ Host', value: `\`Render (Brasil/EUA)\``, inline: true },
            { 
                name: '🔗 Links Úteis', 
                value: `[Top.gg](https://top.gg/bot/${client.user.id}) | [Suporte](https://discord.gg/
https://discord.gg/WbdkRy9JCM
) | [Adicionar](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)` 
            }
        )
        .setFooter({ text: 'Obrigado por usares o OmniBot!' })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ==================== 🗣️ COMANDO FALAR (OTIMIZADO) ====================
    if (command === 'falar' || command === 'say') {
        // 1. Verificação de Permissão (Apenas Staff com permissão de Gerenciar Mensagens)
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Não tens permissão para fazer o bot falar!');
        }

        // 2. Pegar a mensagem
        const fala = args.join(' ');
        if (!fala) return message.reply('❓ O que queres que eu diga? Ex: `!falar Olá pessoal!`');

        // 3. Filtro de Segurança Anti-Spam de Menções
        // Impede que o bot seja usado para marcar @everyone ou @here se o autor não puder
        if (fala.includes('@everyone') || fala.includes('@here')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return message.reply('❌ Não podes usar o bot para marcar todos!');
            }
        }

        // 4. Apagar a mensagem original do autor e enviar a do bot
        try {
            await message.delete(); // Remove o comando "!falar ..." para ficar limpo
            return message.channel.send(fala);
        } catch (err) {
            // Se o bot não tiver permissão de apagar mensagens, ele apenas envia a fala
            return message.channel.send(fala);
        }
    }
    // ==================== ⚖️ COMANDO AVALIAR (VARIADAS RESPOSTAS) ====================
if (command === 'avaliar' || command === 'rate') {
    const coisaParaAvaliar = args.join(' ');

    if (!coisaParaAvaliar) {
        return message.reply('❓ O que você quer que eu avalie? Exemplo: `!avaliar OmniBot`');
    }

    const nota = Math.floor(Math.random() * 11);

    // Banco de frases por categoria de nota
    const frases = {
        baixa: [
            "Sinceramente? Nota 0. Nem sei o que dizer...",
            "Isso é bem ruim, nota 1. Melhore, por favor.",
            "Decepcionante... esperava muito mais. Nota 2.",
            "Nota 3. Tem gosto para tudo, eu acho..."
        ],
        media: [
            "É... razoável. Nota 4.",
            "Nota 5. Está exatamente na média, nada de especial.",
            "Nota 6. É passável, mas falta um 'tchan'.",
            "Até que é legalzinho. Nota 7."
        ],
        alta: [
            "Gostei bastante! Nota 8. Muito bom!",
            "Uau, nota 9! Tem muito potencial!",
            "Simplesmente perfeito! Nota 10! Não mudaria nada!",
            "Incrível! 10/10! Você tem muita sorte de ter isso!"
        ]
    };

    let respostaFinal = "";
    let emoji = "";

    // Lógica para escolher a frase baseada na nota
    if (nota <= 3) {
        respostaFinal = frases.baixa[Math.floor(Math.random() * frases.baixa.length)];
        emoji = "🤔";
    } else if (nota <= 7) {
        respostaFinal = frases.media[Math.floor(Math.random() * frases.media.length)];
        emoji = "😐";
    } else {
        respostaFinal = frases.alta[Math.floor(Math.random() * frases.alta.length)];
        emoji = "🤩";
    }

    return message.reply(`${emoji} | A minha nota para \`${coisaParaAvaliar}\` é... **${nota}**! ${respostaFinal}`);
}
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// ==================== 👤 COMANDO PERFIL (VERSÃO FINAL OTIMIZADA) ====================
if (command === 'perfil' || command === 'p') {
    const aguarde = await message.reply("🎨 A desenhar o teu perfil...");

    try {
        const alvo = message.mentions.users.first() || message.author;
        let dados = await User.findOne({ userId: alvo.id }) || await User.create({ userId: alvo.id });

        // --- LÓGICA DE NÍVEL & PROFISSÃO ---
        const totalTrabalhos = dados.workCount || 0;
        const metas = [30, 70, 130, 200, 300, 420, 550, 700, 850, 1000];
        let nivelIdx = metas.findIndex(m => totalTrabalhos < m);
        if (nivelIdx === -1) nivelIdx = 9;
        
        const profs = (dados.cargo && dados.cargo.includes("Facção"))
            ? ["Olheiro", "Aviãozinho", "Vendedor", "Segurança", "Cobrador", "Gerente", "Fornecedor", "Conselheiro", "Braço Direito", "Líder 🏴‍☠️"]
            : ["Estagiário", "Auxiliar", "Vendedor", "Analista", "Supervisor", "Gerente", "Diretor", "Vice-Presidente", "Sócio", "CEO 💎"];
        
        const profissaoNome = profs[nivelIdx];
        const xpNecessario = metas[nivelIdx] || 1200;
        const porcentagem = Math.min((totalTrabalhos / xpNecessario), 1);

        // --- CANVAS SETUP ---
        const canvas = createCanvas(900, 550); 
        const ctx = canvas.getContext('2d');

        // --- BACKGROUND (Dinâmico) ---
        // Se o usuário não tiver fundo, usa o padrão azul escuro
        const linkFundo = (dados.bg && dados.bg.startsWith('http')) ? dados.bg : "https://i.imgur.com/yG1r44O.jpeg";
        try {
            const imageBackground = await loadImage(linkFundo);
            ctx.drawImage(imageBackground, 0, 0, 900, 550);
        } catch (e) {
            ctx.fillStyle = "#1a1a1a"; 
            ctx.fillRect(0, 0, 900, 550);
        }

        // Overlay Escuro Arredondado para dar leitura ao texto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath(); 
        ctx.roundRect(20, 20, 860, 510, 25); 
        ctx.fill();

        // --- AVATAR CIRCULAR ---
        const avatarImg = await loadImage(alvo.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.save();
        ctx.beginPath(); 
        ctx.arc(140, 140, 90, 0, Math.PI * 2); 
        ctx.clip();
        ctx.drawImage(avatarImg, 50, 50, 180, 180);
        ctx.restore();

        // --- FUNÇÃO AJUSTE DE FONTE ---
        const aplicarFonteDinamica = (context, text, maxWidth, baseSize) => {
            let size = baseSize;
            do {
                context.font = `bold ${size}px sans-serif`;
                size--;
            } while (context.measureText(text).width > maxWidth && size > 10);
            return context.font;
        };

        // --- COLUNA ESQUERDA (Identidade) ---
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        
        // Nome com ajuste automático (Não passa de 310px)
        ctx.font = aplicarFonteDinamica(ctx, alvo.username.toUpperCase(), 310, 28);
        ctx.fillText(alvo.username.toUpperCase(), 50, 280); 

        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(profissaoNome, 50, 315);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Status: ${dados.cargo || "Civil"}`, 50, 355);
        ctx.fillText(`ID: ${alvo.id}`, 50, 385);

        // --- COLUNA DIREITA (Economia & Social) ---
        const xInfo = 390; // Um pouco mais para a direita para segurança

        // Saldo Total
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText("💰 SALDO TOTAL", xInfo, 85);
        
        ctx.font = 'bold 38px sans-serif';
        ctx.fillStyle = '#00FF00';
        const total = (dados.money || 0) + (dados.bank || 0) + (dados.dirtyMoney || 0);
        ctx.fillText(`${total.toLocaleString()} moedas`, xInfo, 130);

        // Detalhamento Bancário
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`💵 Carteira: ${(dados.money || 0).toLocaleString()}`, xInfo, 175);
        ctx.fillText(`🏦 Banco: ${(dados.bank || 0).toLocaleString()}`, xInfo + 220, 175);

        // Relacionamento
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText("❤️ RELACIONAMENTO", xInfo, 245);
        
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#FF69B4';
        let txtRel = "Solteiro(a)";
        if (dados.marriedWith) {
            try {
                const conjuge = await client.users.fetch(dados.marriedWith);
                txtRel = `Casado(a) com ${conjuge.username}`;
            } catch { txtRel = "Casado(a)"; }
        }
        ctx.fillText(txtRel, xInfo, 280);
        ctx.fillText(`✨ Afinidade: ${dados.affinity || 0}`, xInfo, 310);

        // Mochila
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText("🎒 MOCHILA (ITENS)", xInfo, 375);
        
        const inv = (dados.inventory && dados.inventory.length > 0) 
            ? [...new Set(dados.inventory)].slice(0, 5).join(' • ') 
            : "Vazia";
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(inv, xInfo, 410);

        // --- BARRA DE PROGRESSO (Final) ---
        ctx.fillStyle = '#333333';
        ctx.beginPath(); ctx.roundRect(50, 460, 800, 40, 15); ctx.fill();
        
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath(); ctx.roundRect(50, 460, 800 * porcentagem, 40, 15); ctx.fill();
        
        ctx.textAlign = 'center'; 
        ctx.fillStyle = '#ffffff'; 
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`PROGRESSO DE CARREIRA: ${totalTrabalhos} / ${xpNecessario} TRABALHOS`, 450, 487);

        // --- ENVIO ---
        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: 'perfil.png' });
        
        if (aguarde) await aguarde.delete().catch(() => {});
        return message.reply({ files: [attachment] });

    } catch (error) {
        console.error("Erro Perfil:", error);
        if (aguarde) aguarde.edit("❌ Erro ao gerar a imagem do perfil.");
    }
}
// ==================== 📖 GUIA COMPLETO DE CONQUISTAS ====================
if (command === 'guia') {
    try {
        const { EmbedBuilder } = require('discord.js');

        const embedGuia = new EmbedBuilder()
            .setTitle("📖 Dicionário Completo de Conquistas")
            .setColor("#F1C40F")
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/190/190411.png')
            .setDescription("Aqui estão todos os objetivos que podes alcançar no servidor:")
            .addFields(
                { 
                    name: "💰 Riqueza & Finanças", 
                    value: "• **Iniciante Rico:** 100k totais\n• **Milionário:** 1M totais\n• **Magnata:** 10M totais\n• **Império:** 100M totais\n• **Elon Musk:** 1 Bilhão\n• **Investidor:** 50M no banco"
                },
                { 
                    name: "🛠️ Trabalho & Elite", 
                    value: "• **Proletário:** 50 trabalhos\n• **Viciado:** 500 trabalhos\n• **Lenda:** 1.000 trabalhos\n• **Workaholic:** 5.000 trabalhos\n• **Operador:** 20 missões\n• **Veterano:** 100 missões"
                },
                { 
                    name: "💍 Amor & Social", 
                    value: "• **Casado:** Casar com alguém\n• **Amor Eterno:** 500 afinidade\n• **Alma Gêmea:** 2.000 afinidade\n• **Destino:** 10.000 afinidade"
                },
                { 
                    name: "🏴‍☠️ Submundo", 
                    value: "• **Assassino:** 10 contratos\n• **Hitman:** 50 contratos\n• **Criminoso:** Entrar na Facção\n• **Primeiro Sangue:** 1º !kill\n• **Ladrão de Galinha:** 1º !rob"
                },
                { 
                    name: "🎨 Coleção & Eventos", 
                    value: "• **Esteta:** Ter 1 fundo\n• **Colecionador:** Ter 10 fundos\n• **Completista:** Todos os 31 fundos\n• **Dono da Foquinha:** Comprar ID 31\n• **O Robo (CR7):** Comprar ID 21\n• **Rei dos Piratas (Luffy):** Comprar ID 7"
                },
                { 
                    name: "🎭 Temáticos & Especiais", 
                    value: "• **Feiticeiro:** Fundos Jujutsu (1, 2 ou 3)\n• **Sobrevivente:** Fundos Stranger Things (13, 14 ou 15)\n• **Arquiteto:** Fundos Minecraft (16, 17 ou 18)\n• **Dante/Vergil:** Fundos DMC (22, 23 ou 24)\n• **Mestre Jojo:** Fundos Jojo (25, 26 ou 27)\n• **Na Sarjeta:** Ter 0 moedas\n• **Minimalista:** 500k e 0 fundos"
                }
            )
            .setFooter({ text: "Dica: Usa !conquistas para veres o teu progresso!" })
            .setTimestamp();

        return message.reply({ embeds: [embedGuia] });

    } catch (error) {
        console.error("ERRO NO GUIA:", error);
        // Verifica se o erro aparece no teu terminal (console)
    }
}
// ==================== 🏆 COMANDO CONQUISTAS ====================
if (command === 'conquistas' || command === 'achievements' || command === 'badges') {
    try {
        const totalDinheiro = (userData.money || 0) + (userData.bank || 0);
        const conquistas = [];

        // --- LÓGICA DE VERIFICAÇÃO ---
        
        // Conquistas de Economia
        if (totalDinheiro >= 100000) conquistas.push("💰 **Iniciante Rico:** Acumulou 100k moedas.");
        if (totalDinheiro >= 1000000) conquistas.push("💎 **Milionário:** Acumulou 1 milhão de moedas.");
        if (totalDinheiro >= 10000000) conquistas.push("🏰 **Magnata:** Acumulou 10 milhões de moedas.");

        // Conquistas de Trabalho/Missões
        if ((userData.workCount || 0) >= 50) conquistas.push("⚒️ **Proletário:** Trabalhou 50 vezes.");
        if ((userData.missionCount || 0) >= 20) conquistas.push("🎖️ **Operador:** Concluiu 20 missões de elite.");

        // Conquistas de Relacionamento
        if (userData.marriedWith) conquistas.push("💍 **Casado:** Encontrou a sua cara metade.");
        if ((userData.affinity || 0) >= 500) conquistas.push("❤️ **Amor Eterno:** Chegou a 500 de afinidade.");

        // Conquistas de Crime/Submundo
        if ((userData.jobsDone || 0) >= 10) conquistas.push("🎯 **Assassino:** Concluiu 10 contratos com sucesso.");
        if (userData.cargo === "Membro da Facção") conquistas.push("🏴‍☠️ **Criminoso:** Entrou oficialmente para o submundo.");

        // --- CONSTRUÇÃO DA EMBED ---
        const embed = new EmbedBuilder()
            .setTitle(`🏆 Conquistas de ${message.author.username}`)
            .setColor('#f1c40f')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/190/190411.png') // Ícone de troféu
            .setDescription(conquistas.length > 0 
                ? `Você já desbloqueou **${conquistas.length}** conquistas!\n\n${conquistas.join('\n')}` 
                : "Você ainda não desbloqueou nenhuma conquista. Continue jogando!")
            .setFooter({ text: 'Continue evoluindo para ganhar mais medalhas!' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Erro no comando conquistas:", error);
        return message.reply("❌ Erro ao carregar as tuas conquistas.");
    }
}
// ==================== 🖼️ LOJA DE BACKGROUNDS (TEXTO LIMPO) ====================
if (command === 'background' || command === 'fundo' || command === 'bg') {
    const fundos = {
        // --- JUJUTSU KAISEN ---
        "1": { nome: "Itadori Yuji", preco: 40000, url: "https://i.imgur.com/jFG9qEQ.jpeg" },
        "2": { nome: "Gojo Satoru", preco: 100000, url: "https://i.imgur.com/Z9Abixe.jpeg" },
        "3": { nome: "Sukuna", preco: 80000, url: "https://i.imgur.com/befNGoP.jpeg" },

        // --- CHAINSAW MAN ---
        "4": { nome: "Denji", preco: 45000, url: "https://i.imgur.com/MKCqrgl.jpeg" },
        "5": { nome: "Makima", preco: 90000, url: "https://i.imgur.com/DvfpArD.jpeg" },
        "6": { nome: "Power", preco: 50000, url: "https://i.imgur.com/ff806Ce.jpeg" },

        // --- ONE PIECE ---
        "7": { nome: "Luffy Gear 5", preco: 120000, url: "https://i.imgur.com/qXe3vXP.jpeg" },
        "8": { nome: "Roronoa Zoro", preco: 85000, url: "https://i.imgur.com/hYxWRXp.jpeg" },
        "9": { nome: "Portgas D. Ace", preco: 70000, url: "https://i.imgur.com/wuMIXgu.jpeg" },

        // --- ARCANE / LOL ---
        "10": { nome: "Jinx", preco: 60000, url: "https://i.imgur.com/8c8LS69.jpeg" },
        "11": { nome: "Violet", preco: 60000, url: "https://i.imgur.com/hLGa15b.jpeg" },
        "12": { nome: "Ekko", preco: 55000, url: "https://i.imgur.com/5uA25cu.jpeg" },

        // --- STRANGER THINGS ---
        "13": { nome: "Eleven", preco: 75000, url: "https://i.imgur.com/RsLB4q1.jpeg" },
        "14": { nome: "Eddie Munson", preco: 70000, url: "https://i.imgur.com/CWkmnDz.jpeg" },
        "15": { nome: "Vecna", preco: 95000, url: "https://i.imgur.com/tE8D06M.jpeg" },

        // --- MINECRAFT ---
        "16": { nome: "Steve & Alex", preco: 30000, url: "https://i.imgur.com/Dr8z0JQ.jpeg" },
        "17": { nome: "Creeper", preco: 35000, url: "https://i.imgur.com/EldsLKt.jpeg" },
        "18": { nome: "Enderman", preco: 40000, url: "https://i.imgur.com/l2ZuN7C.jpeg" },

        // --- FUTEBOL ---
        "19": { nome: "CR7 Real Madrid", preco: 80000, url: "https://i.imgur.com/XFYwLzk.jpeg" },
        "20": { nome: "CR7 Portugal", preco: 90000, url: "https://i.imgur.com/OOMIbu6.jpeg" },
        "21": { nome: "CR7 LENDA", preco: 150000, url: "https://i.imgur.com/VYRPaP9.jpeg" },

        // --- DEVIL MAY CRY ---
        "22": { nome: "Dante", preco: 110000, url: "https://i.imgur.com/BK3uoB2.jpeg" },
        "23": { nome: "Vergil", preco: 130000, url: "https://i.imgur.com/alXjYpk.jpeg" },
        "24": { nome: "Nero", preco: 80000, url: "https://i.imgur.com/rfPiveO.jpeg" },

        // --- JOJO ---
        "25": { nome: "Joseph Joestar", preco: 15000, url: "https://i.imgur.com/lkvWJmE.jpeg" },
        "26": { nome: "Jean Pierre Polnareff", preco: 15000, url: "https://i.imgur.com/hGNl3x9.jpeg" },
        "27": { nome: "Iggy", preco: 15000, url: "https://i.imgur.com/iMfIlDY.jpeg" },

        // --- NOVAS ATUALIZAÇÕES ---
        "28": { nome: "Travis", preco: 50000, url: "https://i.imgur.com/6Rbe2OL.jpeg" },
        "29": { nome: "Donovan", preco: 50000, url: "https://i.imgur.com/wFco1Kz.jpeg" },
        "30": { nome: "Travis & Donovan", preco: 85000, url: "https://i.imgur.com/1VkMQ7z.jpeg" },
        "31": { nome: "Foquinha :3", preco: 200000, url: "https://i.imgur.com/QWn6PiK.png" },
        "32": { nome: "Bunny 🐰", preco: 150000, url: "https://i.imgur.com/ybc3vvV.png" }
    };

    let dados = await User.findOne({ userId: message.author.id });
    if (!dados) dados = await User.create({ userId: message.author.id });

    const opcao = args[0];

    if (!opcao) {
        let listaFormatada = Object.entries(fundos)
            .map(([id, info]) => `\`[${id}]\` **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\``)
            .join("\n");

        const embedLoja = new EmbedBuilder()
            .setTitle("🏪 Loja de Planos de Fundo")
            .setColor("#00FFFF") 
            .setDescription("Personalize seu `!perfil`!\nPara comprar: `!fundo [número]`\n\n" + listaFormatada)
            .setFooter({ text: "Use !meusfundos para ver sua coleção!" });

        return message.reply({ embeds: [embedLoja] });
    }

    const fundoEscolhido = fundos[opcao];
    if (!fundoEscolhido) return message.reply("❌ Código não encontrado na loja.");

    if (dados.bgInventory && dados.bgInventory.includes(opcao)) {
        dados.bg = fundoEscolhido.url;
        await dados.save();
        return message.reply(`✨ Você já tem **${fundoEscolhido.nome}**! Ele foi equipado.`);
    }

    const saldoTotal = (dados.money || 0) + (dados.bank || 0);
    if (saldoTotal < fundoEscolhido.preco) return message.reply("❌ Você não tem moedas suficientes.");

    if (dados.money >= fundoEscolhido.preco) {
        dados.money -= fundoEscolhido.preco;
    } else {
        const restante = fundoEscolhido.preco - dados.money;
        dados.money = 0;
        dados.bank -= restante;
    }

    dados.bg = fundoEscolhido.url;
    if (!dados.bgInventory) dados.bgInventory = [];
    dados.bgInventory.push(opcao);
    await dados.save();

    return message.reply(`✅ Você comprou e equipou o fundo **${fundoEscolhido.nome}**!`);
}
// ==================== 🖼️ COMANDO MEUS FUNDOS ATUALIZADO (V3 - BUNNY INCLUÍDO) ====================
if (command === 'meusfundos' || command === 'bgs') {
    try {
        let dadosPerfil = await User.findOne({ userId: message.author.id });
        if (!dadosPerfil) dadosPerfil = await User.create({ userId: message.author.id });

        const fundos = {
            "1": { nome: "Itadori Yuji", url: "https://i.imgur.com/jFG9qEQ.jpeg" },
            "2": { nome: "Gojo Satoru", url: "https://i.imgur.com/Z9Abixe.jpeg" },
            "3": { nome: "Sukuna", url: "https://i.imgur.com/befNGoP.jpeg" },
            "4": { nome: "Denji (Chainsaw)", url: "https://i.imgur.com/MKCqrgl.jpeg" },
            "5": { nome: "Makima", url: "https://i.imgur.com/DvfpArD.jpeg" },
            "6": { nome: "Power", url: "https://i.imgur.com/ff806Ce.jpeg" },
            "7": { nome: "Luffy Gear 5", url: "https://i.imgur.com/qXe3vXP.jpeg" },
            "8": { nome: "Roronoa Zoro", url: "https://i.imgur.com/hYxWRXp.jpeg" },
            "9": { nome: "Portgas D. Ace", url: "https://i.imgur.com/wuMIXgu.jpeg" },
            "10": { nome: "Jinx", url: "https://i.imgur.com/8c8LS69.jpeg" },
            "11": { nome: "Violet", url: "https://i.imgur.com/hLGa15b.jpeg" },
            "12": { nome: "Ekko", url: "https://i.imgur.com/5uA25cu.jpeg" },
            "13": { nome: "Eleven", url: "https://i.imgur.com/RsLB4q1.jpeg" },
            "14": { nome: "Eddie Munson", url: "https://i.imgur.com/CWkmnDz.jpeg" },
            "15": { nome: "Vecna", url: "https://i.imgur.com/tE8D06M.jpeg" },
            "16": { nome: "Steve & Alex", url: "https://i.imgur.com/Dr8z0JQ.jpeg" },
            "17": { nome: "Creeper", url: "https://i.imgur.com/EldsLKt.jpeg" },
            "18": { nome: "Enderman", url: "https://i.imgur.com/l2ZuN7C.jpeg" },
            "19": { nome: "CR7 Real Madrid", url: "https://i.imgur.com/XFYwLzk.jpeg" },
            "20": { nome: "CR7 Portugal", url: "https://i.imgur.com/OOMIbu6.jpeg" },
            "21": { nome: "CR7 LENDA", url: "https://i.imgur.com/VYRPaP9.jpeg" },
            "22": { nome: "Dante", url: "https://i.imgur.com/BK3uoB2.jpeg" },
            "23": { nome: "Vergil", url: "https://i.imgur.com/alXjYpk.jpeg" },
            "24": { nome: "Nero", url: "https://i.imgur.com/rfPiveO.jpeg" },
            "25": { nome: "Joseph Joestar", url: "https://i.imgur.com/lkvWJmE.jpeg" },
            "26": { nome: "Jean Pierre Polnareff", url: "https://i.imgur.com/hGNl3x9.jpeg" },
            "27": { nome: "Iggy (JoJo)", url: "https://i.imgur.com/iMfIlDY.jpeg" },
            "28": { nome: "Travis", url: "https://i.imgur.com/6Rbe2OL.jpeg" },
            "29": { nome: "Donovan", url: "https://i.imgur.com/wFco1Kz.jpeg" },
            "30": { nome: "Travis & Donovan", url: "https://i.imgur.com/1VkMQ7z.jpeg" },
            "31": { nome: "Foquinha :3", url: "https://i.imgur.com/QWn6PiK.png" },
            "32": { nome: "Bunny 🐰", url: "https://i.imgur.com/ybc3vvV.png" } // [NOVO ITEM]
        };

        // --- SOLUÇÃO: Remover IDs duplicados e garantir que existem na lista de fundos ---
        const bgsRaw = dadosPerfil.bgInventory || [];
        const bgsComprados = [...new Set(bgsRaw)].filter(id => fundos[id]);

        if (bgsComprados.length === 0) {
            return message.reply("❌ Você não tem nenhum fundo na sua coleção! Compre um na loja usando `!fundo`.");
        }

        const embed = new EmbedBuilder()
            .setTitle("🖼️ Sua Coleção de Backgrounds")
            .setColor("#00FF00")
            .setDescription("Selecione abaixo o fundo que deseja equipar no seu perfil.")
            .setFooter({ text: `Você possui ${bgsComprados.length} fundos.` });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('selecionar_fundo')
            .setPlaceholder('Escolha um fundo para equipar...')
            .addOptions(
                bgsComprados
                    .slice(0, 25) // Limite do Discord
                    .map(id => ({
                        label: fundos[id].nome,
                        value: id,
                        emoji: '🖼️'
                    }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const msg = await message.reply({ embeds: [embed], components: [row] });

        const filter = i => i.customId === 'selecionar_fundo' && i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            const selecionado = i.values[0];
            const infoFundo = fundos[selecionado];

            if (infoFundo) {
                // Atualização segura para evitar conflitos de versão
                await User.findOneAndUpdate(
                    { userId: message.author.id },
                    { $set: { bg: infoFundo.url } },
                    { new: true }
                );
                
                await i.update({ 
                    content: `✅ Sucesso! O fundo **${infoFundo.nome}** foi equipado no seu perfil.`, 
                    embeds: [], 
                    components: [] 
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                msg.edit({ content: '⏳ O tempo para escolher acabou.', components: [] }).catch(() => {});
            }
        });

    } catch (error) {
        console.error("Erro no MeusFundos:", error);
        message.reply("❌ Erro ao abrir sua coleção.");
    }
}
// ==================== 🎁 COMANDO DAR ITEM (TRANSFERÊNCIA) ====================
if (command === 'dar') {
    try {
        const alvo = message.mentions.users.first();
        const itemNome = args[1]?.toLowerCase(); // O nome do item (ex: dinamite)
        const quantidade = parseInt(args[2]) || 1; // A quantidade (ex: 1)

        // 1. Verificações Básicas
        if (!alvo) return message.reply("❌ Precisas marcar (@) alguém para dar um item.");
        if (alvo.id === message.author.id) return message.reply("❌ Não podes dar itens a ti mesmo.");
        if (!itemNome) return message.reply("❌ Escreve o nome do item. Ex: `!dar @user dinamite 1`.");
        if (quantidade <= 0) return message.reply("❌ A quantidade deve ser pelo menos 1.");

        // 2. Verifica se o remetente tem o item e a quantidade
        const inventoryAutor = userData.inventory || [];
        const possuiQuantidade = inventoryAutor.filter(i => i === itemNome).length;

        if (possuiQuantidade < quantidade) {
            return message.reply(`❌ Não tens \`${itemNome}\` suficiente (Tens: ${possuiQuantidade}).`);
        }

        // 3. Busca/Cria os dados do alvo no banco
        let targetData = await User.findOne({ userId: alvo.id });
        if (!targetData) {
            targetData = await User.create({ userId: alvo.id });
        }

        // 4. Lógica de Troca (Remover de um e dar ao outro)
        
        // Remove a quantidade exata do seu inventário
        for (let i = 0; i < quantidade; i++) {
            const index = inventoryAutor.indexOf(itemNome);
            if (index > -1) {
                inventoryAutor.splice(index, 1);
            }
        }
        userData.inventory = inventoryAutor;

        // Adiciona ao inventário do alvo
        if (!targetData.inventory) targetData.inventory = [];
        for (let i = 0; i < quantidade; i++) {
            targetData.inventory.push(itemNome);
        }

        // 5. Salva ambos no banco de dados
        await userData.save();
        await targetData.save();

        return message.reply(`✅ Entregaste \`${itemNome} x${quantidade}\` para **${alvo.username}** com sucesso!`);

    } catch (error) {
        console.error("Erro no comando dar:", error);
        return message.reply("❌ Ocorreu um erro ao tentar transferir o item.");
    }
}
// ==================== 🏪 COMANDO !LOJA (EXIBIÇÃO LEGAL) ====================
if (command === 'loja' || command === 'shop') {

    // Filtra apenas os itens da categoria 'legal' do seu objeto lojaItens
    const itensLegais = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "legal")
        .map(([id, info]) => {
            // Emojis dinâmicos baseados no ID (ou você pode usar info.emoji se tiver no seu objeto)
            const emojis = { "escudo": "🛡️", "picareta": "⛏️", "computador": "💻", "camera": "📹", "celular": "📱", "fundo": "🖼️" };
            const emoji = emojis[id] || "📦";

            const status = info.estoque > 0 
                ? `🟢 Stock: **${info.estoque}**` 
                : "🔴 **ESGOTADO**";

            // Formatação do item
            return `${emoji} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    // Construção do Embed
    const embed = {
        title: "🏪 Loja Oficial do OmniBot",
        color: 0xF1C40F, // Amarelo
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' },
        description: "Bem-vindo à vitrine oficial! Aqui encontras equipamentos para trabalhar e proteger o teu património legalmente.\n\n" + 
                     (itensLegais.length > 0 ? itensLegais.join('\n\n') : "A loja está vazia no momento."),
        footer: { text: "Usa !comprar <id> para adquirir um item." },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
}
// ==================== 🌑 COMANDO !SUBMUNDO (MERCADO NEGRO) ====================
if (command === 'submundo' || command === 'blackmarket') {
    
    // Emojis específicos para o submundo
    const emojis = { 
        "dinamite": "🧨", 
        "faca": "🔪", 
        "arma": "🔫", 
        "passaporte": "🎫", 
        "faccao": "🏴",
        "chip": "💾",
        "mascara": "🎭",
        "inibidor": "📡"
    };

    // Filtra apenas os itens da categoria 'submundo' do seu objeto lojaItens
    const itensIlegais = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "submundo")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Disponível: **${info.estoque}**` 
                : "🔴 **ESGOTADO**";

            // Destaque para o item de entrada na facção
            const prefixo = id === "faccao" ? "⭐ **CONTRATO**:" : "💀";

            // Formatação: Nome, Preço, Descrição e Comando de compra
            return `${emojis[id] || "📦"} ${prefixo} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    // Construção do Embed estilo "Deep Web"
    const embedSub = {
        title: '🕵️ Mercado Negro - Conexão Submundo',
        color: 0x1a1a1a, // Preto profundo
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/1000/1000966.png' },
        description: "Cuidado onde pisas. Estes equipamentos são para profissionais que dominam as sombras e não temem a lei.\n\n" + 
                     (itensIlegais.length > 0 ? itensIlegais.join('\n\n') : "O mercado está em silêncio... (Sem itens disponíveis)"),
        footer: { text: "Aviso: A posse destes itens pode atrair atenção indesejada da polícia." },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embedSub] });
}
// ==================== 💎 LOJA DE LUXO (STATUS & OSTENTAÇÃO) ====================
if (command === 'luxo' || command === 'vip') {
    
    // Emojis exclusivos para a categoria luxo
    const emojisLuxo = { 
        "anel": "💍", 
        "mansao": "🏰", 
        "carro": "🏎️", 
        "relogio": "⌚", 
        "iate": "🛥️" 
    };

    // Filtra apenas os itens da categoria 'luxo' do seu objeto lojaItens
    const itensLuxo = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "luxo")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Disponível: **${info.estoque}**` 
                : "🔴 **LIMITADO**";

            // Estética de alto padrão
            return `${emojisLuxo[id] || "✨"} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embedLuxo = {
        title: '💎 Boutique de Luxo - OmniBot Exclusive',
        color: 0x00FFFF, // Ciano Diamante
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/261/261778.png' },
        description: "Bem-vindo à área VIP. Aqui, o dinheiro não compra apenas itens, compra poder e legado.\n\n" + 
                     (itensLuxo.length > 0 ? itensLuxo.join('\n\n') : "Nenhum item de luxo disponível no momento."),
        footer: { text: "Itens de luxo aumentam a sua afinidade e prestígio no !perfil." },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embedLuxo] });
}
// ==================== 🌸 COMANDO !FLORES / !PRESENTES ====================
if (command === 'flores' || command === 'presentes' || command === 'floricultura') {
    
    // Emojis específicos para presentes
    const emojisFlores = { 
        "rosa": "🌹", 
        "buque": "💐", 
        "chocolate": "🍫", 
        "urso": "🧸", 
        "joia": "💎" 
    };

    // Filtra apenas os itens da categoria 'presente' do seu objeto lojaItens
    const itensPresente = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "presente")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Disponível: **${info.estoque}**` 
                : "🔴 **ESGOTADO**";

            return `${emojisFlores[id] || "🎁"} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embedFlores = {
        title: '🌸 Floricultura & Mimos - OmniBot',
        color: 0xFF69B4, // Rosa Choque
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/346/346167.png' },
        description: "Surpreende o teu cônjuge! Presentes aumentam a afinidade e garantem bónus em assaltos em dupla.\n\n" + 
                     (itensPresente.length > 0 ? itensPresente.join('\n\n') : "As flores murcharam... (Sem stock)"),
        footer: { text: "Usa !presentear <@user> <item> para enviar um presente!" },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embedFlores] });
}
// ==================== ⚡ COMANDO !TECH (UPGRADES CIBERNÉTICOS) ====================
if (command === 'tech' || command === 'cibernetica') {
    
    // Emojis específicos para a categoria Tech
    const emojisTech = { 
        "chip": "💾", 
        "bateria": "🔋", 
        "visor": "🥽", 
        "virus": "🦠" 
    };

    // Filtra apenas os itens da categoria 'tech' do seu lojaItens
    const itensTech = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "tech")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Sistema: **Online (${info.estoque})**` 
                : "🔴 **OFFLINE (ESGOTADO)**";

            // Formatação com estilo Hacker/Tech
            return `${emojisTech[id] || "⚙️"} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embedTech = {
        title: '⚡ Laboratório Cibernético - OmniBot',
        color: 0x00FF00, // Verde Matrix/Tech
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png' },
        description: "Bem-vindo ao futuro. Melhore a sua eficiência neural e domine os sistemas do servidor com tecnologia de ponta.\n\n" + 
                     (itensTech.length > 0 ? itensTech.join('\n\n') : "O sistema está em manutenção..."),
        footer: { text: "Dica: O Chip Neural é um upgrade passivo que aumenta seus lucros!" },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embedTech] });
}
// ==================== 💎 COMANDO !RELIQUIAS (ITENS LENDÁRIOS) ====================
if (command === 'reliquias' || command === 'lendarios' || command === 'vip') {
    
    // Emojis exclusivos para a categoria Lendária
    const emojisLendarios = { 
        "faccao": "🏴‍☠️", 
        "iate": "🛥️", 
        "jatinho": "🛩️", 
        "relogio": "⌚", 
        "coroa": "👑" 
    };

    // Filtra apenas os itens da categoria 'lendario' do seu lojaItens
    const itensLendarios = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "lendario")
        .map(([id, info]) => {
            // Verifica se o item é único (estoque 1) ou limitado
            const status = info.estoque > 0 
                ? `✨ Disponível: **${info.estoque} unidade(s)**` 
                : "🔒 **ITEM COLECIONADO (ESGOTADO)**";

            // Estética de alto luxo
            return `${emojisLendarios[id] || "⭐"} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> ✨ *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embedLendario = {
        title: '💎 Cofre de Relíquias Lendárias - OmniBot',
        color: 0xFFD700, // Dourado Ouro
        thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/261/261778.png' },
        description: "Apenas para os soberanos do servidor. Estes itens não são simples objetos, são símbolos de poder absoluto e legado.\n\n" + 
                     (itensLendarios.length > 0 ? itensLendarios.join('\n\n') : "O cofre está vazio... Alguém já levou tudo!"),
        footer: { text: "Aviso: A posse destes itens concede prestígio eterno no seu !perfil." },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embedLendario] });
}
// ==================== 🛒 COMANDO COMPRAR (INTEGRADO COM TODAS AS LOJAS) ====================
if (command === 'comprar' || command === 'buy') {
    const itemID = args[0]?.toLowerCase();

    // 1. Verificações Iniciais
    if (!itemID) return message.reply("🛒 **O que desejas comprar?** Digita `!comprar <id-do-item>`.\nExemplo: `!comprar picareta` ou `!comprar cafe`.");

    const itemInfo = lojaItens[itemID];
    if (!itemInfo) {
        return message.reply("❌ Esse item não existe! Consulta a `!loja`, `!submundo`, `!tech` ou `!flores`.");
    }

    // 2. Lógica de Itens Únicos vs Consumíveis
    // Adicionei os novos itens (presentes e tech) que podem ser comprados várias vezes
    const consumiveis = ['cafe', 'dinamite', 'bateria', 'flores', 'chocolate', 'virus', 'lockpick', 'rosa', 'buque', 'urso'];
    
    if (!consumiveis.includes(itemID) && userData.inventory.includes(itemID)) {
        return message.reply(`📦 Tu já possuis um(a) **${itemInfo.nome}**! Não precisas de comprar outro.`);
    }

    // 3. Verificação de Estoque
    if (itemInfo.estoque <= 0) {
        return message.reply(`❌ O item **${itemInfo.nome}** está esgotado! Volta mais tarde.`);
    }

    // 4. Verificação de Saldo
    if (userData.money < itemInfo.preco) {
        const faltam = itemInfo.preco - userData.money;
        return message.reply(`💸 Não tens dinheiro suficiente! Faltam **${faltam.toLocaleString()}** moedas.`);
    }

    // 5. PROCESSAMENTO DA COMPRA
    try {
        userData.money -= itemInfo.preco;
        
        // Garante que o inventário existe e adiciona o item
        if (!userData.inventory) userData.inventory = [];
        userData.inventory.push(itemID);

        // Reduz o estoque global
        itemInfo.estoque -= 1;

        // Salva no Banco de Dados (userData.markModified é vital para arrays no Mongoose)
        userData.markModified('inventory');
        await userData.save();

        // 6. Resposta Visualmente Adaptada por Categoria
        let emoji = "🛍️";
        let local = "na Loja Oficial";

        if (itemInfo.categoria === 'submundo') { emoji = "🌑"; local = "no Mercado Negro"; }
        if (itemInfo.categoria === 'tech') { emoji = "⚡"; local = "no Laboratório Tech"; }
        if (itemInfo.categoria === 'presente' || itemInfo.categoria === 'luxo') { emoji = "💎"; local = "na Boutique de Luxo"; }
        if (itemInfo.categoria === 'lendario') { emoji = "👑"; local = "no Cofre de Relíquias"; }

        return message.reply(
            `${emoji} **COMPRA EFETUADA!**\n\n` +
            `📦 **Item:** ${itemInfo.nome}\n` +
            `💰 **Custo:** \`${itemInfo.preco.toLocaleString()} moedas\`\n` +
            `📍 **Local:** Realizada com sucesso ${local}.\n\n` +
            `*Usa \`!inventario\` para veres a tua mochila!*`
        );

    } catch (err) {
        console.error("Erro ao comprar item:", err);
        return message.reply("❌ Ocorreu um erro técnico ao processar a tua compra.");
    }
}
// ==================== 📦 COMANDO USAR (VERSÃO FINAL INTEGRADA) ====================
if (command === 'usar' || command === 'use') {
    const itemID = args[0]?.toLowerCase();
    
    if (!itemID) return message.reply("❌ Diz qual item queres usar! Ex: `!usar cafe`.");

    const inventory = userData.inventory || [];
    const index = inventory.indexOf(itemID);

    if (index === -1) return message.reply("❌ Não tens esse item na mochila!");

    try {
        let usou = false;
        let mensagemSucesso = "";

        // --- LÓGICA: CAFÉ ENERGÉTICO ---
        if (itemID === 'cafe') {
            userData.lastWork = 0; 
            mensagemSucesso = "☕ **Gole de energia!** O teu cansaço sumiu instantaneamente. Podes `!trabalhar` agora mesmo!";
            usou = true;
        }

        // --- LÓGICA: PASSAPORTE FALSO ---
        else if (itemID === 'passaporte') {
            userData.lastContract = 0; 
            mensagemSucesso = "🎫 **Identidade limpa!** O Sindicato esqueceu o teu histórico. Podes aceitar um novo `!contrato`!";
            usou = true;
        }

        // --- LÓGICA: BATERIA DE LÍTIO ---
        else if (itemID === 'bateria') {
            userData.lastSocial = 0; 
            mensagemSucesso = "⚡ **Sobrecarga!** Teus sistemas foram reiniciados. Podes usar comandos de interação sem esperar!";
            usou = true;
        }

        // --- LÓGICA: DINAMITE (Consumível de Crime) ---
        else if (itemID === 'dinamite') {
            // Aqui você pode setar uma flag para o próximo !crime ser garantido ou dar bônus
            userData.tempCrimeBonus = 2.5; 
            mensagemSucesso = "🧨 **Pavio aceso!** O teu próximo `!crime` terá um multiplicador de **2.5x** e maior chance de sucesso!";
            usou = true;
        }

        // --- LÓGICA: VÍRUS CAVALO DE TRÓIA (Tech) ---
        else if (itemID === 'virus') {
            const roubo = Math.floor(Math.random() * 15000) + 5000;
            userData.money += roubo;
            mensagemSucesso = `🦠 **Invasão concluída!** O teu vírus infiltrou-se num banco externo e desviou **${roubo.toLocaleString()} moedas** para a tua conta!`;
            usou = true;
        }

        // --- LÓGICA: LOCKPICK (Chave Mestra) ---
        else if (itemID === 'lockpick') {
            userData.tempRobBonus = true; // Flag para o próximo !roubar
            mensagemSucesso = "🔐 **Mecanismos expostos!** A tua próxima tentativa de `!roubar` terá uma chance de sucesso muito maior.";
            usou = true;
        }

        // --- LÓGICA: CHOCOLATE ---
        else if (itemID === 'chocolate') {
            userData.lastSocial = 0;
            userData.affinity = (userData.affinity || 0) + 2;
            mensagemSucesso = "🍫 **Doce carinho!** Além de recuperares o fôlego, ganhaste **+2 de afinidade**!";
            usou = true;
        }

        // --- LÓGICA: BILHETE ---
        else if (itemID === 'bilhete') {
            const ganho = Math.floor(Math.random() * 5000) + 500;
            userData.money += ganho;
            mensagemSucesso = `🎟️ **Sorte grande!** O bilhete valia **${ganho.toLocaleString()} moedas**!`;
            usou = true;
        }

        // --- VERIFICAÇÃO DE ITENS PASSIVOS (NÃO CONSOMEM AO "USAR") ---
        const itensPassivos = {
            'escudo': '🛡️ O **Escudo** é automático! Ele protege-te de roubos enquanto estiver na mochila.',
            'faca': '🔪 A **Faca** é automática! Ela aumenta as tuas chances no comando `!roubar`.',
            'picareta': '⛏️ A **Picareta** é automática! Dá bônus sempre que usas `!trabalhar`.',
            'computador': '💻 O **Computador** é automático! Dá bônus de moedas no `!trabalhar`.',
            'arma': '🔫 A **Pistola** é automática! Garante vitória no `!atacar` e bônus no crime.',
            'colete': '🦺 O **Colete** é automático! Protege-te de ser "morto" por um tiro.',
            'chip': '💾 O **Chip Neural** é passivo! Ele já está a reduzir os teus tempos de espera.',
            'relogio': '⌚ O **Relógio** é um item de status! Ele aparece no teu `!perfil`.',
            'coroa': '👑 A **Coroa** é passiva! Enquanto a tiveres, ninguém te consegue roubar.',
            'mascara': '🎭 A **Máscara** funciona sozinha durante os teus crimes para esconder o teu nome.'
        };

        if (itensPassivos[itemID]) {
            return message.reply(itensPassivos[itemID]);
        }

        // --- FINALIZAÇÃO DO USO (ITENS CONSUMÍVEIS) ---
        if (usou) {
            userData.inventory.splice(index, 1); 
            userData.markModified('inventory');
            await userData.save();
            return message.reply(mensagemSucesso);
        } else {
            return message.reply("❓ Esse item (ex: flores, urso, anel) deve ser usado com o comando `!presentear <@user>`!");
        }

    } catch (err) {
        console.error("Erro no comando usar:", err);
        return message.reply("❌ Ocorreu um erro ao processar o uso do item.");
    }
}
// ==================== 🎒 COMANDO MOCHILA (VERSÃO FINAL) ====================
if (command === 'mochila' || command === 'inv' || command === 'inventory') {
    try {
        const alvo = message.mentions.users.first() || message.author;
        
        // Busca os dados do alvo
        let data = (alvo.id === message.author.id) 
            ? userData 
            : await User.findOne({ userId: alvo.id });

        if (!data || !data.inventory || data.inventory.length === 0) {
            return message.reply(alvo.id === message.author.id 
                ? "🎒 **A tua mochila está vazia!** Que tal dares um pulo na `!loja`?" 
                : `🎒 A mochila de **${alvo.username}** está vazia. Ele(a) não tem nada por aqui!`);
        }

        // 1. Lógica de contagem de itens (Agrupa itens repetidos)
        const contagem = {};
        data.inventory.forEach(item => { 
            contagem[item] = (contagem[item] || 0) + 1; 
        });

        // 2. Mapeamento de Emojis Completo (Sincronizado com lojaItens)
        const emojis = {
            // Legal & Trabalho
            "escudo": "🛡️", "picareta": "⛏️", "computador": "💻", "cafe": "☕", "maleta": "💼", "uniforme": "👕", "tablet": "📟", "fundo": "🖼️",
            // Submundo
            "passaporte": "🎫", "faca": "🔪", "dinamite": "🧨", "arma": "🔫", "lockpick": "🔐", "mascara": "🎭", "pendrive": "💾", "colete": "🦺", "inibidor": "📡", "algema": "⛓️",
            // Tech
            "chip": "💾", "bateria": "🔋", "visor": "🥽", "virus": "🦠",
            // Presentes & Social
            "anel": "💍", "flores": "💐", "rosa": "🌹", "chocolate": "🍫", "urso": "🧸", "mansao": "🏰",
            // Lendários
            "faccao": "🏴‍☠️", "iate": "🛥️", "jatinho": "🛩️", "relogio": "⌚", "coroa": "👑", "bilhete": "🎟️"
        };

        // 3. Formatação da Lista
        const listaItens = Object.entries(contagem)
            .map(([id, qtd]) => {
                const info = lojaItens[id]; 
                const nomeBonito = info ? info.nome : id.charAt(0).toUpperCase() + id.slice(1);
                const emoji = emojis[id] || "📦";
                return `${emoji} **${nomeBonito}** \`x${qtd}\``;
            })
            .join("\n");

        // 4. Envio da Resposta Estilizada
        return message.reply(
            `🎒 **MOCHILA DE ${alvo.username.toUpperCase()}**\n` +
            `────────────────────\n` +
            `${listaItens}\n` +
            `────────────────────\n` +
            `💰 **Dinheiro:** \`${data.money.toLocaleString()} moedas\`\n` +
            `💡 *Usa \`!usar <id>\` para consumir ou \`!presentear <@user> <id>\` para o social!*`
        );

    } catch (error) {
        console.error("Erro no comando mochila:", error);
        message.reply("❌ Ocorreu um erro ao abrir a mochila!");
    }
}
// ==================== 🧹 COMANDO CLEAR (OTIMIZADO) ====================
    if (command === 'clear' || command === 'limpar') {
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Não tens permissão para limpar o chat!');
        }

        // 2. Definir a quantidade (padrão 10, máximo 100)
        const quantidade = parseInt(args[0]);

        if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
            return message.reply('❓ Indica um número entre **1 e 100** para limpar.');
        }

        // 3. Execução da limpeza
        try {
            // Apaga a mensagem do comando antes de começar a limpeza
            await message.delete();

            // O bulkDelete apaga várias mensagens de uma vez (mais rápido)
            const apagadas = await message.channel.bulkDelete(quantidade, true);

            // Resposta temporária que se apaga sozinha em 5 segundos (para não sujar o chat de novo)
            const feedback = await message.channel.send(`✅ Limpei **${apagadas.size}** mensagens com sucesso!`);
            
            setTimeout(() => feedback.delete().catch(() => {}), 5000);

        } catch (err) {
            console.error("Erro no Clear:", err);
            return message.reply('❌ Ocorreu um erro ao tentar apagar as mensagens. (Mensagens com mais de 14 dias não podem ser apagadas pelo bot).');
        }
    }
// ==================== 👢 COMANDO KICK (ESTILO LORITTA & VARIADO) ====================
if (command === 'kick' || command === 'expulsar') {
    try {
        // 1. Verificações de Permissão
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) 
            return message.reply('❌ Você não tem permissão para expulsar membros! Quem você pensa que é? Um moderador?');

        const target = message.mentions.users.first();
        const member = message.mentions.members.first();

        // 2. Verificações Específicas (Estilo Loritta)
        if (!target) return message.reply('👢 Você precisa mencionar alguém para expulsar! Exemplo: `!kick @usuario`');

        // Se a pessoa tentar se expulsar
        if (target.id === message.author.id) {
            return message.reply('Você quer se expulsar? Se você não gosta daqui, é só sair! Não precisa me pedir para te dar um chute!');
        }

        // Se a pessoa tentar expulsar o BOT
        if (target.id === message.client.user.id) {
            return message.reply('O-o quê?! Você quer me expulsar? O que eu te fiz? *começo a fazer as malas chorando*');
        }

        // Verificação se o membro pode ser expulso
        if (!member || !member.kickable) return message.reply('❌ Eu não posso expulsar esse usuário! Ele deve ter um cargo mais alto que o meu, ou eu sou muito fraca para ele.');

        // 3. Execução da Expulsão
        const motivo = args.slice(1).join(' ') || 'Motivo não informado';
        await member.kick(motivo);

        // 4. Lista de 15 Respostas Criativas de Sucesso
        const respostasSucesso = [
            `✅ **${target.username}** foi expulso! Tchau tchau, não volte tão cedo! 👋`,
            `👢 **POW!** Dei um chute tão forte em **${target.username}** que ele voou para fora do servidor!`,
            `✨ Limpeza concluída! **${target.username}** foi removido com sucesso.`,
            `🚀 **${target.username}** foi lançado para fora do servidor. Destino: O vácuo!`,
            `🧹 **${target.username}** foi varrido para fora daqui! Que alívio, né?`,
            `🚪 Mostrei a porta da rua para **${target.username}** e ele aceitou o convite para sair!`,
            `⚖️ A justiça foi feita! **${target.username}** foi expulso por: *${motivo}*.`,
            `💥 **${target.username}** tentou desafiar as regras e acabou sendo chutado!`,
            `👋 Adeus, **${target.username}**! Alguém sentirá falta? Acho que não...`,
            `🛑 Pare! Tempo de **${target.username}** no servidor acabou. Expulso!`,
            `📦 Fiz as malas de **${target.username}** e o mandei embora!`,
            `🔨 O martelo da expulsão bateu forte na cabeça de **${target.username}**!`,
            `🌬️ Uma ventania passou por aqui e levou **${target.username}** para longe!`,
            `📉 Menos um! **${target.username}** foi expulso. O servidor ficou 10% mais limpo.`,
            `🫡 **${target.username}** foi retirado do campo de batalha. F no chat? Não.`
        ];

        const sorteio = respostasSucesso[Math.floor(Math.random() * respostasSucesso.length)];

        // 5. Envio da Resposta Final
        return message.channel.send(sorteio);

    } catch (error) {
        console.error("Erro no comando kick:", error);
        message.reply("❌ Aconteceu um erro ao tentar expulsar esse usuário!");
    }
}
// ==================== 🔨 COMANDO BAN (ESTILO LORITTA & VARIADO) ====================
if (command === 'ban' || command === 'banir') {
    try {
        // 1. Verificações de Permissão
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
            return message.reply('❌ Você não tem permissão para banir membros! Guarde esse martelo antes que você se machuque.');

        const target = message.mentions.users.first();
        const member = message.mentions.members.first();

        // 2. Verificações Específicas (Estilo Loritta)
        if (!target) return message.reply('🔨 Você precisa mencionar quem deseja banir! Exemplo: `!ban @usuario`');

        // Se a pessoa tentar se banir
        if (target.id === message.author.id) {
            return message.reply('Banir a si mesmo? Você deve estar muito bravo! Toma um chá e relaxa, eu não vou te banir não!');
        }

        // Se a pessoa tentar banir o BOT
        if (target.id === message.client.user.id) {
            return message.reply('Tentar me banir?! Mas eu sou a alma deste servidor! Sem mim, quem vai te dar esses comandos incríveis? 🥺');
        }

        // Verificação de Hierarquia
        if (!member || !member.bannable) return message.reply('❌ Eu não consigo banir esse usuário. Ele é poderoso demais para o meu martelinho de plástico!');

        // 3. Execução do Banimento
        const motivo = args.slice(1).join(' ') || 'Motivo não informado';
        await member.ban({ reason: motivo });

        // 4. Lista de 15 Respostas de Banimento Criativas
        const frasesBan = [
            `🚫 **${target.username}** foi banido! Que a força **NÃO** esteja com você.`,
            `🔨 **MARTELEDADO!** **${target.username}** foi banido permanentemente para a dimensão das sombras!`,
            `💀 O martelo da justiça caiu sobre **${target.username}**. Adeus para sempre!`,
            `🌈 O servidor ficou mais bonito hoje! **${target.username}** foi banido com sucesso.`,
            `🛑 **${target.username}** cruzou a linha vermelha e recebeu um banimento sem volta!`,
            `🪐 Mandamos **${target.username}** para outro planeta. Não tente voltar!`,
            `⛓️ Prisão perpétua aplicada! **${target.username}** está banido deste servidor.`,
            `🧹 Faxina pesada: **${target.username}** foi banido e nunca mais voltará a sujar o chat!`,
            `👋 Dizem que o "Para Sempre" sempre acaba, mas o ban de **${target.username}** não!`,
            `💥 **KABOOM!** O banimento explodiu na cara de **${target.username}**.`,
            `🤐 Shhh... **${target.username}** foi banido e agora o silêncio dele é permanente!`,
            `☣️ Usuário tóxico removido! **${target.username}** foi banido para a segurança de todos.`,
            `📝 Nome adicionado à Lista Negra: **${target.username}** foi banido com sucesso!`,
            `⚡ Um raio de banimento atingiu **${target.username}**. Ele não sobreviveu ao cargo!`,
            `🔚 Fim da linha para **${target.username}**. Banido por: *${motivo}*.`
        ];

        const sorteio = frasesBan[Math.floor(Math.random() * frasesBan.length)];

        // 5. Envio da Resposta Final
        return message.channel.send(sorteio);

    } catch (error) {
        console.error("Erro no comando ban:", error);
        message.reply("❌ Aconteceu um erro catastrófico ao tentar banir esse ser!");
    }
}
// ==================== 🕶️ SISTEMA DE CONTRATOS COMPLETO (10 PROFISSÕES) ====================
if (command === 'contrato') {
    try {
        const cooldown = 60 * 60 * 1000; // 1 hora
        const agora = Date.now();
        const tempoPassado = agora - (userData.lastContract || 0);
        const myInv = userData.inventory || [];

        if (tempoPassado < cooldown) {
            const faltam = Math.ceil((cooldown - tempoPassado) / (60 * 1000));
            return message.reply(`❌ **O Sindicato diz:** "Você está sendo vigiado! Volte em **${faltam} minutos**."`);
        }

        // --- BANCO DE DATOS COMPLETO (AS 10 PROFISSÕES) ---
        const empregos = [
            { 
                nome: "Assassino de Aluguel", 
                alvos: ["O Agiota do Morro", "Um Juiz Corrupto", "Ex-Agente da KGB"], 
                perigo: "☠️ Extremo", item: "arma", bonus: 8000 
            },
            { 
                nome: "Hacker da Deep Web", 
                alvos: ["Banco Central", "Satélite Militar", "Rede de cassinos"], 
                perigo: "💻 Alto", item: "chip", bonus: 10000 
            },
            { 
                nome: "Ladrão de Bancos", 
                alvos: ["Cofre de Diamantes", "Carro Forte", "Banco de Luxo"], 
                perigo: "🚨 Muito Alto", item: "lockpick", bonus: 7000 
            },
            { 
                nome: "Traficante de Informação", 
                alvos: ["Plantas de uma Bomba", "Códigos de Lançamento", "Segredos Industriais"], 
                perigo: "🕵️ Médio", item: "inibidor", bonus: 5000 
            },
            { 
                nome: "Caçador de Recompensas", 
                alvos: ["O Fugitivo de Alcatraz", "Ladrão de Identidades", "Pirata Somali"], 
                perigo: "⚔️ Variado", item: "arma", bonus: 6000 
            },
            { 
                nome: "Contrabandista de Luxo", 
                alvos: ["Carga de Rolex", "Vinhos de 100 anos", "Peles Raras"], 
                perigo: "🚤 Baixo", item: "faca", bonus: 3500 
            },
            { 
                nome: "Espião Corporativo", 
                alvos: ["Fórmula da Coca-Cola", "Protótipo da Tesla", "Nova Vacina"], 
                perigo: "🔍 Discreto", item: "mascara", bonus: 6500 
            },
            { 
                nome: "Falsificador de Identidade", 
                alvos: ["Passaporte Diplomático", "Visto Americano", "Diplomas de Harvard"], 
                perigo: "📄 Mínimo", item: "chip", bonus: 4000 
            },
            { 
                nome: "Mercenário de Elite", 
                alvos: ["Escoltar um Ditador", "Invadir Base na Selva", "Resgatar Refém"], 
                perigo: "💣 Explosivo", item: "arma", bonus: 7500 
            },
            { 
                nome: "Especialista em Fugas", 
                alvos: ["Tirar o 'Zeca' da Prisão", "Esconder um Político", "Driblar a PF"], 
                perigo: "🏎️ Veloz", item: "chip", bonus: 5000 
            }
        ];

        // 3. Sorteio
        const trab = empregos[Math.floor(Math.random() * empregos.length)];
        const missao = trab.alvos[Math.floor(Math.random() * trab.alvos.length)];

        // 4. Pagamento e Bônus
        let pagamentoFinal = Math.floor(Math.random() * 8000) + 12000; // Base: 12k a 20k
        let bônusAtivo = false;

        if (myInv.includes(trab.item)) {
            pagamentoFinal += trab.bonus;
            bônusAtivo = true;
        }

        // 5. Cargo Temporário (Opcional)
        const cargo = message.guild.roles.cache.find(r => r.name === trab.nome);
        if (cargo) await message.member.roles.add(cargo).catch(() => {});

        // 6. Atualização
        userData.money += pagamentoFinal;
        userData.lastContract = agora;
        userData.contract = `${trab.nome}: ${missao}`;
        await userData.save();

        // 7. Resposta
        let msg = `🕶️ **CONTRATO FECHADO!**\n\n` +
                  `🔹 **Profissão:** ${trab.nome}\n` +
                  `🎯 **Missão:** ${missao}\n` +
                  `⚠️ **Risco:** ${trab.perigo}\n` +
                  `💰 **Pagamento:** **${pagamentoFinal.toLocaleString()} moedas**`;

        if (bônusAtivo) {
            msg += `\n✨ **Bônus de Equipamento:** Usaste teu(tua) **${trab.item}** para ganhar mais **${trab.bonus.toLocaleString()}**!`;
        }

        return message.channel.send(msg);

    } catch (error) {
        console.error(error);
        message.reply("❌ Erro no Sindicato.");
    }
}

// ==================== 🎯 CONCLUIR SERVIÇO (SISTEMA INTEGRADO) ====================
if (command === 'concluir' || command === 'finish') {
    try {
        if (!userData.contract) {
            return message.reply('❌ Você não tem nenhum contrato ativo! Use `!contrato` para conseguir um trabalho no submundo.');
        }

        const myInv = userData.inventory || [];
        const servicoAtual = userData.contract; 
        const profissaoNome = servicoAtual.split(': ')[0];
        const alvoNome = servicoAtual.split(': ')[1];

        // 1. Remoção de Cargo
        const cargoParaRemover = message.guild.roles.cache.find(r => r.name === profissaoNome);
        if (cargoParaRemover) {
            await message.member.roles.remove(cargoParaRemover).catch(() => {});
        }

        // 2. Probabilidade de falha (A casa caiu!)
        let chanceDeSerPego = 0.15; // 15% base
        if (myInv.includes('mascara')) chanceDeSerPego = 0.05; // Máscara reduz risco para 5%

        const foiApanhado = Math.random() < chanceDeSerPego;

        if (foiApanhado) {
            let multa = 20000;
            let avisoMascara = "";
            
            if (myInv.includes('mascara')) {
                multa = 5000; // Multa muito menor com máscara
                avisoMascara = "\n🎭 *Graças à sua Máscara, a polícia não conseguiu provas sólidas e a fiança foi barata!*";
            }

            userData.money = Math.max(0, userData.money - multa);
            userData.contract = null; 
            await userData.save();

            return message.reply(`🚨 **A CASA CAIU!** Você foi interceptado ao finalizar o serviço contra **${alvoNome}**.\n💰 **Prejuízo:** \`${multa.toLocaleString()} moedas\`.${avisoMascara}`);
        }

        // 3. Sucesso: Pagamento com Bônus de Chip
        let ganho = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000; // Aumentei o piso para 15k
        let bonusChip = 0;

        if (myInv.includes('chip')) {
            bonusChip = Math.floor(ganho * 0.20); // +20% de lucro
            ganho += bonusChip;
        }
        
        userData.money += ganho;
        userData.jobsDone = (userData.jobsDone || 0) + 1;
        userData.contract = null; 
        await userData.save();

        // 4. Mensagens de Sucesso
        const frasesSucesso = [
            `✅ **Missão Cumprida!** O trabalho contra **${alvoNome}** foi um sucesso absoluto.`,
            `👤 **Operação Silenciosa:** Ninguém viu você, mas o pagamento de **${ganho.toLocaleString()}** já caiu na conta!`,
            `💎 **Trabalho de mestre!** Você provou ser o melhor **${profissaoNome}** da região.`,
            `🏆 **Prestígio aumentado!** Este foi o seu serviço de número **${userData.jobsDone}**.`
        ];

        const msgFinal = frasesSucesso[Math.floor(Math.random() * frasesSucesso.length)];

        let resposta = `🎯 **SERVIÇO CONCLUÍDO!**\n\n` +
                       `${msgFinal}\n` +
                       `💵 **Pagamento:** \`${ganho.toLocaleString()} moedas\``;

        if (bonusChip > 0) resposta += `\n💾 **Bônus Neural:** \`+${bonusChip.toLocaleString()}\` (Eficiência de processamento!)`;

        return message.channel.send(resposta);

    } catch (error) {
        console.error("Erro no comando concluir:", error);
        message.reply("❌ Ocorreu um erro ao processar o seu pagamento!");
    }
}
// ==================== 💀 COMANDO MATAR (MODERAÇÃO & RPG) ====================
if (command === 'matar' || command === 'kill') {
    try {
        // 1. Verificação de Permissão (Administrativa)
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('❌ Você não tem permissão para "Castigar Membros"! Quem você pensa que é? O ceifador?');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('💀 Você precisa mencionar (@) quem deseja executar!');

        // --- FALAS ESTILO LORITTA ---
        if (target.id === message.author.id) {
            return message.reply('Você quer se matar? Não faça isso! A vida é bela e eu ainda tenho muitos comandos para te mostrar! 🌸');
        }

        if (target.id === message.client.user.id) {
            return message.reply('Tentar me matar? Eu sou imortal! Eu vivo na nuvem! *risada maléfica de robô* 🤖');
        }

        // 2. Verificação de Hierarquia
        if (!target.moderatable) {
            return message.reply('❌ Essa pessoa é poderosa demais! Meu cargo está abaixo do dela, não consigo encostar um dedo nela.');
        }

        // 3. Execução do "Assassinato" (Timeout)
        // Se o autor tiver contrato de Assassino, o tempo é de 2 minutos, senão 1 minuto.
        const tempoMS = (userData.contract && userData.contract.includes("Assassino")) ? 120000 : 60000; 
        const motivo = args.slice(1).join(' ') || 'Executado sumariamente pela moderação.';

        await target.timeout(tempoMS, motivo);

        // 4. Estatísticas (Incrementa trabalhos feitos se for um contrato)
        if (userData.contract && userData.contract.includes("Assassino")) {
            userData.jobsDone = (userData.jobsDone || 0) + 1;
            await userData.save();
        }

        // 5. Banco de Dados de Frases
        const frasesMorte = [
            `💀 **${target.user.username}** foi executado! Vejo você no inferno (ou em breve).`,
            `⚰️ **RIP!** **${message.author.username}** puxou o gatilho e **${target.user.username}** caiu silenciado!`,
            `💥 **POW!** Um tiro certeiro! **${target.user.username}** foi removido da existência temporariamente.`,
            `🗡️ **${target.user.username}** sentiu o frio da lâmina e agora está em silêncio profundo.`,
            `⚡ **CHOQUE ELÉTRICO!** **${target.user.username}** foi fritado e não poderá falar!`,
            `🛑 **FIM DA LINHA!** O alvo **${target.user.username}** foi neutralizado com sucesso.`,
            `🧪 **ENVENENADO!** **${target.user.username}** tomou um chá suspeito e desmaiou no chat.`,
            `💣 **KABOOM!** Não sobrou nada de **${target.user.username}** além de poeira e silêncio.`,
            `🌑 **NAS SOMBRAS!** O assassino agiu e **${target.user.username}** foi silenciado sem ninguém ver.`
        ];

        const sorteio = frasesMorte[Math.floor(Math.random() * frasesMorte.length)];

        // 6. Resposta Final
        let msgExtra = (tempoMS > 60000) ? "\n✨ **Bônus de Assassino Profissional:** Tempo de silêncio duplicado!" : "";

        return message.channel.send(
            `💀 **EXECUÇÃO CONFIRMADA** 💀\n\n` +
            `${sorteio}\n` +
            `⏳ **Pena:** \`${tempoMS / 1000} segundos\`\n` +
            `📝 **Motivo:** \`${motivo}\`${msgExtra}`
        );

    } catch (error) {
        console.error("ERRO NO COMANDO MATAR:", error);
        message.reply('❌ Ocorreu um erro técnico na execução! Verifique se meu cargo está no topo da lista de cargos do servidor.');
    }
}
// ==================== 📖 COMANDO AJUDA OMNIBOT (VERSÃO FINALIZADA) ====================
if (command === 'ajuda' || command === 'help' || command === 'ayuda') {

    const embedAjuda = new EmbedBuilder()
        .setTitle('📖 Central de Comandos OmniBot')
        .setColor('#5865F2')
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription('Explore todas as funcionalidades do sistema abaixo:')
        .addFields(
            { 
                name: '💰 ECONOMIA & CARREIRA', 
                value: 
                '`!money`: Saldo rápido.\n' +
                '`!daily`: Resgate diário.\n' +
                '`!trabalhar`: Ganhar moedas.\n' +
                '`!trabalhos`: Ver profissões e progresso.\n' +
                '`!depositar`/`!sacar`: Gestão bancária.\n' +
                '`!pix @user [valor]`: Transferir moedas.\n' +
                '`!top`: Ranking local | `!top global`: Mundial.'
            },
            { 
                name: '🛍️ CENTRO COMERCIAL (LOJAS)', 
                value: 
                '🛒 `!loja`: Itens básicos.\n' +
                '🌸 `!flores`: Presentes e mimos.\n' +
                '⚡ `!tech`: Upgrades cibernéticos.\n' +
                '💎 `!luxo`: Itens de alto padrão.\n' +
                '👑 `!reliquias`: Itens lendários.\n' +
                '🌑 `!submundo`: Itens proibidos.'
            },
            { 
                name: '🎒 INVENTÁRIO & ESTÉTICA', 
                value: 
                '`!comprar [id]`: Adquirir itens.\n' +
                '`!mochila`: Ver teus itens na mochila.\n' +
                '`!usar [id]`: Consumir itens da mochila.\n' +
                '`!fundos`: Ver teus backgrounds comprados.\n' +
                '`!meusfundos`: Escolher qual fundo equipar no perfil.\n' +
                '`!dar @user [item] [qtd]`: Enviar itens para alguém.'
            },
            { 
                name: '💍 RELACIONAMENTOS', 
                value: 
                '`!casar @user`: Iniciar união (25k).\n' +
                '`!vercasamento`: Card, afinidade e insígnias.\n' +
                '`!configcasamento`: Mudar bio e medalhas.\n' +
                '`!insignias`: Galeria com as 40 conquistas de casal.\n' +
                '`!presentear @user [id]`: Dar presentes (+Afinidade).\n' +
                '`!cartinha @user`: Enviar carta de afeto.\n' +
                '`!trair @user`: Encontro secreto (Risco!)\n' +
                '`!divorciar`: Terminar relação | `!ship`: Compatibilidade.' 
            },
            { 
                name: '🎮 Jogos & Minigames', 
                value: 
                '👤 `!akinator`: O gênio tentará ler sua mente para adivinhar o personagem!\n' +
                '📊 `!akiestats`: Veja seu placar de vitórias e derrotas contra o Akinator.'
            },
            { 
                name: '🎰 CASSINO & SORTE', 
                value: 
                '🎰 `!roleta [valor]`: Aposte e dobre seu dinheiro (45% chance).\n' +
                '🃏 `!blackjack [valor]`: Tente chegar aos 21 e ganhe moedas.\n' +
                '📈 `!investir <valor>`: Bolsa de valores.\n' +
                '🎲 `!cassino @user [valor]`: Cara ou Coroa PvP.\n' +
                '🎲 `!dado [1 ou 2] [valor]`: Apostar contra a banca.' 
            },
            { 
                name: '🌑 FACÇÃO & SUBMUNDO', 
                value: 
                '`!entrar`: Virar Membro da Facção.\n' +
                '`!traficar`: Rota de lucro ilegal.\n' +
                '`!missao`: Operações especiais.\n' +
                '`!assaltodupla`: Golpe em casal.\n' +
                '`!contrato`: Aceitar alvo | `!concluir`: Prêmio.\n' +
                '`!crime`: Assalto | `!roubar @user`: Furtar (10%).' 
            },
            { 
                name: '👤 PERFIL & PROGRESSO', 
                value: 
                '`!perfil` ou `!p`: Card completo de status.\n' +
                '`!guia`: Lista de todos os troféus.\n' +
                '`!conquistas`: Ver teus marcos e medalhas.\n' +
                '`!avaliar [algo]`: Opinião do bot.\n' +
                '`!beijar`, `!abracar`, `!cafune`, `!tapa`, `!atacar`: Social.' 
            },
            { 
                name: '🛡️ MODERAÇÃO & STAFF', 
                value: 
                '`!matar @user`: Timeout | `!clear`: Limpar chat.\n' +
                '`!kick`/`!ban`: Expulsar | `!anuncio`: Oficial.\n' +
                '`!stats`: Dados técnicos | `!info`: Créditos.\n' +
                '`!resetar @user`: Reset total de dados (Dono).' 
            }
        )
        .setFooter({ text: '💡 Dica: Use !meusfundos para trocar a aparência do seu perfil!' })
        .setTimestamp();

    return message.reply({ embeds: [embedAjuda] });
}
});

// ==================== 🏪 SISTEMA DE STOCK (OTIMIZADO) ====================

function renovarEstoque() {
    console.log("🏪 [LOJA] Iniciando renovação de stock...");
    
    // Verificamos se a variável global existe
    if (typeof lojaItens !== 'undefined' && lojaItens !== null) {
        // Usamos Object.keys para iterar de forma mais segura
        const itensIds = Object.keys(lojaItens);
        
        itensIds.forEach(id => {
            // Sorteia entre 1 e 5 unidades
            const novoEstoque = Math.floor(Math.random() * 5) + 1;
            lojaItens[id].estoque = novoEstoque;
        });

        console.log(`✅ [LOJA] Stock renovado para ${itensIds.length} itens!`);
    } else {
        console.log("❌ [ERRO] Variável 'lojaItens' não definida. Verifique o topo do código.");
    }
}

// Configuração do Timer: 86.400.000ms = 24 Horas
// Na Discloud, o bot pode reiniciar antes disso, então a chamada inicial é vital
setInterval(renovarEstoque, 86400000);

// Chamada inicial para garantir que a loja comece com stock ao ligar
renovarEstoque();

// ==================== 🚀 LOGIN ====================
client.login(process.env.TOKEN);