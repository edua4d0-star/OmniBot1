const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ==================== 👤 IDENTIFICAÇÃO ====================
    userId: { type: String, required: true, unique: true },

    // ==================== 💰 ECONOMIA & BANCO ====================
    money: { type: Number, default: 0 },       // Dinheiro na mão (Limpo)
    bank: { type: Number, default: 0 },        // Dinheiro no banco
    dirtyMoney: { type: Number, default: 0 },  // [ADICIONADO] Dinheiro Sujo (Lavagem)
    lastWork: { type: Number, default: 0 },    
    workCount: { type: Number, default: 0 },   
    lastInvest: { type: Number, default: 0 },  
    lastDaily: { type: Number, default: 0 },   

    // ==================== 🎒 INVENTÁRIO & ESTÉTICA ====================
    inventory: { type: [String], default: [] },   // Itens da mochila
    bg: { type: String, default: "" },             // Link do fundo atual equipado
    bgInventory: { type: [String], default: [] }, // LISTA DE IDS DOS FUNDOS COMPRADOS

    // ==================== 🌑 SISTEMA DE FACÇÃO ====================
    cargo: { type: String, default: "Civil" }, 
    missionCount: { type: Number, default: 0 }, 
    lastTrafico: { type: Number, default: 0 }, 
    lastMission: { type: Number, default: 0 }, 

    // ==================== 💖 RELACIONAMENTO ====================
    marriedWith: { type: String, default: null }, 
    affinity: { type: Number, default: 0 }, 
    lastAssaltoDupla: { type: Number, default: 0 }, 
    lastGift: { type: Number, default: 0 },        // [ADICIONADO] Cooldown de presentes

    // ==================== 🎯 CONTRATOS & CRIMES ====================
    contract: { type: String, default: null }, 
    lastContract: { type: Number, default: 0 }, 
    jobsDone: { type: Number, default: 0 },    
    lastKill: { type: Number, default: 0 },    
    lastRob: { type: Number, default: 0 },     
    lastCrime: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
